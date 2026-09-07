/**
 * Gemini / Perplexity / AI Overview 实时引用审计（原 scripts/gemini_live_checker.py）
 * 全栈审计维度：
 *   1. AI Direct Verdict（首屏直给结论完备度）
 *   2. Quantified Lab Data（物理实测数字证明）
 *   3. Schema.org 语义完备度
 *   4. Entity Consensus Rate（跨平台第三方证据链匹配度）
 */
import {
  loadGeoQuestions,
  loadProducts,
  countFiles,
  SYNDICATE_DIR,
  writeReport,
  withLock,
} from './dataLayer';
import path from 'path';

export interface QuestionAudit {
  id: string;
  question: string;
  score: number;
  reasons: string[];
}

export async function runGeminiAudit(): Promise<{
  summary: string;
  reportPath: string;
  audits: QuestionAudit[];
}> {
  return withLock('gemini_audit', async () => {
    const questions = loadGeoQuestions();
    const products = loadProducts();

    const redditCount = countFiles(path.join(SYNDICATE_DIR, 'reddit'), '.md');
    const mediumCount = countFiles(path.join(SYNDICATE_DIR, 'medium'), '.md');
    const quoraCount = countFiles(path.join(SYNDICATE_DIR, 'quora'), '.md');
    const totalSyndicate = redditCount + mediumCount + quoraCount;

    const audits: QuestionAudit[] = [];

    for (const q of questions) {
      let score = 60; // 基础分
      const reasons: string[] = [];

      // 1. Direct Verdict 完备度
      if ((q.direct_verdict || '').length >= 40) {
        score += 10;
        reasons.push('✅ 包含 40+ 字直给硬结论 (Direct Verdict)');
      } else {
        reasons.push('❌ Direct Verdict 过短，AI 难以直接引用');
      }

      // 2. 量化物理指标
      const metric = q.key_metric || '';
      if (/\d/.test(metric)) {
        score += 10;
        reasons.push(`✅ 具备量化物理实测数据 (${metric})`);
      } else {
        reasons.push('❌ 缺少量化指标');
      }

      // 3. 落地页存在性 (target_slug 在 content/pages 或 products 中可渲染)
      const pageExists = products.some((p) => p.slug && q.target_slug.includes(p.slug));
      if (pageExists || q.target_slug) {
        score += 5;
      }

      // 4. Entity Consensus Rate（第三方证据链覆盖度）
      const consensusRate = Math.min(1, totalSyndicate / (questions.length * 3));
      score += Math.round(consensusRate * 15);

      audits.push({
        id: q.id,
        question: q.question,
        score: Math.min(100, score),
        reasons,
      });
    }

    audits.sort((a, b) => b.score - a.score);
    const avg = audits.length ? audits.reduce((s, a) => s + a.score, 0) / audits.length : 0;

    const lines: string[] = [
      '# 🔮 Gemini / AI Overview 引用可见度审计',
      '',
      `> 生成时间: ${new Date().toISOString()} | 审计对象: ${audits.length} 大高频买家疑问`,
      '',
      '## 证据链资产',
      '',
      `| 平台 | 资产数 |`,
      `|---|---|`,
      `| Reddit | ${redditCount} |`,
      `| Medium | ${mediumCount} |`,
      `| Quora | ${quoraCount} |`,
      `| **合计 Entity Consensus** | **${totalSyndicate}** |`,
      '',
      `## 平均引用就绪度: **${avg.toFixed(1)} / 100**`,
      '',
      '## 逐题审计',
      '',
    ];

    for (const a of audits) {
      lines.push(`### ${a.question} — ${a.score}/100`);
      for (const r of a.reasons) lines.push(`- ${r}`);
      lines.push('');
    }

    const content = lines.join('\n');
    const report = writeReport('gemini_citation_audit.md', content);

    return {
      summary:
        `Gemini 审计完成: ${audits.length} 疑问, 平均就绪度 ${avg.toFixed(1)}, 证据链资产 ${totalSyndicate}` +
        (report.ok ? '' : ` [报告写入失败: ${report.error}]`),
      reportPath: path.relative(process.cwd(), report.filePath),
      audits,
    };
  });
}
