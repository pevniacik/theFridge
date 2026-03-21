---
id: S04
parent: M001
milestone: M001
provides:
  - updateInventoryItem store function (fridge-scoped UPDATE of name/quantity/unit/expiry_date/expiry_estimated + updated_at)
  - setInventoryItemStatus store function (fridge-scoped + active-guard status flip to 'used' or 'discarded')
  - updateInventoryItemAction Server Action with structured result and [inventory] observability
  - setInventoryItemStatusAction Server Action with structured result and [inventory] observability
  - Per-row inline edit UI (InventorySection.tsx): edit button → inline fields → save/cancel
  - Per-row mark-used and mark-discarded controls
  - Per-row pending state (opacity dim, buttons disabled while in-flight)
  - Per-row error banner with Dismiss (surfaces Server Action structured failures)
  - Exclusive edit mode (one row at a time; editingItemId string|null)
  - router.refresh() after each mutation wrapped in startTransition
requires:
  - slice: S03
    provides: inventory_items table with status='active' rows, listInventoryItems read model, InventorySection.tsx component structure
affects:
  - S05
  - S06
key_files:
  - lib/inventory/types.ts
  - lib/inventory/store.ts
  - app/fridges/[fridgeId]/actions.ts
  - app/fridges/[fridgeId]/InventorySection.tsx
key_decisions:
  - Both store functions throw when changes===0 rather than returning boolean — consistent with existing store error contract; errors propagate to Server Action catch block and become structured { success: false, error } responses
  - setInventoryItemStatus guards WHERE status='active' — marking an already-used/discarded item is a no-op that surfaces as an error, not silent success or double-flip
  - No DELETE anywhere — rows are kept for audit trail; listInventoryItems WHERE status='active' makes retired items invisible to the UI automatically
  - editingItemId is string|null (not per-row boolean) making edit mode exclusive — prevents concurrent edit conflicts
  - editDraft is a flat object (not per-row) because only one row can be in edit mode at a time; cleared on Save/Cancel
  - rowStates is Record<itemId, {pending, error}> per-row — both edit saves and status changes share this pattern
  - Edit/Used/Discard buttons all disabled when editingItemId !== null (any row in edit mode), preventing action + edit race conditions
  - router.refresh() wrapped in startTransition consistent with existing promoteToInventoryAction pattern
patterns_established:
  - Mutation store functions: synchronous better-sqlite3, dual-key scoping (id AND fridge_id), always set updated_at=datetime('now'), throw on changes===0
  - Server Actions: try/catch wrapper, structured {success: true} or {success: false, error: string} return, [inventory] log on success, console.error on failure — no thrown exceptions cross the RSC boundary
  - Per-row async state: Record<itemId, {pending: boolean, error: string | null}> — set pending=true before action, delete key on success, set error on failure
  - Exclusive edit mode: editingItemId + editDraft flat object; Cancel clears both; Save clears both on success only
  - Controlled input onChange: functional setState (prev => prev ? {...prev, field: value} : prev) for editDraft updates
observability_surfaces:
  - console.log("[inventory] Updated item <id> in fridge <fridgeId>") on successful edit save
  - console.log("[inventory] Marked item <id> as <status> in fridge <fridgeId>") on successful use/discard
  - console.error("[inventory] updateInventoryItemAction failed for fridge <fridgeId>: <message>") on edit failure
  - console.error("[inventory] setInventoryItemStatusAction failed for fridge <fridgeId>: <message>") on status failure
  - Per-row error banner renders { success: false, error } message in UI
  - "sqlite3 data/fridges.db 'SELECT id, name, status, updated_at FROM inventory_items ORDER BY updated_at DESC;'" — ground truth for all mutations
drill_down_paths:
  - .gsd/milestones/M001/slices/S04/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S04/tasks/T02-SUMMARY.md
duration: ~50m (T01: ~5m, T02: ~45m)
verification_result: passed
completed_at: 2026-03-21
---

# S04: Shared household inventory maintenance

