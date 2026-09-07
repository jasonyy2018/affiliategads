import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, isRateLimited, clearRateLimit, getClientIp } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Please try again in 5 minutes.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const password = body?.password;
    const result = verifyPassword(typeof password === 'string' ? password : '');

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error || 'Incorrect admin access key.' },
        { status: 401 }
      );
    }

    clearRateLimit(ip);
    return NextResponse.json({
      success: true,
      message: 'Authentication successful.',
      token: result.token,
    });
  } catch (err: any) {
    console.error('Auth Route Error:', err);
    return NextResponse.json(
      { success: false, error: `Server error during authentication: ${err?.message || 'Unknown'}` },
      { status: 500 }
    );
  }
}
