/**
 * lib/intake/store.ts
 * Persistence layer for intake_drafts.
 * All functions are synchronous (better-sqlite3 is sync-only).
 */

import { getDb } from "@/lib/db/client";
import { getFridgeById } from "@/lib/fridges/store";
import type { DraftItem } from "./types";

/**
 * Persist a batch of draft items for a fridge.
 *
 * Validates fridge existence first (throws if not found — guards the FK constraint).
 * Runs all inserts inside a single transaction for atomicity.
 */
export function saveDraftItems(fridgeId: string, items: DraftItem[]): void {
  const db = getDb();

  const fridge = getFridgeById(fridgeId);
  if (!fridge) {
    throw new Error(`Fridge not found: ${fridgeId}`);
  }

  const insert = db.prepare(
    "INSERT INTO intake_drafts (id, fridge_id, name, quantity, unit, confidence) VALUES (?, ?, ?, ?, ?, ?)"
  );

  const runAll = db.transaction((draftItems: DraftItem[]) => {
    for (const item of draftItems) {
      insert.run(item.id, fridgeId, item.name, item.quantity, item.unit, item.confidence);
    }
  });

  runAll(items);
}
