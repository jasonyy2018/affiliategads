#!/usr/bin/env python3
"""
Amazon EPC 归因与盈利分析系统：按 Tracking ID 反查每个品类/页面簇的真实每点击收益 (EPC)。

核心逻辑与行业背景：
  Amazon 联盟不会把订单明细回传给 Google，也不提供页面级转化追踪。
  解法是「按品类 / 页面簇分配 Tracking ID」，再用联盟后台导出的
  「Tracking ID 汇总报表 (Fee & Order Report)」反推真实 EPC 与转化率。

决策矩阵规则：
  - EPC > $0.30 的品类/页面簇 → 标记 【EXPAND 加大投入】，细分子 Tracking ID 并扩产内容。
  - EPC < $0.10 且点击数 > 500 → 标记 【OPTIMIZE 优先诊断】，品类选品或页面模板承接力不足。
  - 点击数 < 100 → 标记 【OBSERVE 样本累积中】。

用法:
    python scripts/epc_tracker.py --import data/sample_amazon_orders.csv
    python scripts/epc_tracker.py --import reports/amazon_orders.csv --min-clicks 50
"""

from __future__ import annotations

import os
import sys
import csv
import argparse
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent.parent
REPORTS_DIR = ROOT / "reports"
DATA_DIR = ROOT / "data"


@dataclass
class TrackingIdPerformance:
    """单个 Tracking ID 的收益与转化表现。"""
    tracking_id: str
    category_label: str
    clicks: int
    orders: int
    shipped_revenue: float  # GMV 总销售额
    commission: float       # 实际到手佣金收入

    @property
    def conversion_rate(self) -> float:
        """点击到订单转化率。"""
        return (self.orders / self.clicks) if self.clicks > 0 else 0.0

    @property
    def epc(self) -> float:
        """每点击收益 (Earnings Per Click)——唯一真正决定商业生死的指标。"""
        return (self.commission / self.clicks) if self.clicks > 0 else 0.0

    @property
    def avg_order_value(self) -> float:
        """平均客单价 (AOV)。"""
        return (self.shipped_revenue / self.orders) if self.orders > 0 else 0.0

    @property
    def recommendation(self) -> tuple[str, str]:
        """输出策略建议：Action Tag 与详细行动指南。"""
        if self.clicks < 100:
            return ("OBSERVE", "点击样本不足 100，继续积累自然流曝光")
        if self.epc >= 0.30:
            return ("EXPAND", "高盈利矩阵簇 (EPC > $0.30)：建议增加 50+ 长尾词并细分子 Tracking ID")
        if self.epc < 0.10 and self.clicks >= 500:
            return ("OPTIMIZE", "低产出异常 (EPC < $0.10)：建议排查商品是否有差评或替换高客单替代品")
        return ("STABLE", "健康平稳运行：保持自然更新频率")


def parse_amazon_report(csv_path: Path) -> dict[str, TrackingIdPerformance]:
    """解析 Amazon Associates 导出的订单与佣金报表 CSV。"""
    if not csv_path.exists():
        raise SystemExit(f"[错误] 找不到报表文件: {csv_path}")

    result: dict[str, TrackingIdPerformance] = {}

    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # 兼容官方表头与标准别名
            tid = (
                row.get("Tracking ID") or
                row.get("tracking_id") or
                row.get("Tag") or
                row.get("Tracking Id") or ""
            ).strip()

            if not tid:
                continue

            category = row.get("Category") or row.get("Category Name") or "General"
            clicks = int(row.get("Clicks", 0) or 0)
            orders = int(row.get("Items Ordered", 0) or row.get("Ordered Items", 0) or row.get("orders", 0) or 0)
            
            rev_str = str(row.get("Shipped Revenue", 0) or row.get("Revenue", 0) or row.get("revenue", 0)).replace("$", "").replace(",", "")
            shipped_rev = float(rev_str) if rev_str else 0.0

            comm_str = str(row.get("Total Earnings", 0) or row.get("Earnings", 0) or row.get("commission", 0)).replace("$", "").replace(",", "")
            commission = float(comm_str) if comm_str else 0.0

            if tid in result:
                existing = result[tid]
                result[tid] = TrackingIdPerformance(
                    tracking_id=tid,
                    category_label=category if category != "General" else existing.category_label,
                    clicks=existing.clicks + clicks,
                    orders=existing.orders + orders,
                    shipped_revenue=existing.shipped_revenue + shipped_rev,
                    commission=existing.commission + commission
                )
            else:
                result[tid] = TrackingIdPerformance(
                    tracking_id=tid,
                    category_label=category,
                    clicks=clicks,
                    orders=orders,
                    shipped_revenue=shipped_rev,
                    commission=commission
                )

    return result


