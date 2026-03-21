---
estimated_steps: 5
estimated_files: 3
---

# T01: Add inventory mutation store functions and Server Actions

**Slice:** S04 — Shared household inventory maintenance
**Milestone:** M001

## Description

Add the data-layer support for single-item inventory maintenance: editing item fields (name, quantity, unit, expiry_date, expiry_estimated) and flipping item status to `used` or `discarded`. This follows the existing synchronous better-sqlite3 store pattern and the structured-result Server Action pattern established in S02/S03. Every mutation must be scoped by both `item.id` AND `fridge_id` to prevent cross-fridge writes, and must set `updated_at = datetime('now')`.

The DB schema already has the `status` CHECK constraint (`'active' | 'used' | 'discarded'`) and the `updated_at` column — no migration is needed.

**Relevant skill:** `react-best-practices` (for Server Action patterns)

## Steps

1. **Add `InventoryItemUpdateInput` to `lib/inventory/types.ts`** — A partial-update input type carrying the editable fields: `name`, `quantity`, `unit`, `expiry_date` (string | null), `expiry_estimated` (boolean). All fields should be required (the caller passes the full current values, not just changed ones — simpler and avoids partial-update ambiguity).

2. **Add `updateInventoryItem` to `lib/inventory/store.ts`** — Takes `(fridgeId: string, itemId: string, input: InventoryItemUpdateInput)`. Runs an UPDATE on `inventory_items` WHERE `id = ? AND fridge_id = ?` setting name, quantity, unit, expiry_date, expiry_estimated (convert boolean to 0/1), and `updated_at = datetime('now')`. Check `changes` on the run result — if 0, throw an error (item not found or wrong fridge). Keep it synchronous like all other store functions.

3. **Add `setInventoryItemStatus` to `lib/inventory/store.ts`** — Takes `(fridgeId: string, itemId: string, status: 'used' | 'discarded')`. Runs an UPDATE on `inventory_items` WHERE `id = ? AND fridge_id = ? AND status = 'active'` setting `status` and `updated_at = datetime('now')`. Check `changes` — if 0, throw (item not found, wrong fridge, or already non-active). Synchronous.

4. **Add `updateInventoryItemAction` to `app/fridges/[fridgeId]/actions.ts`** — Wraps `updateInventoryItem` with try/catch and returns `{ success: boolean; error?: string }`. Validates that input fields are non-empty for name. Logs `[inventory] Updated item <id> in fridge <fridgeId>` on success. Logs `[inventory] updateInventoryItemAction failed for fridge <fridgeId>: <message>` on error.

5. **Add `setInventoryItemStatusAction` to `app/fridges/[fridgeId]/actions.ts`** — Wraps `setInventoryItemStatus` with try/catch and returns `{ success: boolean; error?: string }`. Validates status is one of `'used' | 'discarded'`. Logs `[inventory] Marked item <id> as <status> in fridge <fridgeId>` on success.

## Must-Haves

- [ ] `InventoryItemUpdateInput` type is exported from `lib/inventory/types.ts`
- [ ] `updateInventoryItem` scopes UPDATE by both `id` AND `fridge_id`
- [ ] `setInventoryItemStatus` scopes UPDATE by both `id` AND `fridge_id` AND `status = 'active'`
- [ ] Both store functions set `updated_at = datetime('now')` on the row
- [ ] Both store functions throw if `changes === 0` (item not found or already non-active)
- [ ] `setInventoryItemStatus` never uses DELETE — only UPDATE on `status`
- [ ] `expiry_estimated` boolean is converted to INTEGER 0/1 for SQLite in `updateInventoryItem`
- [ ] Both Server Actions return structured `{ success, error? }` results, never throw across the RSC boundary
- [ ] Both Server Actions log with the `[inventory]` namespace prefix

## Verification

- `npx tsc --noEmit` exits 0 with no errors
- `grep -n "fridge_id = ?" lib/inventory/store.ts` shows scoped queries for both new functions
- `grep -n "datetime('now')" lib/inventory/store.ts` shows updated_at being set in both mutations
- `grep -n "DELETE" lib/inventory/store.ts` returns no matches (no row deletion)
- `grep -c "\[inventory\]" app/fridges/\[fridgeId\]/actions.ts` returns at least 4 (2 existing + 2 new success + 2 new error)

## Observability Impact

- Signals added: `[inventory] Updated item <id> in fridge <fridgeId>` and `[inventory] Marked item <id> as <status> in fridge <fridgeId>` console.log on success; corresponding console.error on failure
- How a future agent inspects this: `sqlite3 data/fridges.db "SELECT id, name, status, updated_at FROM inventory_items ORDER BY updated_at DESC;"`
- Failure state exposed: structured `{ success: false, error: "..." }` returned to calling client component

## Inputs

- `lib/inventory/types.ts` — existing `InventoryItem` and `InventoryItemInput` interfaces that define the data model
- `lib/inventory/store.ts` — existing `promoteToInventory` and `listInventoryItems` functions that establish the synchronous store pattern
- `app/fridges/[fridgeId]/actions.ts` — existing `confirmDraftAction` and `promoteToInventoryAction` that establish the Server Action pattern
- `lib/db/client.ts` — existing schema with `inventory_items` table including `status` CHECK constraint and `updated_at` column

## Expected Output

- `lib/inventory/types.ts` — modified: `InventoryItemUpdateInput` interface added
- `lib/inventory/store.ts` — modified: `updateInventoryItem` and `setInventoryItemStatus` functions added
- `app/fridges/[fridgeId]/actions.ts` — modified: `updateInventoryItemAction` and `setInventoryItemStatusAction` Server Actions added
