# ============================================================
# Nathara Safe Campus — API (bun)
# ============================================================
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile

FROM oven/bun:1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY server.js ./
COPY src ./src
COPY db ./db
RUN mkdir -p /app/.data

# The app reads config from env vars (DATABASE_URL, SSO_JWKS_URL, ...).
EXPOSE 5001
CMD ["bun", "server.js"]
