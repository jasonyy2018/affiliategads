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

    const { password } = await req.json();
    const result = verifyPassword(typeof password === 'string' ? password : '');

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    clearRateLimit(ip);
    return NextResponse.json({
      success: true,
      message: 'Authentication successful.',
      token: result.token,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Server error during authentication.' },
      { status: 500 }
    );
  }
}
