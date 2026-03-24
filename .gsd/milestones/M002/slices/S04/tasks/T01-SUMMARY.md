---
id: T01
parent: S04
milestone: M002
provides:
  - bonjour-service production dependency with standalone nft inclusion
  - lib/mdns/advertise.ts: mDNS advertisement module with SIGTERM/SIGINT cleanup
  - instrumentation.ts: Next.js hook that starts mDNS advertisement in nodejs+production
key_files:
  - lib/mdns/advertise.ts
  - instrumentation.ts
  - next.config.ts
  - package.json
key_decisions:
  - outputFileTracingIncludes used to force bonjour-service into standalone because dynamic import() behind NODE_ENV guard is invisible to nft static analysis
patterns_established:
  - Packages only loaded via dynamic import() inside runtime guards must be force-included via outputFileTracingIncludes in next.config.ts
observability_surfaces:
  - "[mdns] Advertising thefridge.local on port <PORT>" logged on startup when NEXT_RUNTIME=nodejs and NODE_ENV=production
  - "[mdns] Stopping advertisement" logged on SIGTERM/SIGINT
  - "docker compose -f docker-compose.host.yml logs fridge-app | grep mdns" — primary inspection surface
duration: ~10m
verification_result: passed
completed_at: 2026-03-24
blocker_discovered: false
---

# T01: Add mDNS advertisement module and Next.js instrumentation hook

**Installed bonjour-service, created mDNS advertisement module and Next.js instrumentation hook; forced package into standalone output via outputFileTracingIncludes.**

## What Happened

`bonjour-service@^1.3.0` was installed as a production dependency. `lib/mdns/advertise.ts` was created exporting `startMdnsAdvertisement()`, which creates a Bonjour instance, publishes a service named `thefridge` on the configured port, logs the `[mdns] Advertising…` line, and registers SIGTERM/SIGINT cleanup handlers that unpublish and destroy the Bonjour instance gracefully.

`instrumentation.ts` was created at the project root with the required dual guards (`NEXT_RUNTIME === 'nodejs'` and `NODE_ENV === 'production'`) and a dynamic `import()` for the advertise module. The guards prevent Edge runtime import of Node.js UDP socket modules and prevent dev-server HMR from creating multiple Bonjour instances.

One unplanned deviation was required: Next.js nft (node-file-trace) could not statically discover `bonjour-service` through the dynamic import behind the `NODE_ENV === 'production'` guard, so the first build left `bonjour-service` absent from `.next/standalone`. The fix was to add `outputFileTracingIncludes: { "**": ["./node_modules/bonjour-service/**"] }` to `next.config.ts`, which forces nft to include the package and its transitive files regardless of static analysis.

## Verification

All three task verification checks passed:

1. `npm run type-check` — exits 0, no TypeScript errors with the new files.
2. `npm run build` — exits 0, full production build succeeds including serwist/PWA bundling.
3. `find .next/standalone -type d -name "bonjour-service"` — finds `.next/standalone/.gsd/worktrees/M002/node_modules/bonjour-service` (nested due to worktree structure, which matches how the Dockerfile copies node_modules at package root).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm run type-check` | 0 | ✅ pass | ~2.6s |
| 2 | `npm run build` | 0 | ✅ pass | ~35s |
| 3 | `test -d .next/standalone/.gsd/worktrees/M002/node_modules/bonjour-service` | 0 | ✅ pass | <1s |

## Observability Impact

- **Startup signal:** `[mdns] Advertising thefridge.local on port 3000` logged to stdout when the Next.js node server starts in production with `NEXT_RUNTIME=nodejs`. Absence of this line means the instrumentation hook didn't fire or the runtime guard blocked it.
- **Shutdown signal:** `[mdns] Stopping advertisement` logged on SIGTERM/SIGINT — confirms graceful cleanup of mDNS multicast.
- **Inspection command:** `docker compose -f docker-compose.host.yml logs fridge-app | grep mdns` — shows both startup and shutdown events.
- **Failure state visibility:** If the log line is missing post-startup, check (a) whether `NODE_ENV=production` and `NEXT_RUNTIME=nodejs` env vars are set, (b) whether `instrumentation.ts` was compiled into `.next/server/instrumentation.js`, (c) whether `bonjour-service` exists in the standalone node_modules.

## Diagnostics

- Check mDNS started: `docker compose -f docker-compose.host.yml logs fridge-app | grep '\[mdns\]'`
- Verify instrumentation compiled: `ls .next/server/instrumentation.js`
- Verify standalone inclusion: `find .next/standalone -name "bonjour-service" -type d`
- Verify package is in production deps: `node -e "const p = require('./package.json'); console.log(p.dependencies['bonjour-service'])"`

## Deviations

**`outputFileTracingIncludes` added to `next.config.ts` (unplanned):** The task plan assumed nft would automatically trace `bonjour-service` through the dynamic import in `instrumentation.ts`. In practice, nft cannot statically evaluate the `NODE_ENV === 'production'` guard and therefore never follows the import. The fix — `outputFileTracingIncludes: { "**": ["./node_modules/bonjour-service/**"] }` — is the canonical Next.js solution for packages hidden behind runtime guards. This adds one extra file to the `key_files` list (`next.config.ts`).

## Known Issues

None. The worktree-nested path (`.next/standalone/.gsd/worktrees/M002/node_modules/bonjour-service`) is expected behavior when building in a git worktree; the Dockerfile for M002 copies from the root `node_modules`, so the container will have the package at the correct path.

## Files Created/Modified

- `lib/mdns/advertise.ts` — new: mDNS advertisement module with SIGTERM/SIGINT cleanup
- `instrumentation.ts` — new: Next.js instrumentation hook, guards on nodejs runtime + production only
- `next.config.ts` — modified: added `outputFileTracingIncludes` to force bonjour-service into standalone output
- `package.json` — modified: `bonjour-service@^1.3.0` added to `dependencies`
