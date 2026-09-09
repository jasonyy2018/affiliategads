/**
 * 免登录的宿主机 cron 触发端点。
 *
 * 用途：服务器 crontab 每 N 分钟调一次本端点，驱动任务引擎实现真·自动化，
 * 无需人工进后台点按钮，也无需任何付费调度服务。
 *
 * 鉴权：HMAC-SHA256 签名（密钥 = ADMIN_SECRET_KEY），非登录 token：
 *   签名串 = `${taskId}.${timestamp}`  （timestamp 为十秒级 Unix 时间，5 分钟窗口防重放）
 *   请求头 X-Cron-Timestamp = timestamp
 *   请求头 X-Cron-Signature  = base64url(HMAC)
 * 调用方（宿主机脚本）与服务器共享同一密钥；拿不到密钥就无法触发任何任务。
 *
 * 防滥用：
 *   - 未配密钥 → 一律 404（不暴露端点存在）
 *   - 签名错误 → 401，并计入登录限速表（复用爆破防护）
 */
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { executeTask, TASK_REGISTRY } from '@/lib/automation';
import { getSecret, isRateLimited, getClientIp } from '@/lib/adminAuth';

export const maxDuration = 300; // 长任务（cron_pipeline / pseo_generate）需要

const SIGN_WINDOW_MS = 5 * 60 * 1000;

function verifySignature(taskId: string, timestamp: string, signature: string, secret: string): boolean {
  // 时间窗校验（防重放：旧签名 5 分钟后失效）
  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > SIGN_WINDOW_MS) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${taskId}.${timestamp}`)
    .digest('base64url');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function handle(req: Request, taskId: string) {
  const secret = getSecret();
  // 未配置密钥 → 伪装 404，不暴露端点存在
  if (!secret) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const task = TASK_REGISTRY[taskId];
  if (!task) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  // 签名校验（失败计入限速，防签名爆破）
  const timestamp = req.headers.get('x-cron-timestamp') || '';
  const signature = req.headers.get('x-cron-signature') || '';
  if (!timestamp || !signature || !verifySignature(taskId, timestamp, signature, secret)) {
    if (isRateLimited(getClientIp(req))) {
      return NextResponse.json({ error: 'Too many attempts.' }, { status: 429 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 只允许 GET/POST，语义相同（cron 用 GET 更顺手）
  const result = await executeTask(taskId, {});
  return NextResponse.json({
    success: result.success,
    task: result.task,
    durationMs: result.durationMs,
    summary: result.summary,
    error: result.error,
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ task: string }> }) {
  const { task } = await params;
  return handle(req, task);
}

export async function POST(req: Request, { params }: { params: Promise<{ task: string }> }) {
  const { task } = await params;
  return handle(req, task);
}
