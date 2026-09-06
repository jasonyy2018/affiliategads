#!/usr/bin/env python3
"""
一人公司 (OPC) 每日全自动统一调度流水线 (Cron Pipeline Runner)。

执行顺序：
  1. GSC 展现监控与零展现下线审计 (scripts/gsc_monitor.py)
  2. 亚马逊真实联盟订单对账与 EPC 商业归因 (scripts/epc_tracker.py)
  3. GEO (普林斯顿 KDD 模型) AI 引用可见度扫描 (scripts/geo_optimizer.py)
  4. 生成每日最终经营决策看板 (scripts/daily_report.py)

用法:
    python scripts/cron_runner.py
    python scripts/cron_runner.py --apply
"""

from __future__ import annotations

import os
import sys
import subprocess
import time
from datetime import datetime
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT / "scripts"
REPORTS_DIR = ROOT / "reports"


def run_step(step_name: str, script_file: str, args: list[str] | None = None) -> bool:
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] 🚀 正在执行流水线: {step_name} ({script_file})...")
    cmd = [sys.executable, str(SCRIPTS_DIR / script_file)]
    if args:
        cmd.extend(args)

    start_t = time.time()
    try:
        res = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
        elapsed = time.time() - start_t
        if res.returncode == 0:
            print(f"  ✅ {step_name} 执行成功 (耗时 {elapsed:.2f}s)")
            return True
        else:
            print(f"  ❌ {step_name} 退出异常 (Code: {res.returncode}):\n{res.stderr.strip()}")
            return False
    except Exception as e:
        print(f"  ❌ {step_name} 抛出异常: {e}")
        return False


def main() -> None:
    print("=" * 80)
    print(f"🏆 一人公司 (OPC) 自动化运维流水线启动: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)

    apply_flag = "--apply" in sys.argv

    # 步骤 1: GSC 监控与自动剪枝
    gsc_args = ["--apply"] if apply_flag else ["--prune-candidates"]
    run_step("1. Search Console 展现监控与零展现剪枝", "gsc_monitor.py", gsc_args)

    # 步骤 2: Amazon 真实订单与 EPC 归因计算
    run_step("2. 亚马逊联盟真实 EPC 商业归因与盈利对账", "epc_tracker.py")

    # 步骤 3: GEO AI 可见度与普林斯顿模型审计
    run_step("3. 全站 GEO AI 引擎引用合规度扫描", "geo_optimizer.py")

    # 步骤 4: SERP 双引擎排名监测
    run_step("4. Google 与 Bing 双引擎排名快照追踪", "serp_tracker.py")

    # 步骤 5: 跨平台第三方信任证据链自动生成 (Reddit / Medium / Quora)
    run_step("5. 跨平台第三方信任证据链派生", "trust_syndicate.py")

    # 步骤 6: Gemini / AI Overview 实时引用审计
    run_step("6. Gemini / AI Overview 实时引用审计", "gemini_live_checker.py")

    # 步骤 7: 生成每日综合经营看板
    run_step("7. 汇总生成一人公司每日经营看板", "daily_report.py")

    daily_report_path = REPORTS_DIR / "daily_report.md"
    gemini_audit_path = REPORTS_DIR / "gemini_citation_audit.md"
    print("\n" + "=" * 80)
    print(f"🎉 每日全自动运维流水线全部执行完毕！")
    print(f"📄 今日经营报告已就绪: {daily_report_path.relative_to(ROOT)}")
    print(f"📄 今日 Gemini 审计已就绪: {gemini_audit_path.relative_to(ROOT)}")
    print("=" * 80)


if __name__ == "__main__":
    main()