def write_epc_ranking_report(perf_list: list[TrackingIdPerformance]) -> Path:
    """输出 Markdown 格式的 EPC 归因与决策排名报告至 reports/epc_ranking.md。"""
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_file = REPORTS_DIR / "epc_ranking.md"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    total_clicks = sum(p.clicks for p in perf_list)
    total_orders = sum(p.orders for p in perf_list)
    total_revenue = sum(p.shipped_revenue for p in perf_list)
    total_commission = sum(p.commission for p in perf_list)
    overall_epc = total_commission / total_clicks if total_clicks > 0 else 0.0
    overall_cr = total_orders / total_clicks if total_clicks > 0 else 0.0

    lines = [
        f"# Amazon 联盟真实 EPC 归因与盈利排名报告",
        f"\n- **更新时间**: {now_str}",
        f"- **总点击数 (Clicks)**: {total_clicks:,}",
        f"- **总订单数 (Orders)**: {total_orders:,}",
        f"- **总成交 GMV**: ${total_revenue:,.2f}",
        f"- **总佣金收入**: **${total_commission:,.2f}**",
        f"- **全站加权 EPC**: **${overall_epc:.3f}** / Click (全站转化率: {overall_cr:.2%})",
        f"\n---\n",
        f"## 🏆 Tracking ID 真实盈利排行榜 (按 EPC 降序)",
        f"\n| Tracking ID | 品类分类 | 点击 | 订单 | 转化率 | GMV | 佣金 | 真实 EPC | 策略决策 |",
        f"|---|---|---|---|---|---|---|---|---|"
    ]

    for p in perf_list:
        action_tag, advice = p.recommendation
        badge = f"`{action_tag}`" if action_tag == "EXPAND" else action_tag
        lines.append(
            f"| `{p.tracking_id}` | {p.category_label} | {p.clicks:,} | {p.orders:,} | "
            f"{p.conversion_rate:.2%} | ${p.shipped_revenue:,.2f} | **${p.commission:,.2f}** | "
            f"**${p.epc:.3f}** | **{badge}** {advice} |"
        )

    lines.extend([
        f"\n---\n",
        f"## 💡 增长工程师决策行动清单",
        f"\n1. **【EXPAND 品类】**：对于 EPC > $0.30 的品类（如登山鞋、技术徒步包），立即在 `data/matrix.json` 中追加场景维度并放量生产叶子对比页。",
        f"2. **【OPTIMIZE 异常】**：对于 EPC < $0.10 且点击 > 500 的品类，在 `/best/[slug]` 对比表中置顶高单笔佣金商品（>$150），并强化第一名选品的 GEO 结论说服力。",
        f"3. **【24小时 Cookie 应对】**：全站持续强化 Lead Magnet 邮件捕获（ Checklist PDF），通过邮件自动化流建立 3-7 天的长周期购买触达。"
    ])

    with open(report_file, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    return report_file


def main() -> None:
    parser = argparse.ArgumentParser(description="Amazon 联盟真实 EPC 归因分析工具")
    parser.add_argument("--import", dest="csv_path", type=Path, help="Amazon Associates 订单报表 CSV 路径")
    parser.add_argument("--min-clicks", type=int, default=0, help="最低过滤点击数阈值")
    args = parser.parse_args()

    csv_file = args.csv_path or (DATA_DIR / "sample_amazon_orders.csv")
    if not csv_file.exists():
        print(f"[提示] 未提供外部 CSV 报表，正在创建样例对账数据: {csv_file}")
        # 创建标准的样例数据用于验证
        sample_rows = [
            {"Tracking ID": "jyu0a-20", "Category": "Hiking Boots", "Clicks": "1250", "Items Ordered": "112", "Shipped Revenue": "16240.00", "Total Earnings": "730.80"},
            {"Tracking ID": "jyu0a-tents-20", "Category": "Camping Tents", "Clicks": "840", "Items Ordered": "58", "Shipped Revenue": "14500.00", "Total Earnings": "652.50"},
            {"Tracking ID": "jyu0a-running-20", "Category": "Trail Running Shoes", "Clicks": "950", "Items Ordered": "65", "Shipped Revenue": "9750.00", "Total Earnings": "438.75"},
            {"Tracking ID": "jyu0a-packs-20", "Category": "Backpacking Daypacks", "Clicks": "620", "Items Ordered": "41", "Shipped Revenue": "6150.00", "Total Earnings": "276.75"},
        ]
        with open(csv_file, "w", encoding="utf-8-sig", newline="") as sf:
            w = csv.DictWriter(sf, fieldnames=["Tracking ID", "Category", "Clicks", "Items Ordered", "Shipped Revenue", "Total Earnings"])
            w.writeheader()
            w.writerows(sample_rows)

    perf_map = parse_amazon_report(csv_file)
    perf_list = [p for p in perf_map.values() if p.clicks >= args.min_clicks]
    # 按 EPC 降序排序
    perf_list.sort(key=lambda p: p.epc, reverse=True)

    print(f"\n[*] 联盟 EPC 归因计算完成 (共 {len(perf_list)} 个 Tracking ID 样本):")
    print(f"{'Tracking ID':<22} {'品类':<18} {'点击':>6} {'订单':>6} {'转化率':>8} {'GMV':>10} {'佣金':>9} {'EPC':>8}")
    print("-" * 92)

    for p in perf_list:
        print(f"{p.tracking_id:<22} {p.category_label:<18} {p.clicks:>6} {p.orders:>6} "
              f"{p.conversion_rate:>7.2%} ${p.shipped_revenue:>9.2f} ${p.commission:>8.2f} ${p.epc:>7.3f}")

    report_path = write_epc_ranking_report(perf_list)
    print(f"\n[OK] 完整 EPC 归因与决策排名报表已生成至: {report_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
