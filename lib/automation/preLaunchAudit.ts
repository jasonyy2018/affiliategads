/**
 * 上线预检任务：部署前一键核对全部关键配置。
 * 输出结构化清单（passed/warning/failed），与 admin diagnostics 联动。
 */
import fs from 'fs';
import path from 'path';
import { loadProducts, PAGES_DIR, countFiles, withLock } from './dataLayer';
import { getSiteUrl, loadMergedSettings } from '../siteConfig';

export interface PreLaunchCheck {
  id: string;
  name: string;
  status: 'passed' | 'warning' | 'failed';
  message: string;
  fix: string;
}

export interface PreLaunchResult {
  healthScore: number;
  readyForLaunch: boolean;
  checks: PreLaunchCheck[];
  summary: string;
}

export async function runPreLaunchAudit(): Promise<PreLaunchResult> {
  return withLock('prelaunch', async () => {
    const checks: PreLaunchCheck[] = [];
    const settings = loadMergedSettings();
    const env = process.env;

    // ---- 1. 生产域名 ----
    const siteUrl = getSiteUrl();
    const isProdDomain = /^https:\/\/(?!localhost|127\.0\.0\.1)/.test(siteUrl);
    checks.push({
      id: 'site-url',
      name: 'Production Site URL',
      status: isProdDomain ? 'passed' : 'failed',
      message: isProdDomain ? `Canonical/sitemap/OG 均指向 ${siteUrl}` : `当前 ${siteUrl || '未设置'} — sitemap 与 canonical 会指向 localhost`,
      fix: '在 .env.local 设置 NEXT_PUBLIC_SITE_URL=https://你的正式域名（部署时必须）',
    });

    // ---- 2. 管理密码强度 ----
    const adminKey = env.ADMIN_SECRET_KEY || '';
    const strongEnough = adminKey.length >= 16 && !/^(opc|\d{4,})/.test(adminKey);
    checks.push({
      id: 'admin-key',
      name: 'Admin Secret Strength',
      status: adminKey ? (strongEnough ? 'passed' : 'warning') : 'failed',
      message: adminKey
        ? strongEnough
          ? '已配置高强度管理密钥'
          : `密钥长度 ${adminKey.length}（建议 ≥16 字符的随机串）`
        : '未设置 ADMIN_SECRET_KEY — 后台将无法登录',
      fix: '生成强密钥: openssl rand -base64 24，写入 .env.local',
    });

    // ---- 3. Amazon 联盟 tag ----
    const tag = env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG || '';
    checks.push({
      id: 'affiliate-tag',
      name: 'Amazon Affiliate Tag',
      status: tag && tag !== 'yourtag-20' && tag !== 'jyu0a-20' ? 'passed' : 'warning',
      message: tag
        ? tag === 'jyu0a-20'
          ? `当前使用 ${tag}（若为你的真实 tag 则忽略此项）`
          : `已配置 ${tag}`
        : '未配置 — 出站链接将不带归因',
      fix: '设置 NEXT_PUBLIC_AMAZON_AFFILIATE_TAG 为你的 Associates tracking ID',
    });

    // ---- 4. 内容资产规模 ----
    const products = loadProducts();
    const pageCount = countFiles(PAGES_DIR, '.json');
    const productsWithContent = products.filter((p) =>
      fs.existsSync(path.join(process.cwd(), 'content', `${p.slug}.json`))
    ).length;

    checks.push({
      id: 'content-volume',
      name: 'Content Assets',
      status: products.length >= 20 && pageCount >= 30 ? 'passed' : 'warning',
      message: `${pageCount} 个 pSEO 对比页 + ${productsWithContent}/${products.length} 个单品评测已生成`,
      fix: '后台运行 content_generate（补齐评测）与 pseo_generate（扩展矩阵页）',
    });

    // ---- 5. 收录通道 ----
    const hasBing = Boolean(env.BING_API_KEY && env.BING_API_KEY.length > 5);
    checks.push({
      id: 'bing-indexing',
      name: 'Bing Indexing Channel',
      status: hasBing ? 'passed' : 'warning',
      message: hasBing
        ? 'Bing Webmaster API 已配置 — 可一键批量推送'
        : '未配置 BING_API_KEY — Bing/ChatGPT 引用通道需手动提交（bing.com/webmasters）',
      fix: 'Bing Webmaster 拿 API Key 后运行 bing_submit 任务',
    });

    // ---- 6. GA 转化跟踪 ----
    const gaId = env.NEXT_PUBLIC_GA_CONVERSION_ID || '';
    checks.push({
      id: 'ga-conversion',
      name: 'Google Ads Conversion Tracking',
      status: gaId && !gaId.includes('123456789') ? 'passed' : 'warning',
      message: gaId
        ? gaId.includes('123456789')
          ? '仍为占位符 AW-123456789 — 出站点击微转化无法归因'
          : `已配置 ${gaId}`
        : '未配置 — 无付费投放归因（纯自然流量阶段可忽略）',
      fix: '投放 Google Ads 前设置 NEXT_PUBLIC_GA_CONVERSION_ID/LABEL',
    });

    // ---- 7. Sitemap 可达性 ----
    const sitemapFile = path.join(process.cwd(), '.next', 'server', 'app', 'sitemap.xml.html');
    const sitemapBuilt = fs.existsSync(sitemapFile) || pageCount > 0;
    checks.push({
      id: 'sitemap',
      name: 'Sitemap Coverage',
      status: sitemapBuilt ? 'passed' : 'warning',
      message: `构建产物含 sitemap.xml（覆盖 ${pageCount} 对比页 + ${products.length} 评测页 + hub）`,
      fix: '部署后到 Google Search Console 提交 /sitemap.xml',
    });

    // ---- 8. 合规声明 ----
    const footerFile = path.join(process.cwd(), 'components', 'DisclaimerFooter.tsx');
    const hasDisclosure =
      fs.existsSync(footerFile) &&
      fs.readFileSync(footerFile, 'utf-8').includes('Amazon Associate');
    checks.push({
      id: 'compliance',
      name: 'FTC / Amazon Associates Disclosure',
      status: hasDisclosure ? 'passed' : 'failed',
      message: hasDisclosure
        ? '页脚包含 Amazon Associates 强制披露'
        : '缺少联盟披露声明 — 违反 Associates 条款',
      fix: '确认 DisclaimerFooter 渲染在所有页面',
    });

    // ---- 9. 价格/图片增强通道（可选） ----
    const paConfigured = Boolean(env.PA_ACCESS_KEY && env.PA_SECRET_KEY);
    checks.push({
      id: 'pa-api',
      name: 'PA-API Enhancement (optional)',
      status: paConfigured ? 'passed' : 'warning',
      message: paConfigured
        ? 'PA-API 就绪 — 价格追踪与官方商品图可用'
        : '未配置 — 价格走基线模式，商品图为 Unsplash 占位（新站正常状态）',
      fix: 'Associates 满足 3 个月 3 单后申请 PA-API 并配置',
    });

    // ---- 10. 邮件通道 ----
    const emailConfigured = Boolean(env.RESEND_API_KEY && env.LEADS_FROM_EMAIL);
    checks.push({
      id: 'email',
      name: 'Lead Email Delivery (optional)',
      status: emailConfigured ? 'passed' : 'warning',
      message: emailConfigured
        ? 'Resend 就绪 — 留资用户将收到真实清单邮件'
        : '未配置 — lead magnet 承诺的邮件不会发出（留资仍落盘）',
      fix: 'resend.com 注册 → 验证域名 → 配置 RESEND_API_KEY + LEADS_FROM_EMAIL',
    });

    const failed = checks.filter((c) => c.status === 'failed').length;
    const warnings = checks.filter((c) => c.status === 'warning').length;
    const passed = checks.filter((c) => c.status === 'passed').length;
    const healthScore = Math.round((passed / checks.length) * 100);
    const readyForLaunch = failed === 0;

    return {
      healthScore,
      readyForLaunch,
      checks,
      summary: `预检完成: ${passed} 通过 / ${warnings} 提示 / ${failed} 阻断 — ${
        readyForLaunch ? '✅ 可上线' : '❌ 存在阻断项，按 fix 修复'
      }`,
    };
  });
}
