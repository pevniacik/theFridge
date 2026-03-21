---
id: S03
parent: M001
milestone: M001
provides:
  - inventory_items SQLite table with expiry_date, expiry_estimated, status, and FK to fridges and intake_drafts
  - InventoryItem and InventoryItemInput TypeScript interfaces
  - listPendingDrafts, promoteToInventory, listInventoryItems store functions (synchronous, better-sqlite3)
  - promoteToInventoryAction Server Action (atomic: inserts inventory rows + flips draft status in one transaction)
  - InventorySection client component with per-item expiry inputs (date picker + quick-pick day buttons) and inventory list
  - page.tsx wired to pass RSC-fetched pendingDrafts and inventoryItems props into InventorySection
requires:
  - slice: S02
    provides: confirmed intake_drafts rows (status='pending'), DraftItem interface, confirmDraftAction pattern
  - slice: S01
    provides: fridge identity records, storage-context routing
affects:
  - S04  # consumes inventory_items table and listInventoryItems for update/remove/discard flows
  - S05  # consumes expiry-aware inventory for status, alerts, and cooking suggestions
  - S06  # consumes full persisted inventory truth for end-to-end proof
key_files:
  - lib/db/client.ts
  - lib/inventory/types.ts
  - lib/inventory/store.ts
  - app/fridges/[fridgeId]/actions.ts
  - app/fridges/[fridgeId]/InventorySection.tsx
  - app/fridges/[fridgeId]/page.tsx
key_decisions:
  - db.transaction() wraps both INSERT into inventory_items AND UPDATE intake_drafts.status in a single atomic block — partial promotion is impossible
  - intake_drafts UPDATE only touches status (no updated_at column on that table)
  - expiry_estimated stored as INTEGER 0/1 in SQLite; converted to boolean at the read boundary in listInventoryItems
  - useTransition wraps router.refresh() so React batches the route invalidation without blocking the success UI
  - expiryData state initialized via useState initializer function (not useEffect) to avoid hydration flash
  - Quick-pick date computation uses setDate(getDate() + N) — DST-safe because it works with local calendar
  - isQuickPickActive compares daysFromNow(N) at render time; no stored reference date needed because the ISO string is deterministic
patterns_established:
  - Atomic draft-to-inventory promotion: db.transaction() covers both the INSERT and the status UPDATE
  - Integer-to-boolean coercion at the store read boundary (not in the query or in the UI)
  - Empty state rendered inline in the same card — no separate component needed
  - Phase state machine (idle → promoting → done | error) for the promotion flow
  - Per-item expiry state keyed by draft.id, initialized lazily via useState initializer
observability_surfaces:
  - console.log("[inventory] Promoted N items to inventory for fridge <id>") on success
  - console.error("[inventory] promoteToInventoryAction failed for fridge <id>: <message>") on failure
  - sqlite3 data/fridges.db "SELECT * FROM inventory_items;" — inventory ground truth
  - sqlite3 data/fridges.db "SELECT id, status FROM intake_drafts;" — draft status transitions
  - Browser: "✓ N items added to inventory" success banner visible before router.refresh() clears the pending list
drill_down_paths:
  - .gsd/milestones/M001/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S03/tasks/T02-SUMMARY.md
duration: ~30 min total (T01: ~10m, T02: ~20m)
verification_result: passed
completed_at: 2026-03-21
---

# S03: Inventory truth and expiry model

**Confirmed draft items are atomically promoted into a persistent item-level inventory with explicit or estimated expiry dates, visible and queryable in both the browser and the database.**

## What Happened

S03 was delivered in two tasks that built from the data layer up to the UI.

**T01** laid the data foundation: the `inventory_items` table was added to the inline migration in `lib/db/client.ts`, with 13 columns including nullable `expiry_date`, integer `expiry_estimated` (0/1), a CHECK-constrained `status` field (`active`/`used`/`discarded`), and a nullable `draft_id` FK back to `intake_drafts`. Three synchronous store functions were written in `lib/inventory/store.ts` following the existing `lib/intake/store.ts` pattern: `listPendingDrafts` queries `intake_drafts WHERE status='pending'`, `promoteToInventory` runs a single `db.transaction()` that inserts each item into `inventory_items` and updates the source draft to `status='confirmed'`, and `listInventoryItems` fetches active items while coercing the 0/1 `expiry_estimated` column to a boolean at the read boundary. `promoteToInventoryAction` was appended to the fridge's `actions.ts`, matching the shape of the existing `confirmDraftAction` — try/catch, structured return, and `[inventory]` console signals.

**T02** delivered the user-facing flow: `InventorySection.tsx` is a `"use client"` component that accepts `fridgeId`, `pendingDrafts`, and `inventoryItems` from its RSC parent. It implements a 3-state phase machine (`idle → promoting → done | error`). Each pending draft item renders in a card with a native date input and four quick-pick buttons (3d / 7d / 14d / 30d). Quick-pick computes the date with `setDate(getDate() + N)` (DST-safe), sets `expiry_estimated: true`, and highlights the active button with a cold-blue pill border. An explicit date clears the quick-pick highlight and sets `expiry_estimated: false`. Blank expiry is valid and results in a null `expiry_date`. The Promote button assembles `InventoryItemInput[]` and calls `promoteToInventoryAction`; on success it shows the "✓ N items added to inventory" banner and calls `router.refresh()` wrapped in `useTransition`. The inventory list below each item shows name, quantity+unit, the expiry date with an amber **est.** badge for estimated entries, and muted "no expiry" text for nulls. Empty states are handled inline: no pending and no inventory → muted empty card; only one side populated → that section only. `page.tsx` was updated to import both store functions and `InventorySection`, call them synchronously in the Found branch, and render `<InventorySection>` immediately after `<IntakeSection>`.

