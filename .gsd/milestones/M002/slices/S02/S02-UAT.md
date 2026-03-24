# S02 UAT: PWA Shell & Home Screen

**Milestone:** M002
**Slice:** S02
**Written:** 2026-03-24

---

## Preconditions

1. `docker compose up -d` is running and healthy (`curl http://localhost:3000/api/health` returns `{"status":"ok"}`)
2. A real phone (iOS or Android) is connected to the same home Wi-Fi network as the server
3. You know the server's LAN IP address (e.g. `192.168.1.x`) — run `ipconfig getifaddr en0` on Mac or `hostname -I` on Linux

---

## Test Cases

### TC-01: Icon dimensions are correct

**Goal:** Verify real icons replaced the 1×1 placeholders.

**Steps:**
1. Run: `file public/icons/icon-192.png`
2. Run: `file public/icons/icon-512.png`

**Expected:**
- Step 1: output contains `192 x 192`
- Step 2: output contains `512 x 512`
- Both report `PNG image data, 8-bit/color RGBA, non-interlaced`

**Failure signal:** Either reports `1 x 1` or a different format.

---

### TC-02: Production build generates the service worker

**Goal:** Confirm Serwist injects `public/sw.js` during `npm run build`.

**Steps:**
1. Run: `npm run build 2>&1 | grep -i serwist`
2. Run: `test -f public/sw.js && wc -c public/sw.js`

**Expected:**
- Step 1: output contains `✓ (serwist) Bundling the service worker script with the URL '/sw.js' and the scope '/'`
- Step 2: reports non-zero byte count (expect ~40,000+ bytes)

**Failure signal:** Step 1 produces no output (Serwist skipped); Step 2 exits non-zero or reports 0 bytes.

---

### TC-03: Type-check passes for both main and worker

**Goal:** Confirm service worker exclusion from main tsconfig doesn't break DOM types, and worker tsconfig type-checks the SW source cleanly.

**Steps:**
1. Run: `npm run type-check`
2. Run: `npx tsc --noEmit -p tsconfig.worker.json`

**Expected:**
- Both exit 0 with no error output

**Failure signal:** Any TypeScript diagnostic errors (especially about `EventTarget`, `Navigator`, `files`, or `ServiceWorkerGlobalScope`).

---

### TC-04: Docker container serves all PWA artifacts

**Goal:** Verify icons, SW, offline page, and manifest are all served correctly from the container.

**Steps:**
1. Run the full verification script: `bash scripts/verify-s02-pwa.sh`

**Expected:**
- Script exits 0
- Output shows `✅` for all 6 checks: Docker build, container health, `/sw.js` JS content, `/~offline` HTML, `/icons/icon-192.png` image/png, `/manifest.webmanifest` valid JSON with icon entries

**Failure signal:** Any `❌` in output or non-zero exit code. Script also dumps `docker compose logs --tail=50` if the health poll times out.

---

### TC-05: Offline fallback page is served

**Goal:** Confirm `/~offline` returns HTML, not a 404.

**Steps (requires running container or dev server):**
1. Run: `curl -sf http://localhost:3000/~offline | grep -i "offline\|server"`

**Expected:**
- Response contains relevant text (e.g. "offline", "server", or similar from the page content)
- HTTP status 200

**Failure signal:** `curl` exits non-zero (4xx/5xx) or empty response.

---

### TC-06: Manifest contains icon entries

**Goal:** Confirm the PWA manifest references both icon sizes.

**Steps (requires running container or dev server):**
1. Run: `curl -sf http://localhost:3000/manifest.webmanifest | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); const m=JSON.parse(d); console.log('icons:', m.icons.length, m.icons.map(i=>i.sizes))"`

**Expected:**
- Parses without error
- Output shows at least 2 icon entries with sizes `192x192` and `512x512`

**Failure signal:** JSON parse error; missing or empty icons array.

---

### TC-07: Phone "Add to Home Screen" — standalone launch with real icon ⚠️ MANUAL

**Goal:** Verify the app installs and launches as a native-looking app on a real phone.

**Preconditions:** TC-04 passed; phone on same Wi-Fi as server.

**Steps (iOS Safari):**
1. Open Safari on iPhone
2. Navigate to `http://<LAN-IP>:3000`
3. Tap the Share button (box with upward arrow)
4. Tap "Add to Home Screen"
5. Confirm the icon preview shows the 🧊 dark icon (not a generic globe/screenshot)
6. Tap "Add"
7. Press the Home button, find the app icon
8. Tap the app icon

**Expected (iOS):**
- The app launches without Safari's URL bar or browser chrome
- The status bar is present but no tab bar or address bar
- The app opens to the theFridge landing page (fridge list)
- The icon on the home screen is the dark 🧊 icon, not a screenshot or generic icon

**Steps (Android Chrome):**
1. Open Chrome on Android
2. Navigate to `http://<LAN-IP>:3000`
3. Tap the three-dot menu → "Add to Home screen" (or wait for the install banner)
4. Tap "Add"
5. Find and tap the app icon from the home screen or app drawer

**Expected (Android):**
- Same as iOS: standalone launch, no browser chrome, 🧊 icon visible

**Known limitation:** The service worker will NOT register on plain `http://192.168.x.x` (browser blocks SW on non-HTTPS, non-localhost). The app will still install standalone and function normally — only the offline caching (R024) is inactive. This is documented and accepted (D028).

**Failure signal:** Browser chrome visible after launch; generic screenshot icon instead of 🧊; app doesn't open or shows a blank screen.

---

### TC-08: Service worker edge case — SW absent in dev mode

**Goal:** Confirm SW is not registered during development (avoids stale cache during development).

**Steps:**
1. Run: `npm run dev` (in a terminal, not needed to open browser)
2. Check next.config.ts: confirm `disable: process.env.NODE_ENV === "development"` is set in withSerwistInit

**Expected:**
- The config shows `disable: process.env.NODE_ENV === "development"` — no SW generated in dev
- Dev server starts without Serwist bundling output

**Failure signal:** `public/sw.js` is overwritten with a dev build; stale cache in browser during development.

---

## Edge Cases

### Icon regeneration
If icons need to be updated: edit the SVG string in `scripts/generate-icons.mjs` and run `node scripts/generate-icons.mjs`. The script validates dimensions and exits non-zero on failure.

### SW precache revision
The offline page `/~offline` is precached with a revision string derived from `git rev-parse HEAD` (or `crypto.randomUUID()` as fallback). If the offline page content changes, a new build generates a new revision, forcing cache update.

### Docker image layer cache
If `package.json` hasn't changed, Docker may use cached layers for the `deps` stage. If icons or SW source change, only the `builder` stage re-runs. Force a clean build with `docker compose build --no-cache` if artifacts appear stale.

---

## Notes for Tester

- TC-01 through TC-06 are automated or semi-automated and should be run first.
- TC-07 is the only true UAT step requiring a physical phone — it proves R023 at the human experience level.
- SW registration (for R024 offline caching) is blocked on plain HTTP LAN. If you want to test offline behavior, either: (a) access the app at `http://localhost:3000` on the server machine itself, or (b) add HTTPS (deferred to a future milestone).
