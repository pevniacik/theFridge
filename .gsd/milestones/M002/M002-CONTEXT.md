# M002: Zero-Friction Access & Deployment

**Gathered:** 2026-03-24
**Status:** Ready for planning

## Project Description

theFridge is a local-first household fridge/freezer inventory app. M001 delivered the complete application loop: QR-based storage context routing, review-first AI grocery photo intake, item-level inventory with expiry tracking, maintenance actions (edit/used/discarded), and a status/suggestions panel. The app runs on the developer's machine with `npm run dev --hostname 0.0.0.0`.

M002 makes the existing app accessible to non-technical household members as a zero-friction experience. The application logic (QR generation, intake flow, inventory, status) is completely untouched. M002 is purely a deployment and access layer on top of what exists.

## Why This Milestone

The app works well but requires the developer to run it. Household members cannot install it on their phones in any meaningful way (placeholder icons, no service worker), and moving the server to a dedicated home device (Pi, Mac Mini, old Linux laptop) requires manual Node setup. M002 solves both problems: Docker makes the server portable and self-managing; the PWA layer makes it feel native on household phones.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Run `docker compose up` on any Linux or macOS home device and the app starts, persists data, and survives reboots without any further intervention
- Open the LAN URL on a phone, tap "Add to Home Screen," and install the app with a real icon that launches standalone (no browser address bar)
- Tap the home screen icon and land directly on the last fridge they used — not the list
- Navigate back to the fridge list and switch contexts from within the PWA at any time
- (nice-to-have) Reach the app at `http://thefridge.local:3000` without knowing the IP address

### Entry point / environment

- Entry point: `docker compose up` on the server device; `http://<LAN-IP>:3000` on household phones
- Environment: Docker on Linux/macOS home device (Pi, Mac Mini, old laptop); phone browser for PWA install
- Live dependencies involved: SQLite (volume-mounted), LAN Wi-Fi network

## Completion Class

- Contract complete means: Docker build succeeds; app shell loads from service worker cache; localStorage fridge memory works in tests
- Integration complete means: container runs on a real home device with LAN access; PWA installs and launches standalone on a real phone
- Operational complete means: container restarts automatically after host reboot; data survives `docker compose down && docker compose up`

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- `docker compose up` on the target home device (not dev machine) builds and starts the app with LAN-accessible inventory intact
- A phone on the home Wi-Fi can install the PWA and open it standalone with a real icon
- Tapping the home screen icon opens the last-used fridge directly
- After `docker compose down && docker compose up`, all fridge and inventory data is intact (volume persistence proof)
- All M001 verification still passes inside the container (`npm run test`, `npm run type-check`, `npm run build` inside container or equivalent)

## Risks and Unknowns

- `better-sqlite3` native module compilation inside Docker — `node-gyp` must succeed during build layer; Alpine vs Debian base image choice affects which system packages are needed
- `output: 'standalone'` in Next.js changes the server entrypoint from `next start` to `node server.js` — must verify this works correctly with the existing SQLite path resolution (`process.cwd()` + `data/fridges.db`)
- **Service worker on LAN HTTP (known limitation):** iOS Safari and most browsers require HTTPS or localhost to register a service worker. Plain `http://192.168.x.x:3000` LAN URLs will NOT activate the service worker. The PWA manifest, standalone install, and "Add to Home Screen" still work — just without offline caching. This is documented and accepted: the milestone delivers what the platform allows over HTTP LAN.
- Serwist service worker in dev mode — Serwist recommends disabling the SW in development to avoid stale cache confusion; need to ensure the build-time precache manifest is generated correctly
- mDNS from Docker container requires `network_mode: host` — this conflicts with explicit port mappings in docker-compose.yml (the two are mutually exclusive); if mDNS uses host networking, port mapping must be removed and the port must be configured via environment variable instead
- `localStorage` fridge memory requires the PWA `start_url` to be the root (`/`) and a redirect to happen client-side — if `start_url` points directly to a fridge context, it becomes stale when fridge IDs change

## Existing Codebase / Prior Art

- `app/manifest.ts` — PWA manifest already exists with `display: standalone`, correct theme/background colors, portrait orientation. Icons declared but currently 1×1 pixel placeholders.
- `app/layout.tsx` — Apple Web App meta already configured (`capable: true`, `black-translucent` status bar, safe-area insets). Good foundation.
- `lib/db/client.ts` — DB path uses `process.cwd()` + `data/fridges.db`. This must resolve correctly inside the Docker container's working directory (`WORKDIR /app`).
- `lib/qr/generate.ts` — QR generation reads from request headers. Direct LAN access on port 3000 is fine — no reverse proxy needed for M002.
- `next.config.ts` — currently minimal. `output: 'standalone'` must be added for the production container.
- `scripts/verify-s06-lan.sh` — existing LAN verification script; can be adapted for container verification.
- `public/icons/` — two PNG files, both 1×1 pixel. Must be replaced with real artwork before PWA install works properly.

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R023 — PWA standalone launch with real icons (S02)
- R024 — Service worker app shell caching (S02, subject to HTTPS limitation)
- R025 — Last-used fridge memory (S03)
- R026 — Fridge list navigation preserved (S03)
- R027 — Docker one-command setup (S01)
- R028 — SQLite data persistence across container restarts (S01)
- R029 — Container auto-starts on boot (S01)
- R030 — LAN accessibility from container (S01)
- R031 — mDNS `thefridge.local` hostname (S04, nice-to-have)

## Scope

### In Scope

- Multi-stage production Dockerfile with `better-sqlite3` native compilation
- `docker-compose.yml` with volume mount for `data/`, `restart: unless-stopped`, port 3000 exposed
- Real PWA icons (192×192 and 512×512) generated programmatically from an SVG fridge emoji / simple design
- Serwist service worker with app-shell precaching and offline fallback page (active in production build only)
- `localStorage`-based last-used fridge memory with client-side redirect on PWA launch from root
- mDNS advertisement via `bonjour-service` with `network_mode: host` (S04, nice-to-have)
- Setup documentation: what to run, how to find the LAN IP, how to install the PWA on iOS and Android

### Out of Scope / Non-Goals

- Offline inventory data caching (app shell caching only; service worker blocked on plain HTTP LAN anyway)
- Public domain / HTTPS deployment
- GUI-only installation (terminal is acceptable for server operator)
- Bootstrap QR for app discovery
- Any changes to M001 application logic (QR, intake, inventory, status, suggestions)

## Technical Constraints

- `better-sqlite3` requires Python + make + gcc during Docker build; must be handled in the build stage, not the runner stage
- `network_mode: host` (for mDNS) is incompatible with `ports:` mapping in docker-compose
- Next.js `output: 'standalone'` changes the production entrypoint to `node .next/standalone/server.js`; `public/` and `.next/static/` must be copied into `standalone/` in the Dockerfile
- Serwist SW should be disabled in `NODE_ENV=development` to avoid stale cache issues
- Service worker requires HTTPS or localhost — plain HTTP LAN blocks SW registration in most browsers (documented limitation)

## Integration Points

- Docker host device LAN — container must bind to the host's network interface via port mapping
- Phone browser (Safari iOS / Chrome Android) — PWA install flow differs; both need real-device verification
- `bonjour-service` npm package — pure TypeScript mDNS; needs `network_mode: host` in Docker for multicast to reach the LAN

## Open Questions

- None — HTTPS/SW limitation is acknowledged and accepted. Platform behavior is documented. Milestone proceeds with what works over HTTP.