## Verification

All slice-level verification checks passed:

| Check | Result |
|---|---|
| `npx tsc --noEmit` exits 0 | ✅ |
| `.schema inventory_items` shows all 13 columns with correct types/constraints | ✅ |
| `SELECT COUNT(*) FROM inventory_items` = 2 after browser promotion flow | ✅ |
| `SELECT COUNT(*) FROM inventory_items WHERE expiry_estimated = 1` = 1 (quick-pick row) | ✅ |
| `SELECT COUNT(*) FROM intake_drafts WHERE status='confirmed'` = 2 | ✅ |
| `SELECT COUNT(*) FROM intake_drafts WHERE status='pending'` = 0 | ✅ |
| Browser empty state renders without error | ✅ |
| Browser: pending items with expiry inputs render after draft confirm | ✅ |
| Browser: 7d quick-pick fills 2026-03-28, highlights button | ✅ |
| Browser: promote → "✓ 2 items added to inventory" → inventory list with est. badge | ✅ |
| `[inventory] Promoted 2 items...` in server log | ✅ |

## New Requirements Surfaced

None.

## Deviations

The task plan mentioned `UPDATE intake_drafts SET status = 'confirmed', updated_at = datetime('now')` — but `intake_drafts` has no `updated_at` column. The implementation correctly omits it; only `status` is updated. This was noted in the plan as a known discrepancy and handled without incident.

`useTransition` was added to wrap `router.refresh()` — not in the original plan but harmless: it marks the refresh as a non-urgent background transition and prevents the success banner from being interrupted.

## Known Limitations

- `expiryData` per-item state is initialized from the `pendingDrafts` prop via a `useState` initializer. If the RSC refetches and passes new `pendingDrafts` (e.g. after a partial failure), the component will not re-initialize state for items that weren't there before — the user would need to refresh. This is acceptable for S03; a more robust solution would track state via a key or external store, which is deferred.
- The inventory list currently shows all active items newest-first with no filtering, search, or grouping. Visual density may become an issue once real household inventory grows. This is S05's concern.
- Quick-pick day values are hardcoded (3 / 7 / 14 / 30). Food type-specific defaults (e.g. 2d for meat) are deferred.

## Follow-ups

- S04 will need `UPDATE` and `DELETE`/`status-flip` operations on `inventory_items`. The `status` CHECK constraint (`active`/`used`/`discarded`) is already in place; S04 should add store functions for those transitions rather than new columns.
- S05 reads `expiry_date` and `expiry_estimated` for highlighting. The `listInventoryItems` query returns all active items — S05 may want a filtered or sorted variant (by expiry date ASC, NULLs last) to drive urgency ordering without a second query.
- The amber **est.** badge is only visible in the inventory list. S05 should use the same `expiry_estimated` boolean to drive different urgency signals (e.g. estimated-expiry items treated with lower confidence in alert thresholds).

## Files Created/Modified

- `lib/db/client.ts` — modified: `inventory_items` CREATE TABLE migration appended after `intake_drafts`
- `lib/inventory/types.ts` — new: `InventoryItem` and `InventoryItemInput` interfaces
- `lib/inventory/store.ts` — new: `listPendingDrafts`, `promoteToInventory`, `listInventoryItems` store functions
- `app/fridges/[fridgeId]/actions.ts` — modified: `promoteToInventoryAction` Server Action added
- `app/fridges/[fridgeId]/InventorySection.tsx` — new: client component with per-item expiry inputs and inventory list
- `app/fridges/[fridgeId]/page.tsx` — modified: imports and renders `InventorySection` with RSC-fetched props

## Forward Intelligence

### What the next slice should know

- The `inventory_items` table `status` column already accepts `'used'` and `'discarded'` values via CHECK constraint. S04's store functions should flip `status` rather than DELETE rows — this preserves history and is what the existing schema expects.
- `promoteToInventory` is all-or-nothing via `db.transaction()`. If S04 needs partial updates (e.g. mark one item used), it should use a separate single-row update function, not a variant of `promoteToInventory`.
- `listInventoryItems` filters `WHERE status = 'active'`. Once S04 adds discard/use flows, old items will naturally disappear from this query without any extra logic.
- `expiryData` in `InventorySection` is initialized from props via `useState` initializer. After `router.refresh()`, Next.js will pass new `inventoryItems` but the component re-mounts because RSC invalidation triggers a full re-render — this is fine and expected.
- The `[inventory]` log prefix is established as the observability namespace for this module. S04 and S05 store functions should use `[inventory]` for consistency.

### What's fragile

- `listPendingDrafts` joins nothing — it relies on `fridge_id` being set correctly in `intake_drafts` at confirm time (S02). If a draft row somehow has the wrong `fridge_id`, it would appear as a pending item in the wrong fridge's `InventorySection`. This is inherent to the design and requires no fix now.
- `router.refresh()` after promotion causes a full RSC re-fetch. In the dev server this takes ~200–400ms. On slow hardware or under load this may feel laggy. The success banner is shown before the refresh begins, which mitigates perceived latency.

### Authoritative diagnostics

- `sqlite3 data/fridges.db "SELECT name, expiry_date, expiry_estimated, status FROM inventory_items;"` — ground truth for what's in inventory and how expiry was set
- `sqlite3 data/fridges.db "SELECT id, name, status FROM intake_drafts;"` — confirms which drafts were promoted (status='confirmed') vs still pending
- Server log `[inventory]` lines — confirm promotion succeeded or failed at the server layer independent of browser state
- `npx tsc --noEmit` — catches type regressions before they reach the browser

### What assumptions changed

- No significant assumption changes. The `intake_drafts` missing `updated_at` discrepancy was anticipated in the plan and the implementation correctly handled it.
