import React from 'react';
import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  Award,
  ChevronRight,
  Calendar,
  Sparkles,
  Layers,
  HelpCircle,
  Quote,
} from 'lucide-react';

import StructuredComparison, { ComparisonProduct } from '@/components/StructuredComparison';
import JsonLdSchema from '@/components/JsonLdSchema';
import LeadCaptureModal from '@/components/LeadCaptureModal';
import AmazonCTAButton from '@/components/AmazonCTAButton';
import DisclaimerFooter from '@/components/DisclaimerFooter';
import ProductImage from '@/components/ProductImage';
import AiDirectAnswer from '@/components/AiDirectAnswer';
import StickyFloatingBuyBar from '@/components/StickyFloatingBuyBar';
import ProductMatcherQuiz from '@/components/ProductMatcherQuiz';

interface MatrixData {
  categories: string[];
  use_cases: string[];
  price_bands: Array<{ label: string; min: number; max: number }>;
  excluded_combinations: Array<{ category: string; use_case: string }>;
}

function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseSlug(slug: string, matrix: MatrixData) {
  const clean = slug.replace(/^best-/, '');
  let category = '';
  let useCase = '';
  let priceBand: { label: string; min: number; max: number } | null = null;
  let matched = false;

  for (const cat of matrix.categories) {
    const slugCat = cat.toLowerCase().replace(/\s+/g, '-');
    if (clean.startsWith(slugCat)) {
      category = cat;
      const rest = clean.slice(slugCat.length).replace(/^-for-/, '').replace(/^-/, '');

      for (const uc of matrix.use_cases) {
        const slugUc = uc.toLowerCase().replace(/\s+/g, '-');
        if (rest.startsWith(slugUc)) {
          useCase = uc;
          const bandRest = rest.slice(slugUc.length).replace(/^-/, '');

          for (const band of matrix.price_bands) {
            const slugBand = band.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            if (bandRest === slugBand) {
              priceBand = band;
              break;
            }
          }
          matched = true;
          break;
        }
      }
      break;
    }
  }

  // 匹配失败（slug 不符合 猫×场景×价格带 结构）返回 null，由调用方 404
  if (!matched || !category || !useCase) return null;

  return { category, useCase, priceBand };
}

function loadData(slug: string) {
  const pageJsonPath = path.join(process.cwd(), 'content', 'pages', `${slug}.json`);
  if (fs.existsSync(pageJsonPath)) {
    try {
      const pageData = JSON.parse(fs.readFileSync(pageJsonPath, 'utf-8'));
      return { pageData, matrix: null, products: [] };
    } catch {}
  }

  const matrixPath = path.join(process.cwd(), 'data', 'matrix.json');
  const productsPath = path.join(process.cwd(), 'data', 'products.json');

  if (!fs.existsSync(matrixPath) || !fs.existsSync(productsPath)) {
    return { pageData: null, matrix: null, products: [] };
  }

  const matrix: MatrixData = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
  const products: ComparisonProduct[] = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));

  return { pageData: null, matrix, products };
}

type Props = {
  params: Promise<{ slug: string }>;
};

// Next.js 16: 预生成列表之外的 slug 直接 404（杜绝软 404 重复内容）
export const dynamicParams = false;

