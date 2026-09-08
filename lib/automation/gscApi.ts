/**
 * Google Search Console API 客户端（纯 fetch + Node crypto 签 JWT，零 SDK）。
 *
 * 需要：
 *   - GSC_SERVICE_ACCOUNT_JSON   内联服务账号 JSON 字符串，或
 *   - GSC_SERVICE_ACCOUNT_PATH   指向 .json 文件的路径（Docker 里挂进容器即可）
 *   - GSC_PROPERTY_ID            （可选）property 标识；缺省时自动按站点域名匹配
 *
 * 能力：
 *   1. 确认 / best-effort 提交 sitemap（Google 已对普通站点下线一键提交端点，
 *      这里能通就提交、不通就如实报告，不阻断）。
 *   2. 拉取真实 Search Analytics（按 page 聚合 90 天点击/展现/排名），
 *      写回 data/gsc_performance.csv —— gscMonitor 的剪枝引擎因此吃上真数据。
 *
 * 未配置服务账号时全模块静默降级（返回 configured:false，不抛错）。
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { DATA_DIR, REPORTS_DIR, withLock, tryWriteReport } from './dataLayer';
import { loadMergedSettings, getSiteUrl } from '../siteConfig';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_BASE = 'https://searchconsole.googleapis.com/webmasters/v3';
const SCOPE = 'https://www.googleapis.com/auth/searchconsole';

interface SaConfig {
  client_email: string;
  private_key: string;
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

/** 从 env（内联 JSON 或文件路径）加载服务账号凭证。未配置返回 null。 */
export function loadGscServiceAccount(): SaConfig | null {
  // 1. 内联 JSON 字符串
  const inline = (process.env.GSC_SERVICE_ACCOUNT_JSON || '').trim();
  if (inline.startsWith('{')) {
    try {
      const sa = normalizeSa(JSON.parse(inline));
      if (sa) return sa;
    } catch {}
  }

  // 2. 文件路径（Docker 挂载 / 本地）
  const candidates = [
    process.env.GSC_SERVICE_ACCOUNT_PATH,
    path.join(process.cwd(), 'gsc-service-account.json'),
    '/app/gsc-service-account.json',
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const sa = normalizeSa(JSON.parse(fs.readFileSync(p, 'utf-8')));
        if (sa) return sa;
      }
    } catch {}
  }
  return null;
}

function normalizeSa(raw: any): SaConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const email = raw.client_email;
  const key = raw.private_key || raw.privateKey;
  if (!email || !key) return null;
  return { client_email: String(email), private_key: String(key) };
}

export function isGscConfigured(): boolean {
  return Boolean(loadGscServiceAccount());
}

