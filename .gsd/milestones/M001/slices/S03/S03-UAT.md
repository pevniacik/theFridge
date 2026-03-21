# S03: Inventory truth and expiry model — UAT

**Milestone:** M001
**Written:** 2026-03-21

## UAT Type

- UAT mode: artifact-driven + live-runtime
- Why this mode is sufficient: The slice plan explicitly scopes out human/UAT for expiry UX feel (deferred to later). What must be proven is the full data path: pending drafts appear in the UI, expiry can be set, promotion writes correct rows to `inventory_items`, and draft rows transition to `confirmed`. Browser automation covers the UI path; `sqlite3` queries cover the data path. Both were exercised during T02 execution and are repeatable.

## Preconditions

1. Dev server is running (`npm run dev`) and accessible — note the actual port from server output (default 3000, may fall back to 3001 if 3000 is occupied).
2. At least one fridge record exists in `data/fridges.db`. If starting from a clean DB, create one via the app's fridge-creation flow first.
3. `data/fridges.db` exists and has the `inventory_items` table: `sqlite3 data/fridges.db ".schema inventory_items"` should show all 13 columns.
4. The target fridge has **no pending drafts** at test start (clean state). Verify: `sqlite3 data/fridges.db "SELECT COUNT(*) FROM intake_drafts WHERE status='pending';"` returns 0.

## Smoke Test

Navigate to a fridge page (e.g. `http://localhost:3000/fridges/<fridgeId>`). The page must load without a JS error and the `InventorySection` must be visible below `IntakeSection`. If the DB is clean, the section shows a muted empty state ("No items yet"). That's pass — the component mounted and queried correctly.

## Test Cases

### 1. Empty state renders gracefully

**Precondition:** No pending drafts and no inventory items for this fridge.

1. Navigate to a fridge page with no pending drafts and no inventory items.
2. Scroll to the `InventorySection` area below the intake section.
3. **Expected:** A card is visible with a muted empty-state message (something like "No items yet — upload a grocery photo above to get started"). No error message, no blank white space, no console JS error.

---

### 2. Pending drafts appear after intake confirmation

**Precondition:** No pending drafts at start.

1. On the fridge page, upload a grocery photo via `IntakeSection`.
2. Wait for the review grid to appear with extracted draft items.
3. Optionally edit one item name or delete one item.
4. Click "Confirm N items".
5. Wait for IntakeSection to show "✓ N items saved" and the page to refresh.
6. **Expected:** `InventorySection` now shows a "PENDING ITEMS · N ITEMS" heading with one card per confirmed draft. Each card shows the item name, quantity, unit, a date input, and four quick-pick buttons (3d, 7d, 14d, 30d). A "Promote N items to inventory →" button is visible at the bottom.

**DB cross-check:** `sqlite3 data/fridges.db "SELECT COUNT(*) FROM intake_drafts WHERE status='pending';"` returns N > 0.

---

### 3. Quick-pick day button sets estimated expiry

1. From the pending items view (after Test Case 2), click the **7d** button on the first item.
2. **Expected:** The date input for that item fills in with a date exactly 7 days from today (e.g. `2026-03-28` if today is `2026-03-21`). The "7d" button is highlighted (cold-blue border/background). A "×" clear button appears next to the date.
3. Click the **14d** button on the same item.
4. **Expected:** The date input updates to 14 days from today. The "14d" button is now highlighted; "7d" is no longer highlighted. The "×" clear button remains.
5. Click the **×** clear button.
6. **Expected:** The date input is cleared. No quick-pick button is highlighted. The item will be promoted with `expiry_date = null`.

---

### 4. Explicit date input sets non-estimated expiry

1. From the pending items view, type a specific date (e.g. `2026-04-15`) directly into the date input for an item.
2. **Expected:** The date input shows the typed date. No quick-pick button is highlighted (or any previous highlight is cleared).
3. Note: this item will be promoted with `expiry_estimated = false` — explicit user date, not an estimate.

---

### 5. Promote all items to inventory

**Precondition:** At least 2 pending items exist. Set expiry on one (quick-pick 7d), leave the other blank.

1. With one item having a 7d quick-pick date and one item having no date set, click "Promote N items to inventory →".
2. **Expected:** The button enters a loading state (or the promote action fires). A "✓ N items added to inventory" success banner appears briefly.
3. After the page refreshes, **Expected:** The pending items card is gone (or shows "No pending items"). An "INVENTORY · N ITEMS" section appears below, listing each promoted item. The item with the 7d date shows that date with an amber **est.** badge. The item with no date shows muted "no expiry" text.