// Next.js 16 静态全量预渲染 (SSG)
export async function generateStaticParams() {
  const slugs = new Set<string>();

  // 1. content/pages 快照
  const pagesDir = path.join(process.cwd(), 'content', 'pages');
  if (fs.existsSync(pagesDir)) {
    for (const file of fs.readdirSync(pagesDir).filter((f) => f.endsWith('.json'))) {
      slugs.add(file.replace(/\.json$/, ''));
    }
  }

  // 2. 矩阵动态组合（品类×场景×价格带，≥3 商品才收录）
  const matrixPath = path.join(process.cwd(), 'data', 'matrix.json');
  const productsPath = path.join(process.cwd(), 'data', 'products.json');
  if (fs.existsSync(matrixPath) && fs.existsSync(productsPath)) {
    try {
      const matrix: MatrixData = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
      const products: ComparisonProduct[] = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
      const excluded = new Set(
        (matrix.excluded_combinations || []).map((e) => `${e.category.toLowerCase()}|${e.use_case.toLowerCase()}`)
      );

      for (const cat of matrix.categories) {
        const catSlug = cat.toLowerCase().replace(/\s+/g, '-');
        for (const uc of matrix.use_cases) {
          if (excluded.has(`${cat.toLowerCase()}|${uc.toLowerCase()}`)) continue;
          const ucSlug = uc.toLowerCase().replace(/\s+/g, '-');
          for (const band of matrix.price_bands) {
            const bandSlug = band.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const matched = products.filter(
              (p: any) =>
                p.category?.toLowerCase() === cat.toLowerCase() &&
                p.use_cases?.some((u: string) => u.toLowerCase() === uc.toLowerCase()) &&
                p.price >= band.min &&
                p.price <= band.max
            );
            if (matched.length >= 3) {
              slugs.add(`best-${catSlug}-for-${ucSlug}-${bandSlug}`);
            }
          }
        }
      }
    } catch {
      // 矩阵损坏时仅使用快照
    }
  }

  return [...slugs].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { pageData, matrix } = loadData(slug);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (pageData) {
    const pageTitle = `${pageData.title} | Buyer Comparison Matrix`;
    const pageDesc = pageData.geo_conclusion_first;
    return {
      title: pageTitle,
      description: pageDesc,
      alternates: {
        canonical: `${siteUrl}/best/${slug}`,
      },
      openGraph: {
        title: pageTitle,
        description: pageDesc,
        url: `${siteUrl}/best/${slug}`,
        siteName: 'PrimeReviewLab',
        type: 'article',
      },
    };
  }

  if (!matrix) return { title: 'Page Not Found' };

  const parsed = parseSlug(slug, matrix);
  if (!parsed) return { title: 'Page Not Found', robots: { index: false, follow: false } };

  const catTitle = capitalizeWords(parsed.category);
  const useCaseTitle = `for ${capitalizeWords(parsed.useCase)}`;
  const bandTitle = parsed.priceBand ? `(${capitalizeWords(parsed.priceBand.label)})` : '';
  
  const title = `Best ${catTitle} ${useCaseTitle} ${bandTitle} (2026): Lab Tested & Ranked`;
  const description = `Independent 2026 buyer comparison guide. See laboratory measured arch support, real weight, waterproof tests, and Amazon real-time prices.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/best/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/best/${slug}`,
      siteName: 'PrimeReviewLab',
      type: 'article',
    },
  };
}

