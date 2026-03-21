# S04 — Research

**Date:** 2026-03-21

## Summary

S04 is a targeted extension of the inventory model established in S03, not a new subsystem. The slice owns the active requirements around truthful maintenance and shared use: **R007** (explicit update/remove/discard flows), **R008** (current item-level state on demand), and **R013** (shared household usage works in practice). The codebase already has the right data model for this: `inventory_items.status` accepts `active | used | discarded`, `listInventoryItems()` already hides non-active rows, and the fridge context page already renders current inventory from server-side reads.

The main work is to add single-item maintenance mutations and wire them into the existing fridge page so household members can act on current inventory directly. The safest approach is to preserve the S03 pattern: keep persistence synchronous in `lib/inventory/store.ts`, expose thin typed Server Actions in `app/fridges/[fridgeId]/actions.ts`, and use a client component state machine in `app/fridges/[fridgeId]/InventorySection.tsx` for optimistic-feeling UX with `router.refresh()` after success. This matches the established patterns from S02/S03 and keeps the current inventory view authoritative by always re-reading from SQLite after a mutation.

## Recommendation

Implement S04 as two tightly related layers in this order:

1. **Data + action layer first**: add targeted inventory mutation functions for update/edit and status flips (`used`, `discarded`) in `lib/inventory/store.ts`, then expose structured-result Server Actions in `app/fridges/[fridgeId]/actions.ts`.
2. **UI layer second**: extend `InventorySection.tsx` so each active item can enter an edit mode and trigger explicit maintenance actions. Finish by relying on the existing RSC fetch in `page.tsx` to re-render the authoritative current state.

