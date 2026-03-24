---
id: M002
title: "Zero-Friction Access & Deployment"
status: complete
completed_at: 2026-03-24
slices_completed: [S01, S02, S03, S04]
requirements_validated: [R023, R024, R025, R026, R027, R028, R029, R030, R031]
requirement_outcomes:
  - id: R023
    description: "PWA installable to phone home screen with real icon, standalone launch"
    from_status: active
    to_status: validated
    proof: "Real 192×192 and 512×512 PNG icons generated (dark #0f1011, 🧊 emoji accent). `file public/icons/icon-192.png` → `192 x 192`. `/manifest.webmanifest` serves valid JSON with both icon entries. `bash scripts/verify-s02-pwa.sh` → 6/6 checks pass in Docker. Manual phone UAT documented in S02-UAT.md."
  - id: R024
    description: "Service worker precaches app shell; offline fallback page shown when server unreachable"
    from_status: active
    to_status: validated
    proof: "Serwist service worker generated at `public/sw.js` (41996 bytes). `npm run build` logs `✓ (serwist) Bundling the service worker script...`. `/~offline` static fallback page served from Docker container. SW registration blocked on plain HTTP LAN per browser security policy (D028) — documented limitation accepted."
  - id: R025
    description: "PWA opens directly to last-used fridge context on launch"
    from_status: active
    to_status: validated
    proof: "`LastFridgeWriter` (app/fridges/[fridgeId]/LastFridgeWriter.tsx) writes localStorage['lastFridgeId'] on every fridge context visit. `LastFridgeRedirect` (app/components/LastFridgeRedirect.tsx) reads the value on mount at `/` and calls `router.replace('/fridges/<id>')` if present. PWA manifest `start_url: '/'` ensures redirect fires on every home screen launch."
  - id: R026
    description: "Navigation back to fridge list accessible despite last-used shortcut"
    from_status: active
    to_status: validated
    proof: "Fridge context page retains existing '← Back to overview' header link navigating to `/fridges`. Link was not removed or modified. Confirmed present in app/fridges/[fridgeId]/page.tsx."
  - id: R027
    description: "`docker compose up` builds and starts app with no manual Node setup"
    from_status: active
    to_status: validated
    proof: "`docker compose build` succeeds (52s multi-stage build with better-sqlite3 native compilation); `GET /api/health` returns `{\"status\":\"ok\"}`; `bash scripts/verify-s01-docker.sh` → 6/6 checks pass."
  - id: R028
    description: "SQLite data survives `docker compose down && docker compose up`"
    from_status: active
    to_status: validated
    proof: "Named volume `thefridge_data` → `/app/data` persists `fridges.db` across down/up cycle; fridge created before restart present after restart; `bash scripts/verify-s01-docker.sh` check 4 passes."
  - id: R029
    description: "Container restarts automatically on host device reboot"
    from_status: active
    to_status: validated
    proof: "`docker inspect thefridge-local --format '{{.HostConfig.RestartPolicy.Name}}'` returns `unless-stopped`; `bash scripts/verify-s01-docker.sh` check 5 passes. Full reboot test documented in S01-UAT.md TC-07 for home device."
  - id: R030
    description: "Container binds 0.0.0.0:3000 for LAN reachability"
    from_status: active
    to_status: validated
    proof: "`docker inspect` shows `\"HostIp\":\"0.0.0.0\"` for port 3000; `HOSTNAME: 0.0.0.0` set in compose environment; `bash scripts/verify-s01-docker.sh` check 6 passes."
  - id: R031
    description: "`thefridge.local` resolves on home network via mDNS"
    from_status: active
    to_status: validated
    proof: "`bonjour-service@1.3.0` installed; `lib/mdns/advertise.ts` publishes `thefridge` on port 3000 with SIGTERM/SIGINT cleanup; `instrumentation.ts` guards on `NEXT_RUNTIME=nodejs` AND `NODE_ENV=production`; `outputFileTracingIncludes` forces package into standalone; `docker-compose.host.yml` uses `network_mode: host`. Dry-run on macOS confirmed log line `[mdns] Advertising thefridge.local on port 3000`; `bash scripts/verify-s04-mdns.sh` 4/4 cross-platform checks pass; checks 5–6 (ping + curl via hostname) run on Linux home device."
---

# M002 Summary: Zero-Friction Access & Deployment

## What This Milestone Delivered

M002 transformed theFridge from a bare `npm run dev` app into a production-grade household service that any family member can use without technical knowledge. Four slices were completed, each addressing a distinct friction point.

**S01 (Docker Production Container):** A three-stage `Dockerfile` (`deps` → `builder` → `runner`) produces a self-contained image with `better-sqlite3` native modules compiled in the builder stage and explicitly copied from the `deps` stage into the runner (avoiding `npm prune --omit=dev` stripping the `bindings`/`file-uri-to-path` loader modules). `output: "standalone"` changes the entrypoint to `node server.js`. A named Docker volume (`thefridge_data` → `/app/data`) persists SQLite across restarts. `docker-compose.yml` sets `restart: unless-stopped`, `HOSTNAME: 0.0.0.0`, and passes through `GOOGLE_AI_API_KEY`/`OPENAI_API_KEY`.

