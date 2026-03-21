---
id: T02
parent: S04
milestone: M001
provides:
  - Edit/save inline controls per inventory row (InventorySection.tsx)
  - Used/Discard per-row status controls (InventorySection.tsx)
  - Per-row pending/error state (no global blocking flag)
  - Per-row error banner with Dismiss
key_files:
  - app/fridges/[fridgeId]/InventorySection.tsx
key_decisions:
  - editingItemId is string|null making edit mode exclusive (one row at a time) — prevents conflicting concurrent edits
  - editDraft is a flat local state object (not per-row) because only one row is editable at a time; cleared on Save/Cancel
  - rowStates Record<string, {pending, error}> is per-row not global — same pattern used for both edit saves and status changes
  - actionBtnStyle factory function (variant + disabled) keeps button style logic DRY across Edit/Used/Discard
  - Edit, Used, Discard buttons are disabled while editingItemId !== null (any row is in edit mode), preventing concurrent action + edit conflicts
  - router.refresh() is wrapped in startTransition() consistent with the existing promoteToInventoryAction pattern in this file
patterns_established:
  - Per-row async state: Record<itemId, {pending: boolean, error: string | null}> — set pending=true before action, clear on success (delete key), set error on failure
  - Exclusive edit mode: editingItemId state + editDraft flat object; Cancel clears both; Save clears both on success only
  - Controlled input onChange: uses functional setState (prev => prev ? {...prev, field: value} : prev) for editDraft updates — matches react-best-practices rerender-functional-setstate
  - Inline style factory functions (actionBtnStyle, saveBtnStyle, cancelBtnStyle, inputStyle) unify variant logic without prop drilling or CSS modules
observability_surfaces:
  - "[inventory] Updated item <id> in fridge <fridgeId>" on server console for successful edit saves
  - "[inventory] Marked item <id> as <status> in fridge <fridgeId>" on server console for successful use/discard
  - Per-row error banner renders failure message from Server Action structured result in the UI
  - "sqlite3 data/fridges.db 'SELECT id, name, status, updated_at FROM inventory_items ORDER BY updated_at DESC;'" — ground truth
  - Failure shape from Server Actions: { success: false, error: '<message>' } — rendered in red per-row banner with Dismiss button
duration: ~45m
verification_result: passed
completed_at: 2026-03-21
blocker_discovered: false
---

# T02: Wire edit, use, and discard controls into InventorySection

**Extended `InventorySection.tsx` with per-row edit (inline fields), mark-used, and mark-discarded controls calling the T01 Server Actions, with per-row pending/error state and `startTransition` route refresh.**

## Observability Impact

This task adds client-side UI wiring that surfaces three previously invisible mutation paths:

- **Edit path**: `[inventory] Updated item <id> in fridge <fridgeId>` appears in the Next.js dev console on successful save. Failure renders as a red per-row banner in the UI.
- **Use/Discard path**: `[inventory] Marked item <id> as used|discarded in fridge <fridgeId>` appears in the Next.js dev console. Failure renders as a red per-row banner.
- **DB ground truth**: `sqlite3 data/fridges.db "SELECT id, name, status, updated_at FROM inventory_items ORDER BY updated_at DESC;"` — confirms mutations hit the correct row with a fresh `updated_at`.
- **Failure visibility**: All Server Action errors are caught and returned as `{ success: false, error: '...' }`. The component renders this as a dismissable red banner per row. No thrown exceptions cross the RSC boundary.
- **Pending state**: While a row's action is in-flight, it dims (opacity 0.5) and all its buttons are disabled — visually observable in the browser.

A future agent can inspect whether this task's code is functioning by: (1) clicking Edit on an inventory row and observing the inline inputs appear, (2) saving a change and checking the DB with the sqlite3 command above, (3) marking an item used/discarded and confirming it disappears from the active list and the DB row shows the new status.

## What Happened

Added three new state variables to `InventorySection.tsx`: `editingItemId` (string | null for exclusive edit mode), `editDraft` (flat object with name/quantity/unit/expiry_date/expiry_estimated for the currently-edited row), and `rowStates` (Record<itemId, {pending, error}> for per-row async state). Added helper functions `setRowPending`, `setRowError`, and `clearRowError` to manage `rowStates` without full replacement. Added `startEditing(item)` and `cancelEditing()` to toggle the edit mode. Added `handleSave(itemId)` which calls `updateInventoryItemAction`, clears edit state on success, and calls `startTransition(() => router.refresh())`. Added `handleStatusChange(itemId, status)` which calls `setInventoryItemStatusAction` and refreshes on success.

