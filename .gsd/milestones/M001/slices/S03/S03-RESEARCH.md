# S03: Inventory truth and expiry model — Research

**Date:** 2026-03-21

## Summary

S03 is straightforward CRUD wiring on top of an already-solid S02 foundation. The slice needs to (1) add a persistent `inventory_items` table, (2) build a promotion flow that reads `intake_drafts WHERE status='pending'`, writes rows to the inventory table, and flips draft status to `'confirmed'`, and (3) expose the current inventory for a fridge/freezer as a query. The key new data concern is expiry: items need both an `expiry_date` field (explicit, from the package) and an `estimated_expiry_date` field with an `expiry_estimated` boolean flag (user-supplied when no printed date exists). The confirmation UI is a new "promote drafts to inventory" surface that lets the user set expiry per item before committing.

The codebase is already well-patterned. `lib/fridges/store.ts` and `lib/intake/store.ts` show the exact module structure to replicate in `lib/inventory/`. The `getDb()` singleton in `lib/db/client.ts` accumulates inline migrations idempotently — S03 adds one more `CREATE TABLE IF NOT EXISTS` block there. The Server Action pattern in `app/fridges/[fridgeId]/actions.ts`, the phase-state-machine client component pattern from `IntakeSection.tsx`, and the inline style design token pattern are all established and should be followed without deviation.

The one non-trivial design decision is the expiry UX: how to let users quickly assign an expiry date or a days-until-expiry estimate per item without making the flow feel like a data-entry form. The recommendation is a small inline date input per item (defaulting to blank) with an optional "days from today" shortcut (a small set of quick-pick buttons: 3d, 5d, 7d, 14d, 30d). When the user picks a quick value, it fills the date field; the system sets `expiry_estimated = true`. When the user types an explicit date, `expiry_estimated = false`. Leaving the field blank is valid — the item is added without any expiry signal. This keeps the fast path fast while satisfying R006.

## Recommendation

**One task, two subtasks — or two tasks cleanly split at the DB/data layer vs. UI layer:**

- **T01:** Add the `inventory_items` table migration, create `lib/inventory/types.ts` + `lib/inventory/store.ts` (query, promote, list functions), and write the `promoteToInventoryAction` Server Action in `app/fridges/[fridgeId]/actions.ts`.
- **T02:** Add the `InventorySection` client component (pending-drafts list → set expiry per item → promote → persisted inventory view) and wire it into `app/fridges/[fridgeId]/page.tsx`.

The data layer (T01) is independently testable via curl/sqlite and should be proved first. The UI (T02) depends only on the data layer — no other blockers.

## Implementation Landscape

### Key Files

- `lib/db/client.ts` — **add** `inventory_items` CREATE TABLE migration (inline, idempotent, after the `intake_drafts` block)
- `lib/intake/types.ts` — **read-only reference** for `DraftItem`; S03 inventory type should extend or map from it
- `lib/intake/store.ts` — **read** to understand how `saveDraftItems` works; S03's `promoteToInventory` will run in one transaction that reads pending drafts and inserts inventory rows
- `lib/inventory/types.ts` — **new**: `InventoryItem` interface
- `lib/inventory/store.ts` — **new**: `promoteToInventory`, `listInventoryItems`, possibly `getInventoryItem`
- `app/fridges/[fridgeId]/actions.ts` — **extend**: add `promoteToInventoryAction` Server Action
- `app/fridges/[fridgeId]/InventorySection.tsx` — **new**: client component; shows pending drafts + expiry inputs, then shows current inventory
- `app/fridges/[fridgeId]/page.tsx` — **modify**: import and render `InventorySection` below `IntakeSection`

### Build Order

1. **`lib/db/client.ts`** — add the `inventory_items` migration first. Everything else depends on the table existing.
2. **`lib/inventory/types.ts`** — define `InventoryItem` interface. Needed by store and actions.
3. **`lib/inventory/store.ts`** — implement `listPendingDrafts`, `promoteToInventory` (transaction), `listInventoryItems`. Testable immediately with `sqlite3` and direct function calls.
4. **`app/fridges/[fridgeId]/actions.ts`** — add `promoteToInventoryAction`. Returns `{ success, count }` or `{ success: false, error }`. Follows existing pattern.
5. **`InventorySection.tsx`** — build after the data layer is confirmed working. Wire into page last.

### Verification Approach

- `npx tsc --noEmit` exits 0 after each task
- `sqlite3 data/fridges.db ".schema inventory_items"` shows expected columns
- After running `confirmDraftAction` (via existing UI), `sqlite3 ... "SELECT * FROM intake_drafts WHERE status='pending'"` returns rows
- Calling `promoteToInventoryAction` (via browser or direct server action test) → `sqlite3 ... "SELECT * FROM inventory_items"` shows rows with expiry data; `intake_drafts` rows show `status='confirmed'`
- Browser: upload photo → confirm draft → see pending items in InventorySection → set expiry on one → promote → "N items added to inventory" → inventory list renders below

### Schema Design

