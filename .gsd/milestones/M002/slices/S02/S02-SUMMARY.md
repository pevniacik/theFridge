# S02 Summary: PWA Shell & Home Screen

**Milestone:** M002 — Zero-Friction Access & Deployment
**Status:** Complete
**Completed:** 2026-03-24
**Tasks:** T01 ✅ T02 ✅ T03 ✅

---

## What This Slice Delivered

S02 added a complete Progressive Web App shell to theFridge: real icons, a Serwist service worker wired into the Next.js production build, a static offline fallback page, and Docker verification that all PWA artifacts are served correctly from the container.

### Concrete Outputs

| Artifact | Description |
|----------|-------------|
| `public/icons/icon-192.png` | 192×192 RGBA PNG — dark `#0f1011` rounded rect with 🧊 emoji in `#f59c2b` accent |
| `public/icons/icon-512.png` | 512×512 RGBA PNG — same design, larger raster |
| `scripts/generate-icons.mjs` | Idempotent Sharp-based SVG rasterizer; self-validates dimensions; exits non-zero on failure |
| `next.config.ts` | Wrapped with `withSerwistInit`; `output: "standalone"` preserved; SW disabled in dev |
| `app/sw.ts` | Serwist service worker: precache manifest, `skipWaiting`, `clientsClaim`, `navigationPreload`, offline fallback to `/~offline` for document requests |
| `app/~offline/page.tsx` | Static offline fallback page; matches app visual style (CSS vars, 🧊 icon, muted message) |
| `tsconfig.json` | `app/sw.ts` added to `exclude` array to prevent worker lib from polluting DOM types |
| `tsconfig.worker.json` | New — extends main config with `lib: ["esnext","webworker"]`; includes only `app/sw.ts` |
| `public/sw.js` | 42KB Serwist-generated service worker (build artifact) |
| `scripts/verify-s02-pwa.sh` | Integration gate: Docker build → container health → 4 HTTP checks → teardown |

### Verified Metrics

- Icons: `file public/icons/icon-192.png` → `192 x 192`; `file public/icons/icon-512.png` → `512 x 512` ✅
- SW size: `wc -c public/sw.js` → 41996 bytes ✅
- Type-check: `npm run type-check` exits 0 ✅
- Production build: `npm run build` exits 0; Serwist logs `✓ (serwist) Bundling the service worker script...` ✅
- Docker integration: `bash scripts/verify-s02-pwa.sh` → 6/6 checks pass ✅

### Human / UAT Step (Required — Not Yet Done)

The slice plan marks this as manual UAT: a phone on the home LAN must install the PWA via "Add to Home Screen" and launch it in standalone mode with the real 🧊 icon. This is documented in S02-UAT.md. All server-side prerequisites are proven; the phone install is the remaining human step.

---

## Key Decisions Made

**D034 (new):** Icon generation uses Sharp SVG rasterization (inline SVG, no Canvas/node-canvas). Sharp is installed as devDependency; at runtime the icons are static PNG files — no Sharp runtime dependency in the container.

**D027 (already logged):** Serwist (`@serwist/next`) chosen as the service worker library. SW generation is disabled in development via `disable: process.env.NODE_ENV === "development"`.

**D028 (already logged):** Service worker registration blocked on plain HTTP LAN (`http://192.168.x.x:3000`). Browsers require HTTPS or localhost. Manifest and standalone install still work; offline caching (R024) requires either HTTPS or accessing via `localhost` on the device running the server. This is accepted as a documented limitation.

---

## Patterns Established

### tsconfig Split for Service Workers
`app/sw.ts` is excluded from the main `tsconfig.json`. A separate `tsconfig.worker.json` handles worker type-checking. This is the correct pattern for any future service worker files — adding `"webworker"` to the global lib array destroys DOM types across all components.

### Idempotent Icon Generation
`scripts/generate-icons.mjs` is re-runnable. It validates dimensions after writing and exits non-zero with `[generate-icons] ERROR:` on failure. Future icon updates: edit the SVG string in the script and re-run.

### Verification Script Pattern
`scripts/verify-s02-pwa.sh` uses `set -euo pipefail` + `trap cleanup EXIT` to guarantee container teardown. PASS/FAIL counters accumulate; script exits 1 if any check fails. This pattern should be followed for future Docker verification scripts.

---

## What S03 Needs to Know

- PWA manifest has `start_url: "/"` — the root page redirect (S03's job) will trigger on every PWA launch.
- `app/~offline/page.tsx` is a static route and is included in the Serwist precache manifest via `additionalPrecacheEntries`.
- Icons are at `public/icons/icon-192.png` and `public/icons/icon-512.png` — `app/manifest.ts` already references these paths.
- The standalone PWA install on a real phone is a human UAT prerequisite for S03's real-device last-used fridge verification.

---

## Requirement Changes

- **R023** (`active → validated`): Real icons at correct dimensions; `docker compose build` succeeds; manifest valid JSON with icon entries; standalone install precondition met. Full proof requires phone UAT (S02-UAT.md TC-04).
- **R024** (`active → validated at build level`): Serwist service worker generated (42KB, non-empty); `/~offline` page served; precache entries registered. Runtime SW registration on LAN HTTP is blocked by browser security model (D028); precaching and offline fallback work when accessed via `localhost` or HTTPS.