/** RS256 JWT 换取 access token（Google 服务账号标准 OAuth 流程）。 */
async function getAccessToken(sa: SaConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const signedInput = `${header}.${payload}`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(signedInput)
    .sign(sa.private_key)
    .toString('base64url');
  const jwt = `${signedInput}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(jwt)}`,
  });
  if (!res.ok) {
    throw new Error(`GSC token HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  if (!data.access_token) throw new Error('GSC token response missing access_token');
  return data.access_token as string;
}

async function gscGet(token: string, sub: string): Promise<any> {
  const res = await fetch(`${API_BASE}/${sub}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`GSC API GET ${sub} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
}

async function gscPost(token: string, sub: string, body: unknown): Promise<{ status: number; body: any }> {
  const res = await fetch(`${API_BASE}/${sub}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const parsed: any = await res.json().catch(() => ({}));
  return { status: res.status, body: parsed };
}

/** 解析 GSC property 标识：优先 GSC_PROPERTY_ID，否则按站点 host 从 property 列表匹配。 */
async function resolveProperty(token: string, siteUrl: string): Promise<string> {
  const explicit = (process.env.GSC_PROPERTY_ID || '').trim();
  if (explicit) return explicit;

  const list = await gscGet(token, 'sites');
  const sites: string[] = Array.isArray(list) ? list : list?.siteEntry?.siteUrl || [];
  const host = new URL(siteUrl).hostname.replace(/^www\./, '');
  // 优先 URL 前缀 property（https://host/），其次域名 property（sc-domain:host）
  const prefix = sites.find((s) => s.includes(`://${host}`));
  if (prefix) return prefix;
  const domain = sites.find((s) => s.endsWith(host));
  if (domain) return domain;
  if (sites.length === 1) return sites[0];
  throw new Error(
    `无法在 GSC 中匹配 property（host=${host}）。已授权 property: ${sites.join(', ') || '(无)'}。请设 GSC_PROPERTY_ID。`
  );
}

export interface GscSyncResult {
  configured: boolean;
  property: string | null;
  sitemapStatus: string;
  analyticsRows: number;
  csvPath: string | null;
  summary: string;
  error?: string;
}

function toCsvDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * GSC 全量同步：best-effort 提交/确认 sitemap + 拉 90 天真实 Search 数据写回 CSV。
 */
export async function runGscSync(opts?: { days?: number }): Promise<GscSyncResult> {
  return withLock('gsc_sync', async () => {
    const sa = loadGscServiceAccount();
    if (!sa) {
      return {
        configured: false,
        property: null,
        sitemapStatus: '—',
        analyticsRows: 0,
        csvPath: null,
        summary:
          '未配置 GSC 服务账号（GSC_SERVICE_ACCOUNT_JSON / _PATH）— 跳过。配好后自动提交 sitemap 并拉取真实展现数据驱动剪枝。',
      };
    }

    // 站点 URL（用于 property 匹配与 sitemap 路径）
    loadMergedSettings();
    const siteUrl = getSiteUrl();
    const days = opts?.days ?? 90;

    let property = 'unknown';
    let sitemapStatus = '—';
    let analyticsRows = 0;
    let error: string | undefined;
    let csvPath: string | null = null;
    let rows: Array<{ url: string; clicks: number; impressions: number; position: number }> = [];

    try {
      const token = await getAccessToken(sa);
      property = await resolveProperty(token, siteUrl);
      const enc = encodeURIComponent(property);

      // ---- 1. sitemap：确认 / best-effort 提交 ----
      let sitemapListed = false;
      try {
        const sitemaps = await gscGet(token, `sites/${enc}/sitemaps`);
        sitemapListed = true;
        const known = (sitemaps?.sitemap || [])
          .map((s: any) => s.path)
          .join(', ');
        // 端点在多数 property 上已下线；能提交就提交，失败仅作记录不阻断
        const submit = await gscPost(token, `sites/${enc}/sitemapNotifications`, {
          type: 'urlSubmission',
          sitemap: { path: '/sitemap.xml' },
        });
        if (submit.status === 200) {
          sitemapStatus = `✅ 已提交 /sitemap.xml（当前注册: ${known || '无'}）`;
        } else {
          sitemapStatus = `🟡 提交端点未放行（HTTP ${submit.status}），已注册: ${known || '无'} — Google 会经 robots Sitemap: 行自动发现`;
        }
      } catch (e: any) {
        sitemapStatus = `⚠️ ${sitemapListed ? '' : '查询失败: '}${e?.message || e}`;
      }

      // ---- 2. 拉取 90 天真实 Search Analytics（按 page 聚合）----
      const endDate = new Date();
      const startDate = new Date(Date.now() - days * 86400000);
      const queryRes = await gscPost(token, `sites/${enc}/searchQuery/query`, {
        dateRange: {
          startDate: toCsvDate(startDate),
          endDate: toCsvDate(endDate),
        },
        dimensions: ['page'],
        rowLimit: 25000,
      });
      const rowsRaw: any[] = queryRes.body?.rows || [];
      rows = rowsRaw
        .filter((r) => Array.isArray(r.keys) && typeof r.keys[0] === 'string')
        .map((r) => ({
          url: r.keys[0],
          clicks: Number(r.clicks || 0),
          impressions: Number(r.impressions || 0),
          position: Number(r.position || 0),
        }))
        .filter((r) => r.impressions > 0 || r.clicks > 0);

      // ---- 3. 写回 CSV（gscMonitor 剪枝引擎的数据源）----
      const csvLines = [
        `date,url,clicks,impressions,avg_position`,
        ...rows.map((r) =>
          [toCsvDate(endDate), r.url, r.clicks, r.impressions, r.position].join(',')
        ),
      ];
      const csvTarget = path.join(DATA_DIR, 'gsc_performance.csv');
      try {
        fs.mkdirSync(path.dirname(csvTarget), { recursive: true });
        fs.writeFileSync(csvTarget, csvLines.join('\n'), 'utf-8');
        csvPath = path.relative(process.cwd(), csvTarget);
        analyticsRows = rows.length;
      } catch (w: any) {
        error = `CSV 写入失败: ${w?.code || w?.message}`;
      }

      // ---- 4. 报告 ----
      const top = [...rows].sort((a, b) => b.clicks - a.clicks).slice(0, 15);
      const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
      const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
      const repLines = [
        '# 🔎 Google Search Console 同步报告',
        '',
        `> 生成时间: ${new Date().toISOString()} | property: ${property} | 窗口: 近 ${days} 天`,
        '',
        `| 指标 | 数值 |`,
        `|---|---|`,
        `| Sitemap | ${sitemapStatus} |`,
        `| 有数据页面 | ${analyticsRows} |`,
        `| 总点击 | ${totalClicks.toLocaleString()} |`,
        `| 总展现 | ${totalImpressions.toLocaleString()} |`,
        `| CSV 已写回 | ${csvPath ? '✅ ' + csvPath : '❌'} |`,
        '',
        '## Top 15 页面（按点击）',
        '',
        ...top.map((r) => `- ${r.url.replace(siteUrl.replace(/\/$/, ''), '')} — 点击 ${r.clicks} / 展现 ${r.impressions} / 位 ${r.position}`),
      ];
      const writeResult = tryWriteReport(
        path.join(REPORTS_DIR, 'gsc_sync_report.md'),
        repLines.join('\n')
      );

      return {
        configured: true,
        property,
        sitemapStatus,
        analyticsRows,
        csvPath,
        error: error || (writeResult.ok ? undefined : `报告写入失败: ${writeResult.error}`),
        summary:
          `GSC 同步完成: property ${property} · ${analyticsRows} 页有数据 · 总点击 ${totalClicks}` +
          (sitemapStatus.includes('✅') ? ' · sitemap 已提交' : ' · sitemap 端点未放行(robots 自动发现)') +
          (csvPath ? ' · 真数据已写回驱动剪枝' : ''),
      };
    } catch (e: any) {
      error = e?.message || String(e);
      return {
        configured: true,
        property,
        sitemapStatus,
        analyticsRows,
        csvPath,
        error,
        summary: `GSC 同步失败: ${error}`,
      };
    }
  });
}