```sql
CREATE TABLE IF NOT EXISTS inventory_items (
  id              TEXT PRIMARY KEY,
  fridge_id       TEXT NOT NULL REFERENCES fridges(id),
  draft_id        TEXT REFERENCES intake_drafts(id),   -- nullable: allows manual adds in S04
  name            TEXT NOT NULL,
  quantity        TEXT NOT NULL DEFAULT '',
  unit            TEXT NOT NULL DEFAULT '',
  confidence      TEXT NOT NULL DEFAULT 'high',
  expiry_date     TEXT,                                 -- ISO date string or null
  expiry_estimated INTEGER NOT NULL DEFAULT 0,          -- 1 = user-estimated, 0 = explicit/none
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'used', 'discarded')),
  added_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Key design choices:
- `draft_id` is nullable with a FK to `intake_drafts` — allows future manual-add flows without drafts
- `expiry_date` stored as ISO `YYYY-MM-DD` TEXT (SQLite has no native DATE type; TEXT comparison works for ordering/filtering)
- `expiry_estimated` as INTEGER (SQLite boolean) — 1 means the user typed "7 days" rather than a printed date
- `status` check constraint anchors S04's update/discard flows — S03 writes only `'active'` rows; S04 transitions to `'used'` or `'discarded'`
- `updated_at` is a manual column (not a trigger) — updated explicitly in the store on any mutation

### InventoryItem TypeScript Interface

```ts
export interface InventoryItem {
  id: string;
  fridge_id: string;
  draft_id: string | null;
  name: string;
  quantity: string;
  unit: string;
  confidence: "high" | "low";
  expiry_date: string | null;       // ISO "YYYY-MM-DD" or null
  expiry_estimated: boolean;
  status: "active" | "used" | "discarded";
  added_at: string;
  updated_at: string;
}
```

### Store Functions

```ts
// Read pending drafts for a fridge (input feed for S03 promotion UI)
listPendingDrafts(fridgeId: string): DraftItem[]

// Atomic promotion: insert inventory rows + flip draft status to 'confirmed'
promoteToInventory(fridgeId: string, items: InventoryItemInput[]): void
// InventoryItemInput = InventoryItem without id/added_at/updated_at, with draft_id

// Read active inventory for a fridge (for the inventory list UI and S04/S05)
listInventoryItems(fridgeId: string): InventoryItem[]
```

`promoteToInventory` should run as a single `db.transaction()`: loop inserts + UPDATE intake_drafts SET status='confirmed' WHERE id=? for each draft_id. Atomic — either all succeed or none.

### InventorySection Component Phases

Follow the same Phase enum pattern from `IntakeSection.tsx`:

```ts
type Phase = "idle" | "loading" | "promoting" | "done" | "error";
```

- **idle/loading**: RSC pre-renders the pending draft count. `InventorySection` is a client component, so it fetches or receives `pendingDrafts` as a prop from the RSC page. The page passes `pendingDrafts` (from `listPendingDrafts`) and `inventoryItems` (from `listInventoryItems`) as props — no client-side fetch needed for initial render.
- **promote UI**: show pending drafts as a grid with name (read-only), qty/unit (read-only), and expiry input per item. Quick-pick day buttons (3d / 7d / 14d / 30d) compute `new Date(+days).toISODate()` and mark `expiry_estimated = true`. Free-form date input for explicit dates marks `expiry_estimated = false`.
- **promoting**: spinner while calling `promoteToInventoryAction`
- **done**: show "N items added to inventory" + inventory list renders inline; pending drafts section collapses

Since the page is a Server Component, after promotion the client should trigger a route refresh (`router.refresh()` from `useRouter`) to pick up the updated `pendingDrafts` and `inventoryItems` props from the server rather than managing inventory state client-side. This keeps the inventory list always in sync with the DB and avoids duplicating server-state in the client.

### Page Integration

`page.tsx` becomes:

```tsx
const pendingDrafts = listPendingDrafts(fridge.id);
const inventoryItems = listInventoryItems(fridge.id);

// ...

<IntakeSection fridgeId={fridge.id} />
<InventorySection
  fridgeId={fridge.id}
  pendingDrafts={pendingDrafts}
  inventoryItems={inventoryItems}
/>
```

The RSC reads both lists synchronously (better-sqlite3) and passes them as props. `InventorySection` is a `"use client"` component that receives the initial server-rendered data and uses `router.refresh()` after mutations to get fresh props.

## Constraints

- `better-sqlite3` is synchronous — all store functions must be synchronous; no async/await in store layer
- `intake_drafts` has `status CHECK ('pending','confirmed','rejected')` — S03 promotion must set `status='confirmed'`, not any other value
- `foreign_keys = ON` is set on the DB — `inventory_items.draft_id` must reference a real `intake_drafts.id` or be NULL
- Next.js 15 route params are async (`await params`) — already handled in `page.tsx`, no change needed
- Inline `style={{}}` with `var(--color-*)` tokens is the established pattern — `InventorySection` must follow this, not use Tailwind utility classes
- `router.refresh()` requires the component to be wrapped in a router context — it works automatically in Next.js App Router since the page is wrapped by `<html>` in `layout.tsx`

## Common Pitfalls

- **Treating `expiry_date` as a JS Date object** — store and return as ISO `YYYY-MM-DD` TEXT strings only; only parse to `Date` in the UI when computing urgency signals for display. SQLite TEXT date comparison (`<`, `>`) works correctly on ISO format.
- **Forgetting `router.refresh()` after promotion** — without it, `pendingDrafts` and `inventoryItems` props from the RSC stay stale; the UI will show old data until a manual page reload. Call `router.refresh()` inside the `promoteToInventoryAction` success branch in the client component.
- **Quick-pick day calculation off-by-one** — use `new Date(); date.setDate(date.getDate() + N); date.toISOString().split('T')[0]` rather than `Date.now() + N * 86400000` to avoid DST edge cases.
- **Promoting the same draft twice** — `promoteToInventory` should filter out drafts that are already `status='confirmed'` or skip if `listPendingDrafts` returns empty; the transaction already guards this via the `WHERE status='pending'` query, but the action should return a clear error if called with an empty list rather than inserting zero rows silently.
- **`InventorySection` mounted before any confirmed drafts exist** — the component should render gracefully with `pendingDrafts.length === 0` and `inventoryItems.length === 0` — show a muted "No items yet" state, not an error.
