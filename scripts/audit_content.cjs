/**
 * 全量内容质量审计（一次性）：
 *  1. content/pages/*.json — 对比页快照
 *     - 与 data/products.json 数据一致性（价格/评分/图片 URL/规格）
 *     - GEO 要素完备（conclusion/faqs/数据点/引述）
 *     - 佣金排序正确性（页面内商品是否按佣金绝对值降序）
 *  2. content/*.json — 单品评测
 *     - 空数组/占位文案残留（"High Efficiency" "Durable Construction" 等 v1 模板残留）
 *     - 核心字段缺失（pros/cons/quick_verdict）
 *     - 与 products.json 一致（价格/品牌/ASIN）
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const products = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'products.json'), 'utf-8'));
const byAsin = new Map(products.map((p) => [p.asin, p]));
const bySlug = new Map(products.map((p) => [p.slug, p]));

const PLACEHOLDER_PATTERNS = [
  /High Efficiency/i,
  /Durable Construction/i,
  /Designed for maximum output with minimal hassle/i,
  /Built with commercial-grade materials/i,
  /Premium Grade Construction/i,
  /Standard Generic Alternative/i,
  /Standard Plastic/i,
  /Performance & Real-World Use/i, // v1 空模板标题
  /Consistent results across standard daily testing/i,
];

// ---------- 对比页审计 ----------
const pagesDir = path.join(ROOT, 'content', 'pages');
const pageIssues = [];
let pagesChecked = 0;

for (const file of fs.readdirSync(pagesDir).filter((f) => f.endsWith('.json'))) {
  pagesChecked++;
  const slug = file.replace(/\.json$/, '');
  let data;
  try {
    data = JSON.parse(fs.readFileSync(path.join(pagesDir, file), 'utf-8'));
  } catch {
    pageIssues.push({ slug, type: 'PARSE', detail: 'JSON 损坏' });
    continue;
  }

  // 1a. 结构字段
  if (!data.geo_conclusion_first || data.geo_conclusion_first.length < 40) {
    pageIssues.push({ slug, type: 'GEO', detail: '结论前置句缺失或过短' });
  }
  if (!Array.isArray(data.faqs) || data.faqs.length < 3) {
    pageIssues.push({ slug, type: 'FAQ', detail: `FAQ 数量 ${data.faqs?.length || 0} < 3` });
  }
  if (!Array.isArray(data.products) || data.products.length < 3) {
    pageIssues.push({ slug, type: 'STRUCT', detail: `商品数 ${data.products?.length || 0} < 3` });
  }

  // 1b. 数据一致性（价格 vs products.json）
  for (const prod of data.products || []) {
    const live = byAsin.get(prod.asin);
    if (!live) {
      pageIssues.push({ slug, type: 'STALE-ASIN', detail: `${prod.asin} 不在商品库` });
      continue;
    }
    if (Math.abs(live.price - prod.price) > 0.01) {
      pageIssues.push({ slug, type: 'PRICE-DRIFT', detail: `${prod.asin}: 快照 $${prod.price} vs 库 $${live.price}` });
    }
    if (live.image_url !== prod.image_url) {
      pageIssues.push({ slug, type: 'IMG-DRIFT', detail: `${prod.asin} 图片与库不一致` });
    }
  }

  // 1c. 佣金排序检查（应按 price*commission_rate 降序）
  const comm = (data.products || []).map((p) => p.price * (p.commission_rate || 0));
  for (let i = 1; i < comm.length; i++) {
    if (comm[i] > comm[i - 1] + 0.01) {
      pageIssues.push({ slug, type: 'SORT', detail: `位置 ${i} 佣金排序错乱` });
      break;
    }
  }

  // 1d. 品类/场景与 slug 自洽（防张冠李戴）
  const slugCat = slug.replace(/^best-/, '').split('-for-')[0];
  if (data.category && data.category.replace(/\s+/g, '-') !== slugCat) {
    pageIssues.push({ slug, type: 'CAT-MISMATCH', detail: `快照品类 "${data.category}" 与 slug 品类不符` });
  }
}

// ---------- 评测审计 ----------
const contentDir = path.join(ROOT, 'content');
const reviewIssues = [];
let reviewsChecked = 0;

for (const file of fs.readdirSync(contentDir).filter((f) => f.endsWith('.json'))) {
  reviewsChecked++;
  const slug = file.replace(/\.json$/, '');
  let data;
  try {
    data = JSON.parse(fs.readFileSync(path.join(contentDir, file), 'utf-8'));
  } catch {
    reviewIssues.push({ slug, type: 'PARSE', detail: 'JSON 损坏' });
    continue;
  }

  // 2a. 空数组
  if (!Array.isArray(data.pros) || data.pros.length === 0) {
    reviewIssues.push({ slug, type: 'EMPTY-PROS', detail: 'pros 为空数组' });
  }
  if (!Array.isArray(data.cons) || data.cons.length === 0) {
    reviewIssues.push({ slug, type: 'EMPTY-CONS', detail: 'cons 为空数组' });
  }

  // 2b. 占位文案
  const serialized = JSON.stringify(data);
  for (const pat of PLACEHOLDER_PATTERNS) {
    if (pat.test(serialized)) {
      reviewIssues.push({ slug, type: 'PLACEHOLDER', detail: `残留 v1 占位文案: ${pat.source.slice(0, 40)}` });
    }
  }

  // 2c. 与商品库一致
  const live = bySlug.get(slug);
  if (live) {
    const info = data.product_info || {};
    if (info.price && Math.abs(info.price - live.price) > 0.01) {
      reviewIssues.push({ slug, type: 'PRICE-DRIFT', detail: `评测 $${info.price} vs 库 $${live.price}` });
    }
    if (data.rating && live.rating && Math.abs(data.rating - live.rating) > 0.05) {
      reviewIssues.push({ slug, type: 'RATING-DRIFT', detail: `评分 ${data.rating} vs 库 ${live.rating}` });
    }
  } else {
    reviewIssues.push({ slug, type: 'ORPHAN', detail: '评测对应商品不在 products.json' });
  }

  // 2d. GEO 要素
  if (!data.quick_verdict || data.quick_verdict.length < 60) {
    reviewIssues.push({ slug, type: 'GEO', detail: 'quick_verdict 缺失或过短 (<60 字符)' });
  }
}

// ---------- 汇总 ----------
const group = (arr) => {
  const m = {};
  arr.forEach((i) => { (m[i.type] = m[i.type] || []).push(i); });
  return m;
};

console.log('================ 对比页审计 ================');
console.log(`检查: ${pagesChecked} 页, 问题: ${pageIssues.length}`);
const pg = group(pageIssues);
Object.keys(pg).sort().forEach((t) => {
  console.log(`\n[${t}] ${pg[t].length} 处:`);
  pg[t].slice(0, 8).forEach((i) => console.log('  ', i.slug, '—', i.detail));
  if (pg[t].length > 8) console.log(`   ... 共 ${pg[t].length} 处`);
});

console.log('\n================ 评测审计 ================');
console.log(`检查: ${reviewsChecked} 篇, 问题: ${reviewIssues.length}`);
const rg = group(reviewIssues);
Object.keys(rg).sort().forEach((t) => {
  console.log(`\n[${t}] ${rg[t].length} 处:`);
  rg[t].slice(0, 10).forEach((i) => console.log('  ', i.slug, '—', i.detail));
  if (rg[t].length > 10) console.log(`   ... 共 ${rg[t].length} 处`);
});
