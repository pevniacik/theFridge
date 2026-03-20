---
estimated_steps: 5
estimated_files: 4
---

# T01: Add inventory data layer with expiry schema and promotion logic

**Slice:** S03 — Inventory truth and expiry model
**Milestone:** M001

## Description

Create the persistent inventory model with expiry support and the atomic draft-to-inventory promotion logic. This task adds the `inventory_items` SQLite table, defines the TypeScript interfaces, implements three store functions (`listPendingDrafts`, `promoteToInventory`, `listInventoryItems`), and adds the `promoteToInventoryAction` Server Action. Everything follows the established patterns from `lib/fridges/` and `lib/intake/`.

**Relevant skills:** None needed — this is straightforward DB/store/action work following existing patterns.

## Steps

1. **Add `inventory_items` migration to `lib/db/client.ts`.**
   Append a new `db.exec(...)` block after the `intake_drafts` migration. Schema:
   ```sql
   CREATE TABLE IF NOT EXISTS inventory_items (
     id              TEXT PRIMARY KEY,
     fridge_id       TEXT NOT NULL REFERENCES fridges(id),
     draft_id        TEXT REFERENCES intake_drafts(id),
     name            TEXT NOT NULL,
     quantity        TEXT NOT NULL DEFAULT '',
     unit            TEXT NOT NULL DEFAULT '',
     confidence      TEXT NOT NULL DEFAULT 'high',
     expiry_date     TEXT,
     expiry_estimated INTEGER NOT NULL DEFAULT 0,
     status          TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'used', 'discarded')),
     added_at        TEXT NOT NULL DEFAULT (datetime('now')),
     updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
   );
   ```
   Key: `draft_id` is nullable (allows manual adds in S04), `expiry_date` is ISO `YYYY-MM-DD` TEXT or null, `expiry_estimated` is 0/1 INTEGER (SQLite boolean), `status` check constraint anchors S04's flows.

2. **Create `lib/inventory/types.ts`.**
   Define two interfaces:
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

   export interface InventoryItemInput {
     draft_id: string;
     name: string;
     quantity: string;
     unit: string;
     confidence: "high" | "low";
     expiry_date: string | null;
     expiry_estimated: boolean;
   }
   ```

3. **Create `lib/inventory/store.ts`.**
   Import `getDb` from `@/lib/db/client`. Implement three synchronous functions:

   - **`listPendingDrafts(fridgeId: string)`**: Query `SELECT * FROM intake_drafts WHERE fridge_id = ? AND status = 'pending' ORDER BY created_at ASC`. Return as `DraftItem[]` (import from `@/lib/intake/types`). Note: the DB rows have more columns than `DraftItem` — map to the interface fields.

   - **`promoteToInventory(fridgeId: string, items: InventoryItemInput[])`**: Run inside `db.transaction()`. For each item: INSERT into `inventory_items` with `nanoid(10)` as id, the fridgeId, and all input fields. Then UPDATE `intake_drafts SET status = 'confirmed', updated_at = datetime('now')` WHERE `id = item.draft_id AND status = 'pending'`. Note: `intake_drafts` doesn't have an `updated_at` column — just update `status`. Return `void`. If items array is empty, throw an error "No items to promote".

   - **`listInventoryItems(fridgeId: string)`**: Query `SELECT * FROM inventory_items WHERE fridge_id = ? AND status = 'active' ORDER BY added_at DESC`. Map `expiry_estimated` from INTEGER (0/1) to boolean. Return as `InventoryItem[]`.

   **Important:** `intake_drafts` table does NOT have an `updated_at` column — only update `status` in the UPDATE statement. The DB rows store `expiry_estimated` as 0/1 — convert to boolean in the return.

4. **Add `promoteToInventoryAction` to `app/fridges/[fridgeId]/actions.ts`.**
   Follow the exact same pattern as `confirmDraftAction`: async function, try/catch, return `{ success: true, count: N }` or `{ success: false, error: "..." }`. Import `promoteToInventory` from `@/lib/inventory/store`. Log `[inventory] Promoted N items to inventory for fridge <fridgeId>` on success and `[inventory] promoteToInventoryAction failed for fridge <fridgeId>: <message>` on error.

   The action receives `fridgeId: string` and `items: InventoryItemInput[]` (imported from `@/lib/inventory/types`).

5. **Verify the data layer.**
   Run `npx tsc --noEmit` — must exit 0. Delete `data/fridges.db` if it exists so the migration runs fresh, then start the dev server briefly or import `getDb` in a Node script to trigger table creation. Run `sqlite3 data/fridges.db ".schema inventory_items"` and confirm all columns are present.

## Must-Haves

- [ ] `inventory_items` table migration is idempotent (`CREATE TABLE IF NOT EXISTS`) and added after `intake_drafts` in `getDb()`
- [ ] `InventoryItem` interface includes `expiry_date` (string | null), `expiry_estimated` (boolean), and `status` ("active" | "used" | "discarded")
- [ ] `promoteToInventory` runs atomically in a single `db.transaction()` — inserts inventory rows AND updates draft statuses
- [ ] `promoteToInventory` converts `expiry_estimated` boolean to 0/1 for SQLite storage
- [ ] `listInventoryItems` converts `expiry_estimated` from 0/1 INTEGER back to boolean
- [ ] `promoteToInventoryAction` returns structured `{ success, count, error? }` — never throws across RSC boundary
- [ ] `listPendingDrafts` returns only `status='pending'` rows

## Verification

- `npx tsc --noEmit` exits 0
- `sqlite3 data/fridges.db ".schema inventory_items"` shows all expected columns (id, fridge_id, draft_id, name, quantity, unit, confidence, expiry_date, expiry_estimated, status, added_at, updated_at)
- `test -f lib/inventory/types.ts && test -f lib/inventory/store.ts` both pass
- `grep -q "promoteToInventoryAction" app/fridges/\[fridgeId\]/actions.ts` passes

## Observability Impact

- Signals added: `console.log("[inventory] Promoted N items ...")` on success; `console.error("[inventory] promoteToInventoryAction failed ...")` on failure
- How a future agent inspects this: `sqlite3 data/fridges.db "SELECT * FROM inventory_items;"` for inventory ground truth; `sqlite3 data/fridges.db "SELECT id, status FROM intake_drafts;"` for draft status transitions
- Failure state exposed: Server Action returns `{ success: false, error }` with descriptive message

## Inputs

- `lib/db/client.ts` — existing getDb() singleton where the migration is added
- `lib/intake/types.ts` — DraftItem interface used by listPendingDrafts return type
- `lib/intake/store.ts` — pattern reference for synchronous store functions
- `app/fridges/[fridgeId]/actions.ts` — existing Server Action file to extend with promoteToInventoryAction
- `lib/fridges/store.ts` — pattern reference for module structure

## Expected Output

- `lib/db/client.ts` — modified: inventory_items CREATE TABLE migration added
- `lib/inventory/types.ts` — new: InventoryItem and InventoryItemInput interfaces
- `lib/inventory/store.ts` — new: listPendingDrafts, promoteToInventory, listInventoryItems functions
- `app/fridges/[fridgeId]/actions.ts` — modified: promoteToInventoryAction added
