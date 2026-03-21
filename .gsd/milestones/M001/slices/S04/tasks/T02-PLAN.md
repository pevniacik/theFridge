---
estimated_steps: 5
estimated_files: 1
---

# T02: Wire edit, use, and discard controls into InventorySection

**Slice:** S04 — Shared household inventory maintenance
**Milestone:** M001

## Description

Extend `InventorySection.tsx` so each active inventory item has explicit maintenance controls: edit (inline field editing), mark-used, and mark-discarded. This is the user-facing proof of R007 (explicit maintenance keeps inventory truthful), R008 (current state on demand), and R013 (shared household usage — server-authoritative refresh after every action ensures all users see the same truth).

The component already renders inventory items as read-only rows. This task adds:
- An "Edit" button per row that reveals inline editable fields for name, quantity, unit, and expiry
- "Save" / "Cancel" buttons in edit mode that call `updateInventoryItemAction` then `router.refresh()`
- "Used" and "Discard" buttons per row that call `setInventoryItemStatusAction` then `router.refresh()`
- Per-row pending/error state so actions on one item don't block or confuse other items

The existing styling uses inline CSS with `var(--color-*)` tokens. New controls must match this aesthetic.

**Relevant skills:** `react-best-practices`

## Steps

1. **Import the new Server Actions** at the top of `InventorySection.tsx`: `updateInventoryItemAction` and `setInventoryItemStatusAction` from `./actions`. Also import `InventoryItemUpdateInput` from `@/lib/inventory/types`.

2. **Add per-row interaction state** — Track which item is being edited with `editingItemId: string | null` state. Track per-row pending/error state with a `rowStates` record keyed by item ID, where each entry can have a `pending: boolean` and `error: string | null`. This avoids a global flag that would block all items when one is saving.

3. **Add edit mode per row** — When `editingItemId === item.id`, render the row with editable inputs (text input for name, quantity, unit; date input for expiry_date; checkbox or toggle for expiry_estimated) instead of the read-only display. Pre-populate from the current item values. Add "Save" and "Cancel" buttons. On Cancel, clear `editingItemId`. On Save:
   - Set the row's `pending: true`
   - Call `updateInventoryItemAction(fridgeId, item.id, { name, quantity, unit, expiry_date, expiry_estimated })`
   - On success: clear `editingItemId`, clear error, call `startTransition(() => router.refresh())`
   - On failure: set the row's error, clear pending

4. **Add "Used" and "Discard" buttons** to each non-editing row. These are small, muted buttons that become visible in the row's action area. On click:
   - Set the row's `pending: true`
   - Call `setInventoryItemStatusAction(fridgeId, item.id, 'used')` or `'discarded'`
   - On success: call `startTransition(() => router.refresh())` — the item will vanish from the active list because `listInventoryItems` filters `status = 'active'`
   - On failure: set the row's error, clear pending
   - While pending, dim the row (opacity) and disable buttons

5. **Add per-row error banner** — When a row has an error, show a small error message below the row with a "Dismiss" button that clears the error. Match the existing error banner style (red background, `#f87171` text).

## Must-Haves

- [ ] Each inventory row has "Edit", "Used", and "Discard" action controls
- [ ] Edit mode shows inline inputs pre-populated with current values, plus Save/Cancel
- [ ] Save calls `updateInventoryItemAction` and refreshes the route on success
- [ ] "Used" calls `setInventoryItemStatusAction(fridgeId, itemId, 'used')` and refreshes
- [ ] "Discard" calls `setInventoryItemStatusAction(fridgeId, itemId, 'discarded')` and refreshes
- [ ] Per-row pending state (not global) — dimmed opacity while saving, buttons disabled
- [ ] Per-row error display with actionable dismiss
- [ ] `router.refresh()` is wrapped in `startTransition` (consistent with S03 pattern)
- [ ] Styling matches existing dark industrial aesthetic with `var(--color-*)` tokens
- [ ] The component continues to render the existing pending drafts / promotion flow unchanged

## Verification

- Start the dev server (`npm run dev`) and open a fridge page with active inventory items
- Click "Edit" on an item → inline inputs appear pre-populated with current values
- Change the name and save → the row updates with the new name; `sqlite3 data/fridges.db "SELECT name, updated_at FROM inventory_items WHERE id='<id>';"` shows the new name and fresh timestamp
- Click "Used" on an item → the item disappears from the list; `sqlite3 data/fridges.db "SELECT status FROM inventory_items WHERE id='<id>';"` returns `used`
- Click "Discard" on an item → the item disappears from the list; status is `discarded` in DB
- The pending drafts section and promote flow still work unchanged
- `npx tsc --noEmit` exits 0

## Inputs

- `app/fridges/[fridgeId]/InventorySection.tsx` — existing component with read-only inventory list and pending drafts promotion flow
- `app/fridges/[fridgeId]/actions.ts` — `updateInventoryItemAction` and `setInventoryItemStatusAction` from T01
- `lib/inventory/types.ts` — `InventoryItem` and `InventoryItemUpdateInput` types from T01

## Expected Output

- `app/fridges/[fridgeId]/InventorySection.tsx` — modified: edit/use/discard controls added to each inventory row with per-row state management