Why this approach:
- The DB schema already encodes the maintenance model; no migration is required unless execution discovers missing fields.
- S03’s forward intelligence explicitly says to **flip `status`, not DELETE rows`**.
- Returning structured results from Server Actions follows the existing pattern and avoids opaque RSC-boundary failures.
- For shared household use, the simplest trustworthy model is server-authoritative refresh after every mutation rather than local-only optimistic state.

## Implementation Landscape

### Key Files

- `lib/db/client.ts` — Already defines `inventory_items` with `status`, `added_at`, and `updated_at`. No schema gap is visible for S04’s basic maintenance flows. `updated_at` exists and should be written on every maintenance mutation.
- `lib/inventory/types.ts` — Defines `InventoryItem`. Likely needs one additional input type for edit/update actions (for example an `InventoryItemUpdateInput` carrying editable fields like `name`, `quantity`, `unit`, `expiry_date`, `expiry_estimated`).
- `lib/inventory/store.ts` — Primary S04 backend seam. Today it only supports promotion and listing. Add single-row mutation functions here, keeping the sync `better-sqlite3` pattern.
- `app/fridges/[fridgeId]/actions.ts` — Add thin Server Actions wrapping the new store functions. Must return `{ success, error? }` objects, matching the established `confirmDraftAction` / `promoteToInventoryAction` pattern.
- `app/fridges/[fridgeId]/InventorySection.tsx` — Primary S04 frontend seam. Today it only lists active inventory. Extend it with item-level controls for edit/update/use/discard and visible pending/error state per interaction.
- `app/fridges/[fridgeId]/page.tsx` — Already does the right thing for R008: reads current inventory on the server via `listInventoryItems(fridge.id)`. This likely only needs prop wiring if `InventorySection` gains extra behavior, not new data-fetching architecture.
- `lib/intake/store.ts` — Useful pattern reference: validates fridge existence before writes and wraps batch writes in a transaction.
- `app/fridges/[fridgeId]/IntakeSection.tsx` — Useful pattern reference for client-side phase management and inline error banners.

### Build Order

1. **Prove the store contract first**
   - Add `getInventoryItemById` if needed for existence checks.
   - Add update/status-flip store functions in `lib/inventory/store.ts`.
   - Ensure every mutation is scoped by both `item.id` and `fridge_id` so one fridge page cannot mutate another fridge’s inventory accidentally.
   - Ensure `updated_at = datetime('now')` is written on successful edits/status flips.

2. **Add Server Actions second**
   - Add actions such as “update inventory item”, “mark used”, and “discard item”.
   - Follow the existing try/catch + structured result + `[inventory]` logging pattern.
   - Validate empty/invalid payloads before calling the store.

3. **Extend `InventorySection` last**
   - Keep the existing inventory list as the authoritative read model.
   - Add explicit controls on each row rather than introducing a separate maintenance page; this keeps the maintenance loop lightweight, which is central to R007.
   - Use a small phase model per row or a targeted `activeItemId`/`editingItemId` pattern instead of one global boolean, so multiple visible controls do not create impossible UI states.
   - After successful mutation, use `router.refresh()` (ideally inside `startTransition`) to reload the server truth, consistent with S03.

4. **Only after the flows work, tighten shared-use behavior**
   - Shared household support in S04 is mainly about the same fridge page remaining understandable when multiple people can mutate it. The minimal viable proof is that mutations are explicit, refresh to server truth, and non-active items disappear from the active list immediately because `listInventoryItems()` already filters `status = 'active'`.

### Verification Approach

Use the existing lightweight verification stack; there is no project test harness yet.

- `npm run type-check` — catch TS regressions.
- Local DB inspection:
  - `sqlite3 data/fridges.db "SELECT id, name, quantity, unit, expiry_date, expiry_estimated, status, updated_at FROM inventory_items ORDER BY added_at DESC;"`
  - Verify edited rows change fields and `updated_at`.
  - Verify “used” / “discarded” actions flip `status` instead of deleting rows.
- Browser/manual flow against the local app:
  - Open a fridge page with active inventory.
  - Edit an item, save, and verify the row re-renders with the new values.
  - Mark an item used/discarded and verify it disappears from the active inventory list after refresh.
  - Confirm error state is visible if a mutation fails.
- Server log verification:
  - Reuse the `[inventory]` namespace established in S03 for success/failure logs.

Observable behaviors that should prove the slice:
- Active inventory is visible on demand when opening the fridge page (R008).
- A household member can explicitly edit an item and immediately see the changed current state (R007).
- A household member can explicitly mark an item used/discarded and the active list becomes more truthful immediately (R007).
- The same shared page remains authoritative because state is re-read from the DB after each action, not only mutated locally (R013).

## Constraints

- `better-sqlite3` is synchronous and already used as the canonical persistence pattern; keep S04 store functions synchronous.
- `listInventoryItems(fridgeId)` currently returns only `status = 'active'` rows newest-first. That means status-flipped rows will disappear automatically from the UI after refresh.
- Next.js App Router page data is already fetched server-side in `app/fridges/[fridgeId]/page.tsx`; S04 should reuse this rather than adding client-side fetching.
- There is no project test framework configured in `package.json`; verification should not assume Jest/Vitest/Playwright tests exist.

## Common Pitfalls

- **Deleting rows instead of flipping `status`** — Avoid `DELETE FROM inventory_items`. The schema and S03 forward intelligence both point to status transitions as the intended history-preserving model.
- **Unscoped item mutations** — Do not update by `item.id` alone. Scope writes by both `id` and `fridge_id` so actions from one fridge context cannot mutate another fridge’s rows.
- **Throwing through imperative Server Actions** — Follow the existing structured-result pattern in `actions.ts`; unhandled throws are harder to surface meaningfully in the client.
- **Global UI pending state for per-row actions** — A single global “saving” flag will make row-level maintenance awkward. Use row-scoped interaction state.
- **Forgetting `updated_at`** — `inventory_items` already has the column; S04 mutations should keep it meaningful for later slices and debugging.

## Open Risks

- The current schema is presence-first and has no richer quantity semantics. “Update” in S04 should likely mean editing text fields (`name`, `quantity`, `unit`, expiry) rather than introducing decrement math or partial-consumption rules.
- Shared-household proof for R013 is probably satisfied by server-authoritative refresh and explicit actions in M001, but if execution finds stale-tab confusion, S04 may need a lightweight “item changed” error or a stricter update guard.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| React / Next.js | `react-best-practices` | available |
| Testing / verification | `test` | available |

