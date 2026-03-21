---
id: T01
parent: S04
milestone: M001
provides:
  - InventoryItemUpdateInput type in lib/inventory/types.ts
  - updateInventoryItem store function (fridge-scoped UPDATE with updated_at)
  - setInventoryItemStatus store function (fridge-scoped + active-guard UPDATE)
  - updateInventoryItemAction Server Action with [inventory] observability
  - setInventoryItemStatusAction Server Action with [inventory] observability
key_files:
  - lib/inventory/types.ts
  - lib/inventory/store.ts
  - app/fridges/[fridgeId]/actions.ts
key_decisions:
  - Both store functions throw on changes===0 rather than returning a boolean, consistent with the existing store error contract
  - setInventoryItemStatus guards on status='active' in the WHERE clause, so marking an already-used/discarded item is a no-op that surfaces as an error, not silent success
patterns_established:
  - Mutation store functions: synchronous better-sqlite3, scoped by both itemId AND fridgeId, always set updated_at=datetime('now'), throw on changes===0
  - Server Actions: import + call store function, validate inputs, return structured {success,error?}, log success with [inventory] prefix, log error with [inventory] prefix to console.error
observability_surfaces:
  - console.log("[inventory] Updated item <id> in fridge <fridgeId>") on successful edit
  - console.log("[inventory] Marked item <id> as <status> in fridge <fridgeId>") on successful status change
  - console.error("[inventory] updateInventoryItemAction failed for fridge <fridgeId>: <message>") on edit failure
  - console.error("[inventory] setInventoryItemStatusAction failed for fridge <fridgeId>: <message>") on status failure
  - "sqlite3 data/fridges.db 'SELECT id, name, status, updated_at FROM inventory_items ORDER BY updated_at DESC;'" — ground truth
duration: ~5m
verification_result: passed
completed_at: 2026-03-21
blocker_discovered: false
---

# T01: Add inventory mutation store functions and Server Actions

**Added `updateInventoryItem` and `setInventoryItemStatus` store functions plus their wrapping Server Actions, enabling fridge-scoped edit and use/discard mutations with full `[inventory]` observability.**

## What Happened

Added `InventoryItemUpdateInput` (5 editable fields, all required) to `lib/inventory/types.ts`. Added two synchronous store functions to `lib/inventory/store.ts` following the established better-sqlite3 pattern: `updateInventoryItem` UPDATEs name/quantity/unit/expiry_date/expiry_estimated and `updated_at` scoped by `id AND fridge_id`, throwing if `changes===0`; `setInventoryItemStatus` flips status to `used` or `discarded` scoped by `id AND fridge_id AND status='active'`, also throwing if `changes===0`. No DELETE is used — rows are kept for audit trail. Added `updateInventoryItemAction` and `setInventoryItemStatusAction` to `app/fridges/[fridgeId]/actions.ts` following the existing `promoteToInventoryAction` pattern: try/catch wrapper, structured `{success, error?}` return, `[inventory]` prefixed log lines on both success and failure paths.

## Verification

Ran TypeScript compiler — no type errors. Grep-verified that both new store functions scope by `fridge_id = ?`. Grep-verified `datetime('now')` appears in both UPDATE statements. Grep-verified no `DELETE` keyword in `store.ts`. Grep-counted 6 `[inventory]` log lines in `actions.ts` (2 original + 2 new success + 2 new error).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | ~4s |
| 2 | `grep -n "fridge_id = ?" lib/inventory/store.ts` | 0 (4 matches, lines 22,103,137,175) | ✅ pass | <1s |
| 3 | `grep -n "datetime('now')" lib/inventory/store.ts` | 0 (lines 136,174) | ✅ pass | <1s |
| 4 | `grep -n "DELETE" lib/inventory/store.ts` | 1 (no matches) | ✅ pass | <1s |
| 5 | `grep -c "\[inventory\]" app/fridges/[fridgeId]/actions.ts` | 0 (count=6) | ✅ pass | <1s |

## Diagnostics

- Server-side: `[inventory]` log lines appear in the Next.js dev console on each mutation.
- DB ground truth: `sqlite3 data/fridges.db "SELECT id, name, status, updated_at FROM inventory_items ORDER BY updated_at DESC;"`
- Failure shape returned to client: `{ success: false, error: "<message>" }` — no thrown errors cross the RSC boundary.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `lib/inventory/types.ts` — added `InventoryItemUpdateInput` interface
- `lib/inventory/store.ts` — added `updateInventoryItem` and `setInventoryItemStatus` functions; updated import to include `InventoryItemUpdateInput`
- `app/fridges/[fridgeId]/actions.ts` — added `updateInventoryItemAction` and `setInventoryItemStatusAction` Server Actions; updated imports
