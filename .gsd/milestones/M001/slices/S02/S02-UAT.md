# S02: Photo intake with review-first draft — UAT

**Milestone:** M001
**Written:** 2026-03-21

## UAT Type

- UAT mode: mixed (live-runtime + artifact-driven)
- Why this mode is sufficient: The intake flow requires a running dev server, real HTTP endpoints, and a live SQLite DB to demonstrate end-to-end integration. Browser verification confirms UI state machine transitions. DB inspection provides objective persistence proof. Artifact-driven checks (schema, TypeScript) cover structural correctness independently of runtime.

## Preconditions

1. Dev server is running: `npm run dev` — confirm `Local: http://localhost:3000` in console output (port may differ if 3000 is occupied; check actual port).
2. At least one fridge record exists in the DB: `sqlite3 data/fridges.db "SELECT id, name FROM fridges;"` — note a valid `<fridgeId>`.
3. `OPENAI_API_KEY` is NOT set in the environment (stub extraction path will be used for deterministic testing).
4. A test image file exists at `test-photo.jpg` in the project root (any valid JPEG works — content does not matter for stub path).
5. Note: The intake_drafts table may already have rows from prior test runs. That is expected and does not affect verification.

## Smoke Test

Navigate to `http://localhost:3000/fridges/<fridgeId>` — the page should show a "GROCERY INTAKE" section with an "Upload photo" button (not a dashed placeholder div that says "Items will appear here"). If the intake section is visible, the basic wiring is confirmed.

---

## Test Cases

### 1. Schema and TypeScript structural integrity

**Purpose:** Verify the data layer and types are correct before any runtime flow.

1. Run `sqlite3 data/fridges.db ".schema intake_drafts"`.
2. **Expected:** Output shows a `CREATE TABLE intake_drafts` statement with columns: `id TEXT PRIMARY KEY`, `fridge_id TEXT NOT NULL REFERENCES fridges(id)`, `name TEXT NOT NULL`, `quantity TEXT NOT NULL DEFAULT ''`, `unit TEXT NOT NULL DEFAULT ''`, `confidence TEXT NOT NULL DEFAULT 'high'`, `status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected'))`, `created_at TEXT NOT NULL DEFAULT (datetime('now'))`.
3. Run `npx tsc --noEmit`.
4. **Expected:** Exits with code 0, no output. Any type error is a failure.

---

### 2. API — valid fridge + photo → stub draft items returned

**Purpose:** Verify the route handler returns structured draft items for a valid fridge.

1. Run:
   ```bash
   curl -s -X POST http://localhost:3000/api/intake/<fridgeId> \
     -F "photo=@test-photo.jpg"
   ```
2. **Expected:** HTTP 200 response. JSON body is `{"items": [...]}` with at least 1 item. Each item has `name`, `quantity`, `unit`, and `confidence` fields.
3. Verify stub items specifically (when no API key is set): response contains exactly 3 items — Milk (confidence: high), Greek Yogurt (confidence: high), Butter (confidence: low).
4. Check server console log: `[intake] Using stub extraction (no OPENAI_API_KEY)` should be printed.

---

### 3. API — invalid fridge ID returns 404 error JSON

**Purpose:** Verify fridge validation runs before extraction.

1. Run:
   ```bash
   curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/intake/nonexistent-id \
     -F "photo=@test-photo.jpg"
   ```
2. **Expected:** HTTP status 404. JSON body contains `{"error": "Storage not found"}` (or equivalent error message). No items array in response.

---

### 4. API — missing photo returns 400 error JSON

**Purpose:** Verify missing-photo validation returns a structured error.

1. Run:
   ```bash
   curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/intake/<fridgeId>
   ```
2. **Expected:** HTTP status 400. JSON body contains `{"error": "Invalid form data"}` or `{"error": "No photo provided"}`. No items array.

---

### 5. Browser — full review-and-confirm flow

**Purpose:** Verify the complete user-facing flow from upload to DB persistence.

1. Open `http://localhost:3000/fridges/<fridgeId>` in a browser.
2. Scroll to the "GROCERY INTAKE" section — confirm "Upload photo" button is visible and "Add groceries" heading is present.
3. Click "Upload photo" and select any image file (or use the file picker to select `test-photo.jpg`).
4. **Expected after upload:** The section transitions to a "REVIEW DRAFT · 3 ITEMS" state showing 3 editable rows: Milk (1 / litre), Greek Yogurt (2 / pots), Butter (Qty / Unit). Butter row shows an amber "?" badge (low confidence). A "Confirm 3 items →" button and "Cancel" link are visible.
5. Edit the name in the first row — change "Milk" to "Whole Milk".
6. **Expected:** The input value updates to "Whole Milk".
7. Click the "×" delete button on the Greek Yogurt row.
8. **Expected:** Greek Yogurt row disappears. Section header updates to "REVIEW DRAFT · 2 ITEMS". Confirm button updates to "Confirm 2 items →".
9. Click "Confirm 2 items →".
10. **Expected:** Section transitions to done phase showing "✓ 2 items saved" and "Ready for inventory confirmation." text. An "Upload more" button is visible.
11. Run: `sqlite3 data/fridges.db "SELECT name, status FROM intake_drafts WHERE fridge_id = '<fridgeId>' ORDER BY created_at DESC LIMIT 2;"`
12. **Expected:** Returns 2 rows with `status = 'pending'`. Names should include "Whole Milk" and "Butter".

