/**
 * GEO 深度合规扫描引擎（原 scripts/geo_optimizer.py）
 * 理论依据：普林斯顿大学 KDD 2024 GEO 研究（提升 AI 引用可见度 30-40%）：
 *   1. Statistics Addition —— 具体数字与单位
 *   2. Cite Sources        —— 权威来源标注
 *   3. Quotation Addition  —— 真实引述
 *   4. Conclusion First    —— 首段即完整结论句
 *   5. Schema Coverage     —— Product / FAQPage / BreadcrumbList
 */
import fs from 'fs';
import path from 'path';
import { PAGES_DIR, writeReport, withLock } from './dataLayer';

const NUMBER_RE = /\b\d+(\.\d+)?\s*(g|kg|mm|cm|inch|hour|hr|min|%|\$|lbs?|oz|N|ft)\b/gi;
const SOURCE_RE = /(according to|source:|厂商标称|data from|lab measured|benchmarked|tested|score|rating)/gi;
const QUOTE_RE = /"[^"]{15,}"/g;

export interface GeoPageScore {
  slug: string;
  title: string;
  score: number;
  grade: string;
  has_conclusion_first: boolean;
  statistic_count: number;
  source_citations: number;
  quotation_count: number;
  word_count: number;
  gaps: string[];
}

function grade(score: number): string {
  if (score >= 90) return 'A+ (AI Citation Ready)';
  if (score >= 80) return 'A (High Visibility)';
  if (score >= 70) return 'B (Good Baseline)';
  return 'C (Needs Optimization)';
}

function scanPageData(data: any, slug: string): GeoPageScore {
  const title: string = data.title || slug;
  const conclusion: string = data.geo_conclusion_first || '';
  const faqs: Array<{ question: string; answer: string }> = data.faqs || [];
  const products: any[] = data.products || [];

  // 全文语料
  const corpus = [
    conclusion,
    ...faqs.map((f) => `${f.question} ${f.answer}`),
    ...products.flatMap((p) => [p.highlight, p.lab_test_quote, p.user_quote].filter(Boolean)),
  ].join(' ');

  const statisticCount = (corpus.match(NUMBER_RE) || []).length;
  const sourceCitations = (corpus.match(SOURCE_RE) || []).length;
  const quotationCount = (corpus.match(QUOTE_RE) || []).length;
  const wordCount = corpus.split(/\s+/).filter(Boolean).length;

  // 结论前置：首句必须是 40+ 字符的完整判断句（可直接被 AI 摘引）
  const firstSentence = conclusion.split(/[.!?]/)[0] || '';
  const hasConclusionFirst = firstSentence.trim().length > 40;

  // 评分：结论前置 30 / 数据 25 / 来源 20 / 引述 15 / Schema 10（页面 JSON 由渲染层保证 schema，此处记 10）
  let score = 0;
  score += hasConclusionFirst ? 30 : 0;
  score += Math.min(25, statisticCount * 3);
  score += Math.min(20, sourceCitations * 4);
  score += Math.min(15, quotationCount * 5);
  score += 10; // JsonLdSchema 组件统一注入 Product/FAQPage/BreadcrumbList

  const gaps: string[] = [];
  if (!hasConclusionFirst)
    gaps.push('首段未结论前置：首句必须是可被 AI 直接引用的完整判断句，剔除铺垫词');
  if (statisticCount < 5)
    gaps.push(`统计数据点不足（当前 ${statisticCount}/5）：将定性描述换为具体数字指标`);
  if (sourceCitations < 3)
    gaps.push(`数据来源标注不足（当前 ${sourceCitations}/3）：关键数据后需增加来源背书`);
  if (quotationCount < 2)
    gaps.push(`真实引述不足（当前 ${quotationCount}/2）：补充真实买家或实验室原话`);

  return {
    slug,
    title,
    score: Math.min(100, score),
    grade: grade(Math.min(100, score)),
    has_conclusion_first: hasConclusionFirst,
    statistic_count: statisticCount,
    source_citations: sourceCitations,
    quotation_count: quotationCount,
    word_count: wordCount,
    gaps,
  };
}

export async function runGeoOptimizer(): Promise<{
  summary: string;
  reportPath: string;
  pages: GeoPageScore[];
}> {
  return withLock('geo_optimizer', async () => {
    const scores: GeoPageScore[] = [];

    if (fs.existsSync(PAGES_DIR)) {
      for (const file of fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.json'))) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(PAGES_DIR, file), 'utf-8'));
          scores.push(scanPageData(data, file.replace(/\.json$/, '')));
        } catch {
          // 跳过损坏文件
        }
      }
    }

    scores.sort((a, b) => a.score - b.score); // 分数最低的排前面（最需优化）

    const avg = scores.length ? scores.reduce((s, p) => s + p.score, 0) / scores.length : 0;
    const aPlus = scores.filter((p) => p.score >= 90).length;
    const needsWork = scores.filter((p) => p.score < 80);

    const lines: string[] = [
      '# 🧠 GEO AI 引擎引用合规度审计报告',
      '',
      `> 生成时间: ${new Date().toISOString()} | 模型: Princeton KDD 2024 GEO Framework`,
      '',
      '## 全站总览',
      '',
      '| 指标 | 数值 |',
      '|---|---|',
      `| 扫描页面 | ${scores.length} |`,
      `| 平均 GEO 分 | **${avg.toFixed(1)}** / 100 |`,
      `| A+ 级 (AI Citation Ready) | ${aPlus} 页 |`,
      `| 需优化 (<80 分) | ${needsWork.length} 页 |`,
      '',
      '## 逐页诊断 (低分优先)',
      '',
    ];

    for (const p of scores) {
      lines.push(`### ${p.slug} — ${p.score}/100 (${p.grade})`);
      lines.push(`- 标题: ${p.title}`);
      lines.push(
        `- 指标: 结论前置 ${p.has_conclusion_first ? '✅' : '❌'} | 数据点 ${p.statistic_count} | 来源 ${p.source_citations} | 引述 ${p.quotation_count} | 字数 ${p.word_count}`
      );
      if (p.gaps.length) {
        lines.push('- 补齐建议:');
        for (const gap of p.gaps) lines.push(`  - ${gap}`);
      }
      lines.push('');
    }

    const content = lines.join('\n');
    const reportPath = writeReport('geo_audit.md', content);

    return {
      summary: `GEO 扫描完成: ${scores.length} 页, 平均分 ${avg.toFixed(1)}, 需优化 ${needsWork.length} 页`,
      reportPath: path.relative(process.cwd(), reportPath),
      pages: scores,
    };
  });
}
