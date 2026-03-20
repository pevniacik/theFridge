/**
 * lib/fridges/store.ts
 * Fridge/freezer identity CRUD — creation and lookup.
 * Uses the singleton SQLite connection from lib/db/client.ts.
 * All functions are synchronous (better-sqlite3 is sync-only).
 */

import { nanoid } from "nanoid";
import { getDb } from "@/lib/db/client";

export type StorageType = "fridge" | "freezer";

export interface FridgeRecord {
  id: string;
  name: string;
  type: StorageType;
  created_at: string;
}

export interface CreateFridgeInput {
  name: string;
  type: StorageType;
}

/**
 * Create a new fridge/freezer record with a stable nanoid.
 * Returns the full record on success, throws on DB error.
 */
export function createFridge(input: CreateFridgeInput): FridgeRecord {
  const db = getDb();
  const id = nanoid(10); // e.g. "V1StGXR8_Z"

  const stmt = db.prepare(
    "INSERT INTO fridges (id, name, type) VALUES (?, ?, ?)"
  );
  stmt.run(id, input.name.trim(), input.type);

  const record = db
    .prepare("SELECT * FROM fridges WHERE id = ?")
    .get(id) as FridgeRecord;

  return record;
}

/**
 * Look up a single fridge/freezer by ID.
 * Returns null when the ID does not exist.
 */
export function getFridgeById(id: string): FridgeRecord | null {
  const db = getDb();
  const record = db
    .prepare("SELECT * FROM fridges WHERE id = ?")
    .get(id) as FridgeRecord | undefined;
  return record ?? null;
}

/**
 * Return all fridge/freezer records, newest first.
 */
export function listFridges(): FridgeRecord[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM fridges ORDER BY created_at DESC")
    .all() as FridgeRecord[];
}
