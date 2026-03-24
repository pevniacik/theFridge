# S02: PWA Shell & Home Screen

**Goal:** The app has real icons, a Serwist service worker for precaching and offline fallback, and can be installed to a phone's home screen in standalone mode.
**Demo:** `npm run build` produces `public/sw.js`; icons are 192×192 and 512×512; `curl /~offline` returns HTML; `docker compose build` succeeds; a phone on the home LAN can "Add to Home Screen" and launch standalone with the real icon.

## Must-Haves

- Real 192×192 and 512×512 PNG icons replace the 1×1 pixel placeholders
- `@serwist/next` wraps `next.config.ts` with SW generation disabled in dev
- `app/sw.ts` defines the service worker with precache manifest, `skipWaiting`, `clientsClaim`, and offline fallback to `/~offline`
- `app/~offline/page.tsx` exists as a static offline fallback page
- `tsconfig.json` includes `"webworker"` in the `lib` array
- `npm run build` succeeds and produces `public/sw.js`
- `docker compose build` succeeds with all new artifacts in the image

## Proof Level

- This slice proves: integration (PWA manifest + icons + SW + build pipeline)
- Real runtime required: yes (Docker build, production build)
- Human/UAT required: yes (real phone "Add to Home Screen" — documented as manual step)

## Observability / Diagnostics

- **Icon dimensions:** `file public/icons/icon-192.png` and `file public/icons/icon-512.png` — human-readable PNG metadata without running the app.
- **SW present:** `test -f public/sw.js && wc -c public/sw.js` — confirms the service worker was generated and is non-empty.
- **Offline route:** `curl -sf http://localhost:3000/~offline | grep -i offline` — confirms the page serves HTML (run against a started container or dev server).
- **Manifest integrity:** `curl -sf http://localhost:3000/manifest.webmanifest | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); JSON.parse(d); console.log('valid JSON')"` — validates manifest is parseable JSON.
- **Build log:** `npm run build 2>&1 | tail -40` — last 40 lines show Serwist injection status and any compile errors.
- **Failure surface:** If `npm run build` fails due to SW config, Serwist emits `[serwist]`-prefixed log lines; if icon generation fails, `node scripts/generate-icons.mjs` prints the Sharp error to stderr and exits non-zero.
- **Redaction:** No secrets are logged; all diagnostics are file paths, HTTP responses, and build output.

## Verification

- `file public/icons/icon-192.png` reports `192 x 192`
- `file public/icons/icon-512.png` reports `512 x 512`
- `npm run build` exits 0 and `test -f public/sw.js`
- `npm run type-check` exits 0
- `docker compose build` exits 0
- `wc -c public/sw.js` reports non-zero byte count (confirms SW is non-empty)
- Human verification: phone on home LAN installs PWA with correct icon and standalone launch (manual, post-slice)

## Integration Closure

- Upstream surfaces consumed: `next.config.ts` (S01 set `output: "standalone"`), `app/manifest.ts` (already declares icon paths), `app/layout.tsx` (already has Apple Web App meta), `Dockerfile` (S01 copies `public/` into standalone image)
- New wiring introduced in this slice: `withSerwistInit` wrapper in `next.config.ts`; `app/sw.ts` service worker source; `public/sw.js` build output
- What remains before the milestone is truly usable end-to-end: S03 (last-used fridge redirect), S04 (mDNS hostname)

## Tasks

- [x] **T01: Install dependencies and generate real app icons** `est:20m`
  - Why: The 1×1 pixel placeholder icons must be replaced before PWA install shows a meaningful icon. All new npm packages (sharp, @serwist/next, serwist) are installed here to avoid conflicting package.json edits across tasks.
  - Files: `package.json`, `scripts/generate-icons.mjs`, `public/icons/icon-192.png`, `public/icons/icon-512.png`
  - Do: `npm install @serwist/next serwist && npm install -D sharp`; write `scripts/generate-icons.mjs` using sharp to rasterize an SVG (dark rounded rect with fridge emoji, theme colors `#0f1011` / `#f59c2b`) to both sizes; run the script to overwrite placeholders.
  - Verify: `file public/icons/icon-192.png` reports `192 x 192`; `file public/icons/icon-512.png` reports `512 x 512`
  - Done when: Both icon files are real PNGs at correct dimensions and all three new packages appear in package.json

- [x] **T02: Wire Serwist service worker, offline page, and tsconfig update** `est:30m`
  - Why: Core PWA integration — the service worker enables precaching and offline fallback (R024); the config wrapper generates `public/sw.js` at build time.
  - Files: `next.config.ts`, `app/sw.ts`, `app/~offline/page.tsx`, `tsconfig.json`
  - Do: Wrap `next.config.ts` with `withSerwistInit({ swSrc: "app/sw.ts", swDest: "public/sw.js", disable: process.env.NODE_ENV === "development", additionalPrecacheEntries: [{ url: "/~offline", revision }] })`; keep `output: "standalone"`. Create `app/sw.ts` with Serwist precache manifest, `skipWaiting`, `clientsClaim`, `navigationPreload`, `defaultCache`, and offline fallback to `/~offline`. Create `app/~offline/page.tsx` as a static page matching app visual style. Add `"webworker"` to `tsconfig.json` `lib` array.
  - Verify: `npm run type-check` exits 0; `npm run build` exits 0 and `test -f public/sw.js`
  - Done when: Production build succeeds, `public/sw.js` is generated, type-check passes

- [x] **T03: Docker build verification and SW serving check** `est:15m`
  - Why: Proves all new artifacts (icons, SW, offline page) are correctly included in the Docker image and served by the container. Closes R023 and R024 at the build level.
  - Files: `scripts/verify-s02-pwa.sh`
  - Do: Write a verification script that: (1) runs `docker compose build`; (2) starts container; (3) curls `/sw.js` and checks for JS content; (4) curls `/~offline` and checks for HTML; (5) curls `/icons/icon-192.png` and checks content-type; (6) curls `/manifest.webmanifest` and checks for valid JSON with icon entries; (7) tears down. Run the script.
  - Verify: `bash scripts/verify-s02-pwa.sh` exits 0 with all checks passing
  - Done when: Docker image builds with all PWA artifacts and serves them correctly over HTTP

## Files Likely Touched

- `package.json`
- `scripts/generate-icons.mjs`
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `next.config.ts`
- `app/sw.ts`
- `app/~offline/page.tsx`
- `tsconfig.json`
- `scripts/verify-s02-pwa.sh`
