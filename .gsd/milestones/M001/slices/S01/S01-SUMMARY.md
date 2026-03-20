---
id: S01
parent: M001
milestone: M001
provides:
  - Next.js 15 App Router scaffold with dark industrial aesthetic
  - Fridge/freezer identity records persisted in SQLite (data/fridges.db)
  - Stable nanoid(10) IDs for each storage unit
  - Create-fridge/freezer flow (Server Action + redirect) at /fridges/new
  - REST API at /api/fridges (GET list, POST create)
  - Server-side SVG QR code generation encoding each storage-context URL
  - /fridges/[fridgeId] page that resolves real identity records and displays the QR
  - Inline "STORAGE NOT FOUND" failure card for unknown IDs (no silent crash)
  - All 7 slice verification checks passing
requires:
  - slice: none
    provides: n/a
affects:
  - S02
  - S03
  - S04
  - S05
  - S06
key_files:
  - package.json
  - tsconfig.json
  - next.config.ts
  - postcss.config.mjs
  - app/globals.css
  - app/layout.tsx
  - app/page.tsx
  - app/fridges/[fridgeId]/page.tsx
  - app/fridges/new/page.tsx
  - app/fridges/new/actions.ts
  - app/fridges/new/CreateFridgeForm.tsx
  - app/api/fridges/route.ts
  - components/QrCode.tsx
  - lib/db/client.ts
  - lib/fridges/store.ts
  - lib/qr/generate.ts
key_decisions:
  - Next.js 15.5.14 App Router (CVE-patched; Pages Router not used)
  - Tailwind CSS v4 with @tailwindcss/postcss (no tailwind.config.ts)
  - better-sqlite3 (synchronous) for persistence — matches RSC model
  - nanoid(10) for IDs — URL-safe, compact, no collision risk at local scale
  - qrcode npm package with SVG output — renders in RSC, printable
  - Server Action with (prevState, formData) signature for useActionState
  - Inline not-found rendering (not Next.js notFound()) — richer UI
  - Base URL derived from request headers (x-forwarded-proto + host) for LAN compatibility
patterns_established:
  - CSS custom properties for design tokens via @theme in globals.css
  - Singleton DB connection (getDb()) with inline schema migration — runs once per process
  - Server-side QR component renders dangerouslySetInnerHTML with app-generated SVG
  - All store functions are synchronous (better-sqlite3 API contract)
  - Invalid IDs produce a rich contextual failure card, not a generic 404
  - REST API always returns JSON with an error field on 4xx/5xx
observability_surfaces:
  - "curl http://localhost:3000/api/fridges — JSON list of all storage units"
  - "sqlite3 data/fridges.db '.tables' — fridges table present after first boot"
  - "sqlite3 data/fridges.db 'SELECT id, name, type FROM fridges;' — list all identity records"
  - "curl -s http://localhost:3000/fridges/<id> | grep 'STORAGE CONTEXT' — confirms identity resolution"
  - "curl -s http://localhost:3000/fridges/bad | grep 'STORAGE NOT FOUND' — confirms failure state"
  - "curl -s http://localhost:3000/fridges/<id> | grep 'fridges/<id>' — confirms QR URL matches route"
  - "npx tsc --noEmit — must exit 0"
drill_down_paths:
  - .gsd/milestones/M001/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S01/tasks/T03-SUMMARY.md
duration: ~60 min across 3 tasks
verification_result: passed
completed_at: 2026-03-21
---

# S01: QR identity and local fridge entry

**Wired the full physical-to-digital identity loop: create a storage unit, generate a printable QR code that encodes its URL, scan it, and land on the correct storage-context page — all running locally with SQLite persistence and zero external dependencies.**

## What Happened

**T01 — Foundation:** Started from an empty directory. Fixed `.gitignore` to stop ignoring `.gsd/`. Manually scaffolded a Next.js 15.5.14 project (upgraded immediately from 15.2.3 which had CVE-2025-66478). Chose Tailwind CSS v4 with the `@tailwindcss/postcss` PostCSS plugin and CSS-native `@theme {}` block — no `tailwind.config.ts`. Applied a dark industrial aesthetic: deep charcoal surface, cold cyan accent, warm amber brand, JetBrains Mono display font. Built the home screen explaining the four-step QR workflow and the dynamic `/fridges/[fridgeId]` route with async params typed per Next.js 15's async-params contract. Dev server booted clean with zero TypeScript errors.

