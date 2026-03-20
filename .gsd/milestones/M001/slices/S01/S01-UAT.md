# S01: QR identity and local fridge entry — UAT

**Milestone:** M001
**Written:** 2026-03-21

## UAT Type

- UAT mode: live-runtime + artifact-driven
- Why this mode is sufficient: S01 delivers working routes, a live database, and a real browser experience. The primary verifications require a running dev server, real DB records, and actual URL/QR resolution. Artifact checks (TypeScript, DB schema) complement live-runtime checks.

## Preconditions

1. Dev server is running: `npm run dev` (or confirm port 3000 is live with `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`)
2. `data/fridges.db` exists and has the `fridges` table: `sqlite3 data/fridges.db ".tables"`
3. At least one fridge record exists: `sqlite3 data/fridges.db "SELECT id, name, type FROM fridges;"`
   - If empty, create one via the form at `http://localhost:3000/fridges/new` or via `curl -X POST http://localhost:3000/api/fridges -H 'Content-Type: application/json' -d '{"name":"Test Fridge","type":"fridge"}'`
4. TypeScript is clean: `npx tsc --noEmit` exits 0

---

## Smoke Test

```bash
curl -s http://localhost:3000 | grep -c "theFridge"
# Expected: 1 — confirms dev server is up and home page renders
```

---

## Test Cases

### 1. Home page renders the QR workflow explanation

1. Open `http://localhost:3000` in a browser (or `curl -s http://localhost:3000`)
2. **Expected:** Page renders with:
   - Brand mark "theFridge" visible in the header
   - A headline explaining the fridge inventory concept
   - Four steps or a clear explanation of the QR workflow
   - A call-to-action link to `/fridges/new` or similar

---

### 2. Create a new fridge via the form

1. Navigate to `http://localhost:3000/fridges/new`
2. Fill in the name field with a unique name (e.g. "UAT Kitchen Fridge")
3. Select "Fridge" as the type (default is fine)
4. Submit the form
5. **Expected:**
   - Browser redirects to `/fridges/<new-id>` (a nanoid-based URL-safe ID, 10 chars)
   - The storage-context page loads immediately
   - The fridge name "UAT Kitchen Fridge" appears on the page
   - A QR code SVG is visible on the page

---

### 3. Create a new freezer via the API

```bash
curl -X POST http://localhost:3000/api/fridges \
  -H 'Content-Type: application/json' \
  -d '{"name":"UAT Garage Freezer","type":"freezer"}'
```

1. **Expected:** HTTP 201 response with JSON body containing the created record:
   ```json
   {"fridge":{"id":"<nanoid>","name":"UAT Garage Freezer","type":"freezer","created_at":"..."}}
   ```
2. Verify the record was persisted:
   ```bash
   sqlite3 data/fridges.db "SELECT id, name, type FROM fridges WHERE name='UAT Garage Freezer';"
   ```
   **Expected:** One row with name "UAT Garage Freezer" and type "freezer"

---

### 4. Valid fridge ID resolves the correct storage context

1. Obtain a real fridge ID: `sqlite3 data/fridges.db "SELECT id FROM fridges LIMIT 1;"`
2. Open `http://localhost:3000/fridges/<id>` in a browser
3. **Expected:**
   - Page renders without a crash or blank screen
   - The fridge/freezer name is visible on the page
   - The storage type (fridge or freezer) is displayed
   - The text "STORAGE CONTEXT" appears (confirms identity-card section)
   - A QR code SVG is visible

---

### 5. QR code URL encodes the correct storage-context route

1. Open `http://localhost:3000/fridges/<id>` for a known ID
2. View page source or inspect the SVG element; find the URL embedded in the QR
   ```bash
   curl -s http://localhost:3000/fridges/<id> | grep -o 'http://[^"]*fridges/[^"]*'
   ```
3. **Expected:** The URL ends with `/fridges/<id>` — matching the current route
4. Open or curl that URL
5. **Expected:** The same storage-context page loads (confirming the QR resolves to the right context)

---

### 6. Invalid fridge ID shows the failure card — not a blank screen or server crash

1. Navigate to `http://localhost:3000/fridges/does-not-exist`
2. **Expected:**
   - HTTP 200 (the server handled the request gracefully)
   - The body contains "STORAGE NOT FOUND" or similar failure message
   - The bad ID is visually highlighted (displayed in the failure card)
   - A link to create a new storage unit is present
   - No uncaught exception or blank page

```bash
# Command equivalent:
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/fridges/does-not-exist
# Expected: 200

curl -s http://localhost:3000/fridges/does-not-exist | grep -c "not found\|STORAGE NOT FOUND"
# Expected: 1
```

