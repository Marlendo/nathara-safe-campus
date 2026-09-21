# ============================================================
# SafePath — API (Node.js)
# ============================================================
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY server.js ./
COPY src ./src
COPY db ./db
RUN mkdir -p /app/.data

# The app reads config from env vars (DATABASE_URL, JWT_SECRET, ...).
EXPOSE 5001
CMD ["node", "server.js"]