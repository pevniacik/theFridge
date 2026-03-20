---
id: T01
parent: S01
milestone: M001
provides:
  - Next.js 15 app scaffold with App Router
  - Home page explaining the QR workflow
  - Dynamic fridge/freezer context route `/fridges/[fridgeId]`
key_files:
  - package.json
  - tsconfig.json
  - next.config.ts
  - postcss.config.mjs
  - app/layout.tsx
  - app/page.tsx
  - app/globals.css
  - app/fridges/[fridgeId]/page.tsx
key_decisions:
  - Next.js 15 App Router (not Pages Router) — aligns with React Server Components for later data-fetching patterns
  - Tailwind CSS v4 with @tailwindcss/postcss (not v3 config) — v4 uses CSS-native @theme rather than tailwind.config.ts
  - Inline style-based design tokens (CSS custom properties in globals.css) — avoids Tailwind class verbosity for a bespoke dark theme
  - Next.js 15.5.14 (upgraded from 15.2.3 which had CVE-2025-66478)
patterns_established:
  - CSS custom properties for all design tokens (--color-surface, --color-accent, etc.) defined in @theme block
  - Monospaced display font (JetBrains Mono) paired with DM Sans body — "industrial kitchen" aesthetic
  - Dynamic route params typed as `Promise<{ fridgeId: string }>` per Next.js 15 async params contract
observability_surfaces:
  - "npm run dev stdout: route hits appear as GET /path 200 in Xms"
  - "curl http://localhost:3000 | grep -c theFridge — returns 1 when home page renders"
  - "curl http://localhost:3000/fridges/<id> | grep -c <id> — confirms param plumbing"
  - "npx tsc --noEmit — zero errors = TypeScript health"
duration: ~15 min
verification_result: passed
completed_at: 2026-03-20
blocker_discovered: false
---

# T01: Create the local web app foundation

**Bootstrapped the Next.js 15 App Router project with a home screen, dynamic fridge-context route, and a distinctive dark industrial aesthetic — dev server boots clean, both routes return 200, TypeScript compiles with zero errors.**

## What Happened

Started from an empty directory (only `.gsd/` and `.git/`). Fixed `.gitignore` to stop ignoring the `.gsd/` directory so planning files are tracked. Applied the pre-flight observability fixes to `S01-PLAN.md` and `T01-PLAN.md`.

Scaffolded the Next.js project manually (not via `create-next-app`, which would conflict with the existing directory). Chose Tailwind CSS v4 which uses `@tailwindcss/postcss` instead of v3's `tailwind.config.ts` — this is a meaningful deviation from what `create-next-app` would produce.

Upgraded Next.js from the initially planned `15.2.3` (which has CVE-2025-66478) to `15.5.14` (0 audit vulnerabilities).

The home page uses an "industrial kitchen" dark aesthetic: deep charcoal surface, cold cyan accent for the hero headline, warm amber for the brand mark, JetBrains Mono for display text. The four-step QR workflow is explained inline. The dynamic route `/fridges/[fridgeId]` renders the ID directly in the UI (pre-data-layer placeholder) and will be wired to real identity records in T02.

## Verification

1. `npm run dev` — server ready in 1729ms, no errors in stdout
2. `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` → `200`
3. `curl -s http://localhost:3000 | grep -c "theFridge"` → `1`
4. `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/fridges/kitchen-fridge-01` → `200`
5. `curl -s http://localhost:3000/fridges/kitchen-fridge-01 | grep -c "kitchen-fridge-01"` → `1`
6. `npx tsc --noEmit` → exit 0, zero errors
7. Browser visual: home page renders with correct heading hierarchy, step list, and CTA buttons
8. Browser visual: fridge-context page renders with breadcrumb, storage-context label, and `fridgeId` in H1

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` | 0 (200) | ✅ pass | 0.12s |
| 2 | `curl -s http://localhost:3000 \| grep -c "theFridge"` | 0 (1) | ✅ pass | 0.08s |
| 3 | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/fridges/does-not-exist` | 0 (200) | ✅ pass | 0.09s |
| 4 | `npx tsc --noEmit` | 0 | ✅ pass | 2.47s |
| 5 | Browser: text "theFridge" visible on home page | — | ✅ pass | — |
| 6 | Browser: text "storage context" + `fridgeId` in H1 on context page | — | ✅ pass | — |

## Diagnostics

- **Dev server:** `npm run dev` → stdout shows `✓ Ready in Xms` and `GET / 200 in Xms` per request
- **Route health:** `curl http://localhost:3000` for home, `curl http://localhost:3000/fridges/<id>` for context
- **TypeScript:** `npx tsc --noEmit` or `npm run type-check` — must exit 0
- **Fonts 404 in restricted environments:** The Google Fonts link in `app/layout.tsx` will 404 where external network is blocked — this is cosmetic (fallback fonts apply), not a functional error
- **No database yet:** The fridge-context page renders the raw `fridgeId` URL param; actual name resolution comes in T02

## Deviations

- **Next.js version bumped to 15.5.14** — 15.2.3 had CVE-2025-66478 (critical). Upgraded before install.
- **Tailwind v4 config** — uses `@tailwindcss/postcss` plugin in `postcss.config.mjs` and CSS `@theme {}` block in `globals.css` instead of `tailwind.config.ts`. No separate config file needed.
- **`params` typed as `Promise<{...}>`** — Next.js 15 made route params async; `params.fridgeId` is accessed via `await params` in the async server component.

## Known Issues

- Google Fonts will 404 in network-restricted environments (cosmetic only — JetBrains Mono falls back to Fira Code / Consolas)
- `/fridges/new` link on home CTA 404s until T02 creates that page

## Files Created/Modified

- `package.json` — project manifest with Next.js 15.5.14, Tailwind v4, TypeScript 5
- `tsconfig.json` — TypeScript config with `@/*` path alias
- `next.config.ts` — minimal Next.js config
- `postcss.config.mjs` — Tailwind v4 PostCSS plugin config
- `app/globals.css` — design tokens (@theme), base styles, font imports
- `app/layout.tsx` — root shell with header (brand + tagline) and `<main>` content area
- `app/page.tsx` — home screen with hero, four-step QR workflow explanation, and CTA buttons
- `app/fridges/[fridgeId]/page.tsx` — async server component resolving `fridgeId` param into storage-context view
- `.gitignore` — un-ignored `.gsd/` directory so planning files are tracked
- `.gsd/milestones/M001/slices/S01/S01-PLAN.md` — added Observability/Diagnostics and Verification sections
- `.gsd/milestones/M001/slices/S01/tasks/T01-PLAN.md` — added Expected Output and Observability Impact sections