---

### 6. Browser — cancel resets to idle

**Purpose:** Verify the cancel action discards the draft without persisting anything.

1. Open `http://localhost:3000/fridges/<fridgeId>` (or reset to idle via "Upload more" → do not upload).
2. Upload a photo using the file picker.
3. When the review phase appears, click "Cancel".
4. **Expected:** Section resets to idle phase showing the "Upload photo" button. No new rows should have been added to `intake_drafts`.

---

### 7. Server Action — observability signals

**Purpose:** Verify runtime logs emit the correct confirmation signal.

1. Start a fresh upload+confirm cycle in the browser (see Test Case 5).
2. After confirming, check the server console output (terminal running `npm run dev`).
3. **Expected:** Line matching `[intake] Confirmed N draft items for fridge <fridgeId>` is present, where N matches the number of items confirmed.

---

## Edge Cases

### Empty extraction result

1. This cannot be triggered with the stub (stub always returns 3 items). With a real OpenAI key and an unrecognizable photo, the API may return 0 items.
2. **Expected behavior:** If `items.length === 0`, the IntakeSection shows "No items were detected in the photo. Try a different image." rather than an empty review grid.
3. **How to simulate:** Manually call `confirmDraftAction` with an empty array — the action should return `{ success: false, error: "No items to confirm" }` and the UI should show the error state.

### Fridge context page for invalid fridge ID

1. Navigate to `http://localhost:3000/fridges/nonexistent-id`.
2. **Expected:** The page renders a "STORAGE NOT FOUND" card inline (HTTP status remains 200 — this is the established inline pattern from S01). The IntakeSection is not rendered. No upload UI is visible.

### Upload more — second batch

1. Complete a full confirm cycle (Test Case 5).
2. When the done phase shows "✓ N items saved", click "Upload more".
3. **Expected:** Section resets to idle phase showing the "Upload photo" button. Prior confirmed items remain in `intake_drafts` (no deletion on reset).
4. Upload another photo and confirm.
5. **Expected:** New rows are appended to `intake_drafts` alongside the prior batch. `SELECT COUNT(*) FROM intake_drafts WHERE fridge_id = '<id>'` returns the cumulative total.

---

## Failure Signals

- `npx tsc --noEmit` exits non-zero → type contract broken between API, UI, and DB layer
- `sqlite3 ... ".schema intake_drafts"` returns nothing → migration did not run; DB not initialized
- `curl POST /api/intake/<id> -F photo=@file` returns `{"error": ...}` for a valid fridge → route handler or fridge validation is broken
- `curl POST /api/intake/bad-id` returns 200 or returns `{"items": [...]}` → fridge validation is not running
- Browser shows "Items will appear here" placeholder text → IntakeSection was not wired into page.tsx
- Browser review phase never appears after upload → fetch to `/api/intake/[fridgeId]` is failing; check network tab and server log
- Server log shows no `[intake]` lines → extract.ts logging is not wired; check import path
- `SELECT COUNT(*) FROM intake_drafts ... WHERE status='pending'` returns 0 after confirm → confirmDraftAction is not persisting; check server log for failure message

## Not Proven By This UAT

- **Real OpenAI extraction quality** — all browser and API tests in this UAT use the stub. Real gpt-4o-mini image recognition quality is untested until an API key is configured and a real grocery photo is used.
- **Inventory promotion** — `intake_drafts` rows land with `status = 'pending'` and stay there. S03 is responsible for promoting them to live inventory.
- **Concurrent household use** — no multi-user upload collision scenarios are tested; local single-user assumption holds for now.
- **Large file handling** — no test with images over ~1 MB; no explicit file size limit is enforced in the route handler.
- **Home-network QR entry → intake** — the QR-based entry path from a mobile device on the LAN is covered by S06, not S02.

## Notes for Tester

- **Port may not be 3000** — if another process holds 3000, Next.js will pick 3001, 3002, etc. Always read the "Local: http://localhost:XXXX" line from `npm run dev` output before navigating or running curl.
- **Stub always returns Milk / Greek Yogurt / Butter** — this is expected and correct. Butter always shows the amber "?" badge because its confidence is `'low'` in the stub. Do not interpret this as a UI bug.
- **DB accumulates rows across test runs** — `intake_drafts` is append-only from the intake flow. Row counts will increase with each confirm cycle. This is correct behavior; S03 will consume and status-update these rows.
- **The review grid is fully editable** — name, quantity, and unit fields are all plain text inputs. Editing one field does not affect the others. Deletion is immediate (no confirmation dialog).
- **"Cancel" does not persist anything** — clicking Cancel during review discards the draft entirely. No rows are written to `intake_drafts`.
