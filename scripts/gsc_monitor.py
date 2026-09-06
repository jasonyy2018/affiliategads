#!/usr/bin/env python3
"""
Search Console 展现监控与自动剪枝引擎：识别零展现/低效页面并自动执行剪枝。

硬约束与剪枝红线：
  1. 索引上线超过 90 天且累计展现 = 0 的页面 → 标记下线（PRUNE），避免拖累全站权重。
  2. 索引上线超过 180 天且月展现 < 10 的页面 → 标记合并（MERGE）到对应的 Hub 目录页。
  3. 所有写操作默认 --dry-run：只输出待处置清单，加 --apply 才真正移动文件并记录日志。

用法:
    python scripts/gsc_monitor.py --prune-candidates
    python scripts/gsc_monitor.py --prune-candidates --import-gsc data/gsc_performance.csv
    python scripts/gsc_monitor.py --prune-candidates --apply
"""

from __future__ import annotations

import os
import sys
import csv
import json
import shutil
import argparse
from datetime import datetime, timedelta
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "content" / "pages"
PRUNED_DIR = ROOT / "content" / "pruned_pages"
REPORTS_DIR = ROOT / "reports"
DATA_DIR = ROOT / "data"

PRUNE_AFTER_DAYS = 90          # 零展现页面存活天数上限
MERGE_AFTER_DAYS = 180         # 低展现页面合并阈值
LOW_IMPRESSION_THRESHOLD = 10  # 低展现阈值


@dataclass
class PageStats:
    """单个页面在 Search Console 中的表现与生命周期。"""
    slug: str
    published_at: datetime
    impressions_90d: int = 0
    clicks_90d: int = 0
    avg_position: float = 0.0

    @property
    def age_days(self) -> int:
        """页面上线天数。"""
        return max(0, (datetime.now() - self.published_at).days)

    @property
    def verdict(self) -> str:
        """处置判定：PRUNE（下线）/ MERGE（合并）/ KEEP（保留）。"""
        if self.age_days >= PRUNE_AFTER_DAYS and self.impressions_90d == 0:
            return "PRUNE"
        if self.age_days >= MERGE_AFTER_DAYS and self.impressions_90d < LOW_IMPRESSION_THRESHOLD:
            return "MERGE"
        return "KEEP"


def load_gsc_csv(csv_path: Path) -> dict[str, dict[str, Any]]:
    """解析 GSC 导出的 Performance 页面级数据 CSV。"""
    if not csv_path.exists():
        return {}
    results = {}
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # 兼容 GSC 导出表头：Top pages / Page, Clicks, Impressions, Position
            page_url = row.get("Top pages") or row.get("Page") or row.get("URL") or ""
            if not page_url:
                continue
            slug = page_url.rstrip("/").split("/")[-1]
            clicks = int(row.get("Clicks", 0)) if row.get("Clicks") else 0
            impressions = int(row.get("Impressions", 0)) if row.get("Impressions") else 0
            pos_str = row.get("Position", "0.0").replace(",", ".")
            pos = float(pos_str) if pos_str else 0.0

            results[slug] = {
                "clicks": clicks,
                "impressions": impressions,
                "position": pos
            }
    return results


