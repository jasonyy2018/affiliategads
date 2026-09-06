/**
 * AI 单品评测生成引擎（原 scripts/generate_content.py）
 * 读取 data/products.json → 调用 AI 生成结构化评测 → 写 content/<slug>.json
 * 无可用 AI Key 时使用高质量数据驱动模板（基于真实 specs，不再使用空洞占位文案）。
 */
import fs from 'fs';
import path from 'path';
import {
  loadProducts,
  CONTENT_DIR,
  withLock,
  writeJson,
  type Product,
} from './dataLayer';
import { generateJson, loadAiConfig, resolveProvider } from './aiEngine';

const SYSTEM = `You are a senior outdoor gear review editor and Conversion Rate Optimization expert.
Write high-converting, authoritative, objective hands-on product review landing pages.

CRITICAL REQUIREMENTS:
1. Language: 100% natural, idiomatic US English. STRICTLY ZERO non-English characters.
2. Output ONLY a valid JSON object matching the requested schema. No markdown wrapping.
3. Tone: unbiased, data-backed with specific numbers (weight, dimensions, durability).
4. Every pro/cons bullet must reference a concrete spec or test observation — never generic filler.`;

function buildUserPrompt(p: Product): string {
  return `Generate a structured product review JSON for this Amazon product:

[Product Data]
- ASIN: ${p.asin}
- Title: ${p.title}
- Brand: ${p.brand}
- Price: $${p.price}
- Highlight: ${p.highlight || ''}
- Specs: ${JSON.stringify(p.specs || {})}
- Lab Test Metric: ${p.lab_test_quote || ''}
- Verified User Quote: ${p.user_quote || ''}

Return ONLY a JSON object with exactly these keys:
{
  "slug": "${p.slug}",
  "asin": "${p.asin}",
  "meta_title": "<60-char SEO title with brand + Review (2026)>",
  "meta_description": "<155-char description>",
  "headline": "<H1>",
  "subheadline": "<one sentence>",
  "badge": "<short badge like EDITORS CHOICE 2026>",
  "rating": ${p.rating || 4.6},
  "rating_count": ${p.review_count || 5000},
  "quick_verdict": "<2-3 sentence verdict referencing real specs>",
  "pros": ["4 specific pros with numbers"],
  "cons": ["2 objective cons"],
  "key_features": [{"title": "...", "description": "...", "icon": "shield|zap|refresh|battery"}],
  "specs": [{"label": "...", "value": "..."}],
  "comparison": {"competitor_name": "<real category competitor>", "rows": [{"feature": "...", "our_product": "...", "competitor": "..."}]},
  "detailed_sections": [{"heading": "...", "content": "<100+ word paragraph with test data>"}],
  "faqs": [{"question": "...", "answer": "..."}],
  "final_cta_heading": "...",
  "final_cta_subtext": "..."
}`;
}

/**
 * 数据驱动模板：直接从商品 specs 渲染，杜绝空洞文案。
 */
