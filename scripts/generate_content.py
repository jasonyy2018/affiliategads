"""
AI 评测与桥梁落地页内容生成流水线
读取 data/products.json，调用 Claude API (或 OpenAI / Mock 兜底) 批量生成符合 Google Ads 质量分与高转化率的结构化内容。
输出至 /content/<slug>.json
"""

import os
import sys
import json
import argparse
from typing import Dict, Any, List, Optional
from pathlib import Path

# 确保控制台支持 UTF-8 打印
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# 简易环境变量解析器（零第三方依赖兼容）
def manual_load_dotenv(filepath: Path) -> None:
    if not filepath.exists():
        return
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip().strip("'\"")
            if k not in os.environ:
                os.environ[k] = v

try:
    from dotenv import load_dotenv
    load_dotenv()
    load_dotenv(".env.local")
except ImportError:
    manual_load_dotenv(Path(".env"))
    manual_load_dotenv(Path(".env.local"))

# 路径常量
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "products.json"
CONTENT_DIR = BASE_DIR / "content"

# 确保目录存在
CONTENT_DIR.mkdir(exist_ok=True, parents=True)


def build_system_prompt() -> str:
    return """You are a senior consumer electronics & outdoor gear review editor and Conversion Rate Optimization (CRO) expert.
Your task is to write high-converting, authoritative, objective, and deeply comprehensive hands-on product review landing pages.

CRITICAL REQUIREMENTS:
1. Language: 100% Natural, idiomatic US English only. STRICTLY ZERO Chinese or non-English characters.
2. Structure: Output ONLY a valid JSON object matching the requested schema. No markdown wrapping, no extra explanations.
3. Tone: Unbiased, highly informative, data-backed with specific numbers (weight, dimensions, durability), and strong editorial buyer authority.
"""


def build_user_prompt(product: Dict[str, Any]) -> str:
    return f"""Please generate a comprehensive, structured product review landing page JSON for this Amazon product:

[Product Data]
- ASIN: {product.get('asin')}
- Title: {product.get('title')}
- Brand: {product.get('brand')}
- Price: ${product.get('price')}
- Highlight: {product.get('highlight')}
- Specs: {json.dumps(product.get('specs', {}), ensure_ascii=False)}
- Lab Test Metric: {product.get('lab_test_quote')}
- Verified User Quote: {product.get('user_quote')}

Return ONLY a JSON object formatted exactly as follows:
{{
  "slug": "{product.get('slug')}",
  "asin": "{product.get('asin')}",
  "meta_title": "{product.get('brand')} {product.get('title', '')[:30]} Review (2026): Is It Worth Buying?",
  "meta_description": "In-depth testing and review of {product.get('title')}. See lab benchmarks, weight, pros, cons, and latest Amazon deals.",
  "headline": "{product.get('title')}: Comprehensive Hands-On Review",
  "subheadline": "We tested real-world performance, durability, and ergonomics. Here is our unbiased verdict.",
  "badge": "#1 TOP RATED 2026",
  "rating": 4.8,
  "rating_count": 12500,
  "quick_verdict": "A 2-3 sentence clear summary of whether this product is worth purchasing and its standout advantage.",
  "pros": [
    "Compelling pro 1 with specific spec",
    "Compelling pro 2 with specific spec",
    "Compelling pro 3 with specific spec",
    "Compelling pro 4 with specific spec"
  ],
  "cons": [
    "Objective minor drawback 1",
    "Objective minor drawback 2"
  ],
  "key_features": [
    {{
      "title": "Standout Feature 1",
      "description": "Detailed analysis of how this feature performs in testing.",
      "icon": "shield"
    }},
    {{
      "title": "Standout Feature 2",
      "description": "Detailed analysis of how this feature performs in testing.",
      "icon": "zap"
    }},
    {{
      "title": "Standout Feature 3",
      "description": "Detailed analysis of how this feature performs in testing.",
      "icon": "refresh"
    }}
  ],
  "specs": [
    {{"label": "Brand", "value": "{product.get('brand')}"}},
    {{"label": "Model / ASIN", "value": "{product.get('asin')}"}},
    {{"label": "List Price", "value": "${product.get('price')}"}}
  ],
  "comparison": {{
    "competitor_name": "Standard Industry Competitor",
    "rows": [
      {{"feature": "Build Quality & Materials", "our_product": "Premium Grade Construction", "competitor": "Standard Plastic/Nylon"}},
      {{"feature": "Laboratory Performance Benchmark", "our_product": "Exceeded Category Average by 25%", "competitor": "Baseline Standard"}},
      {{"feature": "Comfort & Ergonomics", "our_product": "Ergonomically Contoured", "competitor": "Basic Fit"}}
    ]
  }},
  "detailed_sections": [
    {{
      "heading": "Design, Ergonomics & Build Quality",
      "content": "Detailed paragraphs examining chassis materials, fit, and construction durability."
    }},
    {{
      "heading": "Real-World Performance & Laboratory Stress Testing",
      "content": "Comprehensive testing results with specific numbers, benchmarks, and field observations."
    }},
    {{
      "heading": "Who Is This Model Best Suited For?",
      "content": "Target buyer persona, recommended use cases, and who should consider alternatives."
    }}
  ],
  "faqs": [
    {{
      "question": "Is this product covered by official warranty?",
      "answer": "Yes, covered by standard manufacturer warranty when purchased through authorized sellers."
    }},
    {{
      "question": "How does this compare to previous generation models?",
      "answer": "Significant improvements in weight reduction, material durability, and overall ergonomics."
    }}
  ],
  "final_cta_heading": "Ready to Get the Best Deal on Amazon?",
  "final_cta_subtext": "Check today's real-time price, prime shipping eligibility, and customer reviews on Amazon."
}}
    {{
      "question": "常见买家疑问 3",
      "answer": "清晰直接的解答"
    }}
  ],
  "final_cta_heading": "Ready to Experience Premium Quality?",
  "final_cta_subtext": "Check live inventory, latest discounts and customer reviews on Amazon."
}}
"""


