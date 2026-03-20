---
id: T01
parent: S03
milestone: M001
provides:
  - inventory_items SQLite table with expiry and status schema
  - InventoryItem and InventoryItemInput TypeScript interfaces
  - listPendingDrafts, promoteToInventory, listInventoryItems store functions
  - promoteToInventoryAction Server Action with observability logging
key_files:
  - lib/db/client.ts
  - lib/inventory/types.ts
  - lib/inventory/store.ts
  - app/fridges/[fridgeId]/actions.ts
key_decisions:
  - intake_drafts UPDATE in promoteToInventory only touches `status` — the table has no `updated_at` column
  - expiry_estimated stored as INTEGER 0/1 in SQLite and converted to boolean in listInventoryItems return
patterns_established:
  - db.transaction() wraps both INSERT into inventory_items AND UPDATE intake_drafts status in a single atomic block
  - Store functions map raw SQLite integer booleans to TypeScript booleans at the read boundary
observability_surfaces:
  - console.log("[inventory] Promoted N items to inventory for fridge <id>") on success
  - console.error("[inventory] promoteToInventoryAction failed for fridge <id>: <message>") on failure
  - sqlite3 data/fridges.db "SELECT * FROM inventory_items;" — inventory ground truth
  - sqlite3 data/fridges.db "SELECT id, status FROM intake_drafts;" — draft status transitions
duration: ~10 min
verification_result: passed
completed_at: 2026-03-21
blocker_discovered: false
---

# T01: Add inventory data layer with expiry schema and promotion logic

**Added `inventory_items` table migration, TypeScript interfaces, three store functions, and `promoteToInventoryAction` Server Action for atomic draft-to-inventory promotion with expiry support.**

## What Happened

Four files were touched/created in sequence:

1. **`lib/db/client.ts`** — appended a `CREATE TABLE IF NOT EXISTS inventory_items` migration block after the `intake_drafts` block. Schema includes `expiry_date` (TEXT nullable), `expiry_estimated` (INTEGER 0/1), `status` with CHECK constraint `('active', 'used', 'discarded')`, and nullable `draft_id` FK to `intake_drafts`.

2. **`lib/inventory/types.ts`** — new file with `InventoryItem` (full row with boolean `expiry_estimated`) and `InventoryItemInput` (intake form subset with `draft_id` required).

3. **`lib/inventory/store.ts`** — new file implementing three synchronous functions following the pattern in `lib/intake/store.ts`:
   - `listPendingDrafts(fridgeId)` — SELECT from `intake_drafts WHERE status='pending'`, maps to `DraftItem[]`
   - `promoteToInventory(fridgeId, items)` — runs one `db.transaction()` that inserts each item into `inventory_items` (with `nanoid(10)` id, boolean→integer conversion for `expiry_estimated`) and updates the source draft to `status='confirmed'`
   - `listInventoryItems(fridgeId)` — SELECT active items, maps `expiry_estimated` 0/1 → boolean

4. **`app/fridges/[fridgeId]/actions.ts`** — added imports for `promoteToInventory` and `InventoryItemInput`, then appended `promoteToInventoryAction` following the exact shape of `confirmDraftAction` (try/catch, structured return, console.log/error observability).

The DB was initialized fresh (`rm data/fridges.db` + `npx tsx -e "getDb()"`) to confirm the migration runs correctly against a clean database.

## Verification

- `npx tsc --noEmit` → exit 0, no type errors
- `sqlite3 data/fridges.db ".schema inventory_items"` → all 13 columns present (id, fridge_id, draft_id, name, quantity, unit, confidence, expiry_date, expiry_estimated, status, added_at, updated_at) with correct types and constraints
- `test -f lib/inventory/types.ts && test -f lib/inventory/store.ts` → both files exist
- `grep -q "promoteToInventoryAction" app/fridges/[fridgeId]/actions.ts` → match found

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | ~8s |
| 2 | `sqlite3 data/fridges.db ".schema inventory_items"` | 0 | ✅ pass | <1s |
| 3 | `test -f lib/inventory/types.ts && test -f lib/inventory/store.ts` | 0 | ✅ pass | <1s |
| 4 | `grep -q "promoteToInventoryAction" app/fridges/[fridgeId]/actions.ts` | 0 | ✅ pass | <1s |

## Diagnostics

- **Schema inspect:** `sqlite3 data/fridges.db ".schema inventory_items"` — verify all columns and constraints
- **Inventory rows:** `sqlite3 data/fridges.db "SELECT * FROM inventory_items;"` — ground truth after promotion
- **Draft transitions:** `sqlite3 data/fridges.db "SELECT id, status FROM intake_drafts;"` — verify `confirmed` status after promotion
- **Server logs:** search for `[inventory]` prefix in server output for promotion success/failure

## Deviations

The task plan mentioned updating `intake_drafts SET status = 'confirmed', updated_at = datetime('now')` but also noted `intake_drafts` has no `updated_at` column. The implementation correctly omits `updated_at` from the UPDATE statement — only `status` is updated.

## Known Issues

None.

## Files Created/Modified

- `lib/db/client.ts` — modified: `inventory_items` CREATE TABLE migration added after `intake_drafts`
- `lib/inventory/types.ts` — new: `InventoryItem` and `InventoryItemInput` interfaces
- `lib/inventory/store.ts` — new: `listPendingDrafts`, `promoteToInventory`, `listInventoryItems` functions
- `app/fridges/[fridgeId]/actions.ts` — modified: `promoteToInventoryAction` added with imports