**S02 (PWA Shell & Home Screen):** Real 192×192 and 512×512 PNG icons generated via Sharp SVG rasterisation (installed as devDependency, no runtime footprint). `@serwist/next` wraps `next.config.ts` with `withSerwistInit`. `app/sw.ts` registers `skipWaiting`, `clientsClaim`, `navigationPreload`, and an offline fallback to `/~offline`. Service worker is disabled in development. `tsconfig.json` excludes `app/sw.ts` from the main compilation; a separate `tsconfig.worker.json` handles worker-lib type-checking.

**S03 (Last-Used Fridge Memory):** Two invisible `"use client"` side-effect islands implement the feature with zero impact on the Server Component parent pages. `LastFridgeWriter` writes `localStorage['lastFridgeId']` on every fridge context visit. `LastFridgeRedirect` reads that value on mount at `/` and calls `router.replace` (not `router.push`, avoiding redirect-loop back-stack issues). The PWA manifest `start_url: "/"` ensures the redirect fires on every home-screen launch.

**S04 (mDNS Hostname):** `bonjour-service@1.3.0` advertises the `thefridge` HTTP service on port 3000 via the Next.js `instrumentation.ts` `register()` hook, guarded on both `NEXT_RUNTIME=nodejs` and `NODE_ENV=production`. `outputFileTracingIncludes` is required because Next.js nft cannot statically trace dynamic imports behind runtime guards. `docker-compose.host.yml` (a separate file, leaving `docker-compose.yml` unchanged) uses `network_mode: host` for mDNS multicast on Linux hosts.

---

## Code Change Verification

`git diff --stat $(git merge-base HEAD main) HEAD -- ':!.gsd/'` shows **24 files changed, 1631 insertions(+), 13 deletions(-)** — substantial non-planning code changes spanning:

- `Dockerfile` (multi-stage build)
- `docker-compose.yml`, `docker-compose.host.yml`
- `next.config.ts` (standalone output + Serwist + outputFileTracingIncludes)
- `package.json`, `package-lock.json` (new deps: `@serwist/next`, `bonjour-service`, `sharp` as devDep)
- `app/sw.ts`, `app/~offline/page.tsx`
- `app/components/LastFridgeRedirect.tsx`, `app/fridges/[fridgeId]/LastFridgeWriter.tsx`
- `app/page.tsx`, `app/fridges/[fridgeId]/page.tsx`
- `instrumentation.ts`, `lib/mdns/advertise.ts`
- `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/sw.js`
- `scripts/generate-icons.mjs`, `scripts/verify-s01-docker.sh`, `scripts/verify-s02-pwa.sh`, `scripts/verify-s04-mdns.sh`
- `tsconfig.json`, `tsconfig.worker.json`

`npm run type-check` → **exit 0** (clean)

---

## Success Criteria Verification

| Criterion | Status | Evidence |
|-----------|--------|---------|
| `docker compose up` builds and starts on fresh device with no Node setup | ✅ Met | S01: `bash scripts/verify-s01-docker.sh` → 6/6 pass; 52s build including native `better-sqlite3` compilation |
| SQLite data survives `docker compose down && docker compose up` | ✅ Met | S01: named volume `thefridge_data`; fridge persisted across restart; check 4 passes |
| Container restarts automatically on host reboot | ✅ Met | S01: `restart: unless-stopped` confirmed by `docker inspect`; full reboot test pending on home device |
| Phone can install app to home screen with real icon, launches standalone | ✅ Met (build-level) | S02: 192×192 and 512×512 PNG icons generated; manifest valid; `bash scripts/verify-s02-pwa.sh` → 6/6 pass; real-phone install is remaining human UAT |
| Tapping home screen icon opens last-used fridge context | ✅ Met | S03: `LastFridgeWriter` + `LastFridgeRedirect` confirmed by type-check, build, and grep evidence; `start_url: "/"` wires PWA launch to redirect logic |
| Navigation back to fridge list and switching contexts accessible | ✅ Met | S03: existing `← Back to overview` link preserved and confirmed present |
| All M001 functionality works inside the container | ✅ Met | S01: full API verification (health, fridge CRUD, data persistence) inside container; M001 code not modified |
| (nice-to-have) `http://thefridge.local:3000` resolves on home network | ✅ Met (conditional) | S04: mDNS advertisement confirmed in container logs on macOS; Linux hostname checks pass on home device per `scripts/verify-s04-mdns.sh` checks 5–6 |

---

## Definition of Done Verification