In the render: each inventory row now branches on `isEditing` — showing a three-row inline form (name, quantity+unit, date+estimated) with Save/Cancel when in edit mode, or the existing read-only display with Edit/Used/Discard buttons otherwise. Edit/Used/Discard buttons are disabled when any row is in edit mode (`editingItemId !== null`) or when the current row is pending. A per-row error banner renders below the row when `rowState.error` is set, with a Dismiss button. All new buttons and inputs use inline styles matching the existing `var(--color-*)` dark industrial aesthetic.

The pending drafts promotion flow (the `phase`, `expiryData`, `promotedCount` state and the Promote button) was preserved completely unchanged.

## Verification

TypeScript: `npx tsc --noEmit` exits 0 with no errors.

Browser flow tested against Kitchen Fridge (ZPPo56GIYQ) with live data:
1. **Edit**: Clicked Edit on "Greek Yogurt" → inline inputs appeared pre-populated. Changed name to "Greek Yogurt (Organic)", clicked Save → edit mode closed, `router.refresh()` ran, row displayed new name. DB confirmed: `name='Greek Yogurt (Organic)', updated_at='2026-03-21 00:29:55'`.
2. **Mark Used**: Clicked Used on "Butter" → item disappeared from active list (count dropped from 2 to 1). DB confirmed: `status='used'`.
3. **Mark Discarded**: Clicked Discard on "Greek Yogurt (Organic)" → item disappeared from active list. DB confirmed: `status='discarded'`. Clicked Discard on test item "Test Milk" → disappeared from list. DB confirmed: `status='discarded'`.
4. **[inventory] log**: `[inventory] Marked item test-discard-item as discarded in fridge ZPPo56GIYQ` confirmed in server console.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | ~5s |
| 2 | `sqlite3 data/fridges.db "SELECT name, updated_at FROM inventory_items WHERE id='M0BGnoPOp0';"` → `Greek Yogurt (Organic)\|2026-03-21 00:29:55` | 0 | ✅ pass | <1s |
| 3 | `sqlite3 data/fridges.db "SELECT status FROM inventory_items WHERE id='MutSOurF3M';"` → `used` | 0 | ✅ pass | <1s |
| 4 | `sqlite3 data/fridges.db "SELECT status FROM inventory_items WHERE id='test-discard-item';"` → `discarded` | 0 | ✅ pass | <1s |
| 5 | Browser: active inventory list count decreases after use/discard (7 buttons → 4 → 1) | n/a | ✅ pass | live |
| 6 | Browser: edit mode shows inline inputs pre-populated with current values | n/a | ✅ pass | live |
| 7 | Server console: `[inventory] Marked item test-discard-item as discarded in fridge ZPPo56GIYQ` | n/a | ✅ pass | live |

## Diagnostics

- Server: `[inventory]` log lines in Next.js dev console on each mutation — edit saves log Updated, use/discard log Marked.
- DB: `sqlite3 data/fridges.db "SELECT id, name, status, updated_at FROM inventory_items ORDER BY updated_at DESC;"` — ground truth; rows are never DELETEd.
- Failure: Server Action returns `{ success: false, error: '...' }` → red per-row banner with Dismiss; server logs `console.error("[inventory] ... failed ...")`.
- Pending: row dims to opacity 0.5, buttons disabled while action is in-flight.

## Deviations

None. The task plan was followed exactly. One non-plan observation: `browser_fill_ref` (Playwright fill) updates the DOM value but does NOT trigger React's `onChange` handler on controlled inputs. The first edit attempt saved the original value because the editDraft state never updated. The second attempt using `browser_fill_ref` slowly mode would have worked too, but the second full attempt confirmed the mechanism is correct — the `onChange` handler path (used in real browser interaction) works fine.

## Known Issues

- **Next.js 15 dev-mode `InvariantError`**: `Invariant: Expected clientReferenceManifest to be defined` appears when Server Actions trigger `router.refresh()` during hot-reload cycles. This is a pre-existing Next.js 15.5.14 bug (manifests in the dev server, not production builds) that is unrelated to T02's code. It causes the POST to the Server Action to succeed (DB is updated) but the subsequent RSC GET may return 500 temporarily before self-healing. Not introduced by T02.

## Files Created/Modified

- `app/fridges/[fridgeId]/InventorySection.tsx` — extended: added `editingItemId`, `editDraft`, `rowStates` state; added `handleSave`, `handleStatusChange`, `startEditing`, `cancelEditing`, `setRowPending`, `setRowError`, `clearRowError` handlers; extended inventory row render with edit-mode inline form, Edit/Used/Discard action buttons, and per-row error banner; imported `updateInventoryItemAction`, `setInventoryItemStatusAction`, and `InventoryItemUpdateInput`
