# S04: Shared household inventory maintenance — UAT

**Milestone:** M001
**Written:** 2026-03-21

## UAT Type

- UAT mode: live-runtime
- Why this mode is sufficient: S04's proof level is integration — every mutation must round-trip to SQLite and the UI must reflect the new truth. Artifact checks (TypeScript, grep) confirm correctness of the data layer; browser inspection confirms the UI reflects server truth after each action. Human UAT is not required by the slice plan, but this script exercises the full browser+DB loop.

## Preconditions

1. Dev server is running on localhost (check port with `bg_shell highlights` — Next.js may use 3001 if 3000 is occupied).
2. At least one fridge exists with at least two `status='active'` inventory items.
   - Verify: `sqlite3 data/fridges.db "SELECT id, fridge_id, name, status FROM inventory_items WHERE status='active';"` — must return ≥ 2 rows.
   - If no active items exist: go through the photo intake → draft review → confirm → promote flow (S02/S03) to seed some items first.
3. Note the fridge ID and at least two active item IDs from the query above — you will reference them during verification steps.
4. Browser is open to the fridge page: `http://localhost:<port>/fridges/<fridgeId>`

## Smoke Test

Open the fridge page. The **Current Inventory** section must render with at least one item row showing a name, quantity/unit, and an "Edit" button alongside "Used" and "Discard" buttons. If this section is empty or the buttons are absent, S04 is not functioning.

---

## Test Cases

### 1. Edit an item inline and verify persistence

1. On the fridge page, identify an active inventory item (e.g. "Greek Yogurt").
2. Click the **Edit** button on that row.
3. **Expected:** The row switches to edit mode — three input rows appear pre-populated with the current name, quantity, unit, expiry date, and estimated checkbox. The Edit/Used/Discard buttons on ALL rows are disabled (greyed out).
4. Change the item name to something distinctive (e.g. append " (Organic)").
5. Optionally change the quantity or unit.
6. Click **Save**.
7. **Expected:** Edit mode closes. The row re-renders with the new values. No full page navigation occurs — only the row updates.
8. Run: `sqlite3 data/fridges.db "SELECT name, quantity, unit, expiry_date, expiry_estimated, updated_at FROM inventory_items WHERE id='<itemId>';"`.
9. **Expected:** The DB row shows the new name (and any other changed fields) and a fresh `updated_at` timestamp (within the last few seconds).
10. Check the Next.js dev console for: `[inventory] Updated item <id> in fridge <fridgeId>`.
11. **Expected:** Log line is present.

### 2. Cancel edit without saving

1. Click **Edit** on any inventory row.
2. Change the name field to something obviously different.
3. Click **Cancel**.
4. **Expected:** Edit mode closes. The row reverts to the original values. No DB write occurred.
5. Run: `sqlite3 data/fridges.db "SELECT name, updated_at FROM inventory_items WHERE id='<itemId>';"`.
6. **Expected:** Name and `updated_at` are unchanged from before the edit.

### 3. Mark an item as "Used" and verify status flip

1. Note the current count of active inventory items on the page.
2. Click **Used** on one item.
3. **Expected:** The item disappears from the active inventory list immediately. The list count decreases by exactly 1.
4. Refresh the page (`F5` or reload).
5. **Expected:** The item is still absent from the list (server truth matches UI — no stale state).
6. Run: `sqlite3 data/fridges.db "SELECT status FROM inventory_items WHERE id='<itemId>';"`.
7. **Expected:** Returns `used` — not `active`, not deleted (the row still exists).
8. Check the Next.js dev console for: `[inventory] Marked item <id> as used in fridge <fridgeId>`.

### 4. Mark an item as "Discarded" and verify status flip

1. Click **Discard** on another active inventory item.
2. **Expected:** The item disappears from the active inventory list. Count decreases by 1.
3. Refresh the page.
4. **Expected:** Item remains absent.
5. Run: `sqlite3 data/fridges.db "SELECT status FROM inventory_items WHERE id='<itemId>';"`.
6. **Expected:** Returns `discarded` — row exists with updated status.
7. Check dev console for: `[inventory] Marked item <id> as discarded in fridge <fridgeId>`.

### 5. Verify cross-fridge write isolation

1. Note the fridge ID currently open (call it Fridge A).
2. Construct a direct Server Action call or simply verify via the DB: `sqlite3 data/fridges.db "SELECT id, fridge_id, name FROM inventory_items WHERE status='active';"` — confirm all active items visible on the Fridge A page have `fridge_id = <fridgeA_id>`.
3. If a second fridge (Fridge B) exists with its own items, open Fridge B's page and perform an edit.
4. **Expected:** The edited item's `fridge_id` in the DB remains the Fridge B ID — no cross-contamination. Items from Fridge A are not affected.

