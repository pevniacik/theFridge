# S03: Inventory truth and expiry model

**Goal:** Confirmed intake drafts become item-level inventory in the selected fridge/freezer with expiry or estimated expiry recorded and persisted.
**Demo:** Upload a grocery photo → confirm draft → see pending items in InventorySection → set expiry on one item (quick-pick "7d" button) → promote all to inventory → "N items added to inventory" message appears → inventory list renders below with expiry dates visible → `sqlite3 data/fridges.db "SELECT * FROM inventory_items"` shows rows with correct expiry data and `intake_drafts` rows show `status='confirmed'`.

## Must-Haves

- `inventory_items` SQLite table with expiry fields (`expiry_date`, `expiry_estimated`) scoped to fridge via FK
- `InventoryItem` TypeScript interface matching the DB schema
- `promoteToInventory` store function that atomically inserts inventory rows and flips `intake_drafts.status` to `'confirmed'`
- `listPendingDrafts` store function returning pending drafts for a fridge
- `listInventoryItems` store function returning active inventory for a fridge
- `promoteToInventoryAction` Server Action callable from the client component
- `InventorySection` client component showing pending drafts with per-item expiry inputs (explicit date + quick-pick day buttons) and current inventory list
- Quick-pick day buttons (3d, 7d, 14d, 30d) set `expiry_estimated = true`; explicit date input sets `expiry_estimated = false`; blank expiry is valid
- `page.tsx` wired to pass `pendingDrafts` and `inventoryItems` as props from RSC to `InventorySection`
- `router.refresh()` after promotion to sync server-rendered props

## Proof Level

- This slice proves: contract + integration (draft-to-inventory promotion flow with expiry data persisted and queryable)
- Real runtime required: yes (browser promotion flow exercises the full data path)
- Human/UAT required: no (expiry UX feel is deferred to later UAT)

## Verification

- `npx tsc --noEmit` exits 0
- `sqlite3 data/fridges.db ".schema inventory_items"` shows `id, fridge_id, draft_id, name, quantity, unit, confidence, expiry_date, expiry_estimated, status, added_at, updated_at` columns
- After running intake flow (upload photo → confirm draft), `sqlite3 data/fridges.db "SELECT COUNT(*) FROM intake_drafts WHERE status='pending'"` returns > 0
- After calling `promoteToInventoryAction` (via browser), `sqlite3 data/fridges.db "SELECT COUNT(*) FROM inventory_items"` returns > 0
- After promotion, `sqlite3 data/fridges.db "SELECT COUNT(*) FROM intake_drafts WHERE status='confirmed'"` returns > 0
- Browser: InventorySection renders pending items with expiry inputs → quick-pick "7d" fills a date → promote → success message → inventory list visible
- Browser: when no pending drafts and no inventory items exist, InventorySection shows a muted empty state (not an error)
- Console log: `[inventory] Promoted N items to inventory for fridge <id>` visible in server output

## Observability / Diagnostics

- Runtime signals: `console.log("[inventory] Promoted N items ...")` on successful promotion; `console.error("[inventory] promoteToInventoryAction failed ...")` on failure
- Inspection surfaces: `sqlite3 data/fridges.db "SELECT * FROM inventory_items;"` for ground truth; `sqlite3 data/fridges.db "SELECT id, status FROM intake_drafts;"` for draft status transitions
- Failure visibility: Server Action returns `{ success: false, error: "..." }` with descriptive message; phase-based UI shows error state
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: `lib/db/client.ts` (getDb singleton, inline migration pattern), `lib/intake/types.ts` (DraftItem interface), `lib/intake/store.ts` (saveDraftItems pattern reference), `app/fridges/[fridgeId]/actions.ts` (Server Action pattern), `app/fridges/[fridgeId]/page.tsx` (RSC rendering pattern), `app/fridges/[fridgeId]/IntakeSection.tsx` (phase enum pattern reference)
- New wiring introduced in this slice: `InventorySection` mounted in `page.tsx` with server-fetched props; `promoteToInventoryAction` in `actions.ts`; `inventory_items` table migration in `getDb()`
- What remains before the milestone is truly usable end-to-end: S04 (update/remove/discard), S05 (status/alerts/suggestions), S06 (QR → end-to-end proof)

## Tasks

- [x] **T01: Add inventory data layer with expiry schema and promotion logic** `est:30m`
  - Why: Establishes the persistent inventory model, expiry fields, and the atomic draft-to-inventory promotion — the data foundation that R005 and R006 depend on. Without this, there's no inventory table and no way to move confirmed drafts into real inventory.
  - Files: `lib/db/client.ts`, `lib/inventory/types.ts`, `lib/inventory/store.ts`, `app/fridges/[fridgeId]/actions.ts`
  - Do: Add `inventory_items` CREATE TABLE migration to `getDb()`. Create `lib/inventory/types.ts` with `InventoryItem` and `InventoryItemInput` interfaces. Create `lib/inventory/store.ts` with `listPendingDrafts`, `promoteToInventory` (transactional: INSERT inventory rows + UPDATE intake_drafts SET status='confirmed'), and `listInventoryItems`. Add `promoteToInventoryAction` Server Action to `actions.ts`. All store functions synchronous. Follow existing module patterns exactly.
  - Verify: `npx tsc --noEmit` exits 0; `sqlite3 data/fridges.db ".schema inventory_items"` shows expected columns
  - Done when: TypeScript compiles clean, inventory_items table exists with all columns including expiry_date and expiry_estimated, and promoteToInventoryAction is exported and callable

- [x] **T02: Build InventorySection UI with expiry inputs and wire into fridge page** `est:45m`
  - Why: Delivers the user-facing promotion flow — pending drafts → set expiry per item → promote → see inventory list. Without this, the data layer exists but users can't interact with it. Closes R005 (item-level inventory visible) and R006 (expiry input UX).
  - Files: `app/fridges/[fridgeId]/InventorySection.tsx`, `app/fridges/[fridgeId]/page.tsx`
  - Do: Create `InventorySection.tsx` as a `"use client"` component with phase state machine (idle/loading/promoting/done/error). Receive `pendingDrafts` and `inventoryItems` as props from RSC. Render pending drafts grid with read-only name/qty/unit, per-item date input, and quick-pick day buttons (3d/7d/14d/30d). Quick-pick computes date and sets `expiry_estimated=true`; explicit date sets `expiry_estimated=false`; blank is valid. Promote button calls `promoteToInventoryAction`, then `router.refresh()`. Show inventory list below. Handle empty states. Wire into `page.tsx` with `listPendingDrafts` and `listInventoryItems` calls. Follow inline `style={{}}` with `var(--color-*)` tokens pattern.
  - Verify: Browser: upload photo → confirm draft → pending items appear in InventorySection → set expiry → promote → inventory list renders; `sqlite3` confirms rows
  - Done when: Full promotion flow works in browser, expiry dates persist correctly, inventory list displays, empty states render gracefully

## Files Likely Touched

- `lib/db/client.ts`
- `lib/inventory/types.ts`
- `lib/inventory/store.ts`
- `app/fridges/[fridgeId]/actions.ts`
- `app/fridges/[fridgeId]/InventorySection.tsx`
- `app/fridges/[fridgeId]/page.tsx`
