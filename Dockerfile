# syntax=docker/dockerfile:1
# AdvokatKerak — bitta Dockerfile, uchta maqsad (target):
#   tools  — toʻliq manba + node_modules: Telegram bot va migratsiyalar (prisma migrate deploy / seed)
#   runner — Next.js standalone server (sayt)
# docker-compose.yml ularni kerakli servislar uchun ishlatadi.

ARG NODE_VERSION=22

# ---------- 1. Bogʻliqliklar ----------
FROM node:${NODE_VERSION}-bookworm-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
# postinstall → prisma generate (sxema kerak)
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# ---------- 2. Bot va migratsiyalar uchun ----------
FROM deps AS tools
ENV NODE_ENV=production
COPY . .
RUN npx prisma generate
# Standart buyruq — Telegram bot (webhook rejimi)
CMD ["npm", "run", "bot"]

# ---------- 3. Next.js build ----------
FROM tools AS builder
# NEXT_PUBLIC_* qiymatlari build vaqtida kodga joylanadi — shuning uchun build argumentlari
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_BRAND_NAME
ARG NEXT_PUBLIC_CONTACT_PHONE
ARG NEXT_PUBLIC_CONTACT_EMAIL
ARG NEXT_PUBLIC_TELEGRAM_BOT
ARG NEXT_PUBLIC_TELEGRAM_CHANNEL
ARG NEXT_PUBLIC_INSTAGRAM
ARG NEXT_PUBLIC_OPERATOR_INFO
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_YM_ID
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_BRAND_NAME=$NEXT_PUBLIC_BRAND_NAME \
    NEXT_PUBLIC_CONTACT_PHONE=$NEXT_PUBLIC_CONTACT_PHONE \
    NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL \
    NEXT_PUBLIC_TELEGRAM_BOT=$NEXT_PUBLIC_TELEGRAM_BOT \
    NEXT_PUBLIC_TELEGRAM_CHANNEL=$NEXT_PUBLIC_TELEGRAM_CHANNEL \
    NEXT_PUBLIC_INSTAGRAM=$NEXT_PUBLIC_INSTAGRAM \
    NEXT_PUBLIC_OPERATOR_INFO=$NEXT_PUBLIC_OPERATOR_INFO \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY \
    NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID \
    NEXT_PUBLIC_YM_ID=$NEXT_PUBLIC_YM_ID \
    BUILD_WITHOUT_DB=1 \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    DIRECT_URL=postgresql://build:build@localhost:5432/build \
    NEXT_TELEMETRY_DISABLED=1
# BUILD_WITHOUT_DB=1: build vaqtida baza yoʻq — ochiq sahifalar birinchi soʻrovda generatsiya qilinib keshlanadi (ISR)
RUN npm run build

# ---------- 4. Sayt (minimal image) ----------
FROM node:${NODE_VERSION}-bookworm-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    LOCAL_STORAGE_DIR=/app/storage
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs \
    && mkdir -p /app/storage /app/.next/cache && chown -R nextjs:nodejs /app/storage /app/.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