**Per-row edit, mark-used, and mark-discarded controls wired into InventorySection, backed by dual-key-scoped fridge-safe Server Actions, making the active inventory list a trustworthy mutable view of the SQLite ground truth.**

## What Happened

**T01** established the data layer. `InventoryItemUpdateInput` (name, quantity, unit, expiry_date, expiry_estimated — all required) was added to `lib/inventory/types.ts`. Two synchronous store functions were added to `lib/inventory/store.ts` following the established better-sqlite3 pattern: `updateInventoryItem` UPDATEs all five editable fields plus `updated_at=datetime('now')` scoped by `id AND fridge_id`; `setInventoryItemStatus` flips status to `used` or `discarded` scoped by `id AND fridge_id AND status='active'`, throwing if `changes===0` (making double-flips visible as errors rather than silent no-ops). No `DELETE` statement exists anywhere in the store. Two Server Actions — `updateInventoryItemAction` and `setInventoryItemStatusAction` — were added to `app/fridges/[fridgeId]/actions.ts` following the existing `promoteToInventoryAction` pattern: try/catch wrappers, structured `{ success, error? }` returns, and `[inventory]`-prefixed log lines on both success and failure paths.

**T02** wired the UI. `InventorySection.tsx` was extended with three new state variables (`editingItemId: string | null`, `editDraft`, `rowStates: Record<string, {pending, error}>`) and five helper functions (`startEditing`, `cancelEditing`, `handleSave`, `handleStatusChange`, plus `setRowPending`/`setRowError`/`clearRowError`). Each inventory row now branches on `isEditing`: in edit mode it renders a three-row inline form (name field; quantity + unit fields; expiry date + estimated checkbox) with Save/Cancel; in read mode it renders the existing display with Edit, Used, and Discard buttons alongside it. All action buttons are disabled when any row is in edit mode (`editingItemId !== null`) or when the current row is pending. A per-row error banner renders below the row on failure with a Dismiss button. Pending rows dim to `opacity: 0.5`. The existing pending-draft promotion flow (phase/expiryData/promotedCount state and Promote button) was preserved completely unchanged.

## Verification

TypeScript: `npx tsc --noEmit` exits 0 — no type regressions.

DB scoping: both new store functions scope by `fridge_id = ?` (grep-confirmed lines 137 and 175 in store.ts). `datetime('now')` appears in both UPDATE statements. No `DELETE` keyword in store.ts.

`[inventory]` log coverage: 6 `[inventory]`-prefixed lines in `actions.ts` (2 original from S03 + 2 new success + 2 new error paths).

Browser flow (Kitchen Fridge ZPPo56GIYQ with live data):
- **Edit**: Clicked Edit on "Greek Yogurt" → inline inputs appeared pre-populated → changed name → saved → row re-rendered with new name. `sqlite3` confirmed: `name='Greek Yogurt (Organic)', updated_at='2026-03-21 00:29:55'`.
- **Mark Used**: Clicked Used on "Butter" → item disappeared from active list. `sqlite3` confirmed: `status='used'`.
- **Mark Discarded**: Clicked Discard on items → they disappeared from active list. `sqlite3` confirmed: `status='discarded'` (not deleted — row exists with updated status).
- **Active list count**: Decreased by 1 per use/discard action (7 buttons → 4 → 1 across multiple items).
- **Server log**: `[inventory] Marked item test-discard-item as discarded in fridge ZPPo56GIYQ` confirmed in Next.js dev console.

## New Requirements Surfaced

- none

## Deviations

None. The task plan was followed exactly. One implementation note during T02 browser testing: Playwright's `browser_fill_ref` (without `slowly: true`) sets the DOM input value but does NOT trigger React's synthetic `onChange` handler on controlled inputs — so `editDraft` state remained unchanged and the first save attempt wrote the original value back. This is a testing-environment quirk only (documented in KNOWLEDGE.md); the `onChange` handler path used in real browser interaction works correctly.

## Known Limitations

