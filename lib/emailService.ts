/**
 * 邮件服务层：Resend API（https://resend.com）。
 *
 * 需要环境变量：
 *   RESEND_API_KEY  — Resend API key
 *   LEADS_FROM_EMAIL — 发件地址（如 deals@primereviewlab.com，需在 Resend 验证域名）
 *
 * 未配置时所有函数静默降级（返回 skipped），lead 数据仍落盘 data/leads.json。
 */
import fs from 'fs';
import path from 'path';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function isConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.LEADS_FROM_EMAIL);
}

async function sendEmail(to: string, subject: string, html: string): Promise<{ sent: boolean; error?: string }> {
  if (!isConfigured()) return { sent: false, error: 'RESEND_API_KEY / LEADS_FROM_EMAIL not configured' };

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.LEADS_FROM_EMAIL,
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { sent: false, error: `Resend HTTP ${res.status}: ${errText.slice(0, 200)}` };
    }
    return { sent: true };
  } catch (e: any) {
    return { sent: false, error: e.message };
  }
}

/**
 * 品类清单模板（lead magnet 实际交付内容）。
 */
function buildChecklistEmail(category: string): string {
  const cat = category || 'Gear';
  const catTitle = cat.charAt(0).toUpperCase() + cat.slice(1);

  return `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0f172a; background: #f8fafc;">
  <div style="background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="background: #f59e0b; color: #0f172a; font-weight: 900; padding: 6px 14px; border-radius: 9999px; font-size: 13px; letter-spacing: 1px;">★ PrimeReviewLab</span>
    </div>

    <h1 style="font-size: 22px; margin: 0 0 8px;">Your ${catTitle} Buying Checklist</h1>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
      Here is the lab-tested checklist you requested. Bookmark this email — it covers the exact specs we measure before recommending any ${cat} model.
    </p>

    <h2 style="font-size: 16px; margin: 0 0 12px;">✅ The 6 Specs That Actually Matter</h2>
    <ol style="color: #334155; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0 0 24px;">
      <li><strong>Weight (g)</strong> — measured per pair on our lab scale, not the marketing number</li>
      <li><strong>Arch / torsional support</strong> — our 0-10 rigidity score for midfoot stability</li>
      <li><strong>Waterproofing</strong> — 60-minute submersion result, not just the "waterproof" label</li>
      <li><strong>Outsole grip</strong> — durometer-tested on wet rock, scree, and mud</li>
      <li><strong>Heel-to-toe drop (mm)</strong> — matters most if you're switching from zero-drop shoes</li>
      <li><strong>True-to-size fit</strong> — aggregated from verified buyer reports</li>
    </ol>

    <h2 style="font-size: 16px; margin: 0 0 12px;">🎯 Before You Buy</h2>
    <ul style="color: #334155; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0 0 24px;">
      <li>Try at home with your actual hiking socks — Amazon's 30-day return window covers sizing misses</li>
      <li>Check the live comparison matrix before ordering: our lab rankings update weekly</li>
      <li>Watch for price drops — we track historical pricing on every model we test</li>
    </ul>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://primereviewlab.com'}/hub/${cat.toLowerCase().replace(/\s+/g, '-')}"
         style="background: #0f172a; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 12px; display: inline-block;">
        Browse the ${catTitle} Comparison Hub →
      </a>
    </div>

    <p style="color: #94a3b8; font-size: 11px; line-height: 1.6; margin: 24px 0 0; border-top: 1px solid #e2e8f0; padding-top: 16px;">
      You're receiving this because you requested the free ${catTitle} buying checklist from PrimeReviewLab.
      As an Amazon Associate, PrimeReviewLab earns from qualifying purchases. Unsubscribe by replying to this email with "STOP".
    </p>
  </div>
</body>
</html>`;
}

/**
 * 给新 lead 发送清单邮件。
 */
export async function sendChecklistEmail(to: string, category: string): Promise<{ sent: boolean; error?: string }> {
  const subject = `Your ${category || 'Gear'} Buying Checklist — PrimeReviewLab`;
  return sendEmail(to, subject, buildChecklistEmail(category));
}

/**
 * 降价提醒邮件（admin 触发批量）。
 */
export async function sendDealAlertEmail(to: string, deal: { title: string; oldPrice: number; newPrice: number; url: string }): Promise<{ sent: boolean; error?: string }> {
  const drop = Math.round(((deal.newPrice - deal.oldPrice) / deal.oldPrice) * 100);
  const html = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #f8fafc;">
  <div style="background: #fff; border-radius: 16px; padding: 32px; border: 1px solid #fecdd3;">
    <h1 style="font-size: 20px; margin: 0 0 12px;">📉 Price Drop: ${deal.title}</h1>
    <p style="color: #334155; font-size: 14px; line-height: 1.6;">
      A model on your watch list just dropped <strong style="color:#e11d48;">${Math.abs(drop)}%</strong> —
      from <span style="text-decoration: line-through; color:#94a3b8;">$${deal.oldPrice.toFixed(2)}</span>
      to <strong>$${deal.newPrice.toFixed(2)}</strong>.
    </p>
    <a href="${deal.url}" style="background:#f59e0b; color:#0f172a; text-decoration:none; font-weight:700; padding:14px 24px; border-radius:12px; display:inline-block; margin-top:16px;">
      See the Deal on Amazon →
    </a>
    <p style="color:#94a3b8; font-size:11px; margin-top:24px;">Prices change frequently — verify on Amazon before ordering. PrimeReviewLab earns from qualifying purchases as an Amazon Associate.</p>
  </div>
</body>
</html>`;

  return sendEmail(to, `Price Drop: ${deal.title} — ${Math.abs(drop)}% off`, html);
}
