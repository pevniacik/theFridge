---
id: T01
parent: S02
milestone: M002
provides:
  - Real 192×192 and 512×512 PNG app icons in public/icons/
  - "@serwist/next", "serwist", and "sharp" packages installed in package.json
  - Idempotent scripts/generate-icons.mjs for icon regeneration
key_files:
  - package.json
  - scripts/generate-icons.mjs
  - public/icons/icon-192.png
  - public/icons/icon-512.png
key_decisions:
  - Used sharp SVG rasterization with inline SVG rather than Canvas/node-canvas to avoid native binary complexity
  - Emoji-only SVG (🧊) with dark #0f1011 background and #f59c2b accent — matches app theme
patterns_established:
  - Icon generation script is in scripts/ and is re-runnable (idempotent overwrite)
  - generate-icons.mjs self-validates dimensions after write and throws on mismatch
observability_surfaces:
  - "file public/icons/icon-192.png" and "file public/icons/icon-512.png" — dimension check without running app
  - "node scripts/generate-icons.mjs" exits non-zero with [generate-icons] ERROR: prefix on failure
  - Script logs [generate-icons] prefix for all steps for easy filtering
duration: ~5m
verification_result: passed
completed_at: 2026-03-24
blocker_discovered: false
---

# T01: Install dependencies and generate real app icons

**Installed @serwist/next, serwist, and sharp; generated real 192×192 and 512×512 PNG app icons using an SVG rasterization script.**

## What Happened

Added observability sections to S02-PLAN.md and T01-PLAN.md as required by the pre-flight checks. Then installed `@serwist/next@^9.5.7`, `serwist@^9.5.7` (as dependencies) and `sharp@^0.34.5` (as devDependency) via npm. Created `scripts/generate-icons.mjs` which uses sharp to rasterize an inline SVG (512×512 viewport, dark `#0f1011` rounded rectangle background with a 🧊 emoji in `#f59c2b` accent colour) to both sizes. The script validates dimensions after writing and exits non-zero with a descriptive error if anything is wrong. Ran the script to replace the 1×1 placeholder PNGs with real icons.

## Verification

Ran `file public/icons/icon-192.png` and `file public/icons/icon-512.png` — both reported correct PNG dimensions. Ran `grep` checks on `package.json` to confirm all three packages are registered. The generate-icons.mjs script itself also performs internal dimension validation and logged `All icons verified. ✓`.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `file public/icons/icon-192.png` → `PNG image data, 192 x 192` | 0 | ✅ pass | <1s |
| 2 | `file public/icons/icon-512.png` → `PNG image data, 512 x 512` | 0 | ✅ pass | <1s |
| 3 | `grep '"@serwist/next"' package.json` | 0 | ✅ pass | <1s |
| 4 | `grep '"serwist"' package.json` | 0 | ✅ pass | <1s |
| 5 | `grep '"sharp"' package.json` | 0 | ✅ pass | <1s |
| 6 | `node scripts/generate-icons.mjs` (internal dimension validation) | 0 | ✅ pass | ~3s |

## Diagnostics

- `file public/icons/icon-192.png` / `file public/icons/icon-512.png` — quick dimension check without running the app.
- `node scripts/generate-icons.mjs` — re-runnable; exits 0 with `[generate-icons]` prefix logs; exits 1 with `[generate-icons] ERROR:` on failure.
- `node -e "const p=require('./package.json'); console.log(p.dependencies['@serwist/next'], p.devDependencies['sharp'])"` — verify package versions at a glance.

## Deviations

None. The plan was followed exactly.

## Known Issues

None.

## Files Created/Modified

- `package.json` — added `@serwist/next`, `serwist` to dependencies; `sharp` to devDependencies
- `package-lock.json` — updated lockfile (252 packages added)
- `scripts/generate-icons.mjs` — new icon generation script (idempotent, self-validating)
- `public/icons/icon-192.png` — replaced 1×1 placeholder with real 192×192 PNG
- `public/icons/icon-512.png` — replaced 1×1 placeholder with real 512×512 PNG
- `.gsd/milestones/M002/slices/S02/S02-PLAN.md` — added Observability/Diagnostics section and extra SW byte-count check
- `.gsd/milestones/M002/slices/S02/tasks/T01-PLAN.md` — added Observability Impact section
