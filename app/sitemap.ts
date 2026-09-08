import { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';
import { getSiteUrl } from '@/lib/siteConfig';

interface MatrixData {
  categories: string[];
  use_cases: string[];
  price_bands: Array<{ label: string; min: number; max: number }>;
  excluded_combinations: Array<{ category: string; use_case: string }>;
}

/**
 * 读取 pSEO 页面快照的 generated_at 作为真实 lastModified。
 * 写死 new Date()（构建当天）会让搜索引擎每次构建都认为全站更新，
 * 属于噪音信号；快照无时间戳时回退到文件 mtime，再兜底当天。
 */
function getPageLastModified(slug: string): Date {
  const pageJsonPath = path.join(process.cwd(), 'content', 'pages', `${slug}.json`);
  try {
    if (fs.existsSync(pageJsonPath)) {
      const data = JSON.parse(fs.readFileSync(pageJsonPath, 'utf-8'));
      if (typeof data.generated_at === 'string') {
        const d = new Date(`${data.generated_at}T00:00:00Z`);
        if (!isNaN(d.getTime())) return d;
      }
      const stat = fs.statSync(pageJsonPath);
      if (stat.mtime) return stat.mtime;
    }
  } catch {}
  return new Date();
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const routes: MetadataRoute.Sitemap = [];

  // 1. 首页
  routes.push({
    url: `${baseUrl}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1.0,
  });

  // 2. Hub 聚合页 (从 data/matrix.json 读取品类)
  const matrixPath = path.join(process.cwd(), 'data', 'matrix.json');
  const productsPath = path.join(process.cwd(), 'data', 'products.json');
  let matrix: MatrixData | null = null;
  if (fs.existsSync(matrixPath)) {
    try {
      matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf-8'));
    } catch {}
  }

  if (matrix) {
    for (const cat of matrix.categories || []) {
      routes.push({
        url: `${baseUrl}/hub/${cat.toLowerCase().replace(/\s+/g, '-')}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.9,
      });
    }
  }

  // 3. pSEO 页面：快照 + 矩阵动态组合（与 generateStaticParams 保持一致，确保全部可被发现）
  const validSlugs = new Set<string>();

  const pagesDir = path.join(process.cwd(), 'content', 'pages');
  if (fs.existsSync(pagesDir)) {
    for (const file of fs.readdirSync(pagesDir).filter((f) => f.endsWith('.json'))) {
      validSlugs.add(file.replace(/\.json$/, ''));
    }
  }

  if (matrix && fs.existsSync(productsPath)) {
    try {
      const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
      const excluded = new Set(
        (matrix.excluded_combinations || []).map((e) => `${e.category.toLowerCase()}|${e.use_case.toLowerCase()}`)
      );

      for (const cat of matrix.categories || []) {
        const catSlug = cat.toLowerCase().replace(/\s+/g, '-');
        for (const uc of matrix.use_cases || []) {
          if (excluded.has(`${cat.toLowerCase()}|${uc.toLowerCase()}`)) continue;
          const ucSlug = uc.toLowerCase().replace(/\s+/g, '-');
          for (const band of matrix.price_bands || []) {
            const bandSlug = band.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const matched = products.filter(
              (p: any) =>
                p.category?.toLowerCase() === cat.toLowerCase() &&
                p.use_cases?.some((u: string) => u.toLowerCase() === uc.toLowerCase()) &&
                p.price >= band.min &&
                p.price <= band.max
            );
            if (matched.length >= 3) {
              validSlugs.add(`best-${catSlug}-for-${ucSlug}-${bandSlug}`);
            }
          }
        }
      }
    } catch {}
  }

  for (const slug of validSlugs) {
    routes.push({
      url: `${baseUrl}/best/${slug}`,
      lastModified: getPageLastModified(slug),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  // 4. 单品深度评测页 (从 data/products.json 读取)
  if (fs.existsSync(productsPath)) {
    try {
      const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
      for (const p of products) {
        if (p.slug) {
          routes.push({
            url: `${baseUrl}/review/${p.slug}`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.7,
          });
        }
      }
    } catch {}
  }

  return routes;
}