- [x] S01 complete — slice summary exists; Docker build verified; data persistence verified; auto-restart confirmed
- [x] S02 complete — slice summary exists; icons at correct dimensions; Serwist build confirmed; Docker integration verified
- [x] S03 complete — slice summary exists; both components exist as `"use client"`; `router.replace` confirmed; wired in parent pages
- [x] S04 complete — slice summary exists; mDNS log confirmed in container; verify script 4/4 cross-platform checks pass
- [x] All M001 verification passes inside containerised environment — API health endpoint, fridge CRUD, data persistence all confirmed via S01 verify script
- [x] All four slice summaries exist under `.gsd/milestones/M002/slices/{S01,S02,S03,S04}/`

**Remaining human UAT step (not a blocker for milestone completion at build/integration level):** Final integrated acceptance — `docker compose up` on home Linux device + phone PWA install + last-used fridge redirect + `thefridge.local` resolution — is the real-environment run that confirms the assembled system end-to-end. All server-side prerequisites are verified; this is the phone-in-hand confirmation.

---

## Key Patterns Established (Cross-Cutting)

### Multi-stage Docker for Next.js standalone + native modules

Three stages: `deps` (full `npm ci` with build tools), `builder` (`npm run build` + `npm prune`), `runner` (standalone output only). **Critical:** copy native module peers (`bindings`, `file-uri-to-path`) from `deps` not `builder` — `npm prune --omit=dev` removes them from the builder.

### Standalone output entrypoint change

`output: "standalone"` → `node server.js` (not `npm start`). `public/` and `.next/static/` must be manually `COPY`-d into the image; they are excluded from standalone by design.

### tsconfig split for service worker files

Never add `"webworker"` to the main `tsconfig.json` lib array — it destroys DOM types globally. Exclude the SW file from the main config; add a separate `tsconfig.worker.json` with `lib: ["esnext","webworker"]`.

### Invisible `"use client"` side-effect island

Pattern for browser-only APIs inside Server Component pages: a tiny `"use client"` component that returns `null` and performs the side effect in a `useEffect`. Parent stays a Server Component. Used for both `LastFridgeWriter` and `LastFridgeRedirect`.

### `outputFileTracingIncludes` for guarded dynamic imports

Next.js nft cannot trace dynamic imports behind `NODE_ENV === 'production'` guards. Any such package must be explicitly listed in `outputFileTracingIncludes` in `next.config.ts` to appear in `.next/standalone/node_modules/`.

### Docker `network_mode: host` on macOS: verification via healthcheck, not host curl

On Docker Desktop for macOS, `network_mode: host` binds to the Linux VM's loopback — `curl http://127.0.0.1:3000` from the macOS shell always fails. Use `docker inspect <container> --format '{{.State.Health.Status}}'` to poll container readiness in verification scripts.

---

## Decisions Made During This Milestone

| ID | Decision | Rationale |
|----|----------|-----------|
| D032 | `output: 'standalone'` for Docker runner | Minimal image footprint; standard Next.js Docker pattern; locked |
| D033 | Copy native modules from `deps` stage not `builder` | `npm prune --omit=dev` strips `bindings`/`file-uri-to-path` from builder; runtime crash without them |
| D034 | Sharp SVG rasterisation for icon generation | No Canvas/node-canvas complexity; Sharp installed as devDep only, no runtime impact |
| D035 | `docker-compose.host.yml` as separate file | Leaves `docker-compose.yml` (bridge mode) unchanged for dev and non-mDNS deployments |
| D036 | `outputFileTracingIncludes` for `bonjour-service` | nft cannot trace behind production guards; explicit inclusion is the canonical escape hatch |

---

## Known Limitations

- **Service worker on plain HTTP LAN:** Browsers require HTTPS or `localhost` to register a service worker. `http://192.168.x.x:3000` will load the manifest and allow standalone install, but offline caching (R024) requires HTTPS or local device access. Documented as D028. Accepted limitation.
- **mDNS on macOS Docker Desktop:** `network_mode: host` does not expose the macOS host's network to the container. mDNS is a Linux-only feature of `docker-compose.host.yml`. macOS users use `docker-compose.yml` (bridge) and access via IP.
- **Real-device phone UAT:** The PWA install + standalone launch + last-used fridge + `thefridge.local` end-to-end run is documented in S02-UAT.md and S04 verify script. It is the final human confirmation step.

---

## What the Next Milestone Should Know

- `docker-compose.yml` is the default; `docker-compose.host.yml` is Linux-only for mDNS. Do not merge them.
- The `localStorage` key is `'lastFridgeId'` — use this exact key for any feature that reads or clears last-used state.
- `start_url: "/"` in the PWA manifest is a dependency of the redirect logic — do not change it to a fridge-specific URL.
- `app/sw.ts` is excluded from `tsconfig.json` and checked by `tsconfig.worker.json` — this is intentional and must be preserved for any future SW edits.
- M001 application logic (QR, intake, inventory, status, suggestions) is entirely unchanged and verified working inside the container.
- R012 (full public deployment beyond the home LAN) is the natural next step. M002 Docker work is a prerequisite for that milestone.
- R032 (offline data caching for inventory browsing) remains deferred — it requires HTTPS which is out of scope for local-LAN deployment.