def generate_with_anthropic(product: Dict[str, Any], api_key: str) -> Dict[str, Any]:
    """使用 Anthropic Claude API 生成内容"""
    import anthropic
    client = anthropic.Anthropic(api_key=api_key)
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(product)

    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=4000,
        temperature=0.7,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}]
    )
    raw_content = message.content[0].text.strip()
    # 清理 markdown 代码块标记
    if raw_content.startswith("```json"):
        raw_content = raw_content[7:]
    if raw_content.startswith("```"):
        raw_content = raw_content[3:]
    if raw_content.endswith("```"):
        raw_content = raw_content[:-3]
    return json.loads(raw_content.strip())


def generate_with_openai(product: Dict[str, Any], api_key: str) -> Dict[str, Any]:
    """使用 OpenAI GPT-4o 生成内容"""
    from openai import OpenAI
    client = OpenAI(api_key=api_key)
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(product)

    response = client.chat.completions.create(
        model="gpt-4o",
        temperature=0.7,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        response_format={"type": "json_object"}
    )
    raw_content = response.choices[0].message.content or "{}"
    return json.loads(raw_content)


def generate_with_custom(
    product: Dict[str, Any],
    base_url: str,
    api_key: str,
    model_name: str,
    protocol: str = "openai"
) -> Dict[str, Any]:
    """使用第三方自定义 API (支持 DeepSeek, OpenRouter, SiliconFlow, OneAPI, 自建代理等) 生成内容"""
    import urllib.request
    import urllib.error
    import ssl

    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(product)

    clean_base = base_url.strip().rstrip("/") if base_url else "https://api.openai.com/v1"
    target_model = model_name.strip() if model_name else "deepseek-chat"

    ctx = ssl.create_default_context()

    if protocol == "anthropic":
        url = f"{clean_base}/messages"
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": target_model,
            "max_tokens": 4000,
            "temperature": 0.7,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
        }
        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
        with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            raw = data["content"][0]["text"].strip()
    else:
        # OpenAI 兼容协议 (DeepSeek / OpenRouter / OneAPI / SiliconFlow)
        url = f"{clean_base}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": target_model,
            "temperature": 0.7,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "response_format": {"type": "json_object"}
        }
        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
        with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            raw = data["choices"][0]["message"]["content"].strip()

    # 规范化清理
    if raw.startswith("```json"):
        raw = raw[7:]
    if raw.startswith("```"):
        raw = raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3]
    return json.loads(raw.strip())


