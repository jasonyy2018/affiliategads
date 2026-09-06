import { NextResponse } from 'next/server';
import { isAuthorized, unauthorized } from '@/lib/adminAuth';
import { runContentGenerator } from '@/lib/automation/contentGenerator';

export const maxDuration = 300;

export async function POST(req: Request) {
  if (!isAuthorized(req)) return unauthorized();

  try {
    const { slug, all = false, useAi = false } = await req.json().catch(() => ({}));

    const result = await runContentGenerator({ slug, all, useAi });

    return NextResponse.json({
      success: true,
      exitCode: 0,
      processed: result.processed,
      written: result.written,
      provider: result.provider,
      slugs: result.slugs,
      // 兼容旧前端的 stdout 字段
      stdout:
        `[OK] 内容生成完成 — 处理 ${result.processed} 个商品, 写入 ${result.written} 篇 (引擎: ${result.provider})\n` +
        result.slugs.map((s: string) => `  ✓ content/${s}.json`).join('\n'),
      stderr: '',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
