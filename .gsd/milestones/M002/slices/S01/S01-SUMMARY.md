# S01: Docker Production Container — Summary

**Milestone:** M002
**Status:** Complete
**Completed:** 2026-03-24

## What This Slice Delivered

S01 converted theFridge from a bare Node.js dev app into a reproducible, self-contained Docker container that anyone can run with `docker compose up` — no Node, no npm, no manual setup.

### Files Created / Modified

| File | Change |
|------|--------|
| `next.config.ts` | Added `output: "standalone"` |
| `Dockerfile` | Complete 3-stage build: `deps` → `builder` → `runner`; runner uses standalone output with explicit native module copies |
| `docker-compose.yml` | Full production config: named volume, healthcheck, `restart: unless-stopped`, `GOOGLE_AI_API_KEY` passthrough, `OPENAI_API_KEY` passthrough, `HOSTNAME: 0.0.0.0`, structured logging |
| `scripts/verify-s01-docker.sh` | 7-step automated verification script covering R027–R030 |

### Verification Result

`bash scripts/verify-s01-docker.sh` → **6/6 checks pass** (52s build + 64s runtime)

| Check | Requirement | Result |
|-------|-------------|--------|
| `docker compose build` | R027 | ✅ pass |
| `GET /api/health` → `{"status":"ok"}` | R027 | ✅ pass |
| `POST /api/fridges` creates a fridge | R028 setup | ✅ pass |
| Fridge survives `docker compose down && up` | R028 | ✅ pass |
| Restart policy is `unless-stopped` | R029 | ✅ pass |
| Port binding includes `0.0.0.0:3000` | R030 | ✅ pass |

## Key Patterns Established

### 1. Multi-stage Docker build for Next.js standalone + better-sqlite3

Three stages: `deps` (full `npm ci` with build tools), `builder` (`npm run build` + `npm prune`), `runner` (standalone output only).

The runner stage must copy native modules from the **`deps` stage**, not `builder` — `npm prune --omit=dev` in the builder removes `bindings` and `file-uri-to-path` which are needed by the `better-sqlite3` loader at runtime.

```dockerfile
COPY --from=deps --chown=node:node /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=deps --chown=node:node /app/node_modules/bindings ./node_modules/bindings
COPY --from=deps --chown=node:node /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path
```

### 2. Standalone output entrypoint and asset copies

`output: "standalone"` changes the production entrypoint from `npm start` → `node server.js`. The Dockerfile must also manually copy:
- `.next/static/` → `.next/static/` (static assets excluded from standalone by design)
- `public/` → `public/` (same)

`.next/standalone/` is copied with `COPY .next/standalone ./` which places `server.js` directly at `/app/server.js` — the CMD is `["node", "server.js"]`, not `["node", ".next/standalone/server.js"]`.

### 3. SQLite data persistence with named volumes

Named Docker volume `thefridge_data` → `/app/data` survives `docker compose down`, image rebuilds, and host reboots. The Dockerfile runner stage creates `/app/data` with correct ownership (`node:node`) before the volume is mounted.

### 4. Verification script idioms

- Pre-cleanup step (compose down + docker rm -f) makes the script idempotent against stale containers from interrupted runs.
- `(( ++PASS )) || true` not `((PASS++))` — post-increment with `set -e` exits on the first call when the counter starts at 0.

## What S01 Does NOT Cover (for downstream slices)

- **PWA manifest and icons** — S02
- **Service worker** — S02 (and only if HTTPS is available; plain HTTP LAN blocks SW registration)
- **Last-used fridge redirect** — S03
- **mDNS `thefridge.local`** — S04 (modifies `docker-compose.yml` to use `network_mode: host`)
- **Real-device LAN testing** — verified with localhost during S01; actual phone access confirmed in S02+S03

## Decisions Made

- **D032**: `output: 'standalone'` for Docker runner (locked, no revisit)
- **D033**: Copy native modules from `deps` stage not `builder` (locked, no revisit)

## What S02 Consumes From Here

- Running container at `http://localhost:3000` (or `http://<LAN-IP>:3000`)
- `Dockerfile` and `docker-compose.yml` are stable; S02 adds `withSerwist` to `next.config.ts` only
- `public/` directory is served correctly by the container (needed for PWA icons and manifest)
- `HOSTNAME: 0.0.0.0` is already set in compose environment — app is LAN-reachable for phone testing

## Observability Surfaces

- `curl http://localhost:3000/api/health` → `{"status":"ok","timestamp":"..."}` confirms server + DB liveness
- `docker compose ps` → shows `healthy` / `unhealthy` state (driven by built-in healthcheck)
- `docker compose logs -f fridge-app` → streams server.js stdout/stderr (SQLite init, request logs)
- `bash scripts/verify-s01-docker.sh` → exit 0 = R027–R030 all pass