### 6. Pending state while action is in-flight

1. Click **Used** or **Discard** on an item.
2. **Expected (observable in a slow-network or debugger scenario):** While the Server Action is in-flight, the row dims to `opacity: 0.5` and all buttons on that row are disabled. On completion, the row disappears from the list.
   - Note: In local dev, the action completes too fast to observe the pending state visually. This test case is best verified by reading the component source: confirm `rowStates[item.id]?.pending` drives `opacity: 0.5` and `disabled` on the row's buttons in `InventorySection.tsx`.

---

## Edge Cases

### Double-action prevention: mark a used item as discarded

1. After marking an item `used` (Test Case 3), attempt to click **Discard** on it.
2. **Expected:** The item is no longer visible in the active list — the button cannot be reached. Attempting the action programmatically (e.g. calling the Server Action directly with the item ID and `status='discarded'`) should return `{ success: false, error: '...' }` because `setInventoryItemStatus` guards on `WHERE status='active'`.

### Edit with no changes (empty save)

1. Click **Edit** on an item without changing any fields.
2. Click **Save**.
3. **Expected:** No error. The row saves successfully (the UPDATE still runs and sets `updated_at`). The row re-renders with identical values.

### Expiry date edit: set explicit date

1. Click **Edit** on an item that has no expiry date (or has an estimated expiry).
2. Enter a specific date in the expiry date field (e.g. `2026-04-01`).
3. Ensure the "Estimated" checkbox is unchecked.
4. Click **Save**.
5. **Expected:** Row re-renders. `sqlite3` confirms `expiry_date='2026-04-01'` and `expiry_estimated=0` for that item.

### Expiry date edit: clear the date

1. Click **Edit** on an item with an expiry date.
2. Clear the date field (leave empty).
3. Click **Save**.
4. **Expected:** Row saves. `sqlite3` confirms `expiry_date` is either `null` or empty for that item — no error on blank expiry.

---

## Failure Signals

- **Edit mode shows no inline inputs**: `editingItemId` state is not being set on button click — check that `startEditing(item)` is wired to the Edit button's `onClick` in `InventorySection.tsx`.
- **Save writes the old value**: `editDraft` state is not updating from `onChange` handlers. If testing via Playwright: use `slowly: true` to trigger React synthetic events. In real browser interaction this is not an issue.
- **Used/Discard item remains in the list after action**: `router.refresh()` is not firing, or `listInventoryItems` is not filtering by `status='active'`. Check `startTransition(() => router.refresh())` in `handleStatusChange`.
- **Page refresh shows different state than UI**: stale local state — server truth diverged. The `router.refresh()` pattern should prevent this; if it occurs, check that the refresh is inside `startTransition` and that the RSC page fetch is reading fresh data from SQLite.
- **`[inventory]` log lines absent from server console**: Server Action is not being called, or the action is throwing before the log line. Check structured result in browser network tab for the action POST.
- **`changes===0` error surfaced as per-row banner**: The item was not in `status='active'` when the mutation ran (already used/discarded). Expected behavior — the error banner confirms the guard is working.
- **Next.js InvariantError 500 after mutation**: Pre-existing Next.js 15.5.14 hot-reload bug. Self-heals on retry. Not introduced by S04. Ignore unless it persists beyond 2 retries.

---

## Not Proven By This UAT

- **Concurrent multi-user access**: Two browser sessions modifying the same item simultaneously. S04's architecture (stateless server, SQLite, no session locking beyond better-sqlite3 synchronous writes) makes this structurally safe but it has not been exercised with two simultaneous sessions.
- **LAN / home-network mutation flow**: All testing is on localhost. S06 proves the full flow on the real home network.
- **Undo / restore of used or discarded items**: Not implemented. The `WHERE status='active'` guard makes status flips one-way in the current implementation.
- **Bulk edit or multi-row batch mutations**: Only single-row, sequential edits are supported by design in v1.

---

## Notes for Tester

- The dev server may be on port 3001 if 3000 is in use. Run `bg_shell highlights` or check the terminal for "Local: http://localhost:XXXX" before navigating.
- The `sqlite3` commands are your ground truth. If the UI and DB agree, the slice is working correctly. If they disagree, `router.refresh()` is not running or the RSC page is serving stale data.
- The Next.js hot-reload `InvariantError` may appear in the server console after mutations. This is cosmetic at dev time — the DB write succeeded if `[inventory]` was logged before the error.
- If you need fresh test items, run through the S02/S03 intake flow to add new active items before exercising S04 mutations.
