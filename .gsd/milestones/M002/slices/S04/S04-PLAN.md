# S04: mDNS Hostname

**Goal:** `http://thefridge.local:3000` resolves on the home LAN via mDNS/Bonjour advertisement from the Docker container.
**Demo:** On a Linux host running `docker compose -f docker-compose.host.yml up`, `ping thefridge.local` resolves and `curl http://thefridge.local:3000/api/health` returns `{"status":"ok"}`.

## Must-Haves

- `bonjour-service` installed as a production dependency
- `lib/mdns/advertise.ts` publishes `thefridge` service on port 3000 with SIGTERM/SIGINT cleanup
- `instrumentation.ts` at project root calls `startMdnsAdvertisement()` only in nodejs runtime + production
- `docker-compose.host.yml` uses `network_mode: host` with no `ports:` mapping
- Existing `docker-compose.yml` (bridge networking) is NOT modified — S01–S03 remain unaffected
- macOS Docker Desktop limitation is documented in compose file comments
- Verification script `scripts/verify-s04-mdns.sh` exercises container startup, log check, and hostname resolution

## Proof Level

- This slice proves: integration (mDNS multicast from container reaches LAN)
- Real runtime required: yes (Linux host with Docker)
- Human/UAT required: yes (final hostname resolution verified on target device)

## Verification

- `npm run type-check` passes with new files
- `npm run build` succeeds and `bonjour-service` is traced into `.next/standalone/node_modules/`
- `bash scripts/verify-s04-mdns.sh` passes checks 1–4 on any host (container start, health, network mode, log line); checks 5–6 (ping + curl via hostname) pass on Linux only
- Container logs contain `[mdns] Advertising thefridge.local on port 3000`

## Observability / Diagnostics

- Runtime signals: `[mdns] Advertising thefridge.local on port 3000` log line on startup; SIGTERM/SIGINT cleanup logged
- Inspection surfaces: `docker compose -f docker-compose.host.yml logs fridge-app | grep mdns`
- Failure visibility: missing log line means instrumentation hook didn't fire or runtime guard blocked it

## Integration Closure

- Upstream surfaces consumed: `docker-compose.yml` (structure cloned into host variant), `Dockerfile` (unchanged — nft traces bonjour-service automatically), `next.config.ts` (unchanged — instrumentation auto-detected)
- New wiring introduced: `instrumentation.ts` → `lib/mdns/advertise.ts` → `bonjour-service`; `docker-compose.host.yml` as alternate compose file
- What remains before the milestone is truly usable end-to-end: final integrated acceptance (S01–S04 all demonstrated on target device)

## Tasks

- [x] **T01: Add mDNS advertisement module and Next.js instrumentation hook** `est:30m`
  - Why: Creates the application-level mDNS capability — the `bonjour-service` dependency, the advertisement module, and the instrumentation hook that starts it in production. This is the core of R031.
  - Files: `package.json`, `lib/mdns/advertise.ts`, `instrumentation.ts`
  - Do: Install `bonjour-service@^1.3.0` as a dependency. Create `lib/mdns/advertise.ts` exporting `startMdnsAdvertisement()` that creates a Bonjour instance, publishes `{name:'thefridge', type:'http', port}`, logs `[mdns] Advertising...`, and registers SIGTERM/SIGINT cleanup. Create `instrumentation.ts` at project root with `register()` that guards on `NEXT_RUNTIME === 'nodejs'` and `NODE_ENV === 'production'` before dynamically importing the advertise module. Run `npm install` then `npm run type-check` and `npm run build`.
  - Verify: `npm run type-check` exits 0; `npm run build` exits 0; `ls .next/standalone/node_modules/bonjour-service` confirms nft tracing
  - Done when: type-check clean, build succeeds, `bonjour-service` present in standalone node_modules

- [x] **T02: Create host-mode compose file and mDNS verification script** `est:30m`
  - Why: Provides the Docker networking configuration required for mDNS multicast to reach the LAN, and an automated verification script that exercises R031. Keeps the existing bridge-mode compose file intact for S01–S03 operators.
  - Files: `docker-compose.host.yml`, `scripts/verify-s04-mdns.sh`
  - Do: Create `docker-compose.host.yml` cloning the structure of `docker-compose.yml` but replacing `ports:` with `network_mode: host`. Add comments documenting the macOS limitation. Create `scripts/verify-s04-mdns.sh` that: (1) builds and starts with `docker compose -f docker-compose.host.yml up -d`, (2) waits for health endpoint, (3) inspects container for host network mode, (4) checks logs for `[mdns]` line, (5) on Linux only: pings `thefridge.local` and curls the health endpoint via hostname, (6) tears down. Script must detect OS and skip/warn for macOS on checks 5–6.
  - Verify: `bash scripts/verify-s04-mdns.sh` runs without errors on the dev machine (checks 1–4 pass; checks 5–6 skipped on macOS with warning)
  - Done when: Host-mode compose file exists; verification script is executable and passes available checks

## Files Likely Touched

- `package.json`
- `lib/mdns/advertise.ts`
- `instrumentation.ts`
- `docker-compose.host.yml`
- `scripts/verify-s04-mdns.sh`
