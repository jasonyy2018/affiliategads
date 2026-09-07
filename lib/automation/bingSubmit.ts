/**
 * Bing Webmaster URL 批量推送（原 scripts/bing_submit.py）
 * 87% 的 ChatGPT 引用匹配 Bing 前十结果 → Bing 是 GEO 的第一杠杆。
 * 需要 BING_API_KEY；未配置时输出模拟推送预览。
 */
import fs from 'fs';
import path from 'path';
import { PAGES_DIR, DATA_DIR, REPORTS_DIR, withLock, readJson, tryWriteReport } from './dataLayer';
import type { MatrixData } from './dataLayer';

function collectUrls(siteUrl: string): string[] {
  const clean = siteUrl.replace(/\/+$/, '');
  const urls = [clean];

  const matrix = readJson<MatrixData>(path.join(DATA_DIR, 'matrix.json'), {
    categories: [],
    use_cases: [],
    price_bands: [],
    excluded_combinations: [],
  });
  for (const cat of matrix.categories) {
    urls.push(`${clean}/hub/${cat.toLowerCase().replace(/\s+/g, '-')}`);
  }

  if (fs.existsSync(PAGES_DIR)) {
    for (const file of fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.json'))) {
      urls.push(`${clean}/best/${file.replace(/\.json$/, '')}`);
    }
  }

  return urls;
}

export interface BingSubmitResult {
  mode: 'live' | 'preview';
  submitted: number;
  quota: { daily: number; remaining: number } | null;
  error?: string;
  reportPath: string;
}

export async function runBingSubmit(apply = true): Promise<BingSubmitResult> {
  return withLock('bing_submit', async () => {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const apiKey = process.env.BING_API_KEY || '';
    const urls = collectUrls(siteUrl);

    let mode: 'live' | 'preview' = 'preview';
    let quota: { daily: number; remaining: number } | null = null;
    let error: string | undefined;
    let submitted = 0;

    if (apply && apiKey.length > 5) {
      try {
        // 先查配额
        const quotaRes = await fetch(
          `https://ssl.bing.com/webmaster/api.svc/json/GetUrlSubmissionQuota?siteUrl=${encodeURIComponent(siteUrl)}&apikey=${apiKey}`
        );
        if (quotaRes.ok) {
          const qd = await quotaRes.json();
          quota = {
            daily: qd?.d?.DailyQuota ?? 0,
            remaining: qd?.d?.DailyQuotaRemaining ?? 0,
          };
        }

        // 批量推送 (每次上限 500)
        const batch = urls.slice(0, 500);
        const res = await fetch(
          `https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlBatch?apikey=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteUrl, urlList: batch }),
          }
        );
        if (res.ok) {
          mode = 'live';
          submitted = batch.length;
        } else {
          error = `Bing API HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`;
        }
      } catch (e: any) {
        error = e.message;
      }
    }

    const lines = [
      '# 🚀 Bing Webmaster URL 批量推送报告',
      '',
      `> 生成时间: ${new Date().toISOString()} | 模式: ${mode === 'live' ? '✅ 实盘推送' : '👁 预览 (未配置 BING_API_KEY 或未 apply)'}`,
      '',
      `| 指标 | 数值 |`,
      `|---|---|`,
      `| 收集 URL | ${urls.length} |`,
      `| 已推送 | ${mode === 'live' ? submitted : 0} |`,
      `| 每日配额 | ${quota?.daily ?? '—'} |`,
      `| 剩余配额 | ${quota?.remaining ?? '—'} |`,
      '',
      '## URL 清单',
      '',
      ...urls.map((u) => `- ${u}`),
    ];
    if (error) lines.push('', `## 错误`, '', error);

    const reportPath = path.join(REPORTS_DIR, 'bing_submission_report.md');
    const writeResult = tryWriteReport(reportPath, lines.join('\n'));

    return {
      mode,
      submitted: mode === 'live' ? submitted : 0,
      quota,
      error: error || (writeResult.ok ? undefined : `报告写入失败: ${writeResult.error}`),
      reportPath: path.relative(process.cwd(), reportPath),
      summary:
        (mode === 'live'
          ? `Bing 推送完成: ${submitted} URL 已提交`
          : `Bing 推送预览: ${urls.length} URL 就绪 (配置 BING_API_KEY 后实盘)`) +
        (writeResult.ok ? '' : ` [报告写入失败: ${writeResult.error}]`),
    };
  });
}