**DB cross-check (run immediately after promotion):**
```
sqlite3 data/fridges.db "SELECT name, expiry_date, expiry_estimated FROM inventory_items;"
```
- Row for the quick-pick item: `expiry_date` = `YYYY-MM-DD`, `expiry_estimated` = `1`
- Row for the no-date item: `expiry_date` = (empty/null), `expiry_estimated` = `0`

```
sqlite3 data/fridges.db "SELECT COUNT(*) FROM intake_drafts WHERE status='confirmed';"
```
Returns N (matching the number of items just promoted).

```
sqlite3 data/fridges.db "SELECT COUNT(*) FROM intake_drafts WHERE status='pending';"
```
Returns 0.

---

### 6. Server observability signal fires on promotion

1. After running Test Case 5, inspect the dev server terminal output.
2. **Expected:** A log line matching `[inventory] Promoted N items to inventory for fridge <fridgeId>` is present. No `[inventory] promoteToInventoryAction failed` line appears.

---

### 7. Inventory persists across page reload

1. After a successful promotion (Test Case 5), hard-reload the fridge page (Cmd+Shift+R or equivalent).
2. **Expected:** The "INVENTORY · N ITEMS" section reappears with the same items and expiry data as before the reload. The RSC re-fetches from SQLite — no in-memory state is involved.

---

### 8. Schema integrity — all required columns present

Run without the browser:
```
sqlite3 data/fridges.db ".schema inventory_items"
```
**Expected output contains all 13 columns:** `id`, `fridge_id`, `draft_id`, `name`, `quantity`, `unit`, `confidence`, `expiry_date`, `expiry_estimated`, `status`, `added_at`, `updated_at` — with `expiry_estimated INTEGER NOT NULL DEFAULT 0` and `status CHECK (status IN ('active', 'used', 'discarded'))`.

## Edge Cases

### Empty promotion attempt

1. If a user somehow clicks "Promote" with zero items, the `promoteToInventoryAction` should return `{ success: false, error: "No items to promote" }`.
2. **Expected:** The UI transitions to the `error` phase showing the error message. No DB writes occur.

### TypeScript clean compile

```
npx tsc --noEmit
```
**Expected:** exit code 0, no diagnostic output. This confirms the `InventoryItem`, `InventoryItemInput`, and `DraftItem` interfaces are consistent across store, actions, and component.

### Promotion with explicit date

1. Type a date directly into one item's date input (e.g. `2026-05-01`) without using any quick-pick button.
2. Promote.
3. **DB check:** `SELECT expiry_date, expiry_estimated FROM inventory_items WHERE name = '<that item name>';`
4. **Expected:** `expiry_date = '2026-05-01'`, `expiry_estimated = 0` — user-provided explicit date is not marked as an estimate.

## Failure Signals

- `InventorySection` is missing from the fridge page → `page.tsx` import or render was removed/broken
- TypeScript compile error → interface mismatch between `InventoryItemInput`, `DraftItem`, or `InventoryItem`
- `inventory_items` table missing → `getDb()` migration not running (stale DB file; try deleting `data/fridges.db` and restarting the server)
- `expiry_estimated` column shows `1` for an explicitly-typed date → coercion logic is inverted in the component's `buildInput` function
- Pending items still showing after promotion → `router.refresh()` not being called, or `listPendingDrafts` query not filtering `status='confirmed'`
- "✓ N items added" never appears → Server Action is returning `{ success: false }` — check server log for `[inventory] promoteToInventoryAction failed`
- DB `intake_drafts` rows still `pending` after promotion → the `confirmDraft.run()` inside the transaction is failing silently; check for draft ID mismatch

## Not Proven By This UAT

- Expiry UX feel — whether 3d/7d/14d/30d are the right defaults for real household use (deferred to later human UAT)
- Performance at scale — the inventory list has no pagination; a household with 50+ active items may find the list unwieldy (S05 scope)
- Multi-user concurrent promotion — two household members promoting the same pending draft simultaneously (S04 and S06 scope)
- LAN/home-network operation — everything above is verified on localhost (S06 scope)
- The update, remove, and discard flows on already-promoted inventory items (S04 scope)

## Notes for Tester

- The DB state carries over between test runs. If running multiple test passes, clear with: `sqlite3 data/fridges.db "DELETE FROM inventory_items; DELETE FROM intake_drafts;"` (or `rm data/fridges.db` for a full reset — the server will recreate the schema on next request).
- The "est." badge only appears if `expiry_estimated = 1` in the DB row. If you used an explicit date picker, no badge should appear — this is the intended distinction between the two expiry types.
- Quick-pick dates are computed at the moment you click the button, using the client's local clock. If you run the test at exactly midnight, the computed date may shift by one day. This is expected behavior.
- If the dev server is on port 3001 (because 3000 was occupied), use `http://localhost:3001/fridges/<fridgeId>` throughout.
