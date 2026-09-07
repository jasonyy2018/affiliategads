export type AdminLanguage = 'zh' | 'en';

export const ADMIN_I18N = {
  zh: {
    // 顶部 Header
    title: 'OPC 亚马逊联盟 & 套利控制中心',
    subtitle: '亚马逊联盟 + Google Ads 套利与 pSEO 自动化流水线',
    versionBadge: 'v2026 • WSAI & WCKJ',
    copyright: '网站版本归 WSAI & WCKJ 所有',
    previewSite: '预览网站前台',
    aiKeysBtn: '⚙️ 全系统总控配置',
    lockBtn: '锁定控制台',
    addProductBtn: '添加商品',
    langToggle: 'English',

    // 安全门禁
    gateTitle: 'OPC 商业控制台安全保护',
    gateDesc: '请输入管理访问密钥以查看财务数据、API 凭证与自动化调度流水线。',
    gateInputLabel: '管理访问密钥 (ADMIN_SECRET_KEY)',
    gatePlaceholder: '请输入访问密钥...',
    gateUnlockBtn: '解锁控制台',
    gateHint: '开发密钥默认配置在 .env.local 中为 opc2026',
    gateVerifying: '正在验证安全访问凭证...',

    // 顶部 4 大指标
    metricProductsTitle: '商品库 ASIN 规模',
    metricProductsSub: '款活跃在售商品',
    metricProductsDesc: '已注册到库的目标单品',

    metricPagesTitle: 'SSG / pSEO 静态页面',
    metricPagesSub: '个静态页面已生成',
    metricPagesDesc: '构建时预编译的 HTML 极速路由',

    metricLeadsTitle: '买家邮件私域留资',
    metricLeadsSub: '位高意向订阅者',
    metricLeadsDesc: '对冲 24h 亚马逊 Cookie 失效风险',

    metricSyndicateTitle: '全网实体信任链资产',
    metricSyndicateSub: '篇已就绪资产',
    metricSyndicateDesc: 'Reddit / Medium / Quora 讨论背书',

    // 4 大工作区 Tab 导航
    tabAutomation: '⚡ 自动化运维调度台',
    tabReports: '📊 经营与 GEO 报告中心',
    tabLeads: '📬 买家留资 CRM',
    tabProducts: '📦 商品库与单品落地页',

    // 自动化工作区
    pipelineBadge: 'One-Click OPC Master Pipeline',
    pipelineTitle: '每日全自动综合运维流水线 (Native Engine)',
    pipelineDesc: '一键串联执行：Search Console 展现监控与剪枝 ➔ 亚马逊真实联盟订单与 EPC 对账 ➔ 普林斯顿 GEO 模型全站扫描 ➔ Google/Bing 双引擎排名快照 ➔ 跨平台 60 篇第三方证据链派生 ➔ Gemini 引用可见度审计 ➔ 汇总生成一人公司今日经营看板。',
    pipelineRunBtn: '⚡ 立即执行今日全流程流水线',
    pipelineRunning: '流水线执行中...',

    // 6 大专项工具
    toolSyndicateTitle: '跨平台第三方实体证据链派生',
    toolSyndicateDesc: '依据 AirOps 85% 规则，派生 60 篇 Reddit/Medium/Quora 技术贴。',
    toolSyndicateBtn: '立即生成证据链',

    toolGeminiTitle: 'Gemini / AI Overview 引用审计',
    toolGeminiDesc: '评估全站 20 大买家疑问被 AI 提取为 Position 0 标准答案的概率。',
    toolGeminiBtn: '执行引用可见度审计',

    toolEpcTitle: '真实联盟订单对账与 EPC 计算',
    toolEpcDesc: '按品类反查 Tracking ID 真实出单佣金与每点击收益 (EPC)。',
    toolEpcBtn: '开始 EPC 归因对账',

    toolBingTitle: 'Bing + IndexNow 双通道极速收录推送',
    toolBingDesc: '通过 Bing 官方 Batch API + IndexNow 全球网关，一键同步推送至 Bing、Copilot、ChatGPT 及 Yandex。',
    toolBingBtn: '双通道极速推送',

    toolGeoTitle: '普林斯顿 KDD GEO 全站扫描',
    toolGeoDesc: '扫描全站 50 个对比页的直接答案、量化数据、权威引用完整度。',
    toolGeoBtn: '运行 GEO 评分扫描',

    toolPseoTitle: '批量构建 50 个 pSEO 矩阵对比页',
    toolPseoDesc: '根据 品类 × 场景 × 价格带 自动编译 50 个高信息增量静态对比页。',
    toolPseoBtn: '重新构建 pSEO 矩阵',

    toolSocialTitle: '🚀 全网社媒一键广播与中继分发',
    toolSocialDesc: '提取 20 组量化评测，通过通用 Webhook 一键同步至 Twitter/X、Pinterest、LinkedIn、Reddit。',
    toolSocialBtn: '立即触发全网社媒广播',

    // 控制台终端
    consoleTitle: '实时运行控制台日志 (Live Terminal)',
    consoleClear: '清空日志',
    consoleReady: '就绪。点击上方任意运维工具或主流水线，实时查看原生引擎执行日志...',

    // 报告中心
    reportsTitle: '经营指标与 AI 引用报告阅读器',
    reportsDesc: '在线查阅最新综合日报、Gemini 引用审计、EPC 归因及合规日志，无需手动翻找服务器文件。',
    reportsRefresh: '刷新全部报告',
    reportTabDaily: '📄 今日综合经营看板 (daily_report.md)',
    reportTabSocial: '🚀 全网社媒广播日志 (social_dispatch_report.md)',
    reportTabBing: '🔍 Bing 批量推送日志 (bing_submission_report.md)',
    reportTabGemini: '🧠 Gemini 引用审计 (gemini_citation_audit.md)',
    reportTabGeo: '🔬 普林斯顿 GEO 合规扫描 (geo_audit.md)',
    reportTabEpc: '💰 真实 EPC 归因排名 (epc_ranking.md)',
    reportTabRank: '📈 搜索排名快照 (rank_history.md)',
    reportTabPrune: '✂️ 零展现自动剪枝日志 (prune_log.md)',
    reportEmpty: '暂无此报告内容。请在「自动化运维调度台」点击执行对应工具以生成最新报告。',

    // 买家留资 CRM
    leadsTitle: '买家留资 CRM 与邮件订阅列表',
    leadsDesc: '通过前台落地页下载「2026 选购排坑清单 PDF」沉淀的高意向买家邮箱，对冲 24 小时 Cookie 风险。',
    leadsExportBtn: '导出 CSV 清单',
    leadsColEmail: '订阅邮箱',
    leadsColCategory: '意向品类',
    leadsColUseCase: '触发场景 / 痛点',
    leadsColSource: '留资来源',
    leadsColTime: '提交时间',
    leadsEmpty: '暂无买家留资。在前台落地页提交「Free 2026 Buyer Checklist PDF」将自动在此归档。',

    // 商品库与落地页
    diagnosticsTitle: '合规与系统健康体检报告',
    diagnosticsReAudit: '重新体检',
    productsTableTitle: '商品库与单品落地页中心',
    productsTableDesc: '管理 ASIN、修改价格、查看套利空间并一键触发单个商品的 AI 深度评测。',
    productsCountPrefix: '当前已收录',
    productsCountSuffix: '款商品',
    thProduct: '商品 / ASIN',
    thPrice: '价格',
    thCommission: '佣金率',
    thMargin: '预估单点击收益',
    thLandingPage: '评测落地页状态',
    thActions: '操作',
    statusReady: '已生成',
    statusNeedsGen: '待生成',
    btnGenReview: '生成此商品的 AI 深度评测',
    btnPreviewReview: '预览单品落地页',
    btnEdit: '编辑商品信息',
    btnDelete: '删除商品',

    // 设置 Modal - 全系统总控配置
    settingsTitle: '全系统环境与商业参数总控配置',
    settingsSubtitle: '在线查看、编辑并持久化 .env.local 环境变量，修改后即刻生效，无需登录服务器。',
    cfgCategoryCommercial: '🏢 站点与商业联盟',
    cfgCategoryAi: '🤖 AI 模型与 API',
    cfgCategorySeo: '🔍 搜索引擎与收录',
    cfgCategoryAds: '📊 Google 广告追踪',
    cfgCategorySocial: '🚀 全域社媒 Webhook',
    cfgCategorySecurity: '🔐 控制台门禁密码',

    // 商业与站点
    cfgSiteUrlLabel: '生产主域名 / 规范 URL (NEXT_PUBLIC_SITE_URL)',
    cfgSiteUrlDesc: '用于生成 Sitemap、Schema.org 规范结构化数据、Bing 批量收录 URL 以及社媒推广链接。',
    cfgSiteUrlPlaceholder: 'https://yourdomain.com 或 http://localhost:3000',
    cfgAmazonTagLabel: '亚马逊联盟 Tracking ID (NEXT_PUBLIC_AMAZON_AFFILIATE_TAG)',
    cfgAmazonTagDesc: '自动注入到全站所有商品跳转按钮、卡片、浮动购买条以及 AI 答案推荐链接中。',
    cfgAmazonTagPlaceholder: '例如: yourtag-20',

    // AI 模型
    cfgAiModeLabel: '默认 AI 内容生成模式 (AI_MODEL_CHOICE)',
    cfgAiModeDesc: '控制自动化流水线在批量生成评测与回答时采用的推理通道。',
    cfgCustomBaseUrlLabel: '第三方 API 端点 (CUSTOM_AI_BASE_URL)',
    cfgCustomBaseUrlPlaceholder: 'https://api.deepseek.com/v1',
    cfgCustomApiKeyLabel: '第三方 API 密钥 (CUSTOM_AI_API_KEY)',
    cfgCustomApiKeyPlaceholder: 'sk-... (留空则保持已配置密钥不变)',
    cfgCustomModelLabel: '模型代号 (CUSTOM_AI_MODEL)',
    cfgCustomModelPlaceholder: '例如: deepseek-chat 或 claude-3-5-sonnet',
    cfgCustomProtocolLabel: '协议类型 (CUSTOM_AI_PROTOCOL)',
    cfgClaudeKeyLabel: '官方 Anthropic Claude API Key (ANTHROPIC_API_KEY)',
    cfgClaudeKeyPlaceholder: 'sk-ant-api03-... (留空则保持已配置密钥不变)',
    cfgOpenaiKeyLabel: '官方 OpenAI API Key (OPENAI_API_KEY)',
    cfgOpenaiKeyPlaceholder: 'sk-proj-... (留空则保持已配置密钥不变)',
    cfgQuickPresets: '快捷一键预设:',
    cfgTestConnection: '测试连接',

    // 搜索引擎
    cfgBingKeyLabel: 'Bing Webmaster Tools API 密钥 (BING_API_KEY)',
    cfgBingKeyDesc: '用于一键推送全站 94+ pSEO 页面至 Bing Batch URL API，抢占 Copilot 和 ChatGPT 引用源。',
    cfgBingKeyPlaceholder: '从 Bing Webmaster Tools 获取的 API 密钥...',
    cfgBingTestBtn: '测试 Bing 连通性',

    // Google Ads
    cfgGaIdLabel: 'Google Ads 转化账户 ID (NEXT_PUBLIC_GA_CONVERSION_ID)',
    cfgGaIdDesc: '全局加载 Google gtag.js 脚本，追踪广告投放流量与用户行为。',
    cfgGaIdPlaceholder: '例如: AW-123456789',
    cfgGaLabelLabel: 'Google Ads 购买转化事件标签 (NEXT_PUBLIC_GA_CONVERSION_LABEL)',
    cfgGaLabelDesc: '用户点击任意亚马逊购买按钮或浮动出站条时触发转化回传。',
    cfgGaLabelPlaceholder: '例如: AbCdEfGhIjKlMnOpQrS',

    // 社媒 Webhook
    settingsSocialSectionTitle: '全域社媒广播 Webhook 与中继凭证',
    settingsSocialWebhookLabel: '通用社媒 Webhook URL (SOCIAL_WEBHOOK_URL)',
    settingsSocialWebhookDesc: '接入 Make.com / Zapier / Pabbly 后，点击一键广播将把 20 组量化评测直发全网社媒；未填写时在沙盒安全演练。',
    settingsSocialWebhookPlaceholder: 'https://hook.eu1.make.com/... 或 https://hooks.zapier.com/...',
    cfgSocialTestBtn: '发送测试 Ping',
    settingsAyrshareKeyLabel: 'Ayrshare 多平台聚合 API Key (AYRSHARE_API_KEY)',
    settingsAyrshareKeyDesc: '可选。用于直接向 Twitter、Pinterest、LinkedIn 原生 API 批量推送图文。',
    settingsAyrshareKeyPlaceholder: '例如: AYRSHARE-API-KEY-...',

    // 安全门禁密码
    cfgAdminSecretLabel: '控制台管理访问密码 (ADMIN_SECRET_KEY)',
    cfgAdminSecretDesc: '用于保护本管理后台。修改并保存后，系统将自动使用新密码作为访问凭证。',
    cfgAdminSecretPlaceholder: '输入新密码以修改当前访问口令 (留空则保持当前密码)',

    settingsSaveBtn: '保存所有配置至 .env.local',
    settingsCloseBtn: '关闭',
  },
  en: {
    // 顶部 Header
    title: 'OPC Amazon Affiliate & Arbitrage Command Center',
    subtitle: 'Amazon Associates + Google Ads Arbitrage & pSEO Automation Pipeline',
    versionBadge: 'v2026 • WSAI & WCKJ',
    copyright: 'Version Copyright © WSAI & WCKJ. All rights reserved.',
    previewSite: 'Preview Live Site',
    aiKeysBtn: '⚙️ System Settings',
    lockBtn: 'Lock Console',
    addProductBtn: 'Add Product',
    langToggle: '中文',

    // 安全门禁
    gateTitle: 'OPC Command Security Gate',
    gateDesc: 'Enter your Admin Secret Key to access financial metrics, API credentials, and asset pipelines.',
    gateInputLabel: 'Admin Secret Key (ADMIN_SECRET_KEY)',
    gatePlaceholder: 'Enter ADMIN_SECRET_KEY...',
    gateUnlockBtn: 'Unlock Admin Console',
    gateHint: 'Default development key configured in .env.local as opc2026',
    gateVerifying: 'Verifying security credentials...',

    // 顶部 4 大指标
    metricProductsTitle: 'Catalog Products',
    metricProductsSub: 'Active ASIN Items',
    metricProductsDesc: 'Target product catalog in database',

    metricPagesTitle: 'SSG / pSEO Pages',
    metricPagesSub: 'Live Pre-rendered Pages',
    metricPagesDesc: 'Fast static HTML routes generated at build time',

    metricLeadsTitle: 'Buyer Email Leads',
    metricLeadsSub: 'High-Intent Subscribers',
    metricLeadsDesc: 'Hedges against Amazon 24h cookie drop-off',

    metricSyndicateTitle: 'Trust Syndicate Assets',
    metricSyndicateSub: 'Ready Discussion Posts',
    metricSyndicateDesc: 'Reddit, Medium & Quora entity evidence',

    // 4 大工作区 Tab 导航
    tabAutomation: '⚡ Automation Pipelines',
    tabReports: '📊 Reports & GEO Audits',
    tabLeads: '📬 Buyer Leads CRM',
    tabProducts: '📦 Product Catalog & Reviews',

    // 自动化工作区
    pipelineBadge: 'One-Click OPC Master Pipeline',
    pipelineTitle: 'Daily Full-Automated Pipeline (Native Engine)',
    pipelineDesc: 'Executes sequentially in 4s: Search Console monitoring & prune candidates ➔ Amazon Associates sales & EPC attribution ➔ Princeton GEO model site scan ➔ Google/Bing SERP ranking snapshots ➔ Multi-platform 60-post syndicate generation ➔ Gemini citation readiness audit ➔ Consolidated daily executive report.',
    pipelineRunBtn: '⚡ Run Today\'s Full Master Pipeline',
    pipelineRunning: 'Pipeline Running...',

    // 6 大专项工具
    toolSyndicateTitle: 'Cross-Platform Entity Trust Syndicate',
    toolSyndicateDesc: 'Applies AirOps 85% Rule to generate 60 Reddit, Medium & Quora technical evidence posts.',
    toolSyndicateBtn: 'Generate Evidence Chain',

    toolGeminiTitle: 'Gemini / AI Overview Citation Audit',
    toolGeminiDesc: 'Audits probability of our top 20 buyer queries being selected as Position 0 standard answers.',
    toolGeminiBtn: 'Run Citation Audit',

    toolEpcTitle: 'Real Affiliate Orders & EPC Attribution',
    toolEpcDesc: 'Attributes Tracking ID commission and calculates category-specific earnings per click (EPC).',
    toolEpcBtn: 'Run EPC Attribution',

    toolBingTitle: 'Bing + IndexNow Dual-Engine Instant Push',
    toolBingDesc: 'Batch submits full site URLs via Bing Webmaster Batch API + IndexNow Global Protocol (Bing, ChatGPT, Yandex).',
    toolBingBtn: 'Push to Bing & IndexNow',

    toolGeoTitle: 'Princeton KDD GEO Full Site Audit',
    toolGeoDesc: 'Audits 50 comparison pages for direct answers, quantitative lab metrics, and authoritative citations.',
    toolGeoBtn: 'Run GEO Model Audit',

    toolPseoTitle: 'Batch Build 50 pSEO Comparison Hubs',
    toolPseoDesc: 'Compiles 50 high-information-gain comparison pages across category × use-case × price band.',
    toolPseoBtn: 'Rebuild pSEO Matrix',

    toolSocialTitle: '🚀 Omnichannel Social Media Broadcast',
    toolSocialDesc: 'Dispatches 20 quantified test payloads via universal Webhook to Twitter/X, Pinterest, LinkedIn & Reddit.',
    toolSocialBtn: 'Trigger Social Broadcast Now',

    // 控制台终端
    consoleTitle: 'Live Execution Console (Live Terminal)',
    consoleClear: 'Clear',
    consoleReady: 'Ready. Click any pipeline action above to view native engine output...',

    // 报告中心
    reportsTitle: 'Business KPIs & AI Citation Reports Viewer',
    reportsDesc: 'Read daily business reports, Gemini citation audits, EPC rankings, and compliance logs without touching files.',
    reportsRefresh: 'Refresh Reports',
    reportTabDaily: '📄 Daily Executive Report (daily_report.md)',
    reportTabSocial: '🚀 Social Broadcast Log (social_dispatch_report.md)',
    reportTabBing: '🔍 Bing Batch Submit Log (bing_submission_report.md)',
    reportTabGemini: '🧠 Gemini Citation Audit (gemini_citation_audit.md)',
    reportTabGeo: '🔬 Princeton GEO Audit (geo_audit.md)',
    reportTabEpc: '💰 Real EPC Attribution Ranking (epc_ranking.md)',
    reportTabRank: '📈 Search SERP History (rank_history.md)',
    reportTabPrune: '✂️ Zero-Impression Prune Log (prune_log.md)',
    reportEmpty: 'No report content found. Run the corresponding tool in the Automation tab to generate the latest report.',

    // 买家留资 CRM
    leadsTitle: 'Buyer Leads CRM & Email Subscribers',
    leadsDesc: 'High-intent outdoor buyers who downloaded the 2026 Checklist PDF to hedge against 24-hour cookie drop-offs.',
    leadsExportBtn: 'Export CSV List',
    leadsColEmail: 'Subscriber Email',
    leadsColCategory: 'Category Interest',
    leadsColUseCase: 'Use Case / Trigger',
    leadsColSource: 'Capture Source',
    leadsColTime: 'Captured Time',
    leadsEmpty: 'No buyer leads captured yet. Submissions from the "Free 2026 Checklist PDF" modal will be archived here.',

    // 商品库与落地页
    diagnosticsTitle: 'Compliance & System Health Diagnostics',
    diagnosticsReAudit: 'Re-Audit',
    productsTableTitle: 'Product Catalog & Landing Page Hub',
    productsTableDesc: 'Manage ASIN items, review JSON status, check arbitrage margins, and trigger individual AI reviews.',
    productsCountPrefix: 'Showing',
    productsCountSuffix: 'registered item(s)',
    thProduct: 'Product / ASIN',
    thPrice: 'Price',
    thCommission: 'Commission Rate',
    thMargin: 'Est. Margin / Click',
    thLandingPage: 'Landing Page Status',
    thActions: 'Actions',
    statusReady: 'Generated',
    statusNeedsGen: 'Needs Generation',
    btnGenReview: 'Generate AI Review for this product',
    btnPreviewReview: 'Preview Landing Page',
    btnEdit: 'Edit Product Information',
    btnDelete: 'Delete Product',

    // 设置 Modal - 全系统总控配置
    settingsTitle: 'All-in-One System & Commercial Configuration Center',
    settingsSubtitle: 'View, edit, and persist .env.local environment variables live with instant hot-reload without touching server files.',
    cfgCategoryCommercial: '🏢 Site & Commercial',
    cfgCategoryAi: '🤖 AI Models & API',
    cfgCategorySeo: '🔍 Search Engine Indexing',
    cfgCategoryAds: '📊 Google Ads Tracking',
    cfgCategorySocial: '🚀 Omnichannel Webhook',
    cfgCategorySecurity: '🔐 Admin Security Gate',

    // 商业与站点
    cfgSiteUrlLabel: 'Production Domain / Canonical URL (NEXT_PUBLIC_SITE_URL)',
    cfgSiteUrlDesc: 'Used for Sitemap, Schema.org canonical metadata, Bing batch URL submission, and social syndication links.',
    cfgSiteUrlPlaceholder: 'https://yourdomain.com or http://localhost:3000',
    cfgAmazonTagLabel: 'Amazon Associates Tracking Tag (NEXT_PUBLIC_AMAZON_AFFILIATE_TAG)',
    cfgAmazonTagDesc: 'Injected into all buy buttons, comparison cards, sticky floating bars, and AI recommendation links.',
    cfgAmazonTagPlaceholder: 'e.g. yourtag-20',

    // AI 模型
    cfgAiModeLabel: 'Default AI Generation Mode (AI_MODEL_CHOICE)',
    cfgAiModeDesc: 'Controls which inference provider is chosen for bulk reviews and buyer FAQ generation.',
    cfgCustomBaseUrlLabel: 'Custom API Endpoint (CUSTOM_AI_BASE_URL)',
    cfgCustomBaseUrlPlaceholder: 'https://api.deepseek.com/v1',
    cfgCustomApiKeyLabel: 'Custom API Key (CUSTOM_AI_API_KEY)',
    cfgCustomApiKeyPlaceholder: 'sk-... (Leave empty to keep existing key unchanged)',
    cfgCustomModelLabel: 'Model Identifier (CUSTOM_AI_MODEL)',
    cfgCustomModelPlaceholder: 'e.g. deepseek-chat or claude-3-5-sonnet',
    cfgCustomProtocolLabel: 'Protocol Type (CUSTOM_AI_PROTOCOL)',
    cfgClaudeKeyLabel: 'Official Anthropic Claude API Key (ANTHROPIC_API_KEY)',
    cfgClaudeKeyPlaceholder: 'sk-ant-api03-... (Leave empty to keep existing key unchanged)',
    cfgOpenaiKeyLabel: 'Official OpenAI API Key (OPENAI_API_KEY)',
    cfgOpenaiKeyPlaceholder: 'sk-proj-... (Leave empty to keep existing key unchanged)',
    cfgQuickPresets: 'Quick Presets:',
    cfgTestConnection: 'Test Connection',

    // 搜索引擎
    cfgBingKeyLabel: 'Bing Webmaster Tools API Key (BING_API_KEY)',
    cfgBingKeyDesc: 'Pushes 94+ pSEO URLs to Bing Batch URL API to capture ChatGPT and Copilot citation traffic.',
    cfgBingKeyPlaceholder: 'API key from Bing Webmaster Tools...',
    cfgBingTestBtn: 'Test Bing API',

    // Google Ads
    cfgGaIdLabel: 'Google Ads Conversion ID (NEXT_PUBLIC_GA_CONVERSION_ID)',
    cfgGaIdDesc: 'Loads Google gtag.js globally across all routes to track ad referral traffic and dwell time.',
    cfgGaIdPlaceholder: 'e.g. AW-123456789',
    cfgGaLabelLabel: 'Google Ads Purchase Conversion Label (NEXT_PUBLIC_GA_CONVERSION_LABEL)',
    cfgGaLabelDesc: 'Fired whenever a user clicks any outbound Amazon CTA or floating deal button.',
    cfgGaLabelPlaceholder: 'e.g. AbCdEfGhIjKlMnOpQrS',

    // 社媒 Webhook
    settingsSocialSectionTitle: 'Omnichannel Social Media Webhook & Relay',
    settingsSocialWebhookLabel: 'Universal Social Webhook URL (SOCIAL_WEBHOOK_URL)',
    settingsSocialWebhookDesc: 'Connect Make.com / Zapier to dispatch 20 lab evaluations to social networks; runs in safe sandbox dry-run if unconfigured.',
    settingsSocialWebhookPlaceholder: 'https://hook.eu1.make.com/... or https://hooks.zapier.com/...',
    cfgSocialTestBtn: 'Send Test Ping',
    settingsAyrshareKeyLabel: 'Ayrshare Multi-Platform API Key (AYRSHARE_API_KEY)',
    settingsAyrshareKeyDesc: 'Optional. Direct native publishing to Twitter/X, Pinterest, LinkedIn without third-party webhooks.',
    settingsAyrshareKeyPlaceholder: 'e.g. AYRSHARE-API-KEY-...',

    // 安全门禁密码
    cfgAdminSecretLabel: 'Admin Console Access Secret Key (ADMIN_SECRET_KEY)',
    cfgAdminSecretDesc: 'Protects financial metrics, API keys, and pipeline triggers. System will immediately require this key on next login.',
    cfgAdminSecretPlaceholder: 'Enter new password to update gate key (Leave empty to keep current)',

    settingsSaveBtn: 'Save All Configurations to .env.local',
    settingsCloseBtn: 'Close',
  },
};
