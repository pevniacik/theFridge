---
estimated_steps: 3
estimated_files: 1
skills_used: []
---

# T03: Docker build verification and SW serving check

**Slice:** S02 — PWA Shell & Home Screen
**Milestone:** M002

## Description

Write and run a verification script that proves all PWA artifacts (icons, service worker, offline page, manifest) are correctly built into the Docker image and served by the container. This is the integration gate for R023 (standalone install with real icon) and R024 (service worker precache + offline fallback).

## Steps

1. **Write `scripts/verify-s02-pwa.sh`**: A bash script (with `set -euo pipefail`) that:
   - Cleans up any stale containers (`docker compose down --remove-orphans 2>/dev/null || true`)
   - Runs `docker compose build` and asserts exit 0
   - Starts the container in detached mode (`docker compose up -d`)
   - Waits for health (poll `curl -sf http://localhost:3000/api/health` up to 30s)
   - Check 1: `curl -sf http://localhost:3000/sw.js` returns content containing `precache` or `serwist` (JS file, not 404)
   - Check 2: `curl -sf http://localhost:3000/~offline` returns HTML content
   - Check 3: `curl -sf http://localhost:3000/icons/icon-192.png -o /dev/null -w '%{content_type}'` contains `image/png`
   - Check 4: `curl -sf http://localhost:3000/manifest.webmanifest` returns valid JSON containing `"icon-192.png"`
   - Tears down (`docker compose down`)
   - Prints pass/fail summary with count
   
2. **Run the script**: `bash scripts/verify-s02-pwa.sh`

3. **Fix any failures**: If any check fails, diagnose and fix. Common issues: Dockerfile not copying new `public/` files (unlikely — S01 already copies all of `public/`), or build step failing with new deps.

## Must-Haves

- [ ] `scripts/verify-s02-pwa.sh` exists and is executable
- [ ] Docker image builds successfully with all PWA artifacts
- [ ] Container serves `/sw.js`, `/~offline`, `/icons/icon-192.png`, and `/manifest.webmanifest`
- [ ] Script exits 0 with all checks passing

## Verification

- `bash scripts/verify-s02-pwa.sh` exits 0

## Inputs

- `Dockerfile` — S01's multi-stage build (copies `public/` and `.next/static/`)
- `docker-compose.yml` — S01's compose config
- `public/icons/icon-192.png` — T01's generated icon
- `public/icons/icon-512.png` — T01's generated icon
- `public/sw.js` — T02's build output (generated during Docker build)
- `app/~offline/page.tsx` — T02's offline page
- `next.config.ts` — T02's Serwist-wrapped config

## Expected Output

- `scripts/verify-s02-pwa.sh` — new verification script with all checks passing