def generate_mock_content(product: Dict[str, Any]) -> Dict[str, Any]:
    """高质量 Mock 数据生成器（当无 API Key 或处于快速测试模式时使用）"""
    title = product.get("title", "")
    brand = product.get("brand", "")
    price = product.get("price", 0.0)
    slug = product.get("slug", "item")
    asin = product.get("asin", "")

    if "WH-1000XM5" in title:
        return {
            "slug": slug,
            "asin": asin,
            "meta_title": "Sony WH-1000XM5 In-Depth Review (2026): Is It Worth $398?",
            "meta_description": "Full hands-on test of the Sony WH-1000XM5 Wireless ANC Headphones. See noise cancellation score, battery life, pros, cons, and latest Amazon deals.",
            "headline": "Sony WH-1000XM5 Review: The Undisputed King of Noise Cancellation?",
            "subheadline": "We tested Sony's flagship ANC headphones across flights, open offices, and daily commutes. Here is the unbiased breakdown.",
            "badge": "EDITORS CHOICE 2026",
            "rating": 4.9,
            "rating_count": 18450,
            "quick_verdict": "The Sony WH-1000XM5 sets the benchmark for active noise cancellation and call clarity in 2026. If you want supreme comfort, 30-hour battery, and near-total silence on demand, this is the smartest investment you can make.",
            "pros": [
                "Industry-best Auto NC Optimizer with 8 microphones",
                "Featherlight 250g chassis with pressure-free soft leather",
                "Outstanding 30-hour battery life with 3-min quick charge",
                "Unrivaled 4-mic AI beamforming voice pickup for crisp calls"
            ],
            "cons": [
                "Non-folding headband requires a slightly larger carry case",
                "Premium price tag compared to older XM4 generation"
            ],
            "key_features": [
                {
                    "title": "Dual-Processor Noise Canceling",
                    "description": "Integrated V1 processor coupled with HD Noise Canceling Processor QN1 for unprecedented mid-to-high frequency isolation.",
                    "icon": "shield"
                },
                {
                    "title": "High-Res Wireless & LDAC",
                    "description": "Specially engineered 30mm carbon-fiber driver units reproduce authentic studio-quality sound without distortion.",
                    "icon": "zap"
                },
                {
                    "title": "Smart Multipoint Bluetooth 5.2",
                    "description": "Seamlessly pairs with your laptop and phone simultaneously, switching effortlessly when an incoming call rings.",
                    "icon": "refresh"
                },
                {
                    "title": "30-Hour Rapid-Fuel Battery",
                    "description": "Lasts all week on a single charge. Running late? A 3-minute USB-PD charge gives you 3 full hours of playback.",
                    "icon": "battery"
                }
            ],
            "specs": [
                {"label": "Brand", "value": brand},
                {"label": "Driver Size", "value": "30mm Carbon Fiber"},
                {"label": "Weight", "value": "250g (8.8 oz)"},
                {"label": "Battery Life", "value": "Up to 30 hours (ANC On) / 40h (ANC Off)"},
                {"label": "Connectivity", "value": "Bluetooth 5.2 (LDAC, AAC, SBC)"},
                {"label": "Fast Charge", "value": "3 min = 3 hours playback"}
            ],
            "comparison": {
                "competitor_name": "Bose QuietComfort Ultra",
                "rows": [
                    {"feature": "Noise Cancellation Depth", "our_product": "9.8/10 (Adaptive Auto Optimizer)", "competitor": "9.5/10 (Standard ANC)"},
                    {"feature": "Battery Life", "our_product": "30 Hours ANC On", "competitor": "24 Hours ANC On"},
                    {"feature": "Microphone Wind Noise Rejection", "our_product": "4 Beamforming + AI Algorithm", "competitor": "Standard Dual Mic"},
                    {"feature": "Weight", "our_product": "250 grams", "competitor": "253 grams"}
                ]
            },
            "detailed_sections": [
                {
                    "heading": "Acoustic Performance & ANC Benchmark",
                    "content": "In our rigorous decibel-chamber and subway tests, the WH-1000XM5 obliterated low rumble airplane engine hums and high-pitched office chatter. The dual V1 + QN1 architecture actively analyzes atmospheric pressure and hair/glass seal every millisecond."
                },
                {
                    "heading": "All-Day Ergonomics & Wearability",
                    "content": "Sony ditched the traditional bulky hinge in favor of a silent stepless slider and newly developed soft-fit synthetic leather. Clamping force is dialed in to perfection, preventing top-of-skull fatigue even during 8-hour international flights."
                },
                {
                    "heading": "Who Should Buy The Sony WH-1000XM5?",
                    "content": "Frequent flyers, remote knowledge workers on constant Zoom calls, audiophiles seeking LDAC wireless transmission, and anyone demanding undisturbed focus in bustling open-space environments."
                }
            ],
            "faqs": [
                {
                    "question": "Can I use the Sony WH-1000XM5 while charging?",
                    "answer": "No, but thanks to USB-PD quick charging, plugging it in for just 3 minutes gives you up to 3 hours of playtime."
                },
                {
                    "question": "Does it work seamlessly with iPhone and Android?",
                    "answer": "Yes. It supports AAC for iOS devices and LDAC/SBC for Android and Windows PCs with multipoint dual-device pairing."
                },
                {
                    "question": "How does it compare to the older WH-1000XM4?",
                    "answer": "The XM5 delivers significantly superior microphone call quality, lighter weight, faster ambient sound reaction, and cleaner vocal resolution."
                }
            ],
            "final_cta_heading": "Ready to Elevate Your Daily Listening Experience?",
            "final_cta_subtext": "Check today's real-time price, prime delivery eligibility and verified buyer reviews on Amazon."
        }
    else:
        # 通用 Mock
        return {
            "slug": slug,
            "asin": asin,
            "meta_title": f"{title[:50]} Review (2026)",
            "meta_description": f"Comprehensive review and buying guide for {title}. Check specs, real pros & cons, and current Amazon pricing.",
            "headline": f"{title} - Complete 2026 Hands-On Review",
            "subheadline": f"An in-depth analysis of {brand}'s top-performing product.",
            "badge": "HIGHLY RECOMMENDED",
            "rating": 4.7,
            "rating_count": 9320,
            "quick_verdict": f"The {title} combines rock-solid durability with outstanding value. A reliable top contender in its category.",
            "pros": product.get("bullets", [])[:3],
            "cons": ["Slight learning curve for first-time users", "Accessories sold separately"],
            "key_features": [
                {"title": "High Efficiency", "description": "Designed for maximum output with minimal hassle.", "icon": "zap"},
                {"title": "Durable Construction", "description": "Built with commercial-grade materials.", "icon": "shield"}
            ],
            "specs": [
                {"label": "Brand", "value": brand},
                {"label": "Model / ASIN", "value": asin},
                {"label": "Retail Price", "value": f"${price}"}
            ],
            "comparison": {
                "competitor_name": "Standard Generic Alternative",
                "rows": [
                    {"feature": "Build Quality", "our_product": "Premium Grade", "competitor": "Plastic"},
                    {"feature": "Warranty", "our_product": "Official Guarantee", "competitor": "90 Days"}
                ]
            },
            "detailed_sections": [
                {"heading": "Performance & Real-World Use", "content": "Delivers consistent results across standard daily testing cycles."}
            ],
            "faqs": [
                {"question": "Is this covered by manufacturer warranty?", "answer": "Yes, covered by standard official manufacturer warranty when purchased through authorized sellers."}
            ],
            "final_cta_heading": "Check Live Price & Fast Shipping on Amazon",
            "final_cta_subtext": "Click below to see current promotions and user feedback."
        }


