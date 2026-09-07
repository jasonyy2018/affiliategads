import { NextResponse } from 'next/server';
import { isAuthorized, unauthorized } from '@/lib/adminAuth';
import { executeTask, TASK_REGISTRY } from '@/lib/automation';
import { autoDetectAndSaveSiteUrl } from '@/lib/siteConfig';

export const maxDuration = 300; // 长任务 (pSEO 生成 / cron pipeline) 需要更长时间

export async function POST(req: Request) {
  if (!isAuthorized(req)) return unauthorized();

  try {
    const hostHeader = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const protoHeader = req.headers.get('x-forwarded-proto') || 'https';
    autoDetectAndSaveSiteUrl(hostHeader, protoHeader);

    const body = await req.json().catch(() => ({}));
    const { task, ...opts } = body || {};

    if (!task || !TASK_REGISTRY[task]) {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown task "${task}". Available: ${Object.keys(TASK_REGISTRY).join(', ')}`,
        },
        { status: 400 }
      );
    }

    const result = await executeTask(task, opts);

    return NextResponse.json({
      success: result.success,
      exitCode: result.success ? 0 : 1,
      task: result.task,
      taskLabel: result.label,
      taskDescription: TASK_REGISTRY[task].description,
      durationMs: result.durationMs,
      summary: result.summary,
      details: result.details,
      // 兼容旧前端的 stdout 字段
      stdout: result.success
        ? `[OK] ${result.label} 完成 (耗时 ${(result.durationMs / 1000).toFixed(2)}s)\n${result.summary}`
        : '',
      stderr: result.error || '',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: `Server exception: ${error?.message}` },
      { status: 500 }
    );
  }
}

// 任务目录（供前端渲染任务列表）
export async function GET(req: Request) {
  if (!isAuthorized(req)) return unauthorized();

  return NextResponse.json({
    success: true,
    tasks: Object.entries(TASK_REGISTRY).map(([key, def]) => ({
      key,
      label: def.label,
      description: def.description,
    })),
  });
}
