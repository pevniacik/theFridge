# S04: Shared household inventory maintenance

**Goal:** Household members can update, remove, or discard items and the current fridge/freezer status stays trustworthy.
**Demo:** Open a fridge page with active inventory → edit an item's name/quantity/expiry and save → the row re-renders with new values. Mark an item "used" or "discarded" → it disappears from the active inventory list. Refresh the page → server truth matches what the UI showed.

## Must-Haves

- Single-item update (edit name, quantity, unit, expiry_date, expiry_estimated) persists to DB and re-renders
- Single-item "mark used" and "mark discarded" flip `status` (never DELETE rows) and remove the item from the active list
- Every mutation is scoped by both `item.id` AND `fridge_id` — cross-fridge writes are impossible
- `updated_at` is set to `datetime('now')` on every successful mutation
- Per-row interaction state (not a single global flag) so multiple items can be acted on independently
- After each mutation, `router.refresh()` re-reads server truth — no stale local-only state
- Error state is visible per-action, following the existing structured-result Server Action pattern

## Proof Level

- This slice proves: integration (mutation → DB → UI round-trip is truthful)
- Real runtime required: yes (local dev server + SQLite)
- Human/UAT required: no (browser inspection is sufficient)

## Verification

- `npx tsc --noEmit` exits 0 — no type regressions
- After editing an item via UI: `sqlite3 data/fridges.db "SELECT name, quantity, unit, expiry_date, expiry_estimated, updated_at FROM inventory_items WHERE id='<id>';"` shows the new values and a fresh `updated_at`
- After marking an item used: `sqlite3 data/fridges.db "SELECT status FROM inventory_items WHERE id='<id>';"` returns `used` (not deleted)
- After marking an item discarded: `sqlite3 data/fridges.db "SELECT status FROM inventory_items WHERE id='<id>';"` returns `discarded` (not deleted)
- Browser: the active inventory list count decreases by 1 after a use/discard action
- Browser: editing an item shows new values inline after save without full page navigation
- `[inventory]` log lines appear in the server console for each mutation

## Observability / Diagnostics

- Runtime signals: `console.log("[inventory] Updated item <id> in fridge <fridgeId>")`, `console.log("[inventory] Marked item <id> as <status> in fridge <fridgeId>")` on success; `console.error("[inventory] ...")` on failure
- Inspection surfaces: `sqlite3 data/fridges.db "SELECT id, name, status, updated_at FROM inventory_items ORDER BY updated_at DESC;"` — ground truth for all mutations
- Failure visibility: structured `{ success: false, error: "..." }` returned from Server Actions; error banner rendered per-row in the UI
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: `lib/inventory/store.ts` (listInventoryItems), `lib/inventory/types.ts` (InventoryItem), `app/fridges/[fridgeId]/actions.ts` (existing Server Action pattern), `app/fridges/[fridgeId]/InventorySection.tsx` (existing inventory list UI), `app/fridges/[fridgeId]/page.tsx` (RSC data fetch)
- New wiring introduced in this slice: update/use/discard Server Actions wired into InventorySection row controls; no new routes or pages
- What remains before the milestone is truly usable end-to-end: S05 (status/alerts/suggestions), S06 (local-first runtime proof)

## Tasks

- [x] **T01: Add inventory mutation store functions and Server Actions** `est:30m`
  - Why: The data layer must support single-item update and status-flip mutations before the UI can call them. This task creates the backend contract that S05/S06 will also consume.
  - Files: `lib/inventory/types.ts`, `lib/inventory/store.ts`, `app/fridges/[fridgeId]/actions.ts`
  - Do: Add `InventoryItemUpdateInput` type. Add `updateInventoryItem(fridgeId, itemId, input)` and `setInventoryItemStatus(fridgeId, itemId, status)` store functions — both scoped by `fridge_id` AND `id`, both setting `updated_at = datetime('now')`. Add `updateInventoryItemAction` and `setInventoryItemStatusAction` Server Actions with structured results and `[inventory]` logging.
  - Verify: `npx tsc --noEmit` exits 0; grep for `fridge_id = ?` AND `id = ?` in store queries confirms scoping
  - Done when: Three new exports from store.ts and two new Server Actions compile without error and follow the established pattern

- [ ] **T02: Wire edit, use, and discard controls into InventorySection** `est:45m`
  - Why: The UI must let household members act on individual items so the inventory stays truthful (R007, R008, R013). This is the user-facing proof of the slice.
  - Files: `app/fridges/[fridgeId]/InventorySection.tsx`
  - Do: Extend each inventory row with: (1) an "Edit" button that reveals inline editable fields for name, quantity, unit, and expiry; (2) a "Save" button that calls `updateInventoryItemAction` then `router.refresh()`; (3) "Used" and "Discard" buttons that call `setInventoryItemStatusAction` then `router.refresh()`. Use per-row state (`editingItemId` or similar) so only one row is in edit mode at a time. Show per-row error banners on failure. Match existing styling patterns. Skills: `react-best-practices`.
  - Verify: Start dev server, open a fridge page with inventory, edit an item → verify new values render; mark used → verify item disappears from active list; check `sqlite3` for status flips and updated timestamps
  - Done when: All three maintenance actions (edit, use, discard) work from the browser and the active inventory list reflects truthful current state after each action

## Files Likely Touched

- `lib/inventory/types.ts`
- `lib/inventory/store.ts`
- `app/fridges/[fridgeId]/actions.ts`
- `app/fridges/[fridgeId]/InventorySection.tsx`
