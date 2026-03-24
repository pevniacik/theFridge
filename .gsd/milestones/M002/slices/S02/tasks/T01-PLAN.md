---
estimated_steps: 4
estimated_files: 4
skills_used: []
---

# T01: Install dependencies and generate real app icons

**Slice:** S02 — PWA Shell & Home Screen
**Milestone:** M002

## Description

Install all npm packages needed for the PWA slice (`@serwist/next`, `serwist` as dependencies; `sharp` as devDependency) and generate real 192×192 and 512×512 PNG icons to replace the current 1×1 pixel placeholders. The icons use the app's theme colors (background `#0f1011`, accent `#f59c2b`) with a fridge/snowflake emoji on a dark rounded rectangle.

## Steps

1. Install packages: `npm install @serwist/next serwist && npm install -D sharp`
2. Create `scripts/generate-icons.mjs` — a Node script that uses `sharp` to rasterize an inline SVG (512×512 viewport, dark rounded rect fill `#0f1011`, centered emoji/text in accent `#f59c2b`) to `public/icons/icon-192.png` (resized to 192) and `public/icons/icon-512.png` (resized to 512)
3. Run `node scripts/generate-icons.mjs` to overwrite the placeholder files
4. Verify dimensions: `file public/icons/icon-192.png` should report `192 x 192`; `file public/icons/icon-512.png` should report `512 x 512`

## Must-Haves

- [ ] `@serwist/next` and `serwist` in `dependencies`
- [ ] `sharp` in `devDependencies`
- [ ] `public/icons/icon-192.png` is a real 192×192 PNG
- [ ] `public/icons/icon-512.png` is a real 512×512 PNG
- [ ] `scripts/generate-icons.mjs` exists and is re-runnable

## Observability Impact

- **What changes:** `public/icons/icon-192.png` and `public/icons/icon-512.png` grow from 1×1 to real PNGs; `package.json` gains three new entries.
- **Inspection surface:** `file public/icons/icon-*.png` reports dimensions without running the app; `node -e "require('./package.json').dependencies['@serwist/next']"` confirms the package is registered.
- **Failure visibility:** `node scripts/generate-icons.mjs` exits non-zero and prints a Sharp error to stderr if icon generation fails; `npm install` prints npm error output to stdout/stderr if network or resolution fails.
- **Re-runnable:** `scripts/generate-icons.mjs` is idempotent — re-running it overwrites existing icons with correctly-sized PNGs.
- **Redaction:** No secrets involved; all signals are file metadata and package names.

## Verification

- `file public/icons/icon-192.png` reports `PNG image data, 192 x 192`
- `file public/icons/icon-512.png` reports `PNG image data, 512 x 512`
- `grep '"@serwist/next"' package.json` finds a match
- `grep '"serwist"' package.json` finds a match
- `grep '"sharp"' package.json` finds a match

## Inputs

- `package.json` — existing dependencies to extend
- `public/icons/icon-192.png` — 1×1 placeholder to overwrite
- `public/icons/icon-512.png` — 1×1 placeholder to overwrite

## Expected Output

- `package.json` — updated with new dependencies
- `package-lock.json` — updated lockfile
- `scripts/generate-icons.mjs` — new icon generation script
- `public/icons/icon-192.png` — real 192×192 PNG icon
- `public/icons/icon-512.png` — real 512×512 PNG icon
