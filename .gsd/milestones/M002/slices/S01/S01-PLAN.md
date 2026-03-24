# S01: Docker Production Container

**Goal:** `docker compose up` builds and starts the app with standalone Next.js output, `better-sqlite3` native modules, and volume-persisted SQLite data.
**Demo:** `docker compose up -d` on the dev machine → health check passes at `http://localhost:3000/api/health` → create a fridge → `docker compose down && docker compose up -d` → fridge still exists → container binds `0.0.0.0:3000` for LAN access.

## Must-Haves

- `next.config.ts` has `output: 'standalone'`
- Dockerfile runner stage uses `node server.js` entrypoint (not `npm start`) with standalone output
- Dockerfile runner copies `better-sqlite3` + its transitive deps (`bindings`, `file-uri-to-path`, `node-gyp-build`) explicitly into `/app/node_modules/`
- Dockerfile runner copies `.next/static/` and `public/` manually (standalone excludes them)
- `docker-compose.yml` passes `GOOGLE_AI_API_KEY` and sets `NODE_ENV: production`
- Named volume `thefridge_data` → `/app/data` persists SQLite across restarts
- `restart: unless-stopped` ensures auto-restart on host reboot (R029)
- Container binds `0.0.0.0:3000` for LAN access (R030)

## Proof Level

- This slice proves: operational
- Real runtime required: yes (Docker build + compose up)
- Human/UAT required: no (automated health check + API verification)

## Verification

- `docker build -t thefridge-test .` completes without error
- `bash scripts/verify-s01-docker.sh` passes all checks (health, data persistence, LAN binding)
- Health endpoint returns `{"status":"ok"}` from inside the container

## Observability / Diagnostics

- Runtime signals: `/api/health` returns DB connectivity status; container logs via `docker compose logs`
- Inspection surfaces: `docker compose ps` shows healthy status; `curl localhost:3000/api/health`
- Failure visibility: health check failure surfaces in `docker compose ps` as unhealthy; `/api/health` returns 503 with error message on DB failure

## Integration Closure

- Upstream surfaces consumed: `lib/db/client.ts` (DB_PATH = `process.cwd()/data`), `app/api/health/route.ts`
- New wiring introduced in this slice: `output: 'standalone'` changes the build output structure; Dockerfile runner stage is the new production entrypoint
- What remains before the milestone is truly usable end-to-end: S02 (PWA), S03 (last-used fridge), S04 (mDNS)

## Tasks

- [x] **T01: Configure standalone build and rewrite Dockerfile for production** `est:45m`
  - Why: The existing Dockerfile uses the wrong runner pattern (`npm start` + full `node_modules`) which doesn't work with `output: 'standalone'`. The runner stage must be rewritten, `next.config.ts` must enable standalone output, and `docker-compose.yml` needs the `GOOGLE_AI_API_KEY` passthrough.
  - Files: `next.config.ts`, `Dockerfile`, `docker-compose.yml`
  - Do: (1) Add `output: 'standalone'` to `next.config.ts`. (2) Rewrite Dockerfile runner stage: copy standalone output as primary payload, explicitly copy `better-sqlite3` + transitive deps, copy `.next/static/` and `public/`, set `CMD ["node", "server.js"]`. (3) Add `GOOGLE_AI_API_KEY` and `NODE_ENV` to docker-compose environment.
  - Verify: `grep -q "standalone" next.config.ts && grep -q "node.*server.js" Dockerfile && grep -q "GOOGLE_AI_API_KEY" docker-compose.yml`
  - Done when: All three files updated; Dockerfile runner stage uses standalone pattern with explicit native module copies.

- [ ] **T02: Write verification script and validate Docker build** `est:30m`
  - Why: The high-risk part of this slice is whether `better-sqlite3` native binaries survive the standalone build and are loadable at runtime. A verification script codifies the acceptance criteria for R027–R030 and catches regressions.
  - Files: `scripts/verify-s01-docker.sh`
  - Do: (1) Write `scripts/verify-s01-docker.sh` that builds the image, starts compose, waits for healthy, tests `/api/health`, creates a fridge via API, restarts compose, verifies fridge persists, checks `0.0.0.0` binding, cleans up. (2) Run `docker build -t thefridge-test .` to validate the build succeeds. (3) If Docker is available, run the full verification script.
  - Verify: `test -f scripts/verify-s01-docker.sh && bash -n scripts/verify-s01-docker.sh`
  - Done when: Verification script exists and is syntactically valid; Docker build succeeds (if Docker available); health check passes from running container.

## Files Likely Touched

- `next.config.ts`
- `Dockerfile`
- `docker-compose.yml`
- `scripts/verify-s01-docker.sh`
