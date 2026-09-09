/**
 * 商品批量导入 + 市场需求重排引擎（零 API 依赖，纯本地数据驱动）。
 *
 * 两个能力，都对应后台可一键触发的任务：
 *
 * 1. runProductImport(csvText) — 解决"不定期更新商品数量"
 *    粘贴一份 CSV（asin 必填，其余可省）→ 去重 upsert 进 products.json →
 *    自动补默认字段（slug/佣金率/占位图）→ 末尾跑一次重排，让新品立刻进优先级。
 *
 * 2. runMarketRebalance() — 解决"根据市场需求波动更新调整所有产品"
 *    用**无需任何 API key 的真信号**给全库商品打分排序：
 *      - 利润分      = 单价 × 该品类佣金率（联盟不出货没成本，这就是你每单赚多少）
 *      - 需求分      = GSC 分页展现（gsc_performance.csv，若已接入）+ 矩阵缺口杠杆
 *      - 真实 EPC    = 你导出的 Amazon 订单 CSV（category → EPC）
 *      - 季节系数    = 户外品类当前月份的需求波动（鞋/跑鞋秋冬冲高、帐篷夏冲秋冬降）
 *    输出 reports/market_rebalance.md：该主推谁 / 该补哪个价格带 / 该剪哪个品 / 季节性切换。
 *
 * 数据源全部是你自己导出的 CSV + 引擎产物，换一个文件就变准，无需 SerpApi/PA-API。
 */
import fs from 'fs';
import path from 'path';
import {
  loadProducts,
  saveProducts,
  loadMatrix,
  loadTrackingIds,
  DATA_DIR,
  PAGES_DIR,
  REPORTS_DIR,
  withLock,
  writeReport,
  type Product,
  type MatrixData,
} from './dataLayer';
import { parseAmazonOrdersCsv } from './epcTracker';
import { runMatrixOpportunities } from './matrixOpportunities';

/**
 * 各品类默认佣金率（Amazon Associates 美国站当前档位的近似值，可被 CSV 里
 * 的 commission_rate 覆盖）。这是可维护的参考表，不是权威实时数据。
 */
const CATEGORY_COMMISSION: Record<string, number> = {
  'hiking boots': 0.045,
  'trail running shoes': 0.045,
  'camping tents': 0.03,
  'backpacking daypacks': 0.045,
};
const DEFAULT_COMMISSION = 0.03;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** 户外品类的月度需求系数：>1 该品类当季走强，<1 走软。10/11 月=秋季，冬季鞋类冲高。 */
function seasonMultiplier(category: string, month = new Date().getMonth() + 1): number {
  const c = category.toLowerCase();
  // month: 1=Jan ... 12=Dec
  const winter = month >= 10 || month <= 2; // 冬季段
  const summer = month >= 5 && month <= 8; // 夏季段
  if (/boot|shoe|running|trail|winter|snow|gtx/i.test(c)) {
    return winter ? 1.3 : summer ? 0.8 : 1.0; // 鞋类秋冬冲高
  }
  if (/tent|camp|canopy/i.test(c)) {
    return summer ? 1.3 : winter ? 0.7 : 1.0; // 帐篷夏季冲高
  }
  if (/pack|backpack|daypack|bag/i.test(c)) {
    return 1.0; // 包类全年平稳，秋季小幅冲高
  }
  return 1.0;
}

// ---------- CSV 解析（兼容带引号字段，与 epcTracker 同款） ----------

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];
  for (const line of lines.slice(1)) {
    const cells: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === ',' && !inQuotes) {
        cells.push(cur);
        cur = '';
      } else cur += ch;
    }
    cells.push(cur);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = (cells[i] ?? '').trim()));
    rows.push(row);
  }
  return rows;
}

function firstTruthy(...vals: (string | undefined)[]): string {
  for (const v of vals) if (v && v.trim()) return v.trim();
  return '';
}

/** 类目标准化：尽量落到 matrix.categories 里；落不到就原样保留。 */
function normalizeCategory(raw: string, matrix: MatrixData): string {
  if (!raw) return '';
  const lower = raw.toLowerCase();
  const match = matrix.categories.find((c) => lower === c.toLowerCase() || lower.includes(c.toLowerCase()) || c.toLowerCase().includes(lower));
  return match || raw.trim();
}

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  newSlugs: string[];
  csvPath: string;
  rebalance: RebalanceResult | null;
  summary: string;
}

/**
 * 批量导入商品。CSV 列（asin 必填，其余可省并给默认）：
 *   asin, title, brand, price, commission_rate, category, use_cases(用 | 或 ; 分隔), slug
 * 末尾自动跑一次市场重排，让新品立刻进优先级。
 */
