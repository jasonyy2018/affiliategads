import React from 'react';
import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Layers,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle,
  Award
} from 'lucide-react';

import DisclaimerFooter from '@/components/DisclaimerFooter';
import { getSiteUrl } from '@/lib/siteConfig';

interface MatrixData {
  categories: string[];
  use_cases: string[];
  price_bands: Array<{ label: string; min: number; max: number }>;
  excluded_combinations: Array<{ category: string; use_case: string }>;
}

interface PageMeta {
  slug: string;
  productCount: number;
}

/** 读取 content/pages/ 快照清单：Hub 只内链真实存在的页面（消灭死链/软 404） */
function loadExistingPages(): Map<string, PageMeta> {
  const pagesDir = path.join(process.cwd(), 'content', 'pages');
  const map = new Map<string, PageMeta>();
  try {
    if (fs.existsSync(pagesDir)) {
      for (const file of fs.readdirSync(pagesDir).filter((f) => f.endsWith('.json'))) {
        const slug = file.replace(/\.json$/, '');
        try {
          const data = JSON.parse(fs.readFileSync(path.join(pagesDir, file), 'utf-8'));
          map.set(slug, { slug, productCount: data.product_count || data.products?.length || 0 });
        } catch {
          map.set(slug, { slug, productCount: 0 });
        }
      }
    }
  } catch {}
  return map;
}

/** 判断某品类是否在库（products.json 中有该品类商品） */
function categoryHasProducts(categorySlug: string): boolean {
  try {
    const productsPath = path.join(process.cwd(), 'data', 'products.json');
    if (!fs.existsSync(productsPath)) return false;
    const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
    return products.some(
      (p: any) => p.category && p.category.toLowerCase().replace(/\s+/g, '-') === categorySlug
    );
  } catch {
    return false;
  }
}

