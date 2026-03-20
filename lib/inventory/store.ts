/**
 * lib/inventory/store.ts
 * Persistence layer for inventory_items and intake_drafts promotion.
 * All functions are synchronous (better-sqlite3 is sync-only).
 */

import { nanoid } from "nanoid";
import { getDb } from "@/lib/db/client";
import type { DraftItem } from "@/lib/intake/types";
import type { InventoryItem, InventoryItemInput } from "./types";

/**
 * Return all pending (unconfirmed) draft items for a fridge, ordered
 * oldest-first so the UI renders them in intake order.
 */
export function listPendingDrafts(fridgeId: string): DraftItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, quantity, unit, confidence
       FROM intake_drafts
       WHERE fridge_id = ? AND status = 'pending'
       ORDER BY created_at ASC`
    )
    .all(fridgeId) as Array<{
    id: string;
    name: string;
    quantity: string;
    unit: string;
    confidence: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    confidence: row.confidence as "high" | "low",
  }));
}

/**
 * Atomically insert inventory_items rows and mark the source drafts as
 * 'confirmed'. Runs inside a single db.transaction() — all inserts and
 * status updates succeed together or roll back together.
 *
 * @throws if items array is empty
 */
export function promoteToInventory(
  fridgeId: string,
  items: InventoryItemInput[]
): void {
  if (items.length === 0) {
    throw new Error("No items to promote");
  }

  const db = getDb();

  const insertItem = db.prepare(
    `INSERT INTO inventory_items
       (id, fridge_id, draft_id, name, quantity, unit, confidence,
        expiry_date, expiry_estimated, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`
  );

  const confirmDraft = db.prepare(
    `UPDATE intake_drafts
     SET status = 'confirmed'
     WHERE id = ? AND status = 'pending'`
  );

  const runAll = db.transaction((inputItems: InventoryItemInput[]) => {
    for (const item of inputItems) {
      insertItem.run(
        nanoid(10),
        fridgeId,
        item.draft_id,
        item.name,
        item.quantity,
        item.unit,
        item.confidence,
        item.expiry_date,
        item.expiry_estimated ? 1 : 0
      );
      confirmDraft.run(item.draft_id);
    }
  });

  runAll(items);
}

/**
 * Return all active inventory items for a fridge, newest-first.
 * Converts expiry_estimated from SQLite INTEGER (0/1) to boolean.
 */
export function listInventoryItems(fridgeId: string): InventoryItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, fridge_id, draft_id, name, quantity, unit, confidence,
              expiry_date, expiry_estimated, status, added_at, updated_at
       FROM inventory_items
       WHERE fridge_id = ? AND status = 'active'
       ORDER BY added_at DESC`
    )
    .all(fridgeId) as Array<Omit<InventoryItem, "expiry_estimated"> & { expiry_estimated: number }>;

  return rows.map((row) => ({
    ...row,
    expiry_estimated: row.expiry_estimated !== 0,
  }));
}