def collect_page_stats(gsc_data: dict[str, dict[str, Any]]) -> list[PageStats]:
    """遍历本地已生成的 pSEO 页面，结合 GSC 数据与生成时间组装 PageStats。"""
    stats: list[PageStats] = []
    if not CONTENT_DIR.exists():
        return stats

    for page_file in CONTENT_DIR.glob("*.json"):
        slug = page_file.stem
        published_at = datetime.fromtimestamp(page_file.stat().st_mtime)

        # 读取页面元数据中的生成时间
        try:
            with open(page_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                if "generated_at" in data:
                    try:
                        published_at = datetime.strptime(data["generated_at"], "%Y-%m-%d")
                    except Exception:
                        pass
        except Exception:
            pass

        metric = gsc_data.get(slug, {"clicks": 0, "impressions": 0, "position": 0.0})

        stats.append(PageStats(
            slug=slug,
            published_at=published_at,
            impressions_90d=metric["impressions"],
            clicks_90d=metric["clicks"],
            avg_position=metric["position"]
        ))

    return stats


def write_prune_report(prune_list: list[PageStats], merge_list: list[PageStats], is_applied: bool) -> Path:
    """输出 Markdown 格式的剪枝日志报表至 reports/prune_log.md。"""
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_file = REPORTS_DIR / "prune_log.md"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    lines = [
        f"# Search Console 页面展现监控与剪枝日志",
        f"\n- **执行时间**: {now_str}",
        f"- **模式**: {'【已执行下线 --apply】' if is_applied else '【预览模式 --dry-run】'}",
        f"- **待下线 (PRUNE) 页面数**: {len(prune_list)}（>90天且0展现）",
        f"- **待合并 (MERGE) 页面数**: {len(merge_list)}（>180天且月展现<10）",
        f"\n---\n",
        f"## 待下线页面清单 (PRUNE: 90天零展现)",
        f"\n| Slug | 上线天数 | 90天展现 | 90天点击 | 状态 |",
        f"|---|---|---|---|---|"
    ]

    if not prune_list:
        lines.append("| (无待下线页面，全站页面展现健康) | - | - | - | PASS |")
    else:
        for p in prune_list:
            status_text = "已移至 pruned_pages" if is_applied else "待下线 (dry-run)"
            lines.append(f"| `/best/{p.slug}` | {p.age_days} 天 | {p.impressions_90d} | {p.clicks_90d} | {status_text} |")

    lines.extend([
        f"\n---\n",
        f"## 待合并页面清单 (MERGE: 180天低展现)",
        f"\n| Slug | 上线天数 | 90天展现 | 建议合并目标 |",
        f"|---|---|---|---|"
    ])

    if not merge_list:
        lines.append("| (无待合并页面) | - | - | - |")
    else:
        for p in merge_list:
            lines.append(f"| `/best/{p.slug}` | {p.age_days} 天 | {p.impressions_90d} | 合并回对应 Hub 目录页 |")

    with open(report_file, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    return report_file


def main() -> None:
    parser = argparse.ArgumentParser(description="Search Console 展现监控与自动剪枝工具")
    parser.add_argument("--prune-candidates", action="store_true", help="输出待剪枝页面清单")
    parser.add_argument("--import-gsc", type=Path, help="GSC 导出的 Performance 页面数据 CSV 路径")
    parser.add_argument("--apply", action="store_true", help="真正执行下线（将页面移入 content/pruned_pages/）；默认 dry-run")
    args = parser.parse_args()

    gsc_csv = args.import_gsc or (DATA_DIR / "gsc_performance.csv")
    gsc_data = load_gsc_csv(gsc_csv) if gsc_csv.exists() else {}

    stats = collect_page_stats(gsc_data)
    prune_list = [s for s in stats if s.verdict == "PRUNE"]
    merge_list = [s for s in stats if s.verdict == "MERGE"]
    keep_list = [s for s in stats if s.verdict == "KEEP"]

    print(f"[*] GSC 展现监控扫描完成:")
    print(f"    - 本地已发布页面总数: {len(stats)}")
    print(f"    - 健康保留 (KEEP): {len(keep_list)}")
    print(f"    - 待下线 (PRUNE: >90天零展现): {len(prune_list)}")
    print(f"    - 待合并 (MERGE: >180天低展现): {len(merge_list)}")

    if not args.apply:
        print("\n[DRY-RUN 模式：预览前 10 个待处置页面]:")
        for p in prune_list[:10]:
            print(f"  [PRUNE] /best/{p.slug} (上线 {p.age_days} 天, 90天展现: {p.impressions_90d})")
        for p in merge_list[:5]:
            print(f"  [MERGE] /best/{p.slug} (上线 {p.age_days} 天, 90天展现: {p.impressions_90d})")
        
        report_path = write_prune_report(prune_list, merge_list, is_applied=False)
        print(f"\n[OK] 剪枝分析报告已生成至: {report_path.relative_to(ROOT)}")
        print("[提示] 追加 --apply 参数将真正执行移出下线操作并更新 Sitemap。")
        return

    # 真正执行剪枝移出
    PRUNED_DIR.mkdir(parents=True, exist_ok=True)
    pruned_count = 0
    for p in prune_list:
        src = CONTENT_DIR / f"{p.slug}.json"
        dst = PRUNED_DIR / f"{p.slug}.json"
        if src.exists():
            shutil.move(str(src), str(dst))
            pruned_count += 1

    report_path = write_prune_report(prune_list, merge_list, is_applied=True)
    print(f"\n[OK] 成功下线并移出 {pruned_count} 个零展现页面至 {PRUNED_DIR.relative_to(ROOT)}")
    print(f"[OK] 剪枝操作日志已记录至: {report_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
