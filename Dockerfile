FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# better-sqlite3 native binary + its transitive deps (not traced by nft).
# Copied from the deps stage (pre-prune) because node-gyp-build and bindings
# are removed by "npm prune --omit=dev" in the builder stage.
COPY --from=deps --chown=node:node /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=deps --chown=node:node /app/node_modules/bindings ./node_modules/bindings
COPY --from=deps --chown=node:node /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

# Standalone Next.js output (server.js ends up at /app/server.js)
COPY --from=builder --chown=node:node /app/.next/standalone ./

# Static assets (excluded from standalone by design)
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

# Data directory for SQLite volume mount
RUN mkdir -p /app/data && chown node:node /app/data

USER node
EXPOSE 3000
CMD ["node", "server.js"]
