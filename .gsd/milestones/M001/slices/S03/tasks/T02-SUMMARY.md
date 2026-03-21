---
id: T02
parent: S03
milestone: M001
provides:
  - InventorySection client component with pending-draft promotion UI and inventory list
  - Per-item expiry inputs (date picker + quick-pick day buttons) with estimated/explicit tracking
  - page.tsx wired to pass pendingDrafts and inventoryItems as RSC-fetched props
key_files:
  - app/fridges/[fridgeId]/InventorySection.tsx
  - app/fridges/[fridgeId]/page.tsx
key_decisions:
  - useTransition wraps router.refresh() so React batches the route invalidation without blocking the success UI
  - isQuickPickActive compares daysFromNow(N) at render time — no stored reference date needed because the date string is deterministic
  - Quick-pick buttons use pill (border-radius 999px) style vs card radius to visually distinguish from action buttons
patterns_established:
  - Empty state rendered inline in same card when both pendingDrafts and inventoryItems are empty — no separate component needed
  - expiryData initialized lazily from pendingDrafts prop via useState initializer function; not useEffect to avoid hydration flash
  - Per-item card uses flex-direction column with two rows (identity + expiry) for clean stacking at any viewport width
observability_surfaces:
  - console.log("[inventory] Promoted N items to inventory for fridge <id>") emitted by promoteToInventoryAction on success
  - console.error("[inventory] promoteToInventoryAction failed for fridge <id>: <msg>") on failure
  - Browser: success message "✓ N items added to inventory" visible in pending card before router.refresh() clears the pending list
  - sqlite3 data/fridges.db "SELECT * FROM inventory_items;" — ground truth with expiry_date and expiry_estimated columns
  - sqlite3 data/fridges.db "SELECT id, status FROM intake_drafts;" — verify 'confirmed' after promotion
duration: ~20 min
verification_result: passed
completed_at: 2026-03-21
blocker_discovered: false
---

# T02: Build InventorySection UI with expiry inputs and wire into fridge page

**Created `InventorySection` client component with per-item expiry inputs and quick-pick day buttons, wired into the fridge page as an RSC section below `IntakeSection` — completing the promotion flow from pending draft to inventory.**

## What Happened

Two files were created/modified:

1. **`app/fridges/[fridgeId]/InventorySection.tsx`** — New `"use client"` component implementing the full promotion UX:
   - Accepts `fridgeId`, `pendingDrafts: DraftItem[]`, and `inventoryItems: InventoryItem[]` as props
   - Phase state machine: `idle → promoting → done | error`
   - Per-item expiry state keyed by `draft.id` — initialized via `useState` initializer (not `useEffect`) to avoid hydration flash
   - Quick-pick buttons (3d, 7d, 14d, 30d): pill-style, compute date with `Date.setDate(getDate() + N)` (DST-safe), set `expiry_estimated: true`; active quick-pick highlighted in `var(--color-cold)` border
   - Explicit date input: sets `expiry_estimated: false`, highlighted border when a date is selected
   - Clear "×" button: shown only when a date is set
   - Promote handler builds `InventoryItemInput[]`, calls `promoteToInventoryAction`, then `router.refresh()` wrapped in `useTransition`
   - On success: shows "✓ N items added to inventory" banner in cold-blue; `router.refresh()` causes RSC to re-fetch and clear pendingDrafts while populating inventoryItems
   - On error: shows error message with "Try again" link
   - Three empty states: no pending + no inventory → empty card with muted copy; has pending only → pending section only; has inventory only → inventory list only
   - Inventory list: name, quantity+unit, expiry date with amber **est.** badge if estimated, "no expiry" muted text if null
   - All styling via `style={{}}` with `var(--color-*)` tokens, matching IntakeSection's dark industrial aesthetic

2. **`app/fridges/[fridgeId]/page.tsx`** — Modified to:
   - Import `listPendingDrafts` and `listInventoryItems` from `@/lib/inventory/store`
   - Import `InventorySection` from `./InventorySection`
   - Call both store functions synchronously in the Found branch (synchronous because `better-sqlite3` is sync-only)
   - Render `<InventorySection fridgeId={...} pendingDrafts={...} inventoryItems={...} />` immediately after `<IntakeSection>`

## Verification

