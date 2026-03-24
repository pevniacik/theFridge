# S01 Research: Docker Production Container

**Slice:** S01 — Docker Production Container
**Risk:** High (better-sqlite3 native compile + standalone output wiring)
**Requirements owned:** R027, R028, R029, R030

---

## Summary

Most of the scaffolding for S01 already exists in the worktree: a `Dockerfile`, `docker-compose.yml`, `.dockerignore`, and a working `/api/health` route. **However, the existing Dockerfile is wrong for `output: 'standalone'`** — it uses the old "copy node_modules to runner" pattern instead of the standalone server pattern, and `next.config.ts` has no `output: 'standalone'` at all. Three files need changes; one needs creation (none of the correct structure is in place yet). This is targeted work, not greenfield.

---

## What Exists

### Files in place (correct as-is or mostly correct)

| File | Status | Notes |
|------|--------|-------|
| `docker-compose.yml` | Mostly correct | Has `restart: unless-stopped`, named volume `thefridge_data` → `/app/data`, health check, `HOSTNAME: 0.0.0.0`, `ports: "${HOST_PORT:-3000}:3000"`. Missing `GOOGLE_AI_API_KEY` passthrough. |
| `.dockerignore` | Correct | Excludes `node_modules`, `.next`, `data`, `.env*`, `.gsd/worktrees`, `.gsd/runtime`. Fine as-is. |
| `app/api/health/route.ts` | Complete | Calls `getDb()` → `SELECT 1` to verify DB; returns `{status:"ok"}` on 200. Used by docker-compose healthcheck. |
| `lib/db/client.ts` | Correct path | `DB_DIR = path.join(process.cwd(), "data")`. With `WORKDIR /app` in Docker, this resolves to `/app/data` — correct for the volume mount. |
| `.env.example` | Present | Shows `GOOGLE_AI_API_KEY`, `OPENAI_API_KEY`, `QR_BASE_URL`. |

### Files that need changes

**`next.config.ts`** — currently:
```ts
const nextConfig: NextConfig = {
  /* Intentionally minimal for local-first v1 */
};
```
Needs `output: 'standalone'` added. This is the prerequisite for everything else.

**`Dockerfile`** — current runner stage (wrong):
```dockerfile
FROM node:22-bookworm-slim AS runner
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
CMD ["npm", "start"]   # uses `next start` — WRONG for standalone
```
The runner stage must instead:
1. Copy `.next/standalone/` as the primary payload
2. Copy `public/` → `.next/standalone/public/`
3. Copy `.next/static/` → `.next/standalone/.next/static/`
4. Copy `node_modules/better-sqlite3` explicitly (see native binary risk below)
5. Set `CMD ["node", ".next/standalone/server.js"]`

---

## Critical Risk: better-sqlite3 Native Module in Standalone

### The problem
Next.js `output: 'standalone'` uses `@vercel/nft` (Node File Tracing) to copy only the files that are statically reachable from the server entry point. Native `.node` binaries loaded via `require()` at runtime are often missed because `nft` can't statically trace dynamic `require()` calls (which `bindings` / `node-gyp-build` use to locate the compiled binary).

`better-sqlite3` loads its native binary via `node-gyp-build`, which does a runtime filesystem walk. This path is NOT statically traceable. The binary will NOT be in `.next/standalone/node_modules/better-sqlite3/` automatically.

### The fix
In the Dockerfile runner stage, after copying the standalone output, explicitly copy the full `better-sqlite3` package from the builder:
```dockerfile
COPY --from=builder --chown=node:node /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder --chown=node:node /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder --chown=node:node /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path
COPY --from=builder --chown=node:node /app/node_modules/node-gyp-build ./node_modules/node-gyp-build
```
These are placed at `/app/node_modules/` (alongside `.next/standalone/`), not inside `.next/standalone/node_modules/`. Node resolves modules up the directory tree, so `server.js` at `/app/.next/standalone/server.js` will find them at `/app/node_modules/`.

**Alternative approach**: use `outputFileTracingIncludes` in `next.config.ts` to force `nft` to include the native binary:
```ts
experimental: {
  outputFileTracingIncludes: {
    '/**': ['./node_modules/better-sqlite3/**', './node_modules/bindings/**', './node_modules/node-gyp-build/**']
  }
}
```
This is cleaner because Next.js handles the copy during build. Either approach works; the explicit COPY in Dockerfile is more reliable and easier to verify.

### The build stage already handles compilation correctly
The deps stage installs `python3 make g++` via apt, then runs `npm ci` — this compiles the `.node` binary for the correct Node version. The builder stage copies `node_modules` from deps. This part is correct. No changes needed to the deps or builder stages (except: deps stage should also install `libatomic1` for arm64/Pi targets; see below).

---

## Dockerfile: Full Correct Structure

### Deps stage: correct (with one addition)
```dockerfile
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
```
**No changes needed.** The existing apt packages are correct for bookworm (Debian 12). Alpine would need more packages (`alpine-sdk`, `python3`, etc.) — bookworm-slim is the right choice.

### Builder stage: one addition needed
```dockerfile
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
```
The existing `npm prune --omit=dev` after `npm run build` is fine but unnecessary if runner only uses standalone output. Can keep it for safety.

**Note:** `npm run build` currently does `rm -rf .next && next build`. With `output: 'standalone'`, this produces `.next/standalone/` — the entire server + bundled dependencies in one directory.

