/**
 * 每日经营看板（原 scripts/daily_report.py）
 * 汇总：资产规模 / EPC 归因 / GEO 评分 / SERP 快照 / 剪枝审计 → 一张决策日报。
 */
import fs from 'fs';
import path from 'path';
import {
  PAGES_DIR,
  DATA_DIR,
  REPORTS_DIR,
  loadMatrix,
  loadProducts,
  countFiles,
  SYNDICATE_DIR,
  withLock,
} from './dataLayer';

function readReportSafe(filename: string): string {
  try {
    const p = path.join(REPORTS_DIR, filename);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : '';
  } catch {
    return '';
  }
}

export async function runDailyReport(): Promise<{ summary: string; reportPath: string }> {
  return withLock('daily_report', async () => {
    const pageCount = countFiles(PAGES_DIR, '.json');
    const matrix = loadMatrix();
    const products = loadProducts();

    const pageCountByCat = new Map<string, number>();
    for (const p of products) {
      pageCountByCat.set(p.category, (pageCountByCat.get(p.category) || 0) + 1);
    }

    const epcText = readReportSafe('epc_ranking.md');
    const geoText = readReportSafe('geo_audit.md');
    const rankText = readReportSafe('rank_history.md');
    const pruneText = readReportSafe('prune_log.md');

    // 从报告中抽取关键数字（存在时）
    const epcMatch = epcText.match(/加权 EPC \| \$(\d+\.\d+)/);
    const geoMatch = geoText.match(/平均 GEO 分 \| \*\*(\d+\.\d+)\*\*/);
    const bingMatch = rankText.match(/Bing \| (\d+) \| (\d+)\/(\d+)/);

    const syndicateTotal =
      countFiles(path.join(SYNDICATE_DIR, 'reddit'), '.md') +
      countFiles(path.join(SYNDICATE_DIR, 'medium'), '.md') +
      countFiles(path.join(SYNDICATE_DIR, 'quora'), '.md');

    const now = new Date().toISOString();

    const lines = [
      '# 🏆 每日资产与经营看板',
      '',
      `> **报告生成时间**: ${now} | **系统版本**: pSEO + GEO Native Engine v3.0`,
      '',
      '---',
      '',
      '## 📊 1. 核心资产指标',
      '',
      '| 指标维度 | 当前数值 | 说明 |',
      '|---|---|---|',
      `| 全站 pSEO 对比页 | **${pageCount}** 页 | 覆盖 ${matrix.categories.length} 大品类 |`,
      `| 单品深度评测 | **${products.length}** 篇 | ${[...pageCountByCat.keys()].join(' / ') || '—'} |`,
      `| 第三方信任证据链 | **${syndicateTotal}** 篇 | Reddit / Medium / Quora |`,
      `| GEO 平均分 | **${geoMatch ? geoMatch[1] : '未扫描'}** / 100 | 先运行 geo_optimizer |`,
      `| 加权 EPC | **${epcMatch ? '$' + epcMatch[1] : '未对账'}** / Click | 先运行 epc_tracker |`,
      `| Bing 首页覆盖 | ${bingMatch ? `${bingMatch[2]}/${bingMatch[3]}` : '未扫描'} | 先运行 serp_tracker |`,
      '',
      '## 🗂 2. 品类矩阵覆盖',
      '',
      '| 品类 | 在库 SKU | 对应 Tracking ID 策略 |',
      '|---|---|---|',
    ];

    for (const cat of matrix.categories) {
      lines.push(`| ${cat} | ${pageCountByCat.get(cat) || 0} | ${cat} 专属 ID 归因 |`);
    }

    lines.push(
      '',
      '## 📋 3. 模块报告快照',
      '',
    );

    for (const [name, text] of [
      ['EPC 归因', epcText],
      ['GEO 审计', geoText],
      ['SERP 快照', rankText],
      ['剪枝日志', pruneText],
    ] as const) {
      lines.push(`### ${name}`);
      if (text) {
        // 只贴前 40 行防报告爆炸
        const excerpt = text.split('\n').slice(0, 40).join('\n');
        lines.push('```markdown', excerpt, '```');
      } else {
        lines.push('> 暂无数据 — 先运行对应任务');
      }
      lines.push('');
    }

    lines.push(
      '## ✅ 4. 今日行动清单',
      '',
      `- [ ] 检查 EPC 报告中 **OPTIMIZE** 标记的簇并替换低效商品`,
      `- [ ] 为 GEO 分 < 80 的页面补数据点与来源`,
      `- [ ] 审核新生成 pSEO 页面的 FAQ 质量`,
      `- [ ] 将 syndicate 内容分发到对应平台`,
      `- [ ] 导出 leads.json 新增留资并跟进`,
      ''
    );

    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    const reportPath = path.join(REPORTS_DIR, 'daily_report.md');
    fs.writeFileSync(reportPath, lines.join('\n'), 'utf-8');

    return {
      summary: `日报生成完成: ${pageCount} pSEO 页 / ${products.length} SKU / 证据链 ${syndicateTotal} 篇`,
      reportPath: path.relative(process.cwd(), reportPath),
    };
  });
}