def process_product(product: Dict[str, Any], model_choice: str, dry_run: bool) -> None:
    """处理单个商品并生成对应的 content/<slug>.json"""
    slug = product.get("slug")
    if not slug:
        print(f"[-] 跳过无 slug 商品: {product.get('asin')}")
        return

    print(f"\n[+] 正在处理商品: {slug} (ASIN: {product.get('asin')})")

    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
    openai_key = os.getenv("OPENAI_API_KEY", "")
    custom_key = os.getenv("CUSTOM_AI_API_KEY", "")
    custom_base = os.getenv("CUSTOM_AI_BASE_URL", "")
    custom_model = os.getenv("CUSTOM_AI_MODEL", "deepseek-chat")
    custom_proto = os.getenv("CUSTOM_AI_PROTOCOL", "openai")

    content: Dict[str, Any] = {}

    if model_choice == "custom" or (model_choice == "auto" and custom_key and len(custom_key) > 5):
        print(f"  -> 使用第三方自定义 API ({custom_model} @ {custom_base or 'default'}) 生成...")
        try:
            content = generate_with_custom(product, custom_base, custom_key, custom_model, custom_proto)
        except Exception as e:
            print(f"  [!] 自定义 API 生成异常 ({e})，切换为 Mock 模式兜底")
            content = generate_mock_content(product)
    elif model_choice == "claude" or (model_choice == "auto" and anthropic_key.startswith("sk-ant-") and len(anthropic_key) > 20):
        print("  -> 使用 Claude 3.5 Sonnet 生成...")
        try:
            content = generate_with_anthropic(product, anthropic_key)
        except Exception as e:
            print(f"  [!] Claude 生成异常 ({e})，切换为 Mock 模式兜底")
            content = generate_mock_content(product)
    elif model_choice == "openai" or (model_choice == "auto" and openai_key.startswith("sk-") and len(openai_key) > 20):
        print("  -> 使用 OpenAI GPT-4o 生成...")
        try:
            content = generate_with_openai(product, openai_key)
        except Exception as e:
            print(f"  [!] OpenAI 生成异常 ({e})，切换为 Mock 模式兜底")
            content = generate_mock_content(product)
    else:
        print("  -> 未配置可用 AI Key，使用内置专家级 Mock 模板生成高质量内容...")
        content = generate_mock_content(product)

    # 注入商品基础元数据
    content["product_info"] = {
        "title": product.get("title"),
        "brand": product.get("brand"),
        "price": product.get("price"),
        "commission_rate": product.get("commission_rate"),
        "image_url": product.get("image_url"),
        "asin": product.get("asin")
    }

    if dry_run:
        print(f"  [DRY-RUN] 预览生成的结构:")
        print(f"    - Title: {content.get('meta_title')}")
        print(f"    - Rating: {content.get('rating')} ({content.get('rating_count')} reviews)")
        print(f"    - Pros count: {len(content.get('pros', []))}")
        print(f"    - FAQs count: {len(content.get('faqs', []))}")
        return

    output_file = CONTENT_DIR / f"{slug}.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(content, f, indent=2, ensure_ascii=False)
    print(f"  [OK] 成功写入落地页内容: {output_file.relative_to(BASE_DIR)}")


def main():
    parser = argparse.ArgumentParser(description="桥梁落地页 AI 内容生成流水线")
    parser.add_argument("--slug", type=str, help="指定生成单一商品的 slug")
    parser.add_argument("--all", action="store_true", help="批量生成 products.json 中的所有商品")
    parser.add_argument("--model", type=str, default="auto", choices=["auto", "claude", "openai", "custom", "mock"], help="AI 模型选择")
    parser.add_argument("--dry-run", action="store_true", help="演练模式，不写入文件")

    args = parser.parse_args()

    if not DATA_PATH.exists():
        print(f"[!] 找不到商品文件: {DATA_PATH}")
        return

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        products: List[Dict[str, Any]] = json.load(f)

    if args.slug:
        matched = [p for p in products if p.get("slug") == args.slug]
        if not matched:
            print(f"[!] 未找到 slug 为 '{args.slug}' 的商品")
            return
        for p in matched:
            process_product(p, args.model, args.dry_run)
    elif args.all or True:  # 默认处理
        print(f"[*] 共发现 {len(products)} 个待生成商品")
        for p in products:
            process_product(p, args.model, args.dry_run)


if __name__ == "__main__":
    main()
