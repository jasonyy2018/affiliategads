/**
 * EPC 商业归因引擎（原 scripts/epc_tracker.py）
 * 按 Tracking ID 反查每个品类/页面簇的真实每点击收益 (EPC)。
 *
 * 决策矩阵：
 *  - EPC >= $0.30 → EXPAND（加大投入，细分 Tracking ID 扩产内容）
 *  - EPC < $0.10 且点击 >= 500 → OPTIMIZE（排查选品/承接力）
 *  - 点击 < 100 → OBSERVE（样本累积中）
 */
import { loadProducts, writeReport, withLock, REPORTS_DIR } from './dataLayer';
import fs from 'fs';
import path from 'path';

export interface TrackingPerformance {
  tracking_id: string;
  category_label: string;
  clicks: number;
  orders: number;
  shipped_revenue: number;
  commission: number;
  conversion_rate: number;
  epc: number;
  avg_order_value: number;
  recommendation: { action: string; detail: string };
}

export function parseAmazonOrdersCsv(csvContent: string): TrackingPerformance[] {
  const lines = csvContent.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  const idx = (name: string) => headers.findIndex((h) => h.toLowerCase().includes(name.toLowerCase()));

  const idIdx = idx('Tracking ID');
  const catIdx = idx('Category');
  const clicksIdx = idx('Clicks');
  const ordersIdx = idx('Items Ordered');
  const revenueIdx = idx('Shipped Revenue');
  const earningsIdx = idx('Total Earnings');

  const results: TrackingPerformance[] = [];

  for (const line of lines.slice(1)) {
    // 简易 CSV 解析（兼容带引号字段）
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

    const num = (i: number) => parseFloat(cells[i]?.replace(/[$,]/g, '') || '0') || 0;
    const clicks = num(clicksIdx);
    const orders = num(ordersIdx);
    const shipped = num(revenueIdx);
    const commission = num(earningsIdx);
    const epc = clicks > 0 ? commission / clicks : 0;

    let action = 'STABLE';
    let detail = '健康平稳运行：保持自然更新频率';
    if (clicks < 100) {
      action = 'OBSERVE';
      detail = '点击样本不足 100，继续积累自然流曝光';
    } else if (epc >= 0.3) {
      action = 'EXPAND';
      detail = '高盈利矩阵簇 (EPC > $0.30)：建议增加 50+ 长尾词并细分子 Tracking ID';
    } else if (epc < 0.1 && clicks >= 500) {
      action = 'OPTIMIZE';
      detail = '低产出异常 (EPC < $0.10)：建议排查商品是否有差评或替换高客单替代品';
    }

    results.push({
      tracking_id: cells[idIdx] || 'unknown',
      category_label: cells[catIdx] || 'Uncategorized',
      clicks,
      orders,
      shipped_revenue: shipped,
      commission,
      conversion_rate: clicks > 0 ? orders / clicks : 0,
      epc,
      avg_order_value: orders > 0 ? shipped / orders : 0,
      recommendation: { action, detail },
    });
  }

  // 按 EPC 降序
  return results.sort((a, b) => b.epc - a.epc);
}

export async function runEpcTracker(): Promise<{ summary: string; reportPath: string; performances: TrackingPerformance[] }> {
  return withLock('epc_tracker', async () => {
    // 读取订单 CSV（支持外部导入路径，默认取 sample）
    const csvPath = path.join(process.cwd(), 'data', 'sample_amazon_orders.csv');
    let csvContent = '';
    try {
      if (fs.existsSync(csvPath)) csvContent = fs.readFileSync(csvPath, 'utf-8');
    } catch {}

    const performances = parseAmazonOrdersCsv(csvContent);
    const products = loadProducts();

    const totalClicks = performances.reduce((s, p) => s + p.clicks, 0);
    const totalOrders = performances.reduce((s, p) => s + p.orders, 0);
    const totalCommission = performances.reduce((s, p) => s + p.commission, 0);
    const weightedEpc = totalClicks > 0 ? totalCommission / totalClicks : 0;
    const cr = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;

    const lines: string[] = [
      '# 💰 Amazon EPC 商业归因排名报告',
      '',
      `> 生成时间: ${new Date().toISOString()} | 数据源: Tracking ID 汇总报表`,
      '',
      '## 总览',
      '',
      '| 指标 | 数值 |',
      '|---|---|',
      `| 总点击 | ${totalClicks.toLocaleString()} |`,
      `| 总订单 | ${totalOrders.toLocaleString()} |`,
      `| 总佣金 | $${totalCommission.toFixed(2)} |`,
      `| 加权 EPC | $${weightedEpc.toFixed(3)} / Click ${weightedEpc >= 0.3 ? '🚀 高出行业基准' : ''} |`,
      `| 综合转化率 | ${cr.toFixed(2)}% |`,
      '',
      '## Tracking ID 排名 (按 EPC 降序)',
      '',
      '| Tracking ID | 品类 | 点击 | 订单 | CR | EPC | AOV | 决策 |',
      '|---|---|---|---|---|---|---|---|',
    ];

    for (const p of performances) {
      lines.push(
        `| ${p.tracking_id} | ${p.category_label} | ${p.clicks} | ${p.orders} | ${(p.conversion_rate * 100).toFixed(1)}% | $${p.epc.toFixed(3)} | $${p.avg_order_value.toFixed(0)} | **${p.recommendation.action}** |`
      );
    }

    lines.push('', '## 行动清单', '');
    for (const p of performances) {
      if (p.recommendation.action !== 'STABLE') {
        lines.push(`- **[${p.recommendation.action}]** ${p.tracking_id} (${p.category_label}): ${p.recommendation.detail}`);
      }
    }

    lines.push('', `## 商品库状态 (${products.length} SKU)`, '');
    const byCat = new Map<string, number>();
    for (const prod of products) {
      byCat.set(prod.category, (byCat.get(prod.category) || 0) + 1);
    }
    for (const [cat, count] of byCat) {
      lines.push(`- ${cat}: ${count} 个在库 SKU`);
    }

    const content = lines.join('\n');
    const reportPath = writeReport('epc_ranking.md', content);

    return {
      summary: `EPC 对账完成: ${performances.length} 个 Tracking ID, 加权 EPC $${weightedEpc.toFixed(3)}, 总佣金 $${totalCommission.toFixed(2)}`,
      reportPath: path.relative(process.cwd(), reportPath),
      performances,
    };
  });
}
