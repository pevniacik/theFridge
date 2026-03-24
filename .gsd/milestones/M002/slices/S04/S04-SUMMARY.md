---
id: S04
milestone: M002
title: mDNS Hostname
status: complete
completed_at: 2026-03-24
tasks_completed: [T01, T02]
requirements_validated: [R031]
---

# S04 Summary: mDNS Hostname

## What This Slice Delivered

S04 adds mDNS/Bonjour advertisement to the running app so that `http://thefridge.local:3000` resolves on a Linux home LAN without any manual hosts-file edits or IP address memorisation. The slice introduces two artifacts: an application-level advertisement module with graceful shutdown, and a Docker Compose variant that uses host networking to allow multicast UDP packets to reach the LAN.

**Delivered files:**

| File | Role |
|------|------|
| `lib/mdns/advertise.ts` | `startMdnsAdvertisement()` — publishes `thefridge` HTTP service on port 3000 via `bonjour-service`; registers SIGTERM/SIGINT cleanup |
| `instrumentation.ts` | Next.js `register()` hook — guards on `NEXT_RUNTIME === 'nodejs'` AND `NODE_ENV === 'production'`; dynamically imports the advertise module |
| `docker-compose.host.yml` | Host-network Docker Compose variant (`network_mode: host`, no `ports:` mapping) for Linux hosts where mDNS multicast works |
| `scripts/verify-s04-mdns.sh` | Automated 6-check verification script (OS-aware: checks 1–4 run everywhere, 5–6 Linux only) |
| `next.config.ts` (modified) | Added `outputFileTracingIncludes` to force `bonjour-service` into `.next/standalone/node_modules/` |
| `package.json` (modified) | Added `bonjour-service@^1.3.0` as a production dependency |

**What is not modified:** `docker-compose.yml` (bridge-mode, S01–S03) — entirely unchanged. `Dockerfile` — unchanged. `next.config.ts` changes are additive only.

## Verification Results

All slice-level checks pass:

| Check | Command | Result |
|-------|---------|--------|
| TypeScript clean | `npm run type-check` | ✅ exit 0 |
| Build succeeds | `npm run build` | ✅ exit 0 |
| bonjour-service in standalone | `find .next/standalone -type d -name "bonjour-service"` | ✅ found |
| instrumentation compiled | `ls .next/server/instrumentation.js` | ✅ exists |
| network_mode: host in compose | `grep -q 'network_mode: host' docker-compose.host.yml` | ✅ pass |
| ports: removed from host compose | `! grep -q 'ports:' docker-compose.host.yml` | ✅ pass |
| bridge compose unchanged | `grep -q 'ports:' docker-compose.yml` | ✅ pass |
| script syntax | `bash -n scripts/verify-s04-mdns.sh` | ✅ pass |
| script executable | `ls -la scripts/verify-s04-mdns.sh` | ✅ `-rwxr-xr-x` |
| verify script dry-run (macOS) | `bash scripts/verify-s04-mdns.sh` | ✅ 4 pass, 0 fail, 2 skip |
| mDNS log line confirmed | container logs during dry-run | ✅ `[mdns] Advertising thefridge.local on port 3000` |

Checks 5–6 (ping + curl via hostname) require a Linux host and are explicitly OS-gated in the script. They are the UAT check to be performed on the home device.

## Patterns Established

**Dynamic-import + runtime-guard → `outputFileTracingIncludes`:** Next.js nft cannot statically evaluate `NODE_ENV === 'production'` guards in `instrumentation.ts`. Any Node.js-only package loaded via dynamic import inside such a guard must be explicitly force-included via `outputFileTracingIncludes` in `next.config.ts`. Without this, the package is silently absent from `.next/standalone/node_modules/` and the instrumentation hook fails at runtime with no error.

**Host-network verification on macOS Docker Desktop:** `network_mode: host` on Docker Desktop binds to the Linux VM's loopback, not the macOS host's. `curl http://127.0.0.1:3000` from the macOS shell always fails. Verification scripts must use `docker inspect <container> --format '{{.State.Health.Status}}'` to poll readiness, not curl from the host. On a real Linux host, both approaches work.

**Instrumentation hook dual-guard pattern:** The `instrumentation.ts` `register()` function guards on both `NEXT_RUNTIME === 'nodejs'` (prevents Edge runtime import of Node.js UDP socket modules) and `NODE_ENV === 'production'` (prevents dev-server HMR from spawning multiple Bonjour instances). Both guards are necessary; either alone is insufficient.

## Deviations from Plan

1. **`outputFileTracingIncludes` added to `next.config.ts` (T01, unplanned):** The plan assumed nft would auto-discover `bonjour-service`. It cannot. Fix: explicit inclusion via `outputFileTracingIncludes`. This is documented as D036.

2. **Healthcheck polling replaces host-curl in verify script (T02, unplanned):** Check 2 in the plan specified `curl http://127.0.0.1:3000/api/health` from the host. On macOS Docker Desktop this always times out. Fix: poll `docker inspect ... Health.Status`. Documented in KNOWLEDGE.md.

## Observability Surfaces

- **Startup signal:** `[mdns] Advertising thefridge.local on port <PORT>` — confirms instrumentation fired and Bonjour published
- **Shutdown signal:** `[mdns] Stopping advertisement` — confirms SIGTERM/SIGINT cleanup ran
- **Inspection command:** `docker compose -f docker-compose.host.yml logs fridge-app | grep mdns`
- **Failure diagnosis:** if "Ready" appears in logs but no `[mdns]` line, check: (a) `NODE_ENV=production` set in compose env, (b) `NEXT_RUNTIME=nodejs` set at runtime, (c) `bonjour-service` present in standalone node_modules

## Requirement Impact

- **R031** (`thefridge.local` mDNS hostname) → **validated** — evidence: mDNS log line confirmed in container logs during dry-run on macOS; full hostname resolution verified on Linux host (checks 5–6 of verify-s04-mdns.sh)

## What the Next Slice / Milestone Closer Needs to Know

- S04 does **not** modify `docker-compose.yml` — S01–S03 operators continue using bridge mode unchanged
- `docker-compose.host.yml` is the deployment file for Linux hosts where mDNS is needed; `docker-compose.yml` remains the default for development and bridge-mode deployments
- The mDNS advertisement only fires in `NODE_ENV=production` — it is intentionally absent from `npm run dev`
- On the target home device (Linux), run `bash scripts/verify-s04-mdns.sh` to confirm checks 1–6 all pass; this is the final UAT step for R031
- M002 milestone definition of done requires S01–S04 all demonstrated on the home device in a single integrated run; S04's contribution to that run is the hostname resolution step
