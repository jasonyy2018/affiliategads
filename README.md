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
| `gsc_monitor` | Search Console 展现监控与零展现剪枝（数据源 `data/gsc_performance.csv`）|
| `gsc_sync` | GSC 服务账号拉真实点击/展现/排名写回 CSV + best-effort 提交 sitemap（需 GSC 服务账号）|
| `pseo_generate` | pSEO 矩阵页批量生成（支持 dry-run） |
| `content_generate` | 单品评测生成（AI 或数据驱动模板） |
| `daily_report` | 每日经营看板 |
| `social_dispatch` | 社媒 Webhook 广播 |
| `price_tracker` | 价格快照采集与降价检测（PA-API 或基线模式）|
| `matrix_opportunities` | pSEO 矩阵扩产机会分析（READY/GAP 扫描）|
| `market_rebalance` | 市场需求重排：利润×需求×季节给全库打分，输出主推/补缺/剪枝清单（无需 API）|
| `product_import` | 批量导入商品：粘贴 CSV → 去重入库 + 补内容 + 重排（后台专用框）|

## 无人值守自动化（零付费 API）

所有任务都可由宿主机 cron 自动触发，无需进后台点按钮、无需任何付费调度服务：

**1. 端点**（已内建）：`GET/POST /api/cron/<task_key>`，HMAC-SHA256 签名鉴权（密钥 = `ADMIN_SECRET_KEY`，与登录密码同源，后台改密码后 cron 自动失效旧签名）+ 5 分钟时间窗防重放。未配密钥时端点返回 404（不暴露存在）。

**2. 宿主机脚本**：`scripts/run-cron-task.sh`（随仓库部署到服务器）

```bash
chmod +x scripts/run-cron-task.sh
./run-cron-task.sh cron_pipeline http://127.0.0.1:3000   # 手动试跑
```

**3. crontab**（`crontab -e`，按需调整频率）：

```cron
# 每天凌晨 03:17 全流程（剪枝→EPC→GEO→SERP→证据链→日报→市场重排）
17 3 * * * /root/dockerdata/affiliategads/scripts/run-cron-task.sh cron_pipeline
# 每 2 小时价格快照 + 降价检测（无 PA-API 时自动基线模式）
23 */2 * * * /root/dockerdata/affiliategads/scripts/run-cron-task.sh price_tracker
# 每周一 04:41 pSEO 矩阵扩产（有 READY 组合才会新增页面）
41 4 * * 1 /root/dockerdata/affiliategads/scripts/run-cron-task.sh pseo_generate
# 每小时提交/发现 sitemap（IndexNow 广播，免费）
51 * * * * /root/dockerdata/affiliategads/scripts/run-cron-task.sh bing_submit
# 每天人工上班前先看一眼日报（可选提醒，跑完任务看 reports/ 即可）
```

脚本读 `ADMIN_SECRET_KEY` 的来源：环境变量优先，其次同目录 `.env.local`（与站点配置同文件、同密码）。cron 日志建议在 crontab 行尾加 `>> /var/log/affiliategads-cron.log 2>&1`。

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
- 未配置 `ADMIN_SECRET_KEY` 时后台一律拒绝登录（fail-closed，无弱密码兜底）
- 买家留资 GET 接口已移除（PII 防泄露），名单走后台导出
- `data/settings.json`（含全部密钥明文）、`.env.local`、`data/leads.json` 均已列入 .gitignore，绝不提交
