import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { sendChecklistEmail } from '@/lib/emailService';

interface LeadRecord {
  id: string;
  email: string;
  category?: string;
  useCase?: string;
  createdAt: string;
  source: string;
}

// 简单内存限速：每 IP 每小时最多 5 次提交
const submissions = new Map<string, { count: number; resetAt: number }>();
const MAX_PER_HOUR = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = submissions.get(ip);
  if (!entry || entry.resetAt < now) {
    submissions.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_HOUR;
}

// 邮箱格式校验（比 includes('@') 严格）
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  try {
    const fwd = req.headers.get('x-forwarded-for');
    const ip = fwd ? fwd.split(',')[0].trim() : req.headers.get('x-real-ip') || 'unknown';

    if (isRateLimited(ip)) {
      // 故意返回与成功一致的文案，避免给刷子探测信号
      return NextResponse.json({ success: true, message: 'Buyer checklist guide queued for dispatch.' });
    }

    const body = await req.json();
    const { email, category, useCase, website } = body;

    // 蜜罐字段：正常用户不会填写，机器人会
    if (website) {
      return NextResponse.json({ success: true, message: 'Buyer checklist guide queued for dispatch.' });
    }

    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim()) || email.length > 254) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required.' },
        { status: 400 }
      );
    }

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const leadsFilePath = path.join(dataDir, 'leads.json');
    let leads: LeadRecord[] = [];

    if (fs.existsSync(leadsFilePath)) {
      try {
        leads = JSON.parse(fs.readFileSync(leadsFilePath, 'utf-8'));
      } catch {
        leads = [];
      }
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = leads.find((l) => l.email === normalizedEmail);

    if (!existing) {
      const newLead: LeadRecord = {
        id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        email: normalizedEmail,
        category: typeof category === 'string' ? category.slice(0, 80) : 'all',
        useCase: typeof useCase === 'string' ? useCase.slice(0, 80) : 'general',
        createdAt: new Date().toISOString(),
        source: 'lead_magnet_modal',
      };
      leads.push(newLead);
      fs.writeFileSync(leadsFilePath, JSON.stringify(leads, null, 2), 'utf-8');

      // 触发清单邮件（异步、非阻塞 — 失败不影响留资落盘）
      sendChecklistEmail(normalizedEmail, typeof category === 'string' ? category : 'Gear')
        .then((result) => {
          if (!result.sent) {
            console.warn(`[lead] Checklist email not sent to ${normalizedEmail.slice(0, 3)}***: ${result.error || 'unknown'}`);
          }
        })
        .catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: 'Buyer checklist guide queued for dispatch.',
    });
  } catch (error: any) {
    console.error('Error saving lead:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    );
  }
}

// 注意：出于隐私保护（PII 防泄露），此端点刻意不提供 GET。
// 买家名单请通过 admin 后台的 /api/admin/reports（需鉴权）查看或导出。