**T02 — Identity + QR:** Built the complete data and QR layer. `lib/db/client.ts` provides a singleton `better-sqlite3` connection opening `data/fridges.db` with WAL mode and inline `CREATE TABLE IF NOT EXISTS` schema migration. `lib/fridges/store.ts` exports `createFridge`, `getFridgeById`, and `listFridges` — all synchronous. QR generation in `lib/qr/generate.ts` builds the full storage-context URL from request headers (so it works on a LAN IP, not just localhost), calls `QRCode.toString(..., { type: 'svg' })`, and returns `{ svg, url }` or `{ error }` — never throws. The create flow uses a Server Action with the `(prevState, formData)` signature required by `useActionState`; `redirect()` on success, inline error state on validation failure. A REST API at `/api/fridges` provides GET (list) and POST (create). The fridge context page was updated to do real `getFridgeById` lookup and render either the full identity card + QR panel or a rich "STORAGE NOT FOUND" card with actionable links.

**T03 — Verification and closure:** T02 had already implemented everything T03 required. T03 confirmed the full end-to-end loop was wired correctly: valid IDs resolve the correct storage context, the QR URL encodes a URL that matches the route contract, invalid IDs show the failure card without crashing, and all 7 slice verification checks pass. Two additional curl-based failure-path checks were added to the slice plan as diagnostic aids for future agents.

## Verification

All 7 slice verification checks run clean:

| # | Check | Result |
|---|-------|--------|
| 1 | `curl http://localhost:3000` → 200 | ✅ pass |
| 2 | Home page contains "theFridge" | ✅ pass |
| 3 | `/fridges/does-not-exist` → 200 (handled, not exception) | ✅ pass |
| 4 | `npx tsc --noEmit` → exit 0 | ✅ pass |
| 5 | `sqlite3 data/fridges.db ".tables"` → `fridges` table present | ✅ pass |
| 6 | Invalid ID page contains "not found"/"STORAGE NOT FOUND" | ✅ pass |
| 7 | Valid ID page contains "STORAGE CONTEXT" (× 2) | ✅ pass |

Additional verifications from T02:
- `curl http://localhost:3000/api/fridges` → `{"fridges":[...]}` JSON
- `curl -X POST .../api/fridges -d '{"name":"Garage Freezer","type":"freezer"}'` → 201 with fridge record
- `curl -X POST .../api/fridges -d '{"name":"","type":"fridge"}'` → 400 `{"error":"..."}`
- Browser: create form → submit → redirect → context page with QR rendered
- QR URL `http://localhost:3000/fridges/2O1snSYsoa` matches route contract
- Three identity records in DB: Kitchen Fridge, Garage Freezer, Test Freezer T03

## New Requirements Surfaced

- none

## Deviations

- **Next.js 15.5.14 (not 15.2.3)** — Upgraded before first install due to CVE-2025-66478.
- **useActionState signature** — Server Action needed `(prevState, formData)` not just `(formData)` — a React 19 contract not reflected in the plan's wording. Fixed before type errors appeared.
- **Inline not-found rendering** — Used conditional render on the context page rather than `notFound()`, giving a richer failure card with actionable links instead of a generic 404 page.
- **T03 was verification-only** — T02 had fully implemented all routing, lookup, and failure-state code. T03 confirmed wiring, added failure-path observability to plan files, and collected slice-level evidence.

## Known Limitations

- **QR code requires home network:** The QR URL is built from request headers at generation time. If the app hostname changes (different LAN IP, different port), existing QR codes encode the old URL. This is by design for local-first v1 but means printed QR codes need reprinting if the server address changes.
- **Radio input in create form:** The `browser_fill_form` automation tool cannot reliably address radio inputs — "freezer" type must be selected by clicking the radio button. The form works correctly with manual interaction; this is a test-tooling limitation, not a product bug.
- **`data/fridges.db` is not gitignored** — The SQLite file accumulates real local records. Appropriate for local-only dev, but should be added to `.gitignore` if the repo is ever shared publicly or needs clean-state onboarding.
- **Google Fonts 404 in restricted networks** — The JetBrains Mono / DM Sans Google Fonts link in `app/layout.tsx` 404s in network-isolated environments. Fallback fonts apply; this is cosmetic only.

