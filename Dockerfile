# ==========================================
# 阶段 1：依赖准备 (Dependencies)
# ==========================================
FROM node:22-alpine AS deps
WORKDIR /app

# 安装 libc6-compat 提升 Alpine 兼容性
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./
RUN npm ci

# ==========================================
# 阶段 2：编译构建 (Builder)
# ==========================================
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 执行 Next.js 生产构建（生成 standalone 独立运行包）
# 注：构建期需生成 pSEO 静态页，data/ 与 content/ 必须在镜像内
RUN npm run build

# ==========================================
# 阶段 3：轻量生产运行 (Runner)
# ==========================================
FROM node:22-alpine AS runner
WORKDIR /app

# 安装 su-exec 用于在 entrypoint 中优雅降权
RUN apk add --no-cache su-exec

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 创建非 root 安全用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 拷贝静态资源与 standalone 产物
# 注意：public 目录可为空（保持目录结构存在即可）
COPY --from=builder /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 数据与内容资产（运行时由自动化引擎读写）
COPY --from=builder --chown=nextjs:nodejs /app/data ./data
COPY --from=builder --chown=nextjs:nodejs /app/content ./content

# 确保运行时目录与 .env.local 存在（volume 挂载点 / 后台设置读写）
RUN mkdir -p /app/reports && \
    touch /app/.env.local && \
    chmod 664 /app/.env.local

# Root 入口：启动时修正 bind-mount 卷属主，然后通过 su-exec 降权到 nextjs 运行。
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
