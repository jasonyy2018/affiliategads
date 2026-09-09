#!/bin/bash
# ============================================================
# PrimeReviewLab 宿主机 cron 调度脚本（零付费 API · 真·自动化）
#
# 用法: ./run-cron-task.sh <task_key> [服务器基础URL]
#   例: ./run-cron-task.sh cron_pipeline http://127.0.0.1:3000
#
# 密钥: 读环境变量 ADMIN_SECRET_KEY，或脚本同目录 .env.local 里的一行
#       ADMIN_SECRET_KEY=xxx（与后台登录密码同一把，改密码后 cron 自动同步）。
#
# 部署: crontab -e 加一行（见 README「无人值守自动化」节）
# ============================================================
set -euo pipefail

TASK="${1:-}"
BASE="${2:-http://127.0.0.1:3000}"

if [ -z "$TASK" ]; then
  echo "usage: $0 <task_key> [base_url]" >&2
  exit 1
fi

# ---- 密钥解析（与登录同源: env > 同目录 .env.local） ----
SECRET="${ADMIN_SECRET_KEY:-}"
if [ -z "$SECRET" ] && [ -f "$(dirname "$0")/.env.local" ]; then
  SECRET=$(grep -E '^\s*ADMIN_SECRET_KEY\s*=' "$(dirname "$0")/.env.local" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)
fi
if [ -z "$SECRET" ]; then
  echo "[cron] ADMIN_SECRET_KEY 未配置 — 无法签名，退出" >&2
  exit 2
fi

TS=$(date +%s)
SIG=$(printf '%s.%s' "$TASK" "$TS" | openssl dgst -sha256 -hmac "$SECRET" -binary | openssl base64 -A | tr '+/' '-_' | tr -d '=')

echo "[cron] $(date '+%F %T') 触发任务: $TASK"
HTTP_CODE=$(curl -s -o /tmp/cron-${TASK}.json -w '%{http_code}' \
  -H "X-Cron-Timestamp: $TS" \
  -H "X-Cron-Signature: $SIG" \
  "$BASE/api/cron/$TASK")

if [ "$HTTP_CODE" = "200" ]; then
  echo "[cron] $TASK OK — $(cat /tmp/cron-${TASK}.json | head -c 400)"
else
  echo "[cron] $TASK FAILED (HTTP $HTTP_CODE): $(cat /tmp/cron-${TASK}.json 2>/dev/null | head -c 400)" >&2
  exit 3
fi