### Runner stage: needs full rewrite
```dockerfile
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# better-sqlite3 native binary (not traced by nft)
COPY --from=builder --chown=node:node /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder --chown=node:node /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder --chown=node:node /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path
COPY --from=builder --chown=node:node /app/node_modules/node-gyp-build ./node_modules/node-gyp-build

# Standalone Next.js output
COPY --from=builder --chown=node:node /app/.next/standalone ./

# Static assets must be copied manually (not included in standalone)
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

# Data directory for SQLite volume mount
RUN mkdir -p /app/data && chown node:node /app/data

USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

**Why `CMD ["node", "server.js"]` not `node .next/standalone/server.js`:** After `COPY --from=builder /app/.next/standalone ./`, the contents of standalone are extracted into `/app/` directly. `server.js` ends up at `/app/server.js`. This is the conventional pattern.

---

## docker-compose.yml: One Gap

Add `GOOGLE_AI_API_KEY` passthrough to the environment block:
```yaml
environment:
  PORT: "3000"
  HOSTNAME: "0.0.0.0"
  NODE_ENV: production
  GOOGLE_AI_API_KEY: ${GOOGLE_AI_API_KEY:-}
  OPENAI_API_KEY: ${OPENAI_API_KEY:-}
```
Currently missing `GOOGLE_AI_API_KEY` — the app's AI extraction will fail silently without it. Also add explicit `NODE_ENV: production` (it's set in the Dockerfile but docker-compose env can override).

The named volume `thefridge_data` → `/app/data` correctly satisfies R028 (data persistence). ✓

---

## next.config.ts: Single Addition

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

This is the only required change. It triggers the standalone build mode, which generates `.next/standalone/` with a self-contained server entry.

---

## Verification Plan

### Build verification (on dev machine)
```bash
docker build -t thefridge-test .
# Should complete without error — especially npm ci (better-sqlite3 compile)
```

### Smoke test
```bash
docker compose up -d
sleep 10
curl -s http://localhost:3000/api/health   # expect {"status":"ok",...}
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/  # expect 200
```

### Data persistence verification (R028)
```bash
# Create a fridge via API or UI, note its ID
curl -s -X POST http://localhost:3000/api/fridges \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Fridge","type":"fridge"}'
# Note fridgeId from response

docker compose down
docker compose up -d
sleep 10

# Fridge should still exist
curl -s http://localhost:3000/api/fridges
```

### LAN access verification (R030)
```bash
# From another machine on the same network:
curl -s http://<LAN-IP>:3000/api/health
# Browser: http://<LAN-IP>:3000 should load the app
```

### Auto-restart verification (R029)
- Confirmed by `restart: unless-stopped` in docker-compose.yml
- For boot persistence: `docker compose up -d` installs via systemd/launchd or `docker compose` is launched at boot. On Linux: add to `/etc/rc.local` or a systemd unit. On macOS: LaunchAgent plist. This is documented setup, not a code change.

---

## Implementation Order

1. **`next.config.ts`** — add `output: 'standalone'` (prerequisite for everything)
2. **`Dockerfile` runner stage** — rewrite per the structure above
3. **`docker-compose.yml`** — add `GOOGLE_AI_API_KEY` env passthrough
4. **Verify build succeeds** — `docker build .`
5. **Verify runtime** — `docker compose up`, health check, data persistence

---

## Risks Retired by This Slice

- **`better-sqlite3` in Docker**: retired by explicit COPY of native module into runner image (documented above)
- **`output: 'standalone'` entrypoint**: retired by correct Dockerfile runner structure
- **`process.cwd()` DB path**: `WORKDIR /app` + volume `/app/data` = `process.cwd()` returns `/app` → `DB_PATH = /app/data/fridges.db` ✓

---

## Forward Intelligence for Planner

- **Do not use Alpine** — `better-sqlite3` compilation on Alpine requires musl-specific packages and is error-prone. `node:22-bookworm-slim` (Debian 12 slim) is correct and already in the existing Dockerfile.
- **The `npm start` CMD is wrong** — it calls `next start` which requires `next` to be in node_modules AND requires the full `.next/` output. With standalone, the entrypoint is `node server.js` (no `next` binary needed in runner).
- **Static files are NOT automatic** — `output: 'standalone'` explicitly excludes `.next/static/` and `public/` from the standalone directory. The Dockerfile MUST copy them manually. Forgetting this means the app loads but CSS/JS assets 404.
- **Named volume vs bind mount** — `docker-compose.yml` uses a named Docker volume (`thefridge_data`), not a bind mount (`./data:/app/data`). Named volumes survive `docker compose down` but data lives in Docker's volume store, not a local `./data/` folder. This is fine for R028 but means the operator can't easily browse the DB file. The roadmap says `volumes: ["./data:/app/data"]` — consider switching to bind mount for operator convenience. Either satisfies R028.
- **Port flexibility** — `HOST_PORT` env var in compose allows changing the host-side port without editing the file. Good pattern, keep it.
- **S04 will modify docker-compose.yml** — the mDNS slice replaces `ports:` with `network_mode: host`. S01 should keep bridge networking (with explicit ports) so S02 and S03 can test against a running container before S04 changes networking.
- **`GOOGLE_AI_API_KEY` is the primary AI key** (free via Google AI Studio). It's in `.env.example` but not passed through in `docker-compose.yml`. Without it, the intake extraction falls back to the stub (returns empty items). Add it to the compose environment.
- **Health check start_period is 40s** — conservative but reasonable for first build. The health check correctly calls the `/api/health` route which exercises `getDb()`. If the DB path is wrong, the health check will catch it.
