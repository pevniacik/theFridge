# M002: Zero-Friction Access & Deployment

**Vision:** Make theFridge feel like a native household app — installable on any phone via "Add to Home Screen," running reliably on any home device without manual Node setup, opening directly to the last-used fridge, and optionally reachable by hostname instead of IP address.

## Success Criteria

- `docker compose up` builds and starts the app on a fresh Linux or macOS device with no manual Node setup
- SQLite data survives `docker compose down && docker compose up` (volume persistence)
- Container restarts automatically on host device reboot
- A phone on the home LAN can install the app to their home screen with a real icon that launches standalone
- Tapping the home screen icon opens the last-used fridge context directly
- Navigation back to the fridge list and switching contexts remains accessible
- All M001 functionality (QR, intake, inventory, status, suggestions) works identically inside the container
- (nice-to-have) `http://thefridge.local:3000` resolves on the home network

## Key Risks / Unknowns

- `better-sqlite3` native compilation in Docker — requires `node-gyp`, Python, make, gcc; Alpine vs Debian base image affects which packages are needed; this is the highest-risk build step
- `output: 'standalone'` entrypoint change — `node .next/standalone/server.js` replaces `next start`; `public/` and `.next/static/` must be manually copied; SQLite `process.cwd()` path must still resolve correctly
- Service worker blocked on plain HTTP LAN — browsers require HTTPS or localhost to register a SW; plain `http://192.168.x.x:3000` won't activate the SW; manifest and standalone install still work; this is documented and accepted
- mDNS + Docker networking — `network_mode: host` required for multicast; incompatible with `ports:` mapping; S04 handles this as a separate slice

## Proof Strategy

- `better-sqlite3` in Docker → retire in S01 by building and running the container on the dev machine first, then on the target home device
- `output: 'standalone'` correctness → retire in S01 by confirming `node server.js` starts, health endpoint responds, and DB path resolves correctly
- PWA install on real device → retire in S02 by actually installing on an iOS and Android phone and verifying standalone launch
- Last-used fridge redirect → retire in S03 by verifying localStorage write on fridge visit and redirect on root open

## Verification Classes

- Contract verification: `docker build` succeeds; `npm run test` passes inside container; `npm run type-check` clean; `docker compose down && up` preserves data
- Integration verification: app serves LAN requests from container; PWA installs on real phone; standalone launch confirmed
- Operational verification: `docker compose up` with `restart: unless-stopped` survives host reboot; no manual intervention required after reboot
- UAT / human verification: household member installs PWA on their own phone and uses it naturally

## Milestone Definition of Done

This milestone is complete only when all are true:

- S01 complete: Docker container builds, runs, persists data, and auto-restarts on the target home device
- S02 complete: PWA has real icons, installs standalone on a real phone, loads correctly
- S03 complete: last-used fridge memory works and fridge list navigation is preserved
- S04 complete (or explicitly skipped): mDNS hostname verified or documented as deferred
- All M001 verification passes inside the containerised environment
- Final integrated acceptance: `docker compose up` on home device + phone PWA install + last-used fridge open all demonstrated in a single real-environment run

## Requirement Coverage

- Covers: R023, R024, R025, R026, R027, R028, R029, R030, R031
- Partially covers: R012 (Docker is a step toward public deployment but doesn't constitute it)
- Leaves for later: R012 (full public deployment), R032 (offline data caching)
- Orphan risks: service worker on HTTP LAN — documented limitation, not a gap

## Slices

- [x] **S01: Docker Production Container** `risk:high` `depends:[]`
  > After this: `docker compose up` on the dev machine (and then on a target home device) builds and starts the app; SQLite data survives restart; `http://<LAN-IP>:3000` serves the full M001 feature set; container auto-restarts on boot

- [ ] **S02: PWA Shell & Home Screen** `risk:medium` `depends:[S01]`
  > After this: real app icons exist; a phone on the home LAN can tap "Add to Home Screen" and launch the app in standalone mode with no browser chrome; Serwist service worker is wired for production builds (offline fallback page shown when server is down, if HTTPS allows it)

- [ ] **S03: Last-Used Fridge Memory** `risk:low` `depends:[S02]`
  > After this: tapping the home screen icon opens directly to the last fridge context the user visited; "switch fridge" navigation back to the list is always reachable from the header

- [ ] **S04: mDNS Hostname** `risk:medium` `depends:[S01]`
  > After this: `http://thefridge.local:3000` resolves on the home network; `bonjour-service` advertises the hostname from the container using `network_mode: host`

## Boundary Map

### S01 → S02

Produces:
- `Dockerfile` — multi-stage build: deps → builder → runner; `output: 'standalone'` Next.js; `better-sqlite3` native modules compiled in builder; `public/` and `.next/static/` copied into standalone
- `docker-compose.yml` — service with `build: .`, `ports: ["3000:3000"]`, `volumes: ["./data:/app/data"]`, `restart: unless-stopped`, `environment: NODE_ENV=production`
- `.dockerignore` — excludes `node_modules`, `.next`, `data/`, `.gsd/`, `.env*`
- Verified: `docker compose up` serves the app; health endpoint responds over LAN; data persists across restart

Consumes:
- nothing (first slice)

### S01 → S03

Produces:
- (same as S01 → S02 — S03 builds on the running container)

Consumes:
- nothing (first slice)

### S01 → S04

Produces:
- (same as S01 → S02 — S04 modifies docker-compose.yml)

Consumes:
- nothing (first slice)

### S02 → S03

Produces:
- `public/icons/icon-192.png` — real 192×192 icon asset
- `public/icons/icon-512.png` — real 512×512 icon asset
- `app/sw.ts` — Serwist service worker with precache manifest, `skipWaiting: true`, `clientsClaim: true`, offline fallback to `/~offline`
- `app/~offline/page.tsx` — offline fallback page shown when server is unreachable
- `next.config.ts` — updated with `withSerwist` wrapper and `output: 'standalone'`
- Verified: PWA manifest valid; "Add to Home Screen" prompt appears or manual install works; standalone launch confirmed on real phone

Consumes from S01:
- Running container at `http://<LAN-IP>:3000` for real-device PWA install verification

### S03 → (milestone complete)

Produces:
- `app/page.tsx` — updated landing page: reads `localStorage['lastFridgeId']` on mount; redirects to `/fridges/<id>` if present; otherwise shows fridge list normally
- `app/fridges/[fridgeId]/page.tsx` — writes `localStorage['lastFridgeId']` on each fridge context visit (client-side effect)
- Verified: visit fridge A, close browser/PWA, reopen → lands on fridge A; navigate to list via header → works; visit fridge B → next open goes to fridge B

Consumes from S02:
- Standalone PWA installed on phone (for real-device last-used verification)

### S04 → (milestone complete)

Produces:
- `lib/mdns/advertise.ts` — `bonjour-service` advertisement started in a Next.js custom server or instrumentation hook; advertises `thefridge` on port 3000
- `docker-compose.yml` — updated with `network_mode: host`; `ports:` mapping removed (incompatible with host networking); port is fixed at 3000
- Verified: `ping thefridge.local` resolves on the home network from a Mac or phone; app accessible at `http://thefridge.local:3000`

Consumes from S01:
- Running Docker container (S04 modifies the compose file)
