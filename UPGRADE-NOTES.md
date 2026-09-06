# 升级改造记录 (2026-09-06)

## 已完成的全部改动

### P0 安全修复 ✅
1. **lib/adminAuth.ts**（新增）：HMAC-SHA256 token（12h 过期）+ 登录限速（5次/5分钟）+ timing-safe 比较；不再读取 .env.local 文件，无 ADMIN_SECRET_KEY 时拒绝登录
2. **proxy.ts**（新增，Next.js 16 Proxy 约定）：/api/admin/* 无凭证直接 401 + 全站安全响应头（X-Frame-Options/nosniff/Referrer-Policy/Permissions-Policy）
3. **app/api/admin/auth/route.ts**：重写——限速 + HMAC token；不再回传明文密码
4. **全部 7 个 /api/admin/* 路由**：服务端 isAuthorized() 强制校验（run-task/generate/settings/products/reports/diagnostics/settings-test）
5. **app/api/lead/route.ts**：删除公开 GET（邮箱 PII 泄露）；POST 加邮箱格式校验 + 内存限速（5次/时/IP）+ 蜜罐字段
6. **app/admin/page.tsx**：全部 fetch 携带 Bearer token；移除 ?key= 查询参数后门
7. **settings/test/route.ts**：webhook 测试加 SSRF 防护（阻止内网/链路本地地址）
8. **.env.local** 中 ADMIN_SECRET_KEY=opc2026 为弱密码——**待用户手改**（classifier 故障无法执行随机生成命令）

### Python → 原生 TS 引擎 ✅（13 个脚本全部移植）
- lib/automation/dataLayer.ts — 数据访问 + 进程内文件锁 + 原子写
- lib/automation/aiEngine.ts — 统一 AI 调用（Anthropic claude-sonnet-4-5 / OpenAI / 自定义兼容端点）
- lib/automation/epcTracker.ts — Tracking ID 级 EPC 归因 + EXPAND/OPTIMIZE 决策
- lib/automation/geoOptimizer.ts — Princeton KDD GEO 逐页评分
- lib/automation/serpTracker.ts — Google+Bing 双引擎快照（启发式基准，可换真实 API）
- lib/automation/geminiAudit.ts — AI 引用可见度审计
- lib/automation/trustSyndicate.ts — Reddit/Medium/Quora 证据链派生
- lib/automation/bingSubmit.ts — Bing URL 批量推送（真实 API + 配额查询）
- lib/automation/gscMonitor.ts — 生命周期剪枝（90 天零展现/180 天低展现）
- lib/automation/pseoGenerator.ts — pSEO 矩阵生成（≥3 商品硬约束 + AI FAQ 增强）
- lib/automation/contentGenerator.ts — 单品评测生成（AI 或数据驱动模板，杜绝空洞文案）
- lib/automation/dailyReport.ts — 每日经营看板
- lib/automation/socialDispatch.ts — Webhook 社媒广播
- lib/automation/index.ts — 任务注册表 + 调度中心（12 个任务）
- **app/api/admin/run-task/route.ts**：重写为原生执行（无 Python spawn），maxDuration 300s，GET 返回任务目录
- **app/api/admin/generate/route.ts**：重写为原生执行
- **scripts/README.md**：迁移对照表（Python 保留作参考，运行时零依赖）
- **Dockerfile**：不再需要 Python；修复 public 目录缺失导致的构建失败；data/content 权限修正

### SEO 修复 ✅
1. **app/best/[slug]/page.tsx**：
   - dynamicParams=false + parseSlug 失败返回 null → 真 404（杜绝软 404 重复内容）
   - generateStaticParams 覆盖快照 + 矩阵动态组合（品类×场景×价格带，≥3 商品）
   - 商品匹配改为三维度硬匹配（品类+use_case+价格带），按佣金降序
   - FAQ 优先用快照定制问答，兜底模板基于真实商品数据动态生成
   - Hub 目录内链从 content/pages/ 动态读取（只链真实存在的页面）
2. **app/hub/[category]/page.tsx**：dynamicParams=false + 只内链已存在页面 + excluded_combinations 过滤 + 无商品品类 404
3. **app/sitemap.ts**：与 generateStaticParams 对齐（矩阵组合页全部进入 sitemap）
4. **app/layout.tsx**：加 metadataBase + title 模板
5. **JsonLdSchema.tsx**：移除自评 aggregateRating（Google 富结果合规）；affiliate tag 走环境变量

### 合规修复 ✅
1. 首页 Hero 假数据（"0% Seepage/240+ Hours/42 Points"）→ 描述测试协议的真实表述
2. 分类卡 "24 Models Tested" → 从磁盘统计真实 "N Guides Live"
3. "Explore All 50+ Matrices" → 去掉编造数字
4. rating/review_count 假回退（4.8/5200）→ 无数据显示 "See buyer ratings on Amazon"
5. "In Stock & Prime Eligible"/"Live Inventory Verified"/"In Stock on Amazon" → 合规措辞
6. StructuredComparison "9.0/10"/"10mm" 假回退 → "Not measured"/"—"
7. review 页兜底文案全部改为从真实 specs 渲染（9.4/10 假数据移除）
8. LeadCaptureModal：假"PDF 已发送"→"24 小时内发送"；失败不再假装成功
9. RatingBadge "(N+ ratings)" → "(N ratings)"

### 基建 ✅
- .gitignore（.env.local、data/leads.json 等敏感文件）
- .dockerignore 收紧（.env.local 仍排除但 data/content 进镜像）
- README.md（架构/快速开始/任务 API 文档）
- package.json：移除坏的 `next lint`（Next 16 已移除），加 `typecheck`
- next.config.mjs：poweredByHeader=false
- app/not-found.tsx + app/error.tsx（品牌化 404/错误页）
- app/icon.svg（星星 favicon，Next app-icons 约定）
- public/ 目录（含 README，Docker COPY 不再失败）
- docker-compose.yml：ADMIN_SECRET_KEY 必填校验 + 补全全部环境变量
- .env.example：重写（移除默认密码，加生成说明）
- proxy matcher 排除 icon.svg 等静态资源

### Admin UI 适配 ✅
- 全部 API 请求带 Bearer token（adminHeaders()）
- 429 限速错误提示
- 工具卡片脚本名标签改为 engine: xxx（原生引擎）
- pseo_generate 按钮传 {limit:50, apply:true}
- runPyTask 支持 opts 透传
- i18n 文案移除 Python 引用

## 待办（需 shell/classifier 恢复后执行）

1. **运行 `npx tsc --noEmit` 验证**（平台 classifier 故障，node/npm 命令被拦截，只读 cmdlet 可用）
   - 辅助脚本已备好：`.\run-typecheck.ps1`
2. **删除出圈内容文件**：content/sony-wh-1000xm5.json、content/ninja-af101-air-fryer.json（孤儿文件，不影响运行）
3. **更换 ADMIN_SECRET_KEY**：.env.local 当前为 opc2026，建议 `openssl rand -base64 24` 生成强密钥
4. **git init + 首次提交**（.gitignore 已就绪，提交前确认 .env.local 被忽略）
5. **npm run build** 全量验证 SSG 预渲染
6. 已知需人工确认：
   - admin 页剩余 i18n 文案中 "60 篇/94+ 链接" 等营销数字是否保留
   - syndicate 前端入口无 dry-run 切换（默认 apply）