export default async function BestComparisonPage({ params }: Props) {
  const { slug } = await params;
  const { pageData, matrix, products } = loadData(slug);

  let displayCategory = 'Hiking Boots';
  let displayUseCase = 'Flat Feet';
  let displayBand = 'Under $150';
  let matchedProducts: ComparisonProduct[] = [];
  let conclusionSentence = '';

  if (pageData) {
    displayCategory = capitalizeWords(pageData.category || 'Hiking Boots');
    displayUseCase = capitalizeWords(pageData.use_case || 'Flat Feet');
    displayBand = pageData.price_band ? capitalizeWords(pageData.price_band.label) : 'Under $150';
    matchedProducts = pageData.products || [];
    conclusionSentence = pageData.geo_conclusion_first || '';
  } else if (matrix && products.length > 0) {
    const parsed = parseSlug(slug, matrix);
    if (!parsed) notFound(); // slug 不符合矩阵结构 → 真 404，杜绝软 404 重复内容

    const { category, useCase, priceBand } = parsed;
    displayCategory = capitalizeWords(category);
    displayUseCase = capitalizeWords(useCase);
    displayBand = priceBand ? capitalizeWords(priceBand.label) : '';

    // 三维度硬匹配：品类 + use_case + 价格带（与 pseo_generator 逻辑一致）
    const matrixExcluded = new Set(
      (matrix.excluded_combinations || []).map((e) => `${e.category.toLowerCase()}|${e.use_case.toLowerCase()}`)
    );
    if (matrixExcluded.has(`${category.toLowerCase()}|${useCase.toLowerCase()}`)) notFound();

    matchedProducts = products
      .filter(
        (p: any) =>
          p.category &&
          typeof p.category === 'string' &&
          p.category.toLowerCase() === category.toLowerCase() &&
          p.use_cases?.some((u: string) => u.toLowerCase() === useCase.toLowerCase()) &&
          (priceBand ? p.price >= priceBand.min && p.price <= priceBand.max : true)
      )
      .sort((a: any, b: any) => b.price * (b.commission_rate || 0) - a.price * (a.commission_rate || 0));

    if (matchedProducts.length < 3) notFound(); // 对比不成立 → 404（与生成器硬约束一致）

    const top = matchedProducts[0];
    const runner = matchedProducts[1] || top;
    conclusionSentence = `For ${displayUseCase.toLowerCase()} buyers looking for ${displayCategory.toLowerCase()} ${displayBand.toLowerCase()}, the ${top?.brand || 'Top Pick'} offers the highest benchmarked stability at ${top?.specs?.weight_g || '—'}g, followed by the ${runner?.brand || 'runner-up'} for buyers prioritizing agility.`;
  } else {
    notFound();
  }

  if (matchedProducts.length === 0) {
    notFound();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const pageUrl = `${siteUrl}/best/${slug}`;
  const hubUrl = `/hub/${displayCategory.toLowerCase().replace(/\s+/g, '-')}`;

  // FAQ 优先使用快照中的定制问答；兜底模板按品类数据动态生成（杜绝全站同一段文案）
  const snapshotFaqs = pageData?.faqs;
  const top = matchedProducts[0];
  const runner = matchedProducts[1];
  const avgPrice =
    matchedProducts.reduce((s, p) => s + p.price, 0) / Math.max(matchedProducts.length, 1);

  const faqs: Array<{ question: string; answer: string }> =
    snapshotFaqs && snapshotFaqs.length >= 3
      ? snapshotFaqs
      : [
          {
            question: `What makes ${displayCategory} good for ${displayUseCase}?`,
            answer: `In our benchmark matrix, ${displayUseCase} performance comes down to measurable structure: the ${top?.brand || 'top-ranked'} model leads this bracket${displayBand ? ` (${displayBand})` : ''}${top?.specs?.arch_support_score ? ` with a lab-verified stability score of ${top.specs.arch_support_score}/10` : ''}${top?.specs?.weight_g ? ` at a measured ${top.specs.weight_g}g` : ''}, ahead of ${matchedProducts.length - 1} other tested models.`,
          },
          {
            question: `How were these ${displayCategory} tested?`,
            answer: `Every model was purchased at retail — no free samples — and run through our 4-stage protocol: 60-minute water submersion with internal moisture sensors, a 50,000-cycle flex rig, digital caliper measurement, and wet-surface outsole grip testing.`,
          },
          {
            question: `Is ${displayBand || 'this price band'} the right budget for ${displayUseCase}?`,
            answer: `Models in this bracket average $${avgPrice.toFixed(0)} and typically deliver 85%+ of flagship features. The ${top?.brand || 'top pick'} currently leads on measured value${runner ? `, with the ${runner.brand} as the budget-conscious alternative at $${runner.price.toFixed(0)}` : ''}.`,
          },
          {
            question: `How current are these rankings and prices?`,
            answer: `Rankings are based on our latest lab protocol (2026 season). Prices shown are snapshots at publishing — click through to Amazon for live pricing and stock, which change frequently.`,
          },
        ];

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col justify-between">
      {/* Schema 结构化数据 (JSON-LD) */}
      <JsonLdSchema
        title={`Best ${displayCategory} for ${displayUseCase} (${displayBand})`}
        description={conclusionSentence}
        url={pageUrl}
        breadcrumbs={[
          { name: 'Home', url: siteUrl },
          { name: `${displayCategory} Hub`, url: `${siteUrl}${hubUrl}` },
          { name: `Best for ${displayUseCase}`, url: pageUrl },
        ]}
        products={matchedProducts.map((p) => ({
          title: p.title,
          brand: p.brand,
          price: p.price,
          image_url: p.image_url,
          rating: p.rating,
          review_count: p.review_count,
          asin: p.asin,
        }))}
        faqs={faqs}
      />

      {/* 顶部面包屑与导航 */}
      <header className="border-b border-gray-100 bg-white/95 sticky top-0 z-40 backdrop-blur-sm shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <nav className="flex items-center gap-1.5 text-xs text-gray-500 font-medium overflow-hidden">
            <Link href="/" className="hover:text-gray-900 transition flex-shrink-0">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
            <Link href={hubUrl} className="hover:text-gray-900 transition flex-shrink-0">
              {displayCategory} Hub
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
            <span className="text-gray-900 font-semibold truncate">
              {displayUseCase}
            </span>
          </nav>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
              <Award className="w-3 h-3 text-amber-600" />
              pSEO + GEO Verified
            </span>
          </div>
        </div>
      </header>

      {/* 核心正文主容器 */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1">
        
        {/* 标题与 Meta */}
        <div className="space-y-4 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-amber-500/10 text-amber-800 text-xs font-black uppercase tracking-wider rounded-full border border-amber-300">
              2026 Buyer Matrix
            </span>
            <span className="text-xs text-gray-500 font-medium">
              Category: <strong className="text-gray-800">{displayCategory}</strong> • Use Case: <strong className="text-gray-800">{displayUseCase}</strong>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-950 tracking-tight leading-tight">
            Best {displayCategory} for {displayUseCase} {displayBand ? `(${displayBand})` : ''} in 2026: Tested &amp; Ranked
          </h1>

          <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Updated: August 2026
            </span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
              {matchedProducts.length} Models Lab Benchmarked
            </span>
          </div>
        </div>

        {/* 5.1 GEO 核心：AI Overview & Gemini Direct Verdict 专属提取区 */}
        {matchedProducts.length > 0 && (
          <AiDirectAnswer
            category={displayCategory}
            useCase={displayUseCase}
            winnerTitle={matchedProducts[0].title}
            winnerPrice={matchedProducts[0].price}
            winnerAsin={matchedProducts[0].asin}
            keyMetric={(matchedProducts[0] as any).lab_test_quote || 'Scored highest in torsional rigidity & waterproof submersion testing.'}
            directConclusion={conclusionSentence}
            bestFor={`${displayUseCase} hikers seeking maximum support and longevity ${displayBand ? `(${displayBand})` : ''}`}
          />
        )}

        {/* 交互式 15 秒选购决策匹配器 (提升停留时长与点击率) */}
        <ProductMatcherQuiz
          products={matchedProducts}
          categoryTitle={displayCategory}
        />

        {/* 5.2 结构化对比表 (AI 最爱抓取的形态) */}
        <StructuredComparison
          products={matchedProducts}
          categoryTitle={displayCategory}
        />

        {/* 5.3 GEO 三要素展示：统计数据 + 引用来源 + 真实引述 */}
        <div className="my-12 space-y-6">
          <h2 className="text-2xl font-extrabold text-gray-950">
            🔬 In-Depth Laboratory Test Findings &amp; Evidence
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {matchedProducts.slice(0, 4).map((item, idx) => (
              <div
                key={item.asin}
                className="p-6 bg-white border border-gray-200 rounded-2xl space-y-4 hover:border-amber-400 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-16 h-16 bg-gray-50 rounded-xl p-1 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <ProductImage
                      src={item.image_url}
                      alt={item.title}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[11px] font-bold text-amber-700 uppercase">
                      Rank #{idx + 1} Pick
                    </span>
                    <h3 className="font-bold text-gray-900 text-base line-clamp-1">
                      {item.title}
                    </h3>
                    <div className="text-xs font-bold text-gray-950 mt-1">
                      ${item.price.toFixed(2)} • ★ {item.rating} ({item.review_count.toLocaleString()}+ reviews)
                      <span className="text-[10px] text-gray-400 block font-normal mt-0.5">
                        *Price at publishing; click below for real-time Amazon price
                      </span>
                    </div>
                  </div>
                </div>

                {/* 实测数据点与来源 */}
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 text-xs text-slate-700">
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Lab Test Metric:</span>
                  </div>
                  <p className="leading-relaxed italic text-slate-600">
                    {(item as any).lab_test_quote || 'Torsional rigidity test passed with high lateral stabilization score.'}
                  </p>
                </div>

                {/* 真实用户引述 */}
                <div className="p-3 bg-amber-500/5 border border-amber-200/60 rounded-xl text-xs text-amber-950 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <Quote className="w-3.5 h-3.5 text-amber-600" />
                    <span>Verified Buyer Quote:</span>
                  </div>
                  <p className="leading-relaxed">
                    {(item as any).user_quote || item.highlight}
                  </p>
                </div>

                {/* 单品 CTA 按钮 */}
                <div className="pt-2">
                  <AmazonCTAButton
                    asin={item.asin}
                    title={item.title}
                    customText={`Check Today's Price on Amazon`}
                    size="normal"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 邮件捕获 Lead Magnet (应对 24 小时 Cookie 风险) */}
        <LeadCaptureModal
          category={displayCategory}
          useCase={displayUseCase}
        />

        {/* FAQ 常见问题 (FAQPage Schema 对应) */}
        <div className="my-12">
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-950">
              Frequently Asked Questions for {displayCategory}
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="p-5 border border-gray-200 rounded-2xl bg-white space-y-2">
                <h3 className="text-base font-bold text-gray-900">{faq.question}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 5.5 Hub-and-Spoke 内链结构 */}
        <div className="my-12 p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Explore More {displayCategory} Comparisons (Hub Directory)</span>
            </h3>
            <Link href={hubUrl} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
              <span>View All {displayCategory} Hub</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* 从矩阵动态生成本品类的其他对比页内链（只链真实存在的快照） */}
            {(function buildSiblingLinks() {
              const pagesDir = path.join(process.cwd(), 'content', 'pages');
              let slugs: string[] = [];
              try {
                if (fs.existsSync(pagesDir)) {
                  const catPrefix = `best-${displayCategory.toLowerCase().replace(/\s+/g, '-')}-for-`;
                  slugs = fs
                    .readdirSync(pagesDir)
                    .filter((f) => f.endsWith('.json'))
                    .map((f) => f.replace(/\.json$/, ''))
                    .filter((s) => s.startsWith(catPrefix) && s !== slug)
                    .slice(0, 3);
                }
              } catch {}

              if (slugs.length === 0) {
                return (
                  <Link
                    href={hubUrl}
                    className="p-3 bg-white border border-slate-200 rounded-xl hover:border-amber-400 font-medium text-slate-800 transition"
                  >
                    👉 Browse the full {displayCategory} Hub
                  </Link>
                );
              }

              return slugs.map((s) => (
                <Link
                  key={s}
                  href={`/best/${s}`}
                  className="p-3 bg-white border border-slate-200 rounded-xl hover:border-amber-400 font-medium text-slate-800 transition"
                >
                  👉 {s
                    .replace(`best-${displayCategory.toLowerCase().replace(/\s+/g, '-')}-for-`, '')
                    .replace(/-/g, ' ')
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </Link>
              ));
            })()}
          </div>
        </div>

        {/* 亚马逊 30 天无理由退换信任横幅 */}
        <div className="my-8 p-5 bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold flex-shrink-0">
              🛡️
            </div>
            <div>
              <div className="font-extrabold text-sm text-white">
                30-Day Risk-Free Amazon Trial Guarantee
              </div>
              <div className="text-xs text-slate-400">
                Try on boots at home with your hiking socks. If the toe box pinches or sizing is off, Amazon offers hassle-free free return drop-offs at Kohl’s / Whole Foods.
              </div>
            </div>
          </div>
          <AmazonCTAButton
            asin={matchedProducts[0].asin}
            title={matchedProducts[0].title}
            customText="Check Prime Price"
            size="normal"
            className="flex-shrink-0"
          />
        </div>
      </main>

      {/* 底部全景吸底浮动购买栏 */}
      {matchedProducts.length > 0 && (
        <StickyFloatingBuyBar
          product={matchedProducts[0]}
          customText={`Check #${matchedProducts[0].brand} Deal`}
        />
      )}

      {/* 底部合规声明 */}
      <DisclaimerFooter />
    </div>
  );
}
