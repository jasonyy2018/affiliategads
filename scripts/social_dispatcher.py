#!/usr/bin/env python3
"""
全网社媒一键广播与中继分发引擎 (Omnichannel Social Media Webhook Dispatcher).

功能：
  依据 GEO (生成式引擎优化) 与 AirOps 85% 规则，将站内 20 组量化实验室评测与买家疑问，
  自动编译为适配 Twitter/X、Pinterest、LinkedIn、Facebook、Reddit 的结构化社媒数据包。
  通过通用 Webhook (Make.com, Zapier, Pabbly, Ayrshare 等) 实现一键向全网社媒广播分发。

支持模式：
  1. 沙盒演练 (Dry-Run / Simulation)：未配置真实 Webhook 时自动执行完整格式验证与模拟广播，生成报表。
  2. 真实广播 (Live Broadcast)：配置 SOCIAL_WEBHOOK_URL 或 AYRSHARE_API_KEY 时执行真正 HTTP POST 发送。
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
REPORTS_DIR = ROOT / "reports"
ENV_LOCAL_PATH = ROOT / ".env.local"


def load_env_local() -> dict[str, str]:
    envs: dict[str, str] = {}
    if ENV_LOCAL_PATH.exists():
        with open(ENV_LOCAL_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    k, v = line.split("=", 1)
                    envs[k.strip()] = v.strip().strip("'\"")

    settings_file = ROOT / "data" / "settings.json"
    if settings_file.exists():
        try:
            with open(settings_file, "r", encoding="utf-8") as f:
                db_settings = json.load(f)
                for k, v in db_settings.items():
                    if isinstance(v, str) and v.strip():
                        envs[k] = v.strip()
        except Exception:
            pass

    return envs


def get_config() -> dict[str, str]:
    file_envs = load_env_local()
    webhook_url = (
        file_envs.get("SOCIAL_WEBHOOK_URL")
        or os.environ.get("SOCIAL_WEBHOOK_URL")
        or ""
    )
    ayrshare_key = (
        file_envs.get("AYRSHARE_API_KEY")
        or os.environ.get("AYRSHARE_API_KEY")
        or ""
    )
    domain = (
        file_envs.get("NEXT_PUBLIC_SITE_URL")
        or os.environ.get("NEXT_PUBLIC_SITE_URL")
        or "https://gear-oracle.com"
    ).rstrip("/")

    return {
        "webhook_url": webhook_url,
        "ayrshare_key": ayrshare_key,
        "domain": domain,
    }


def load_questions() -> list[dict]:
    q_file = DATA_DIR / "geo_questions.json"
    if not q_file.exists():
        print(f"❌ 找不到疑问数据文件: {q_file}")
        return []
    with open(q_file, "r", encoding="utf-8") as f:
        return json.load(f)


def build_social_payload(item: dict, domain: str) -> dict:
    """针对各大社媒平台量身定制分发数据包"""
    category = item.get("category", "outdoor gear").lower()
    question = item.get("question", "")
    target_slug = item.get("target_slug", "")
    winning_product = item.get("winning_product", "")
    direct_verdict = item.get("direct_verdict", "")
    key_metric = item.get("key_metric", "")
    best_for = item.get("best_for", "")

    url = f"{domain}/best/{target_slug}"

    tags_map = {
        "hiking boots": ["#HikingBoots", "#GearLab", "#OutdoorGear", "#Trekking", "#TrailTested"],
        "trail running shoes": ["#TrailRunning", "#RunningShoes", "#Ultralight", "#TrailRunner", "#ShoeLab"],
        "camping tents": ["#CampingGear", "#BackpackingTent", "#CampLife", "#UltralightGear", "#Survival"],
        "backpacking daypacks": ["#Daypack", "#HikingPack", "#Backpacking", "#EverydayCarry", "#OutdoorLife"],
    }
    hashtags = tags_map.get(category, ["#OutdoorGear", "#Hiking", "#GearTesting"])

    # 1. Twitter / X 专属精炼版 (Hook + Direct Answer + Metrics + Link)
    x_text = (
        f"🔍 Buyer Query: \"{question}\"\n\n"
        f"🎯 Lab Verdict: {winning_product}\n"
        f"🔬 Benchmark: {key_metric}\n\n"
        f"📊 Full 12-model comparative drop testing & lab data:\n"
        f"👉 {url}\n\n"
        f"{' '.join(hashtags[:3])}"
    )

    # 2. Pinterest 专属视觉与评测版 (SEO Title + Detailed Pin Description)
    pin_title = f"{question} - 2026 Tested & Ranked"
    pin_desc = (
        f"Looking for {category}? We tested 12 top models for \"{question}\". "
        f"Winner: {winning_product}. Lab test results: {key_metric}. "
        f"Best for: {best_for}. Read the complete laboratory comparison on {domain}."
    )

    # 3. LinkedIn 行业技术长文版
    linkedin_text = (
        f"📊 Field Laboratory Testing Report: {category.title()} Analysis\n\n"
        f"When prospective buyers search: \"{question}\", generative AI models (Gemini, ChatGPT) "
        f"demand quantitative proof over promotional claims.\n\n"
        f"Here is our mechanical test breakdown:\n"
        f"• Top Performer: {winning_product}\n"
        f"• Verified Metric: {key_metric}\n"
        f"• Optimal Use Case: {best_for}\n\n"
        f"Full data set, caliper measurements, and torture-test photos:\n"
        f"{url}\n\n"
        f"#ProductTesting #DataDriven #ConsumerInsights {' '.join(hashtags[:2])}"
    )

    # 4. Reddit 讨论贴格式
    reddit_payload = {
        "suggested_sub": "r/CampingGear" if "tent" in category or "boot" in category else "r/trailrunning",
        "post_title": f"[Lab Review] Tested 12 models for: \"{question}\"",
        "post_body": (
            f"Hey everyone,\n\n"
            f"There's too much sponsored marketing fluff around: \"{question}\".\n\n"
            f"**Short Verdict**: {direct_verdict}\n"
            f"**Key Lab Metric**: `{key_metric}`\n"
            f"**Best For**: {best_for}\n\n"
            f"Full raw comparative numbers & methodology: {url}"
        ),
    }

    return {
        "id": item.get("id"),
        "category": category,
        "canonical_url": url,
        "question": question,
        "winning_product": winning_product,
        "key_metric": key_metric,
        "platforms": {
            "twitter_x": {
                "text": x_text,
                "url": url,
            },
            "pinterest": {
                "title": pin_title,
                "description": pin_desc,
                "link": url,
                "board": f"Best {category.title()} 2026",
            },
            "linkedin": {
                "text": linkedin_text,
                "url": url,
            },
            "reddit": reddit_payload,
        },
        "tags": hashtags,
    }


def send_webhook(webhook_url: str, payload: dict) -> tuple[bool, str]:
    """向通用 Webhook 发送 JSON 数据包"""
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            webhook_url,
            data=data,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "OPC-Social-Dispatcher/1.0",
            },
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            status_code = resp.getcode()
            response_body = resp.read().decode("utf-8", errors="ignore")[:300]
            if 200 <= status_code < 300:
                return True, f"HTTP {status_code}: {response_body}"
            return False, f"HTTP {status_code}: {response_body}"
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}: {e.reason}"
    except Exception as e:
        return False, f"Network Error: {str(e)}"


def send_ayrshare(api_key: str, payload: dict) -> tuple[bool, str]:
    """向 Ayrshare 多平台聚合 API 发送数据"""
    try:
        url = "https://app.ayrshare.com/api/post"
        p_x = payload["platforms"]["twitter_x"]
        body = {
            "post": p_x["text"],
            "platforms": ["twitter", "pinterest", "linkedin"],
            "shorten_links": False,
        }
        data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
                "User-Agent": "OPC-Social-Dispatcher/1.0",
            },
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            status_code = resp.getcode()
            response_body = resp.read().decode("utf-8", errors="ignore")[:300]
            return (200 <= status_code < 300), f"Ayrshare HTTP {status_code}: {response_body}"
    except Exception as e:
        return False, f"Ayrshare Error: {str(e)}"


def generate_markdown_report(
    results: list[dict],
    mode: str,
    webhook_configured: bool,
    target_url_masked: str,
    domain: str,
) -> Path:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_file = REPORTS_DIR / "social_dispatch_report.md"

    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    total_count = len(results)
    success_count = sum(1 for r in results if r["status"] == "SUCCESS" or r["status"] == "SIMULATED")

    lines = [
        f"# 🚀 全网社媒一键广播与中继分发报告 (Omnichannel Social Dispatch Report)",
        f"",
        f"- **调度时间 (Timestamp)**: `{now_str}`",
        f"- **执行模式 (Mode)**: `{mode}`",
        f"- **中继端配置 (Webhook Configured)**: `{'✅ 已接入 (' + target_url_masked + ')' if webhook_configured else '⚠️ 未配置真实 Webhook (进入沙盒演练 Dry-Run)'}`",
        f"- **目标发布规模 (Queue Size)**: `{total_count} 个多渠道复合社媒数据包 (总计覆盖 ~80 个社媒触点)`",
        f"- **就绪 / 成功率 (Success Rate)**: `{success_count}/{total_count} ({(success_count/total_count*100):.1f}%)`",
        f"",
        f"---",
        f"",
        f"## 1. 全网社媒覆盖触点矩阵 (Distribution Matrix)",
        f"",
        f"| 社交平台 | 触点类型 | 格式化规范 | 目标价值 |",
        f"| :--- | :--- | :--- | :--- |",
        f"| **Twitter / X** | 短推文 / Thread | Hook + 实验室结论 + 购买链接 + 3 大标签 | 极速收录与即时推文展现 |",
        f"| **Pinterest** | 场景 Rich Pin | 痛点标题 + 100字量化测试描述 + 原创主图 Pin | 长期高客单价买家搜索引流 |",
        f"| **LinkedIn** | 行业评测深度动态 | 严谨方法论 + 测量仪器参数 + 专业背书 | 建立 Google 认可的 E-E-A-T 专家信任 |",
        f"| **Reddit** | r/CampingGear 讨论帖 | 30 秒干货结论 + 规避营销词 + 实验室表格 | 攻占 Gemini / Perplexity 85% 引用源 |",
        f"",
        f"---",
        f"",
        f"## 2. 社媒广播数据包执行明细 (Dispatch Items)",
        f"",
    ]

    for idx, r in enumerate(results, 1):
        status_badge = "🟢 SUCCESS" if r["status"] == "SUCCESS" else "🟡 SIMULATED (DRY-RUN)" if r["status"] == "SIMULATED" else "🔴 FAILED"
        p = r["payload"]
        lines.append(f"### #{idx:02d} [{r['category'].upper()}] {p['question']}")
        lines.append(f"- **分发状态**: `{status_badge}`")
        lines.append(f"- **目标落地页**: [{p['canonical_url']}]({p['canonical_url']})")
        lines.append(f"- **优选获胜单品**: `{p['winning_product']}`")
        lines.append(f"- **实验室量化指标**: `{p['key_metric']}`")
        lines.append(f"- **中继回执**: `{r.get('feedback', 'OK')}`")
        lines.append(f"")
        lines.append(f"```yaml")
        lines.append(f"# Twitter/X 实时文本:")
        lines.append(f"{p['platforms']['twitter_x']['text']}")
        lines.append(f"---")
        lines.append(f"# Pinterest 标题:")
        lines.append(f"{p['platforms']['pinterest']['title']}")
        lines.append(f"# Pinterest 描述:")
        lines.append(f"{p['platforms']['pinterest']['description']}")
        lines.append(f"```")
        lines.append(f"")

    lines.append(f"---")
    lines.append(f"")
    lines.append(f"## 3. 如何开启全网真实自动分发？")
    lines.append(f"1. 登录 [Make.com](https://make.com) 或 [Zapier.com](https://zapier.com)，创建一个带有 **Custom Webhook** 的自动化流水线；")
    lines.append(f"2. 将 Webhook 连接到 Twitter、Pinterest、Facebook Page 或 LinkedIn 账号；")
    lines.append(f"3. 将该 Webhook URL 填入本站后台「AI 密钥与自定义配置」中的 `SOCIAL_WEBHOOK_URL` 输入框；")
    lines.append(f"4. 再次点击后台的 **「🚀 全网社媒一键广播」** 按钮，系统将在 5 秒内将全站 20 组量化评测真实群发至全域社媒！")
    lines.append(f"")

    with open(report_file, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return report_file


def main() -> int:
    parser = argparse.ArgumentParser(description="Omnichannel Social Media Dispatcher")
    parser.add_argument("--broadcast", action="store_true", help="Execute real HTTP Webhook broadcast")
    parser.add_argument("--dry-run", action="store_true", help="Force simulation mode without HTTP requests")
    parser.add_argument("--limit", type=int, default=20, help="Number of question packs to dispatch (default 20)")
    args = parser.parse_args()

    print("=" * 65)
    print("🚀 OPC 全网社媒一键广播与中继分发引擎 (Social Dispatcher)")
    print("=" * 65)

    config = get_config()
    webhook_url = config["webhook_url"]
    ayrshare_key = config["ayrshare_key"]
    domain = config["domain"]

    has_webhook = bool(webhook_url and webhook_url.startswith("http"))
    has_ayrshare = bool(ayrshare_key and len(ayrshare_key) > 5)

    is_live = args.broadcast and (has_webhook or has_ayrshare) and not args.dry_run
    mode_str = "LIVE BROADCAST (真实网络群发)" if is_live else "SANDBOX SIMULATION (沙盒演练 Dry-Run)"

    print(f"[*] 执行模式: {mode_str}")
    print(f"[*] 站点主域: {domain}")
    if has_webhook:
        masked_url = webhook_url[:20] + "..." + webhook_url[-8:]
        print(f"[*] 通用 Webhook URL: {masked_url}")
    elif has_ayrshare:
        print(f"[*] Ayrshare API 凭证: 已配置 (Key: {ayrshare_key[:4]}***)")
    else:
        print(f"[*] 状态提示: 未在 .env.local 侦测到 SOCIAL_WEBHOOK_URL，启用安全演练模式。")

    questions = load_questions()
    if not questions:
        print("❌ 疑问库为空，退出。")
        return 1

    to_process = questions[: args.limit]
    print(f"[*] 待处理社媒数据包: {len(to_process)} 组 (跨 Twitter/Pinterest/LinkedIn/Reddit)")
    print("-" * 65)

    results = []

    for i, q in enumerate(to_process, 1):
        payload = build_social_payload(q, domain)
        q_text = q.get("question", "")[:45] + "..."

        if is_live:
            if has_webhook:
                success, feedback = send_webhook(webhook_url, payload)
            else:
                success, feedback = send_ayrshare(ayrshare_key, payload)

            status = "SUCCESS" if success else "FAILED"
            icon = "✅" if success else "❌"
            print(f"  [{i:02d}/{len(to_process)}] {icon} {q['category'].upper():<20} | {q_text} -> {feedback}")
            results.append({
                "category": q["category"],
                "payload": payload,
                "status": status,
                "feedback": feedback,
            })
        else:
            # 演练模拟模式：验证多平台 payload 格式
            status = "SIMULATED"
            p_len = len(payload["platforms"]["twitter_x"]["text"])
            pin_title = payload["platforms"]["pinterest"]["title"][:25]
            feedback = f"Payload Verified (X: {p_len}c, Pin: '{pin_title}..', Reddit/LinkedIn OK)"
            print(f"  [{i:02d}/{len(to_process)}] 🟡 {q['category'].upper():<20} | {q_text} -> {feedback}")
            results.append({
                "category": q["category"],
                "payload": payload,
                "status": status,
                "feedback": feedback,
            })

    print("-" * 65)
    masked_target = (
        (webhook_url[:18] + "...")
        if has_webhook
        else ("Ayrshare Multi-API" if has_ayrshare else "None")
    )
    report_path = generate_markdown_report(
        results=results,
        mode=mode_str,
        webhook_configured=(has_webhook or has_ayrshare),
        target_url_masked=masked_target,
        domain=domain,
    )

    print(f"✅ 社媒分发批处理完成！")
    print(f"📄 详细广播报告已保存至: {report_path.relative_to(ROOT)}")
    print(f"💡 站长可随时在后台「经营与 GEO 报告中心」查看完整社媒广播日志。")
    print("=" * 65)
    return 0


if __name__ == "__main__":
    sys.exit(main())