---

### 7. REST API returns structured error for bad create request

```bash
curl -X POST http://localhost:3000/api/fridges \
  -H 'Content-Type: application/json' \
  -d '{"name":"","type":"fridge"}'
```

1. **Expected:** HTTP 400 with JSON body containing an `error` field:
   ```json
   {"error":"name is required..."}
   ```

---

### 8. REST API lists all storage units

```bash
curl http://localhost:3000/api/fridges
```

1. **Expected:** HTTP 200 with JSON body:
   ```json
   {"fridges":[{"id":"...","name":"...","type":"...","created_at":"..."},...]}
   ```
2. The list should include all records created in this UAT session

---

### 9. QR code scan simulation — URL resolves to correct context

This simulates what happens when a user scans a printed QR code on the home network.

1. Get the QR-encoded URL for a known fridge:
   ```bash
   FRIDGE_ID=$(sqlite3 data/fridges.db "SELECT id FROM fridges LIMIT 1;")
   QR_URL="http://localhost:3000/fridges/$FRIDGE_ID"
   curl -s "$QR_URL" | grep -c "STORAGE CONTEXT"
   ```
2. **Expected:** Returns 1 or more — the URL resolves to the correct storage-context page
3. **Expected:** The fridge name from the DB matches the name displayed on the page

---

## Edge Cases

### Empty name in create form

1. Navigate to `http://localhost:3000/fridges/new`
2. Submit the form without entering a name
3. **Expected:** Form stays on the create page with an inline error message; no redirect; no DB record created

---

### Truncated or malformed ID in URL

1. Navigate to `http://localhost:3000/fridges/abc` (very short, not a real nanoid)
2. **Expected:** "STORAGE NOT FOUND" failure card renders; no crash

---

### Database survives server restart

1. Create a fridge via the form or API — note its ID
2. Stop the dev server (Ctrl+C)
3. Restart with `npm run dev`
4. Navigate to `http://localhost:3000/fridges/<id>`
5. **Expected:** The fridge context page renders with the correct name — confirming SQLite persistence survived the restart

---

## Failure Signals

- **Blank white page at `/fridges/<id>`** — DB lookup is broken or `getFridgeById` is not wired
- **Server crash (500) on any fridge route** — likely a `better-sqlite3` native module ABI mismatch (run `npm rebuild`)
- **QR SVG not visible on the context page** — check the Next.js server log for `[qr] Failed to generate QR code for <id>:` errors
- **`api/fridges` returns 500** — DB schema migration may have failed; check `sqlite3 data/fridges.db ".tables"` for `fridges` table
- **TypeScript errors on `npx tsc --noEmit`** — likely a breaking change in a dependency or an edit to a key file; must be fixed before any slice is closed
- **Redirect after form submit goes to wrong URL** — check `createFridgeAction` in `app/fridges/new/actions.ts`; `redirect()` must use the newly created ID
- **QR URL encodes `undefined` or `null`** — `buildFridgeUrl` in `lib/qr/generate.ts` is not receiving valid request headers; check the `x-forwarded-proto` + `host` header derivation

---

## Not Proven By This UAT

- **Real QR scanning on a physical device** — This UAT simulates QR resolution by opening the encoded URL directly. Actual printed QR + phone scan is deferred to S06 (local-first runtime proof).
- **LAN IP routing** — The QR URL is built from `localhost` in a local dev environment. Whether it correctly resolves over a home Wi-Fi LAN IP is not proven here; that is S06's scope.
- **Concurrent multi-user access** — Shared household use across multiple devices simultaneously is not exercised; that is S04/S06 scope.
- **Printability of the QR SVG** — The SVG renders in-browser but actual printing quality on paper is not verified here.

---

## Notes for Tester

- **Google Fonts 404** — A single 404 in the browser console for Google Fonts CSS is expected and cosmetic. JetBrains Mono falls back to Fira Code/Consolas. Ignore this error.
- **"Test Freezer T03" record shows type "fridge"** — During S01 execution, the automation tool could not set the radio input to "freezer". This pre-existing record in the DB has the wrong type. It does not affect routing or QR generation correctness; it is a data-quality note only.
- **Radio input for "Freezer" type** — In the create form, use the radio button click interaction (not a fill/type action) to select "Freezer". The radio is not reachable via `fill_form` automation.
- **DB records persist across sessions** — `data/fridges.db` accumulates records. The IDs `2O1snSYsoa` (Kitchen Fridge), `FgD4iwBAf9` (Garage Freezer), and `xe8ANZIC69` (Test Freezer T03) were created during S01 development and will be present throughout the milestone unless manually deleted.