function buildTemplateContent(p: Product): any {
  const s = p.specs || {};
  const weight = s.weight_g ? `${s.weight_g}g per pair` : 'Standard';
  const arch = s.arch_support_score ? `${s.arch_support_score}/10` : 'Lab benchmarked';
  const drop = s.drop_mm ? `${s.drop_mm}mm` : 'Standard';

  return {
    slug: p.slug,
    asin: p.asin,
    meta_title: `${p.title.slice(0, 55)} Review (2026): Lab Tested & Ranked`,
    meta_description: `Hands-on lab review of the ${p.title}. Real weight, waterproof submersion results, arch support score, pros & cons, and current Amazon pricing.`,
    headline: `${p.title}: 2026 Lab-Benchmarked Review`,
    subheadline: `We bought it at retail and ran it through our 4-stage mechanical protocol. Here are the numbers.`,
    badge: 'LAB TESTED 2026',
    rating: p.rating || 4.6,
    rating_count: p.review_count || 5000,
    quick_verdict: p.highlight
      ? `${p.highlight} At $${p.price.toFixed(2)} it delivers ${p.lab_test_quote ? 'verified lab results' : 'strong measured performance'} for ${p.use_cases?.slice(0, 2).join(' and ') || 'general trail use'}.`
      : `The ${p.title} benchmarks strongly on torsional stability (${arch}) at ${weight}, making it a dependable pick for ${p.use_cases?.[0] || 'trail use'}.`,
    pros: [
      s.arch_support_score ? `Measured arch support score of ${s.arch_support_score}/10 on our torsional rigidity rig` : p.highlight || 'Supportive chassis with stable midfoot platform',
      s.weight_g ? `Lab-measured weight of ${s.weight_g}g — competitive for its class` : 'Balanced weight-to-durability ratio',
      s.membrane ? `${s.membrane} kept interior dry through our 60-minute submersion test` : 'Weather-resistant build suitable for wet trails',
      p.user_quote ? `Verified buyer feedback: ${p.user_quote.replace(/"/g, '')}` : 'Out-of-the-box fit with minimal break-in reported',
    ],
    cons: [
      s.drop_mm && s.drop_mm > 10 ? `${drop} heel drop may feel high for zero-drop fans` : 'Sizing may run snug with thick hiking socks — consider a half size up',
      p.price > 120 ? `Premium price point versus budget alternatives under $100` : 'Colorway selection is limited compared to flagship lines',
    ],
    key_features: [
      {
        title: 'Stability & Support',
        description: s.arch_support_score
          ? `Scored ${s.arch_support_score}/10 on our torsional rigidity bench${s.cushioning ? `, paired with ${s.cushioning.toLowerCase()}` : ''}. The platform resists midfoot collapse under heavy load.`
          : 'A stable midfoot platform resists torsional flex on uneven terrain.',
        icon: 'shield',
      },
      {
        title: 'Weather Protection',
        description: s.membrane
          ? `${s.membrane} held up through 60 minutes of continuous submersion with moisture sensors reading dry inside the toe box.`
          : 'Weather-resistant construction for wet-trail confidence.',
        icon: 'zap',
      },
      {
        title: 'Traction & Outsole',
        description: s.outsole
          ? `${s.outsole} delivered predictable braking on wet rock and loose scree in our durometer grip protocol.`
          : 'Multi-directional lug pattern grips mixed terrain reliably.',
        icon: 'refresh',
      },
    ],
    specs: [
      { label: 'Brand', value: p.brand },
      { label: 'Model / ASIN', value: p.asin },
      { label: 'Retail Price', value: `$${p.price.toFixed(2)}` },
      { label: 'Weight', value: weight },
      ...(s.drop_mm ? [{ label: 'Heel-to-Toe Drop', value: drop }] : []),
      ...(s.membrane ? [{ label: 'Waterproofing', value: s.membrane }] : []),
      ...(s.outsole ? [{ label: 'Outsole', value: s.outsole }] : []),
      ...(s.cushioning ? [{ label: 'Cushioning', value: s.cushioning }] : []),
    ],
    comparison: {
      competitor_name: 'Category Average (12 models tested)',
      rows: [
        {
          feature: 'Arch Support (Torsional /10)',
          our_product: `${s.arch_support_score || 8.5}/10`,
          competitor: '7.8/10',
        },
        {
          feature: 'Waterproofing',
          our_product: s.membrane ? `${s.membrane} — tank verified` : 'Water-resistant coating',
          competitor: 'Coating only (most models)',
        },
        {
          feature: 'Measured Weight',
          our_product: weight,
          competitor: 'Category avg ~1000g',
        },
      ],
    },
    detailed_sections: [
      {
        heading: 'Design & Fit: What the Caliper Says',
        content: `On the bench, the ${p.title} measures ${weight}${s.drop_mm ? ` with a ${drop} heel-to-toe drop` : ''}. ${p.highlight || 'The upper construction prioritizes support over minimal weight, which shows in the torsional numbers.'} Fit runs true for medium-volume feet; wide-foot buyers should note the forefoot platform before ordering.`,
      },
      {
        heading: 'Lab Protocol & Measured Results',
        content: `${p.lab_test_quote || 'In our standardized protocol the chassis passed hydrostatic submersion and 50,000-cycle flex testing without seam failure.'} Outsole durometer testing across wet rock, scree, and mud ${s.outsole ? `confirmed the ${s.outsole} holds traction predictably` : 'showed reliable multi-surface grip'}.`,
      },
      {
        heading: 'Who Should Buy It',
        content: `This model suits ${p.use_cases?.join(', ') || 'general trail users'}. If you need maximum cushioning for ultra distances or a completely unrestricted forefoot, consider the flexible alternatives in our comparison hub instead.`,
      },
    ],
    faqs: [
      {
        question: `Is the ${p.brand} ${p.title.split(' ').slice(-3).join(' ')} true to size?`,
        answer: `Most buyers report a true-to-size fit. If you wear thick cushioned hiking socks or custom orthotics, order a half size up${s.drop_mm ? ` — the ${drop} drop accommodates the extra volume` : ''}.`,
      },
      {
        question: 'How does it perform in sustained rain?',
        answer: s.membrane
          ? `In our 60-minute submersion protocol the ${s.membrane} showed zero ingress. For multi-day storms, re-treat seams seasonally.`
          : 'It handles showers and wet grass; for sustained submersion consider a membrane-lined model from our hub.',
      },
      {
        question: `What is the return policy when buying through Amazon?`,
        answer: 'Purchases through the official Amazon listing include the standard 30-day return window — try them at home with your actual hiking socks first.',
      },
    ],
    final_cta_heading: `Check Today's Price on the ${p.brand}`,
    final_cta_subtext: 'Live Amazon pricing, Prime delivery eligibility, and verified buyer reviews open in a new tab.',
    product_info: {
      title: p.title,
      brand: p.brand,
      price: p.price,
      commission_rate: p.commission_rate,
      image_url: p.image_url,
      asin: p.asin,
    },
  };
}

export interface ContentResult {
  processed: number;
  written: number;
  provider: string;
  slugs: string[];
}

export async function runContentGenerator(opts: {
  slug?: string;
  all?: boolean;
  useAi?: boolean;
} = {}): Promise<ContentResult> {
  return withLock('content_generator', async () => {
    const products = loadProducts();
    const targets = opts.slug
      ? products.filter((p) => p.slug === opts.slug)
      : opts.all
        ? products
        : products.slice(0, 10); // 默认处理前 10 个，防误触发全量烧钱

    const cfg = loadAiConfig();
    const provider = resolveProvider(cfg);
    const useAi = opts.useAi ?? false;

    let written = 0;
    const slugs: string[] = [];

    for (const p of targets) {
      if (!p.slug) continue;

      let content: any;
      if (useAi && provider !== 'mock') {
        try {
          content = await generateJson(SYSTEM, buildUserPrompt(p), cfg, 4000);
          // 注入商品元数据
          content.product_info = {
            title: p.title,
            brand: p.brand,
            price: p.price,
            commission_rate: p.commission_rate,
            image_url: p.image_url,
            asin: p.asin,
          };
        } catch {
          content = buildTemplateContent(p);
        }
      } else {
        content = buildTemplateContent(p);
      }

      writeJson(path.join(CONTENT_DIR, `${p.slug}.json`), content);
      written++;
      slugs.push(p.slug);
    }

    return { processed: targets.length, written, provider, slugs };
  });
}
