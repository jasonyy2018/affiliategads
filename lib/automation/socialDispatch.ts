/**
 * 社媒一键广播（原 scripts/social_dispatcher.py）
 * 将 syndicate 内容 + 新页面清单推送到配置的 Webhook (Make.com / Zapier / Pabbly)。
 */
import fs from 'fs';
import path from 'path';
import { SYNDICATE_DIR, PAGES_DIR, REPORTS_DIR, withLock, loadGeoQuestions, tryWriteReport } from './dataLayer';

function listFiles(dir: string, ext: string): string[] {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => f.endsWith(ext));
  } catch {
    return [];
  }
}

export interface SocialDispatchResult {
  mode: 'live' | 'preview';
  payloadCount: number;
  webhookConfigured: boolean;
  reportPath: string;
  error?: string;
}

export async function runSocialDispatch(apply = true): Promise<SocialDispatchResult> {
  return withLock('social_dispatch', async () => {
    const webhook = process.env.SOCIAL_WEBHOOK_URL || '';
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const questions = loadGeoQuestions();

    const reddit = listFiles(path.join(SYNDICATE_DIR, 'reddit'), '.md');
    const medium = listFiles(path.join(SYNDICATE_DIR, 'medium'), '.md');
    const quora = listFiles(path.join(SYNDICATE_DIR, 'quora'), '.md');

    // 构建广播 payload：每条疑问一条社交卡片
    const payloads = questions.slice(0, 20).map((q) => ({
      event: 'content_broadcast',
      platform_hints: ['reddit', 'medium', 'quora', 'x', 'linkedin'],
      question: q.question,
      headline: q.direct_verdict,
      metric: q.key_metric,
      url: `${siteUrl}/best/${q.target_slug}`,
      assets: {
        reddit: reddit.find((f) => f.startsWith(q.target_slug)) || null,
        medium: medium.find((f) => f.startsWith(q.target_slug)) || null,
        quora: quora.find((f) => f.startsWith(q.target_slug)) || null,
      },
      timestamp: new Date().toISOString(),
    }));

    let mode: 'live' | 'preview' = 'preview';
    let error: string | undefined;

    if (apply && webhook.startsWith('http')) {
      try {
        // 分批发送（每批 5 条）
        for (let i = 0; i < payloads.length; i += 5) {
          const batch = payloads.slice(i, i + 5);
          const res = await fetch(webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'opc_broadcast_batch', items: batch }),
          });
          if (!res.ok) {
            error = `Webhook HTTP ${res.status} at batch ${Math.floor(i / 5) + 1}`;
            break;
          }
        }
        if (!error) mode = 'live';
      } catch (e: any) {
        error = e.message;
      }
    }

    const lines = [
      '# 📣 全网社媒一键广播报告',
      '',
      `> 生成时间: ${new Date().toISOString()} | 模式: ${mode === 'live' ? '✅ 已推送 Webhook' : '👁 预览 (未配置 SOCIAL_WEBHOOK_URL)'}`,
      '',
      `| 指标 | 数值 |`,
      `|---|---|`,
      `| 广播卡片 | ${payloads.length} |`,
      `| Reddit 素材 | ${reddit.length} |`,
      `| Medium 素材 | ${medium.length} |`,
      `| Quora 素材 | ${quora.length} |`,
      '',
      '## 广播清单',
      '',
      ...payloads.map((p) => `- [${p.platform_hints.join('/')}] ${p.question} → ${p.url}`),
    ];
    if (error) lines.push('', '## 错误', '', error);

    const reportPath = path.join(REPORTS_DIR, 'social_dispatch_report.md');
    const writeResult = tryWriteReport(reportPath, lines.join('\n'));

    return {
      mode,
      payloadCount: payloads.length,
      webhookConfigured: webhook.startsWith('http'),
      reportPath: path.relative(process.cwd(), reportPath),
      error,
      summary:
        (mode === 'live'
          ? `广播完成: ${payloads.length} 条卡片已推送 Webhook`
          : `广播预览: ${payloads.length} 条卡片就绪 (配置 SOCIAL_WEBHOOK_URL 后实盘推送)`) +
        (writeResult.ok ? '' : ` [报告写入失败: ${writeResult.error}]`),
    };
  });
}