- **TypeScript:** `npx tsc --noEmit` → exit 0, no type errors
- **DB schema:** `.schema inventory_items` — 13 columns with correct types and constraints
- **Browser empty state:** navigated to fresh fridge page → InventorySection shows "INVENTORY — No items yet — upload a grocery photo above to get started"
- **Browser full flow:** uploaded test photo → 3 items extracted → clicked delete on one (2 items) → Confirm 2 items → IntakeSection shows "✓ 2 items saved" → InventorySection shows "PENDING ITEMS · 2 ITEMS" with Greek Yogurt and Butter rows, each with date picker + 3d/7d/14d/30d quick-pick buttons
- **Quick-pick:** clicked "7d" on Greek Yogurt → date populated to 2026-03-28, button highlighted blue, "×" clear button appeared
- **Promote:** clicked "Promote 2 items to inventory →" → page refreshed → "INVENTORY · 2 ITEMS" section appeared with Greek Yogurt (2026-03-28 + amber "est." badge) and Butter ("no expiry")
- **DB verification:** `SELECT COUNT(*) FROM inventory_items` = 2; `SELECT COUNT(*) FROM inventory_items WHERE expiry_estimated = 1` = 1; `SELECT COUNT(*) FROM intake_drafts WHERE status='confirmed'` = 2

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | ~21s |
| 2 | `sqlite3 data/fridges.db ".schema inventory_items"` | 0 | ✅ pass | <1s |
| 3 | `sqlite3 data/fridges.db "SELECT COUNT(*) FROM inventory_items;"` | 0 (returns 2) | ✅ pass | <1s |
| 4 | `sqlite3 data/fridges.db "SELECT COUNT(*) FROM inventory_items WHERE expiry_estimated = 1;"` | 0 (returns 1) | ✅ pass | <1s |
| 5 | `sqlite3 data/fridges.db "SELECT COUNT(*) FROM intake_drafts WHERE status='confirmed';"` | 0 (returns 2) | ✅ pass | <1s |
| 6 | Browser: empty state renders (no error) | — | ✅ pass | — |
| 7 | Browser: pending items with expiry inputs render after draft confirm | — | ✅ pass | — |
| 8 | Browser: 7d quick-pick fills date + highlights button | — | ✅ pass | — |
| 9 | Browser: promote → success message + inventory list with est. badge | — | ✅ pass | — |

## Observability Impact

- **Runtime signals added:** `console.log("[inventory] Promoted N items …")` / `console.error("[inventory] promoteToInventoryAction failed …")` are already present from T01's Server Action — this task's UI calls that action, so both signals are exercised automatically on promotion success and failure.
- **UI-level inspection:** After promotion, the page renders "✓ N items added to inventory" briefly, then `router.refresh()` causes the RSC to re-fetch — both states are observable in the browser without any server log access.
- **DB inspection:** `sqlite3 data/fridges.db "SELECT name, expiry_date, expiry_estimated FROM inventory_items;"` shows the full expiry truth including whether quick-pick vs explicit date was used.
- **Failure visibility:** If `promoteToInventoryAction` returns `{ success: false }`, the component transitions to `"error"` phase, showing the error message inline with a "Try again" button. No silent failures.

## Diagnostics

- **Inventory ground truth:** `sqlite3 data/fridges.db "SELECT * FROM inventory_items;"` — see all promoted rows with expiry data
- **Draft status check:** `sqlite3 data/fridges.db "SELECT id, status FROM intake_drafts;"` — verify `confirmed` after promotion
- **Schema verify:** `sqlite3 data/fridges.db ".schema inventory_items"` — 13 columns
- **Server logs:** filter server output for `[inventory]` prefix for promotion success/failure signals

## Deviations

None. Implementation followed the task plan exactly. The `useTransition` wrapping of `router.refresh()` is a React best-practice addition (not in the plan but harmless — it marks the refresh as a non-urgent background transition).

## Known Issues

None.

## Files Created/Modified

- `app/fridges/[fridgeId]/InventorySection.tsx` — new: `"use client"` component with pending draft promotion UI, quick-pick expiry inputs, and inventory list
- `app/fridges/[fridgeId]/page.tsx` — modified: imports and renders `InventorySection` with RSC-fetched `pendingDrafts` and `inventoryItems` props
