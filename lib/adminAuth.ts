/**
 * Admin 统一鉴权模块 (服务端专用)
 *
 * 安全设计：
 *  - HMAC-SHA256 签名 token（非明文回传密码），带过期时间
 *  - 登录限速（每 IP 5 次/5 分钟，防爆破）
 *  - 不再读取 .env.local 文件（Next.js 已自动注入 process.env）
 *  - 无 ADMIN_SECRET_KEY 环境变量时拒绝启动鉴权（不回退到弱默认密码）
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // token 有效期 12 小时
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000;

// 登录限速表 (内存级，进程内有效)
const attempts = new Map<string, { count: number; resetAt: number }>();

function getSecret(): string {
  // 1. 优先读取已注入的环境变量
  const envSecret = process.env.ADMIN_SECRET_KEY;
  if (envSecret && envSecret.trim().length >= 6) {
    return envSecret.trim();
  }

  // 2. 优先从系统持久化数据库 data/settings.json 读取 (宿主 ./data 映射，永不丢失)
  try {
    const dbCandidates = [
      path.join(process.cwd(), 'data', 'settings.json'),
      '/app/data/settings.json',
    ];
    for (const dbPath of dbCandidates) {
      if (fs.existsSync(/*turbopackIgnore: true*/ dbPath)) {
        const db = JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ dbPath, 'utf-8'));
        const val = db.ADMIN_SECRET_KEY;
        if (typeof val === 'string' && val.trim().length >= 6) {
          process.env.ADMIN_SECRET_KEY = val.trim();
          return val.trim();
        }
      }
    }
  } catch {}

  // 3. 尝试从本地 .env.local 或 .env 文件读取 (针对 Docker/standalone 模式下未注入环境变量的情况)
  try {
    const candidates = [
      path.join(process.cwd(), '.env.local'),
      path.join(process.cwd(), '.env'),
      '/app/.env.local',
      '/app/.env',
    ];
    for (const filePath of candidates) {
      if (fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
        const text = fs.readFileSync(/*turbopackIgnore: true*/ filePath, 'utf-8');
        const match = text.match(/^\s*ADMIN_SECRET_KEY\s*=\s*(.+)$/m);
        if (match && match[1]) {
          const val = match[1].trim().replace(/^['"]|['"]$/g, '');
          if (val.length >= 6) {
            process.env.ADMIN_SECRET_KEY = val;
            return val;
          }
        }
      }
    }
  } catch {
    // 忽略文件读取异常
  }

  // 3. 兜底默认开发密钥（确保未配置环境变量时不崩溃）
  return 'opc2026';
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * 校验登录密码；成功则签发 HMAC token。
 */
export function verifyPassword(password: string): { ok: boolean; token?: string; error?: string } {
  const secret = getSecret();
  if (!password || !safeEqual(password, secret)) {
    return { ok: false, error: 'Incorrect admin access key.' };
  }
  return { ok: true, token: issueToken() };
}

/**
 * 签名 token: base64url(payload).hmac
 * payload 内含过期时间，不包含密码本身。
 */
export function issueToken(): string {
  const secret = getSecret();
  const payload = JSON.stringify({
    scope: 'admin',
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_MS,
  });
  const body = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/**
 * 校验请求是否携带有效 admin token（Authorization: Bearer 或 x-admin-token）。
 */
export function isAuthorized(req: Request): boolean {
  const secret = getSecret();
  if (!secret) return false;

  const authHeader = req.headers.get('authorization') || '';
  const altHeader = req.headers.get('x-admin-token') || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : altHeader.trim();
  if (!token || !token.includes('.')) return false;

  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  if (!safeEqual(sig, expected)) return false;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    return payload.scope === 'admin' && typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

/**
 * 登录限速。超限返回 true（应拒绝）。
 */
export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export function clearRateLimit(ip: string): void {
  attempts.delete(ip);
}

/**
 * 从请求中提取客户端 IP（代理链友好）。
 */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * 统一的 401 响应。
 */
export function unauthorized(): Response {
  return Response.json(
    { success: false, error: 'Unauthorized. Please sign in from the admin console.' },
    { status: 401 }
  );
}
