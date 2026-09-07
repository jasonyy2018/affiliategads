#!/bin/sh
# Next.js 容器入口：修正 bind-mount 卷属主后降权运行。
#
# 背景：docker-compose 将宿主机 ./data ./content ./reports bind-mount 进容器。
# 宿主目录属主（宿主用户 uid，通常 1000）与容器运行用户 nextjs（uid 1001）不一致，
# 导致自动化引擎（cron_pipeline / 报告写入 / leads 落盘 / .env.local 保存）EACCES。
#
# 该入口需以 root 启动，chown 完成后降权到 nextjs 执行 server.js。

set -e

echo "[entrypoint] Fixing ownership of mounted volumes..."

# 幂等修正挂载卷属主（只处理已知目录，失败不阻断启动）
chown -R nextjs:nodejs /app/data /app/content /app/reports 2>/dev/null || \
  echo "[entrypoint] WARN: chown failed (check volume mount permissions)"

if [ -f /app/.env.local ]; then
  chown nextjs:nodejs /app/.env.local 2>/dev/null || true
fi

echo "[entrypoint] Dropping privileges to nextjs..."

# 降权运行（su 在 alpine busybox 中始终可用）
exec su -s /bin/sh -c 'exec node server.js' nextjs
