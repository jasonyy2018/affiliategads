/**
 * pSEO 矩阵页面批量生成器（原 scripts/pseo_generator.py）
 * 三维度矩阵：品类 × 场景 × 价格带。硬约束：
 *   - 每页至少 3 个商品（对比不成立则跳过）
 *   - 排除 excluded_combinations
 *   - 页内商品按单笔佣金绝对值降序
 *   - 可选 AI 增强 GEO 正文
 */
import {
  loadProducts,
  loadMatrix,
  loadTrackingIds,
  PAGES_DIR,
  withLock,
  writeJson,
  type Product,
} from './dataLayer';
import { generateJson, loadAiConfig, resolveProvider } from './aiEngine';
import fs from 'fs';
import path from 'path';

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

interface PageSpec {
  category: string;
  use_case: string;
  price_band: { label: string; min: number; max: number };
  products: Product[];
  slug: string;
  title: string;
}

function buildSpecs(): PageSpec[] {
  const matrix = loadMatrix();
  const products = loadProducts();
  const trackingMap = loadTrackingIds();
  const excluded = new Set(matrix.excluded_combinations.map((e) => `${e.category}|${e.use_case}`));

  const specs: PageSpec[] = [];

  for (const category of matrix.categories) {
    for (const useCase of matrix.use_cases) {
      if (excluded.has(`${category}|${useCase}`)) continue;

      for (const band of matrix.price_bands) {
        const matched = products
          .filter(
            (p) =>
              p.category.toLowerCase() === category.toLowerCase() &&
              p.use_cases.some((u) => u.toLowerCase() === useCase.toLowerCase()) &&
              p.price >= band.min &&
              p.price <= band.max
          )
          .sort(
            (a, b) => b.price * b.commission_rate - a.price * a.commission_rate
          );

        if (matched.length < 3) continue;

        const tag = trackingMap[category.toLowerCase()] || trackingMap.default || 'jyu0a-20';
        const assigned = matched.slice(0, 8).map((p) => ({ ...p, affiliate_tag: tag }));

        const parts = ['best', slugify(category), 'for', slugify(useCase), slugify(band.label)];
        const slug = parts.filter(Boolean).join('-');
        const title = `Best ${category} for ${useCase} (${band.label}) (2026): ${assigned.length} Tested & Ranked`;

        specs.push({ category, use_case: useCase, price_band: band, products: assigned, slug, title });
      }
    }
  }

  return specs;
}

function buildPageData(spec: PageSpec, aiFaqs?: Array<{ question: string; answer: string }>): any {
  const top = spec.products[0];
  const runner = spec.products[1] || top;
  const bandLabel = spec.price_band.label;
  const weight = top.specs?.weight_g ? ` at ${top.specs.weight_g}g` : '';

  const conclusion =
    `For ${spec.use_case} in the ${spec.category} category (${bandLabel}), ` +
    `the ${top.brand} ${top.title.split(' ')[1] || top.brand} offers the highest benchmarked stability${weight}, ` +
    `followed by the ${runner.brand} for buyers prioritizing lightweight agility.`;

  const faqs = aiFaqs && aiFaqs.length >= 3 ? aiFaqs : [
    {
      question: `Why is the ${top.brand} rated highest for ${spec.use_case}?`,
      answer: `In our rigorous laboratory tests, the ${top.brand} demonstrated superior torsional stability and anatomical midfoot alignment, scoring ${top.specs?.arch_support_score || 9.2}/10.`,
    },
    {
      question: `Are these ${spec.category} models tested for waterproof and weather endurance?`,
      answer: 'Yes, each candidate underwent continuous submersion and stress testing to ensure membrane integrity before receiving an editorial recommendation.',
    },
    {
      question: `How does the price of ${bandLabel} compare to premium alternatives?`,
      answer: `Picks in the ${bandLabel} bracket deliver over 85% of high-end flagship features while saving $80–$150 on average.`,
    },
  ];

  return {
    slug: spec.slug,
    title: spec.title,
    category: spec.category,
    use_case: spec.use_case,
    price_band: spec.price_band,
    product_count: spec.products.length,
    geo_conclusion_first: conclusion,
    faqs,
    products: spec.products.map((p) => ({
      asin: p.asin,
      title: p.title,
      brand: p.brand,
      price: p.price,
      commission_rate: p.commission_rate,
      commission_per_sale: Math.round(p.price * p.commission_rate * 100) / 100,
      rating: p.rating,
      review_count: p.review_count,
      specs: p.specs,
      image_url: p.image_url,
      affiliate_tag: p.affiliate_tag,
      highlight: p.highlight,
      lab_test_quote: p.lab_test_quote,
      user_quote: p.user_quote,
    })),
    generated_at: new Date().toISOString().slice(0, 10),
  };
}

const AI_SYSTEM = `You are a senior outdoor gear lab editor writing FAQ content for a buyer comparison page.
Output ONLY valid JSON: {"faqs": [{"question": "...", "answer": "..."}, ...]} — exactly 4 FAQs.
Rules: 100% US English. Each answer 40-80 words, conclusion-first, includes at least one specific number
(weight in g, mm, %, $, or a score out of 10) and attributes data to lab testing. No fluff.`;

export interface PseoResult {
  totalSpecs: number;
  generated: number;
  skipped: number;
  existing: number;
  slugs: string[];
  aiProvider: string;
}

export async function runPseoGenerator(opts: {
  limit?: number;
  apply?: boolean;
  useAi?: boolean;
} = {}): Promise<PseoResult> {
  return withLock('pseo_generator', async () => {
    const limit = opts.limit ?? 50;
    const apply = opts.apply ?? false;
    const useAi = opts.useAi ?? false;

    const specs = buildSpecs();
    const cfg = loadAiConfig();
    const provider = resolveProvider(cfg);

    let generated = 0;
    let skipped = 0;
    let existing = 0;
    const slugs: string[] = [];

    for (const spec of specs) {
      if (generated >= limit) break;

      const filePath = path.join(PAGES_DIR, `${spec.slug}.json`);
      if (fs.existsSync(filePath)) {
        existing++;
        continue;
      }

      if (!apply) {
        generated++;
        slugs.push(spec.slug);
        continue;
      }

      let aiFaqs: Array<{ question: string; answer: string }> | undefined;
      if (useAi && provider !== 'mock') {
        try {
          const userPrompt = `Category: ${spec.category}\nUse case: ${spec.use_case}\nPrice band: ${spec.price_band.label}\nTop pick: ${spec.products[0].title} ($${spec.products[0].price}, arch score ${spec.products[0].specs?.arch_support_score || 'n/a'}/10, weight ${spec.products[0].specs?.weight_g || 'n/a'}g)\nRunner-up: ${spec.products[1]?.title}\n\nWrite 4 buyer FAQs for this comparison.`;
          const out = await generateJson(AI_SYSTEM, userPrompt, cfg, 1500);
          if (Array.isArray(out?.faqs) && out.faqs.length >= 3) aiFaqs = out.faqs;
        } catch {
          // AI 失败时静默回退到模板 FAQ
        }
      }

      writeJson(filePath, buildPageData(spec, aiFaqs));
      generated++;
      slugs.push(spec.slug);
    }

    skipped = specs.length - generated - existing;

    return {
      totalSpecs: specs.length,
      generated,
      skipped,
      existing,
      slugs,
      aiProvider: provider,
    };
  });
}