- **Next.js 15 dev-mode `InvariantError`**: `Invariant: Expected clientReferenceManifest to be defined` appears during hot-reload cycles when Server Actions trigger `router.refresh()`. This is a pre-existing Next.js 15.5.14 bug unrelated to S04's code. It causes the POST to succeed (DB is updated) but the subsequent RSC GET may 500 transiently before self-healing. Not introduced by this slice.
- **Single edit mode**: Only one row can be in edit mode at a time by design (exclusive `editingItemId`). This is appropriate for v1 but means a user who wants to batch-edit several items must do so sequentially.
- **No undo**: Status flips (used/discarded) are immediate with no undo. Future slices may want a reconsider flow but this is out of scope for M001.

## Follow-ups

- S05 can read `status='active'` rows with `expiry_date` and `updated_at` to surface aging/forgotten/expiring items — both fields are now reliably set and maintained by S04 mutations.
- The `updated_at` column updated on every edit could be used as a "last seen" signal for forgotten-item detection in S05.
- S06 should verify the full mutation flow over LAN to confirm no cross-machine session or CORS issues.

## Files Created/Modified

- `lib/inventory/types.ts` — added `InventoryItemUpdateInput` interface (5 editable fields)
- `lib/inventory/store.ts` — added `updateInventoryItem` and `setInventoryItemStatus` functions; updated import
- `app/fridges/[fridgeId]/actions.ts` — added `updateInventoryItemAction` and `setInventoryItemStatusAction` Server Actions; updated imports
- `app/fridges/[fridgeId]/InventorySection.tsx` — extended: per-row edit form, Edit/Used/Discard controls, per-row pending/error state, inline style helpers

## Forward Intelligence

### What the next slice should know
- The `updated_at` field is now reliably stamped on every mutation (edit + status flip). S05 can use `updated_at` to detect items that haven't been touched in a long time as a "forgotten" signal.
- `status='active'` is the single source of truth for the current inventory view. S05 should query `listInventoryItems` (which already filters on `status='active'`) — do not add new filtering logic unless the status model changes.
- The `expiry_date` column is nullable (`null` = no known expiry). S05 must handle nulls when computing expiry urgency — do not assume a date is always present.
- `expiry_estimated` is a boolean (coerced from INTEGER 0/1 at the store read boundary). S05 can use this to show a softer urgency indicator on estimated dates vs hard deadlines.
- `router.refresh()` wrapped in `startTransition` is the established pattern for all mutation → UI refresh flows. Follow this pattern in S05 if it adds any mutations.

### What's fragile
- **React controlled inputs + Playwright**: Playwright's `fill()` does not trigger React `onChange`. Any automated test that fills edit fields must use `slowly: true` (character-by-character) to trigger synthetic events — or the saved value will be the pre-edit original. This is test-only fragility; real user interaction is fine.
- **Next.js 15 hot-reload InvariantError**: The `clientReferenceManifest` invariant in Next.js dev mode causes transient 500s after Server Action + router.refresh() during hot-reload cycles. This self-heals but can confuse agent browser tests that check for 200s immediately after mutation. Wait a moment and retry.
- **setInventoryItemStatus active-guard**: The `WHERE status='active'` guard means you cannot flip an already-used/discarded item back to active via this function. There is no "restore" action. If a restore flow is ever needed, a new store function must be added — the existing one will silently return `changes===0` and throw.

### Authoritative diagnostics
- `sqlite3 data/fridges.db "SELECT id, name, status, updated_at FROM inventory_items ORDER BY updated_at DESC;"` — the single most useful ground-truth command; shows all rows ordered by recency with their current status.
- Next.js dev console `[inventory]` prefixed lines — confirms which Server Action ran and for which item/fridge; search for `[inventory]` to filter signal from noise.
- Per-row error banners in the UI — if a mutation fails, the structured `{ success: false, error: '...' }` message renders inline below the row; no need to dig into network logs for the failure message.

### What assumptions changed
- No assumptions changed. The S03 inventory model (status column, fridge_id FK, listInventoryItems active filter) was exactly as expected. The T02 edit mechanism worked correctly in real browser interaction; the Playwright testing quirk with React controlled inputs was the only surprise.
