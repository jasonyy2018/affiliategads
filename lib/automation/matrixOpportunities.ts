/**
 * pSEO 矩阵机会分析：扫描商品库，找出「商品密度足够但尚未生成页面」的组合，
 * 以及「已生成但商品不足被生成器跳过」的缺口。数据驱动的扩产决策依据。
 *
 * 输出 reports/matrix_opportunities.md：
 *   - READY 组合（≥3 商品匹配，还没生成页面）→ 直接运行 pseo_generate 即可扩产
 *   - GAP 组合（只有 1-2 个商品匹配）→ 补充选品后再扩产
 *   - 覆盖率统计（每品类/场景的页面密度）
 */
import fs from 'fs';
import path from 'path';
import {
  loadProducts,
  loadMatrix,
  PAGES_DIR,
  REPORTS_DIR,
  withLock,
} from './dataLayer';

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export interface Opportunity {
  slug: string;
  category: string;
  use_case: string;
  band: string;
  matchedProducts: number;
  matchedAsins: string[];
  status: 'READY' | 'GAP';
}

export interface MatrixOpportunityResult {
  readyCount: number;
  gapCount: number;
  existingCount: number;
  ready: Opportunity[];
  gaps: Opportunity[];
  summary: string;
}

export async function runMatrixOpportunities(): Promise<MatrixOpportunityResult> {
  return withLock('matrix_opportunities', async () => {
    const matrix = loadMatrix();
    const products = loadProducts();

    // 已生成的页面
    const existing = new Set<string>();
    if (fs.existsSync(PAGES_DIR)) {
      for (const f of fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.json'))) {
        existing.add(f.replace(/\.json$/, ''));
      }
    }

    const excluded = new Set(
      matrix.excluded_combinations.map((e) => `${e.category.toLowerCase()}|${e.use_case.toLowerCase()}`)
    );

    const ready: Opportunity[] = [];
    const gaps: Opportunity[] = [];

    for (const category of matrix.categories) {
      for (const useCase of matrix.use_cases) {
        if (excluded.has(`${category.toLowerCase()}|${useCase.toLowerCase()}`)) continue;

        for (const band of matrix.price_bands) {
          const slug = `best-${slugify(category)}-for-${slugify(useCase)}-${slugify(band.label)}`;
          if (existing.has(slug)) continue;

          const matched = products.filter(
            (p) =>
              p.category?.toLowerCase() === category.toLowerCase() &&
              p.use_cases?.some((u) => u.toLowerCase() === useCase.toLowerCase()) &&
              p.price >= band.min &&
              p.price <= band.max
          );

          const opp: Opportunity = {
            slug,
            category,
            use_case: useCase,
            band: band.label,
            matchedProducts: matched.length,
            matchedAsins: matched.map((p) => p.asin),
            status: matched.length >= 3 ? 'READY' : 'GAP',
          };

          if (opp.status === 'READY') ready.push(opp);
          else if (matched.length > 0) gaps.push(opp);
        }
      }
    }

    // 按 READY 商品数降序（商品最多的组合转化潜力最大）
    ready.sort((a, b) => b.matchedProducts - a.matchedProducts);
    gaps.sort((a, b) => b.matchedProducts - a.matchedProducts);

    // 品类覆盖统计
    const catStats = new Map<string, { pages: number; products: number }>();
    for (const p of products) {
      const key = p.category || 'other';
      const stat = catStats.get(key) || { pages: 0, products: 0 };
      stat.products++;
      catStats.set(key, stat);
    }
    for (const slug of existing) {
      for (const [key] of catStats) {
        if (slug.startsWith(`best-${slugify(key)}-`)) {
          catStats.get(key)!.pages++;
        }
      }
    }

    // 生成报告
    const lines: string[] = [
      '# 🧩 pSEO 矩阵扩产机会分析',
      '',
      `> 生成时间: ${new Date().toISOString()}`,
      '',
      '## 总览',
      '',
      '| 指标 | 数值 |',
      '|---|---|',
      `| 已上线页面 | ${existing.size} |`,
      `| READY 组合 (≥3 商品，可直接生成) | **${ready.length}** |`,
      `| GAP 组合 (缺商品，需补选品) | ${gaps.length} |`,
      `| 商品库 | ${products.length} SKU |`,
      '',
      '## 品类覆盖密度',
      '',
      '| 品类 | 商品数 | 已生成页面 | 页面/商品比 |',
      '|---|---|---|---|',
    ];

    for (const [cat, stat] of catStats) {
      const ratio = stat.products > 0 ? (stat.pages / stat.products).toFixed(2) : '—';
      lines.push(`| ${cat} | ${stat.products} | ${stat.pages} | ${ratio} |`);
    }

    lines.push('', `## READY — 立即可扩产的 ${ready.length} 个组合（按商品密度排序）`, '');
    lines.push('| 组合 | 商品数 | 商品 ASIN |');
    lines.push('|---|---|---|');
    for (const r of ready.slice(0, 30)) {
      lines.push(`| ${r.slug} | ${r.matchedProducts} | ${r.matchedAsins.join(', ')} |`);
    }
    if (ready.length > 30) lines.push(`| ... 共 ${ready.length} 个 | | |`);

    lines.push('', `## GAP — 补齐选品即可解锁的 ${gaps.length} 个组合`, '');
    lines.push('| 组合 | 现有商品 | 还缺 |');
    lines.push('|---|---|---|');
    for (const g of gaps.slice(0, 20)) {
      lines.push(`| ${g.slug} | ${g.matchedProducts} | ${3 - g.matchedProducts} 个 |`);
    }

    // 解锁杠杆：按 (品类, 场景) 聚合 near-miss 组合数 → 补 1 个商品解锁多页的选品指南
    const nearMissByCombo = new Map<string, number>();
    for (const g of gaps) {
      if (g.matchedProducts === 2) {
        const key = `${g.category}|${g.use_case}`;
        nearMissByCombo.set(key, (nearMissByCombo.get(key) || 0) + 1);
      }
    }
    const sortedLeverage = [...nearMissByCombo.entries()].sort((a, b) => b[1] - a[1]);

    lines.push('', '## 🔑 选品杠杆 — 每补 1 个商品解锁的页面数（按杠杆排序）', '');
    lines.push('| 品类 | 场景 | 补 1 个商品解锁页面 |');
    lines.push('|---|---|---|');
    for (const [key, count] of sortedLeverage) {
      const [cat, uc] = key.split('|');
      lines.push(`| ${cat} | ${uc} | **${count} 页** |`);
    }

    lines.push(
      '',
      '## 执行建议',
      '',
      `- 后台运行 \`pseo_generate\`（limit=${Math.min(ready.length, 50)}）即可新增 ${Math.min(ready.length, 50)} 个页面`,
      `- 保持 60 天 ≤ 500 页的放量纪律：当前 ${existing.size} 页，本批后 ${existing.size + Math.min(ready.length, 50)} 页`,
      `- GAP 组合通过 admin 商品库补充对应品类/场景的商品后自动解锁`,
      `- 高杠杆选品：优先补「选品杠杆」表前几行的品类×场景商品，一个商品最多同时解锁 ${sortedLeverage[0]?.[1] || 0} 个页面`,
    );

    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(REPORTS_DIR, 'matrix_opportunities.md'),
      lines.join('\n'),
      'utf-8'
    );

    return {
      readyCount: ready.length,
      gapCount: gaps.length,
      existingCount: existing.size,
      ready,
      gaps,
      summary: `矩阵分析: ${existing.size} 页已上线, ${ready.length} 个 READY 组合可立即扩产, ${gaps.length} 个 GAP 待补选品`,
    };
  });
}