## Follow-ups

- S02 should pick up the storage-context page (`/fridges/[fridgeId]`) and add the photo intake entry point within that context — the identity card and QR are already there.
- If home-network LAN routing is tested before S06, the QR URL generation logic in `lib/qr/generate.ts` (using `x-forwarded-proto` + `host` headers) should be validated with a real LAN IP request.
- The "freezer" type radio input UX in the create form works correctly with click interaction but not with `fill_form` automation — consider switching to a `<select>` for simpler automation in later testing.

## Files Created/Modified

- `package.json` — project manifest (Next.js 15.5.14, Tailwind v4, better-sqlite3, nanoid, qrcode)
- `tsconfig.json` — TypeScript config with `@/*` path alias
- `next.config.ts` — minimal Next.js config
- `postcss.config.mjs` — Tailwind v4 PostCSS plugin
- `app/globals.css` — design tokens (@theme), base styles, font imports
- `app/layout.tsx` — root shell with header and `<main>`
- `app/page.tsx` — home screen with QR workflow explanation and CTAs
- `app/fridges/[fridgeId]/page.tsx` — async server component resolving real identity records; renders QR or not-found card
- `app/fridges/new/page.tsx` — create-fridge page shell
- `app/fridges/new/actions.ts` — `createFridgeAction` Server Action (useActionState-compatible)
- `app/fridges/new/CreateFridgeForm.tsx` — interactive form client component with inline error and pending state
- `app/api/fridges/route.ts` — REST endpoints GET (list) + POST (create)
- `components/QrCode.tsx` — async server component rendering SVG QR inline, with text URL fallback
- `lib/db/client.ts` — singleton better-sqlite3 connection, WAL mode, inline schema migration
- `lib/fridges/store.ts` — `createFridge`, `getFridgeById`, `listFridges` typed CRUD
- `lib/qr/generate.ts` — `buildFridgeUrl`, `generateFridgeQr` — non-throwing SVG QR generation
- `.gitignore` — un-ignored `.gsd/` directory

## Forward Intelligence

### What the next slice should know
- The storage-context page at `/fridges/[fridgeId]` already has an identity card and QR rendered. S02 should add a photo-intake entry point **within** this page — there is a designated inventory placeholder section that is the natural location.
- The `getFridgeById` function in `lib/fridges/store.ts` returns `null` for missing IDs — use this as the authoritative way to validate context ID before any intake action.
- The REST API at `/api/fridges` is the fastest way for any agent to inspect or create fridge records during development (no browser needed).
- `sqlite3 data/fridges.db "SELECT id, name, type FROM fridges;"` is the ground-truth inspection command — always start debugging here if a context page shows unexpected data.

### What's fragile
- **QR URL encodes the server address at generation time** — if the dev server restarts on a different port or LAN address, old QR codes point to a dead URL. Existing DB records don't auto-update. During S06 end-to-end testing, regenerate QR codes after confirming the stable LAN address.
- **`data/fridges.db` grows with every create action** — no cleanup mechanism exists. The three records seeded during S01 (Kitchen Fridge, Garage Freezer, Test Freezer T03) will persist. Downstream slices should query by ID and not assume record count.
- **`better-sqlite3` is a native module** — it compiles against the Node.js version at install time. If Node.js is upgraded significantly, run `npm rebuild` or re-install to avoid ABI mismatch crashes.

### Authoritative diagnostics
- `curl http://localhost:3000/api/fridges` — fastest check that the server is up and DB has records
- `sqlite3 data/fridges.db "SELECT id, name, type FROM fridges;"` — ground truth on what IDs exist
- `curl -s http://localhost:3000/fridges/<id> | grep 'STORAGE CONTEXT'` — confirms identity resolution is wired
- `npx tsc --noEmit` — zero errors = TypeScript health, must pass before any PR or slice close

### What assumptions changed
- **Plan assumed T03 would implement routing** — T02 already did this fully. T03 became a verification + observability task. Future slices can assume their final task may similarly consolidate into verification if earlier tasks move fast.
- **Plan assumed `notFound()` for invalid IDs** — the actual implementation uses inline conditional rendering for a richer UX. The HTTP status is 200 with visible failure content, not a 404. Future agents should grep for "STORAGE NOT FOUND" in the response body, not check for 404 status.
