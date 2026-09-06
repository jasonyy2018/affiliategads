# PrimeReviewLab — pSEO + GEO Affiliate Engine

Next.js 16 联盟营销站点：pSEO 矩阵对比页 + GEO (AI 引擎可见度) 优化 + 原生 TypeScript 自动化引擎。

## 架构

```
app/                    Next.js App Router
  page.tsx              首页（品类矩阵 + 单品评测）
  best/[slug]/          pSEO 三维度对比页（品类×场景×价格带）
  hub/[category]/       品类 Hub 目录页
  review/[slug]/        单品深度评测页
  api/admin/            管理后台 API（统一 HMAC 鉴权）
  api/lead/             买家留资（限速 + 蜜罐）
components/             UI 组件（对比表/CTA/评测组件）
lib/adminAuth.ts        HMAC token 鉴权 + 登录限速
lib/automation/         原生自动化引擎（原 13 个 Python 脚本的 TS 移植）
  dataLayer.ts          数据访问 + 文件锁
  aiEngine.ts           统一 AI 调用 (Anthropic/OpenAI/自定义)
  index.ts              任务注册表 + 调度中心
proxy.ts                Next.js 16 Proxy：/api/admin/* 预检 + 安全响应头
data/                   商品库 / 矩阵 / Tracking ID
content/pages/          pSEO 页面快照（SSG 数据源）
content/syndicate/      Reddit/Medium/Quora 信任证据链
reports/                自动化任务输出报告
```

## 快速开始

```bash
npm install
cp .env.example .env.local
# 编辑 .env.local：设置 ADMIN_SECRET_KEY（必填，≥6 字符）
npm run dev
```

后台：`/admin`（密码为 `ADMIN_SECRET_KEY`）

## 自动化任务（后台可一键执行，无需 Python）

| 任务 key | 功能 |
|---|---|
| `cron_pipeline` | 每日全流程：剪枝审计→EPC→GEO→SERP→证据链→日报 |
| `epc_tracker` | Tracking ID 级 EPC 商业归因 |
| `geo_optimizer` | Princeton KDD GEO 引用就绪度扫描 |
| `serp_tracker` | Google+Bing 双引擎排名快照 |
| `gemini_audit` | AI Overview 引用可见度审计 |
| `trust_syndicate` | Reddit/Medium/Quora 证据链派生 |
| `bing_submit` | Bing Webmaster URL 批量推送 |
| `gsc_monitor` | 零展现页面剪枝审计 |
| `pseo_generate` | pSEO 矩阵页批量生成（支持 dry-run） |
| `content_generate` | 单品评测生成（AI 或数据驱动模板） |
| `daily_report` | 每日经营看板 |
| `social_dispatch` | 社媒 Webhook 广播 |

API 调用示例：

```bash
TOKEN=$(curl -s -X POST localhost:3000/api/admin/auth \
  -H 'Content-Type: application/json' -d '{"password":"<你的密码>"}' | jq -r .token)

curl -X POST localhost:3000/api/admin/run-task \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"task":"cron_pipeline"}'
```

## 部署 (Docker)

```bash
# .env 中至少设置 NEXT_PUBLIC_SITE_URL 与 ADMIN_SECRET_KEY
docker compose up -d --build
```

## 安全要点

- `/api/admin/*` 全部经 proxy.ts 预检 + lib/adminAuth.ts HMAC 校验（12h token 过期）
- 登录限速：5 次 / 5 分钟 / IP
- 买家留资 GET 接口已移除（PII 防泄露），名单走后台导出
- `.env.local`、`data/leads.json` 已列入 .gitignore