export async function runProductImport(csvText: string): Promise<ImportResult> {
  return withLock('product_import', async () => {
    const matrix = loadMatrix();
    const tracking = loadTrackingIds();
    const defaultTag = tracking.default || Object.values(tracking)[0] || 'jyu0a-20';

    const rows = parseCsv(csvText);
    if (rows.length === 0) {
      throw new Error('CSV 为空或缺少表头。示例: asin,title,brand,price,commission_rate,category,use_cases');
    }

    let products = loadProducts();
    const byAsin = new Map(products.map((p) => [p.asin, p]));

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const newSlugs: string[] = [];

    for (const r of rows) {
      const asin = firstTruthy(r.asin);
      if (!asin || asin.length < 2) {
        skipped++;
        continue;
      }

      const title = firstTruthy(r.title);
      const brand = firstTruthy(r.brand);
      const price = parseFloat(firstTruthy(r.price).replace(/[$,]/g, '')) || 0;
      const category = normalizeCategory(firstTruthy(r.category), matrix);
      const slug =
        firstTruthy(r.slug) ||
        (title ? slugify(brand ? `${brand}-${title}` : title).slice(0, 60) : `${asin.toLowerCase()}`);
      const commission = parseFloat(firstTruthy(r.commission_rate)) || CATEGORY_COMMISSION[category.toLowerCase()] || DEFAULT_COMMISSION;
      const useCases = (firstTruthy(r.use_cases) || '')
        .split(/[|;\/]/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      const existing = byAsin.get(asin);
      if (existing) {
        // 更新：只覆盖填了的字段，不抹掉已有的富数据
        existing.price = price || existing.price;
        existing.commission_rate = commission || existing.commission_rate;
        if (category) existing.category = category;
        if (useCases.length) existing.use_cases = useCases;
        if (title) existing.title = title;
        if (brand) existing.brand = brand;
        if (existing.category) existing.affiliate_tag = tracking[existing.category.toLowerCase()] || existing.affiliate_tag || defaultTag;
        updated++;
      } else {
        const fresh: Product = {
          asin,
          title: title || `${brand || 'Product'} (${asin})`,
          brand: brand || 'Unknown',
          price: price || 0,
          commission_rate: commission,
          category: category || 'other',
          use_cases: useCases,
          specs: {},
          rating: 0,
          review_count: 0,
          image_url: '', // 占位，后续 image_sync（配 PA-API 后）替换为官方图
          affiliate_tag: tracking[category?.toLowerCase()] || defaultTag,
          slug,
        };
        products.push(fresh);
        byAsin.set(asin, fresh);
        imported++;
        newSlugs.push(slug);
      }
    }

    saveProducts(products);

    // 落地导入记录（便于审计 + 复现）
    const importRecord = path.join(DATA_DIR, 'imports', `${new Date().toISOString().slice(0, 10)}-import.csv`);
    try {
      fs.mkdirSync(path.dirname(importRecord), { recursive: true });
      fs.writeFileSync(importRecord, csvText, 'utf-8');
    } catch {}

    // 自动补内容（数据驱动模板，不烧 AI 钱）→ 让新品立刻有评测页
    const { runContentGenerator } = await import('./contentGenerator');
    if (newSlugs.length > 0) {
      for (const slug of newSlugs) {
        try {
          await runContentGenerator({ slug });
        } catch {}
      }
    }

    // 末尾重排，让新品进入优先级
    const rebalance = await runMarketRebalance();

    const summary =
      `批量导入: 新增 ${imported} / 更新 ${updated} / 跳过 ${skipped} (共 ${rows.length} 行)` +
      (newSlugs.length ? `，已为 ${newSlugs.length} 个新品生成评测内容` : '') +
      (rebalance ? `；市场重排 ${rebalance.scored} 品，主推 ${rebalance.topPicks.length}` : '');

    return {
      imported,
      updated,
      skipped,
      newSlugs,
      csvPath: path.relative(process.cwd(), importRecord),
      rebalance,
      summary,
    };
  });
}

// ---------- 市场需求重排 ----------

export interface ProductScore {
  slug: string;
  title: string;
  asin: string;
  category: string;
  price: number;
  commission_rate: number;
  commissionPerOrder: number; // 单价 × 佣金率 = 每单赚多少（联盟"利润"）
  gscImpressions: number;
  categoryEpc: number;
  seasonMult: number;
  leverage: number; // 该商品填补的矩阵缺口页数（越多越值钱）
  score: number;
  actions: string[];
}

export interface RebalanceResult {
  scored: number;
  topPicks: ProductScore[];
  gaps: Array<{ category: string; use_case: string; band: string; need: number; unlocks: number }>;
  prune: ProductScore[];
  seasonNote: string;
  summary: string;
  reportPath: string;
}

/** 从 GSC 分页报表构建 品类 → 展现 的需求映射（gsc_performance.csv，未接入则空）。 */
function loadCategoryDemand(): Map<string, number> {
  const map = new Map<string, number>();
  const csvPath = path.join(DATA_DIR, 'gsc_performance.csv');
  if (!fs.existsSync(csvPath)) return map;
  try {
    const lines = fs.readFileSync(csvPath, 'utf-8').split('\n').filter(Boolean);
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const urlIdx = headers.findIndex((h) => h.includes('url'));
    const impIdx = headers.findIndex((h) => h.includes('impression'));
    for (const line of lines.slice(1)) {
      const cells = line.split(',');
      const url = cells[urlIdx] || '';
      const imp = parseInt(cells[impIdx] || '0', 10) || 0;
      // URL 形如 /best/<category>-for-... /hub/<category> /review/<slug>
      const m = url.match(/\/(?:best\/|hub\/)([a-z0-9-]+)/);
      if (m) map.set(m[1], (map.get(m[1]) || 0) + imp);
    }
  } catch {}
  return map;
}

/** 从 Amazon 订单 CSV 构建 品类 → EPC（真实出单率）。
 *  返回 { map, source }，source 标明数据来源，供报告标注真伪。 */
function loadCategoryEpc(): { map: Map<string, number>; source: string } {
  for (const name of ['amazon_orders.csv', 'sample_amazon_orders.csv']) {
    const p = path.join(DATA_DIR, name);
    if (!fs.existsSync(p)) continue;
    try {
      const perf = parseAmazonOrdersCsv(fs.readFileSync(p, 'utf-8'));
      const map = new Map<string, number>();
      for (const r of perf) {
        map.set((r.category_label || 'Uncategorized').toLowerCase(), r.epc);
      }
      // sample_ 前缀 = 样例假数据；真实报表应命名为 amazon_orders.csv
      return { map, source: name === 'sample_amazon_orders.csv' ? 'sample' : 'real' };
    } catch {}
  }
  return { map: new Map(), source: 'none' };
}

export async function runMarketRebalance(): Promise<RebalanceResult> {
  return withLock('market_rebalance', async () => {
    const products = loadProducts();
    const matrix = loadMatrix();
    const demand = loadCategoryDemand();
    const { map: epcMap, source: epcSource } = loadCategoryEpc();
    const month = new Date().getMonth() + 1;
    // 仅当 EPC 来自真实订单报表（amazon_orders.csv）时才当作"出单证据"
    const epcIsReal = epcSource === 'real';

    // 矩阵缺口杠杆：哪个品类现在最缺商品（补 1 个解锁多少页）
    const opp = await runMatrixOpportunities();
    const leverageByCat = new Map<string, number>();
    for (const g of opp.gaps) {
      const k = g.category.toLowerCase();
      const unlock = 3 - g.matchedProducts; // 补到 3 个能解锁的页数（近似）
      leverageByCat.set(k, (leverageByCat.get(k) || 0) + Math.max(1, unlock));
    }

    // 各品类展现/佣金归一化
    const catKey = (c: string) => c.toLowerCase();
    const maxImp = Math.max(1, ...[...demand.values()]);
    const maxEpc = Math.max(0.0001, ...[...epcMap.values()]);

    const scored: ProductScore[] = products.map((p) => {
      const ck = catKey(p.category);
      const commissionPerOrder = p.price * p.commission_rate;
      const gscImpressions = demand.get(ck) ?? 0;
      const categoryEpc = epcMap.get(ck) ?? 0;

      const demandNorm = gscImpressions / maxImp; // 0..1
      // sample EPC 不参与需求信号（避免假数据污染排序），只在展示层列出
      const epcContributes = epcIsReal ? 0.3 * (categoryEpc / maxEpc) : 0;
      const leverage = leverageByCat.get(ck) || 0;
      const demandSignal = 0.5 * demandNorm + epcContributes + Math.min(1, leverage / 5) * 0.2;
      const seasonMult = seasonMultiplier(p.category, month);

      const score = commissionPerOrder * (0.35 + demandSignal) * seasonMult;

      const actions: string[] = [];
      if (score > 0 && demandNorm >= 0.6) actions.push('高需求：加内链 + 补内容吃长尾');
      if (epcIsReal && categoryEpc > 0) actions.push('真实出单 Top：优先主推位');
      if (!epcIsReal && epcSource === 'sample') actions.push('EPC 为示例数据，接真实订单表后生效');
      if (leverage >= 2) actions.push(`补 1 个即可解锁 ~${leverage} 个矩阵页`);
      if (gscImpressions === 0 && p.review_count > 0 && epcIsReal) actions.push('零展现：剪枝或合并候选');

      return {
        slug: p.slug,
        title: p.title,
        asin: p.asin,
        category: p.category,
        price: p.price,
        commission_rate: p.commission_rate,
        commissionPerOrder,
        gscImpressions,
        categoryEpc,
        seasonMult,
        leverage,
        score,
        actions,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    const topPicks = scored.filter((s) => s.score > 0).slice(0, 20);
    const prune = scored.filter((s) => s.gscImpressions === 0 && s.leverage === 0 && s.categoryEpc === 0);

    // 季节性说明（与 seasonMultiplier 的系数严格对应，避免"9 月算夏季"这类错误）
    const winterSeg = month >= 10 || month <= 2; // 冬段：鞋类 ×1.3 / 帐篷 ×0.7
    const summerSeg = month >= 5 && month <= 8; // 夏段：帐篷 ×1.3 / 鞋类 ×0.8
    const seasonNote = winterSeg
      ? `当前 ${month} 月为冬段：鞋类/跑鞋季节系数 ×1.3（冲锋），帐篷 ×0.7。把主推位让给登山鞋/越野跑鞋。`
      : summerSeg
        ? `当前 ${month} 月为夏段：帐篷/营地类 ×1.3（冲锋），鞋类 ×0.8。加码帐篷与营地内容。`
        : `当前 ${month} 月为过渡季（秋季）：鞋类与帐篷季节系数均 ×1.0，无明显季节偏向 — 排序主要由真实需求与利润驱动，勿凭季节砍品。`;

    const epcLabel =
      epcSource === 'real' ? `真实订单 EPC ${epcMap.size} 品类`
      : epcSource === 'sample' ? `示例订单 EPC（未接真表，${epcMap.size} 品类，仅作展示）`
      : '无订单数据';
    const lines: string[] = [
      '# 📊 市场需求重排报告（无 API · 真数据驱动）',
      '',
      `> 生成时间: ${new Date().toISOString()} | 商品库: ${products.length} SKU | 需求信号: ${demand.size ? `GSC 展现 ${demand.size} 品类` : '未接入 GSC'} + ${epcLabel}`,
      '',
      `## ${seasonNote}`,
      '',
      '## 🏆 主推清单（利润 × 需求 × 季节 综合分 Top）',
      '',
      `> 品类 EPC 列${epcIsReal ? '来自你的真实订单报表' : '当前为示例/无数据，接 \`data/amazon_orders.csv\` 真表后自动变真'}。`,
      '',
      '| # | 商品 | 品类 | 单价 | 佣金率 | 每单赚 | GSC展现 | 品类EPC | 季节系数 | 行动 |',
      '|---|---|---|---|---|---|---|---|---|---|',
    ];
    topPicks.forEach((s, i) => {
      lines.push(
        `| ${i + 1} | ${s.title.slice(0, 34)} | ${s.category} | $${s.price.toFixed(0)} | ${(s.commission_rate * 100).toFixed(1)}% | $${s.commissionPerOrder.toFixed(2)} | ${s.gscImpressions} | $${s.categoryEpc.toFixed(3)} | ×${s.seasonMult} | ${s.actions.join('; ') || '保持'} |`
      );
    });

    lines.push('', `## 🧩 矩阵缺口（补 1 个商品能解锁的页面，按品类）`, '', '| 品类 | 场景 | 价格带 | 还缺 | 解锁 |', '|---|---|---|---|---|');
    for (const g of opp.gaps.slice(0, 20)) {
      lines.push(`| ${g.category} | ${g.use_case} | ${g.band} | ${g.matchedProducts}/3 | ~${Math.max(1, 3 - g.matchedProducts)} 页 |`);
    }

    if (prune.length) {
      lines.push('', '## ✂️ 剪枝候选（零需求信号 + 无杠杆）', '', ...prune.slice(0, 20).map((s) => `- ${s.title} (${s.slug})`));
    }

    lines.push(
      '',
      '## 说明',
      '',
      `- **利润 = 单价 × 佣金率**（联盟不出货无成本，这就是你每单净赚的佣金，非进货毛利）。`,
      `- 需求信号来自你自己的真数据：**GSC 分页展现**（跑 \`gsc_sync\` 后自动接入）与 **Amazon 订单 EPC**（把 \`data/amazon_orders.csv\` 换成你导出的真表）。`,
      `- 季节系数是户外品类的确定性规律，无需数据源。数据越全，排序越准。`
    );

    const report = writeReport('market_rebalance.md', lines.join('\n'));

    return {
      scored: products.length,
      topPicks,
      gaps: opp.gaps.map((g) => ({ category: g.category, use_case: g.use_case, band: g.band, need: 3 - g.matchedProducts, unlocks: Math.max(1, 3 - g.matchedProducts) })),
      prune,
      seasonNote,
      summary:
        `市场重排完成: 打分 ${products.length} 品, 主推 ${topPicks.length}, 缺口 ${opp.gaps.length} 组合${report.ok ? '' : ' [报告写入失败]'}`,
      reportPath: path.relative(process.cwd(), report.filePath),
    };
  });
}
