/**
 * Next.js 16 Proxy（原 Middleware）：
 *  1. /api/admin/* 强制校验 HMAC token（除 /api/admin/auth 登录端点本身）
 *  2. 全站附加基础安全响应头
 *
 * 注意：proxy 运行在 Edge/Node runtime，无法访问 Node crypto，
 * 因此 token 的密码学校验放在各 API route 内（lib/adminAuth.ts），
 * proxy 只做"有无凭证"的乐观预检（未携带即直接 401，省一次冷启动）。
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---- /api/admin/* 预检 ----
  if (pathname.startsWith('/api/admin/') && !pathname.startsWith('/api/admin/auth')) {
    const authHeader = request.headers.get('authorization') || '';
    const altHeader = request.headers.get('x-admin-token') || '';
    const hasCredentials =
      authHeader.startsWith('Bearer ') || altHeader.trim().length > 0;
    if (!hasCredentials) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in from the admin console.' },
        { status: 401 }
      );
    }
  }

  const res = NextResponse.next();

  // ---- 基础安全响应头 ----
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return res;
}

export const config = {
  matcher: [
    // 所有页面 + API，排除静态资源与 Next 内部路径
    '/((?!_next/static|_next/image|icon.svg|favicon.ico|images/|robots.txt|sitemap.xml).*)',
  ],
};
