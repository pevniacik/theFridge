---
id: T01
parent: S01
milestone: M002
provides:
  - next.config.ts with output: "standalone"
  - Dockerfile rewritten to use standalone runner stage with explicit native module copies
  - docker-compose.yml environment block with GOOGLE_AI_API_KEY and NODE_ENV
key_files:
  - next.config.ts
  - Dockerfile
  - docker-compose.yml
key_decisions:
  - Standalone runner copies better-sqlite3, bindings, file-uri-to-path, node-gyp-build explicitly because @vercel/nft cannot statically trace native .node binaries
  - COPY .next/standalone ./ extracts to /app/ so CMD is "node server.js" not "node .next/standalone/server.js"
patterns_established:
  - Native node addons must be manually COPY'd into standalone runner; file tracing never catches them
observability_surfaces:
  - /api/health endpoint (healthcheck in docker-compose.yml) reflects container liveness
  - docker compose ps shows healthy/unhealthy status driven by that healthcheck
  - docker compose logs streams structured stdout/stderr from server.js
duration: ~5m
verification_result: passed
completed_at: 2026-03-24
blocker_discovered: false
---

# T01: Configure standalone build and rewrite Dockerfile for production

**Rewrote Dockerfile runner stage for Next.js standalone output, added explicit better-sqlite3 native module copies, and wired GOOGLE_AI_API_KEY + NODE_ENV into docker-compose.yml.**

## What Happened

`next.config.ts` was updated to add `output: "standalone"`. The Dockerfile runner stage was completely replaced: the old stage copied full `node_modules` and used `CMD ["npm", "start"]`, which is incompatible with standalone mode. The new stage copies only the four native-module packages that `@vercel/nft` cannot trace (`better-sqlite3`, `bindings`, `file-uri-to-path`, `node-gyp-build`), then copies `.next/standalone ./` (which extracts `server.js` directly to `/app/server.js`), and finally copies `.next/static` and `public/`. The `CMD` is now `["node", "server.js"]`. `docker-compose.yml` gained `GOOGLE_AI_API_KEY` passthrough and explicit `NODE_ENV: production`.

## Verification

Ran five grep checks and `npm run type-check`:

- `grep -q '"standalone"' next.config.ts` → exit 0
- `grep -q 'node.*server\.js' Dockerfile` → exit 0
- `grep -q 'better-sqlite3' Dockerfile` → exit 0
- `grep -q 'GOOGLE_AI_API_KEY' docker-compose.yml` → exit 0
- `grep -q 'NODE_ENV: production' docker-compose.yml` → exit 0
- `npm run type-check` → exit 0 (clean, no errors)

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `grep -q '"standalone"' next.config.ts` | 0 | ✅ pass | <1s |
| 2 | `grep -q 'node.*server\.js' Dockerfile` | 0 | ✅ pass | <1s |
| 3 | `grep -q 'better-sqlite3' Dockerfile` | 0 | ✅ pass | <1s |
| 4 | `grep -q 'GOOGLE_AI_API_KEY' docker-compose.yml` | 0 | ✅ pass | <1s |
| 5 | `grep -q 'NODE_ENV: production' docker-compose.yml` | 0 | ✅ pass | <1s |
| 6 | `npm run type-check` | 0 | ✅ pass | 3.8s |

## Diagnostics

- **Container health**: `docker compose ps` reflects healthcheck state driven by `/api/health`
- **Logs**: `docker compose logs -f fridge-app` streams server.js stdout/stderr
- **Manual liveness**: `curl http://localhost:3000/api/health` should return `{"status":"ok"}`
- **Build failures**: if `better-sqlite3` is missing in runner, app crashes at startup with `Error: Could not locate the bindings file`; check `docker compose logs`

## Deviations

None — implementation matched the plan exactly.

## Known Issues

None.

## Files Created/Modified

- `next.config.ts` — added `output: "standalone"`, removed minimal comment
- `Dockerfile` — replaced runner stage with standalone pattern + explicit native module copies + correct CMD
- `docker-compose.yml` — added `GOOGLE_AI_API_KEY: ${GOOGLE_AI_API_KEY:-}` and `NODE_ENV: production` to environment block