function loadMatrix(): MatrixData | null {
  const matrixPath = path.join(process.cwd(), 'data', 'matrix.json');
  if (!fs.existsSync(matrixPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
  } catch {
    return null;
  }
}

type Props = {
  params: Promise<{ category: string }>;
};

// Next.js 16: 未预生成的品类直接 404
export const dynamicParams = false;

// Next.js 16 静态全量预渲染 (SSG)
export async function generateStaticParams() {
  const matrixPath = path.join(process.cwd(), 'data', 'matrix.json');
  const slugs: string[] = [];

  if (fs.existsSync(matrixPath)) {
    try {
      const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
      for (const cat of matrix.categories || []) {
        const slug = cat.toLowerCase().replace(/\s+/g, '-');
        if (categoryHasProducts(slug)) slugs.push(slug);
      }
    } catch {}
  }
  return slugs.map((category) => ({ category }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cleanCategory = category.replace(/-/g, ' ');
  const title = `${cleanCategory.charAt(0).toUpperCase() + cleanCategory.slice(1)} Hub: Complete 2026 Comparison Directory`;
  const description = `Browse all tested & ranked comparisons for ${cleanCategory}. Filter by use case, foot type, and price band with lab-benchmarked ratings.`;
  const siteUrl = getSiteUrl();

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/hub/${category}`,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/hub/${category}`,
      siteName: 'PrimeReviewLab',
      type: 'website',
    },
  };
}

export default async function HubCategoryPage({ params }: Props) {
  const { category } = await params;
  const matrix = loadMatrix();

  if (!matrix) notFound();

  // 品类不在库（无商品）→ 404
  if (!categoryHasProducts(category)) notFound();

  const existingPages = loadExistingPages();
  const formattedCat = category.replace(/-/g, ' ');
  const categoryTitle = formattedCat.charAt(0).toUpperCase() + formattedCat.slice(1);

  // 场景矩阵：只保留真实存在的页面
  const excluded = new Set(
    (matrix.excluded_combinations || []).map(
      (e) => `${e.category.toLowerCase()}|${e.use_case.toLowerCase()}`
    )
  );
  const useCaseLinks = matrix.use_cases
    .map((uc) => {
      const slug = `best-${category}-for-${uc.toLowerCase().replace(/\s+/g, '-')}-under-150`;
      return { uc, slug, meta: existingPages.get(slug) };
    })
    .filter((l) => l.meta !== undefined && !excluded.has(`${formattedCat}|${l.uc}`));

  // 价格带维度：结构为 best-<cat>-for-<任一适用场景>-<band>，找任一已存在组合
  const bandLinks = matrix.price_bands
    .map((band) => {
      const bandSlug = band.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      // 找到该品类+价格带下任一已生成的页面
      for (const [slug, meta] of existingPages) {
        if (slug.startsWith(`best-${category}-for-`) && slug.endsWith(`-${bandSlug}`)) {
          const ucMatch = slug.match(new RegExp(`^best-${category}-for-(.+)-${bandSlug}$`));
          return {
            band,
            slug,
            useCaseLabel: ucMatch ? ucMatch[1].replace(/-/g, ' ') : 'beginners',
            meta,
          };
        }
      }
      return null;
    })
    .filter(Boolean) as Array<{ band: MatrixData['price_bands'][0]; slug: string; useCaseLabel: string; meta: PageMeta }>;

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col justify-between">
      {/* 顶部导航 */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-40 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-extrabold text-xl tracking-tight text-gray-950 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black">★</span>
              <span>Prime<span className="text-amber-600">Review</span>Lab</span>
            </Link>
            <span className="text-gray-300 font-light">/</span>
            <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md">
              {categoryTitle} Hub
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Category Pillar</span>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 space-y-10">
        
        {/* Hub 头部介绍 */}
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold rounded-full">
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <span>Hub-and-Spoke Pillar Directory</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-950 tracking-tight">
            {categoryTitle} Buyer Guides &amp; Comparison Directory (2026)
          </h1>

          <p className="text-base text-gray-600 leading-relaxed">
            Welcome to the comprehensive testing laboratory for <strong>{categoryTitle}</strong>. We break down the market by foot anatomy, trail conditions, and budget bands so you find the exact fit without guesswork.
          </p>
        </div>

        {/* 场景矩阵导航 (Use Case Matrix) — 仅内链真实存在的页面 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-xl font-bold text-gray-950 flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-600" />
              <span>Browse by Specific Need / Use Case</span>
            </h2>
            <span className="text-xs text-gray-500">{useCaseLinks.length} Live Guides</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {useCaseLinks.map(({ uc, slug, meta }) => (
              <Link
                key={slug}
                href={`/best/${slug}`}
                className="p-5 border border-gray-200 hover:border-amber-400 bg-white hover:bg-amber-50/20 rounded-2xl shadow-xs transition group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">
                    <span>Tested Category</span>
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-base group-hover:text-amber-600 transition">
                    Best for {uc.charAt(0).toUpperCase() + uc.slice(1)}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    Lab tested benchmarks for {uc} — {meta?.productCount || 'multiple'} models ranked side by side.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-amber-600">
                  <span>View Ranked Models</span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 价格带维度导航 (Price Band Matrix) — 仅内链真实存在的页面 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-xl font-bold text-gray-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Browse by Budget Range</span>
            </h2>
            <span className="text-xs text-gray-500">{bandLinks.length} Live Guides</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {bandLinks.map(({ band, slug, useCaseLabel }) => (
              <Link
                key={slug}
                href={`/best/${slug}`}
                className="p-4 border border-gray-200 hover:border-emerald-400 bg-white rounded-xl text-center shadow-xs transition group"
              >
                <div className="text-sm font-bold text-gray-950 group-hover:text-emerald-600">
                  {band.label.charAt(0).toUpperCase() + band.label.slice(1)}
                </div>
                <span className="text-xs text-gray-500 mt-1 block">
                  Best for {useCaseLabel}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>

      {/* 底部合规声明 */}
      <DisclaimerFooter />
    </div>
  );
}
