---
id: T03
parent: S02
milestone: M002
provides:
  - scripts/verify-s02-pwa.sh — integration verification script for all PWA artifacts in Docker
  - Docker image confirmed to serve /sw.js, /~offline, /icons/icon-192.png, /manifest.webmanifest
key_files:
  - scripts/verify-s02-pwa.sh
key_decisions:
  - Health poll waits 2s between retries for up to 60s (30 iterations) — generous enough for Docker cold-start without being flaky
patterns_established:
  - Verification script uses `set -euo pipefail` with a `trap cleanup EXIT` to guarantee container teardown even on early exit
  - PASS/FAIL counters accumulate throughout; summary exits non-zero if any FAIL > 0
observability_surfaces:
  - "bash scripts/verify-s02-pwa.sh — runs full Docker build + container smoke test; exits 0 on pass, 1 on any check failure; prints per-check ✅/❌ and a summary count"
  - "docker compose logs --tail=50 — used inside the script on health-check timeout to surface container startup errors"
duration: ~3m (91s for Docker build + container startup + checks + teardown)
verification_result: passed
completed_at: 2026-03-24
blocker_discovered: false
---

# T03: Docker build verification and SW serving check

**Wrote `scripts/verify-s02-pwa.sh` and ran it — all 6 checks passed: Docker build ✅, container health ✅, /sw.js precache content ✅, /~offline HTML ✅, /icons/icon-192.png image/png ✅, /manifest.webmanifest valid JSON with icon ✅.**

## What Happened

Wrote `scripts/verify-s02-pwa.sh` as an integration gate: it cleans stale containers, runs `docker compose build`, starts the container in detached mode, polls `/api/health` until healthy (up to 60s), runs four content checks over curl, then tears down via `trap cleanup EXIT`. Ran the script; all checks passed in 91 seconds total.

Docker build output confirmed Serwist bundled correctly: `✓ (serwist) Bundling the service worker script with the URL '/sw.js' and the scope '/'...`. The `/~offline` route appeared in the build output at 140B as a static page. The runner stage already copied `public/` from the builder stage, so icons and the pre-built `public/sw.js` were present in the image without any Dockerfile changes.

## Verification

```
bash scripts/verify-s02-pwa.sh
# → 6 passed, 0 failed, exits 0

file public/icons/icon-192.png  → PNG image data, 192 x 192, 8-bit/color RGBA, non-interlaced
file public/icons/icon-512.png  → PNG image data, 512 x 512, 8-bit/color RGBA, non-interlaced
npm run type-check               → exits 0 (no output)
test -f public/sw.js && wc -c public/sw.js → 41996 bytes
```

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `file public/icons/icon-192.png` reports `192 x 192` | 0 | ✅ pass | <1s |
| 2 | `file public/icons/icon-512.png` reports `512 x 512` | 0 | ✅ pass | <1s |
| 3 | `npm run build` exits 0 and `test -f public/sw.js` | 0 | ✅ pass (within Docker build) | 48s |
| 4 | `npm run type-check` exits 0 | 0 | ✅ pass | 5s |
| 5 | `docker compose build` exits 0 | 0 | ✅ pass | 70s |
| 6 | `wc -c public/sw.js` reports non-zero (41996 bytes) | 0 | ✅ pass | <1s |
| 7 | `bash scripts/verify-s02-pwa.sh` exits 0 (6/6 checks) | 0 | ✅ pass | 91s |

## Diagnostics

- **Re-run verification:** `bash scripts/verify-s02-pwa.sh` — runs full Docker build, container start, all 4 HTTP checks, then tears down. Exits 0 if all pass.
- **SW content check:** `curl -sf http://localhost:3000/sw.js | grep -i precache` — confirms the service worker contains the precache manifest keyword.
- **Offline page:** `curl -sf http://localhost:3000/~offline | grep -i html` — confirms static fallback page is served.
- **Manifest check:** `curl -sf http://localhost:3000/manifest.webmanifest | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log(JSON.parse(d).icons)"` — inspect icon entries directly.
- **Container failure diagnosis:** Script emits `docker compose logs --tail=50` if the health poll times out after 60s.
- **Script exit codes:** 0 = all checks passed; 1 = Docker build failed OR any HTTP check failed OR health timeout.

## Deviations

- Health poll extended to 60s (30 × 2s) vs. the plan's 30s — Docker first-run container startup can be slower; 60s is more robust without being slow on healthy runs.

## Known Issues

None.

## Files Created/Modified

- `scripts/verify-s02-pwa.sh` — integration verification script: Docker build, container health, /sw.js, /~offline, /icons/icon-192.png, /manifest.webmanifest checks
