#!/bin/sh
set -e

echo "[entrypoint] Checking volume permissions..."

# 幂等修正挂载卷属主（只处理已知目录，失败不阻断启动）
chown -R nextjs:nodejs /app/data /app/content /app/reports 2>/dev/null || true

if [ -f /app/.env.local ]; then
  chown nextjs:nodejs /app/.env.local 2>/dev/null || true
  chmod 664 /app/.env.local 2>/dev/null || true
fi

# 如果以 root 身份运行，使用 su-exec 降权到 nextjs 用户；否则直接运行
if [ "$(id -u)" = "0" ]; then
  echo "[entrypoint] Running as root -> dropping privileges to nextjs via su-exec..."
  exec su-exec nextjs node server.js "$@"
else
  echo "[entrypoint] Running as $(whoami) -> starting node server.js..."
  exec node server.js "$@"
fi
