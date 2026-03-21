/**
 * lib/db/migrations.ts
 * Idempotent SQLite migration helpers for schema evolution.
 * All functions are synchronous (better-sqlite3 has no async API).
 */

import type Database from "better-sqlite3";

/**
 * Adds a column to a table if it does not already exist.
 * Idempotent: calling twice for the same column is safe (no-op on second call).
 *
 * @param db - better-sqlite3 Database instance
 * @param table - Table name
 * @param column - Column name to add
 * @param definition - Column definition (e.g., "TEXT NOT NULL DEFAULT ''")
 */
export function addColumnIfNotExists(
  db: Database.Database,
  table: string,
  column: string,
  definition: string
): void {
  // Get existing columns via PRAGMA table_info
  const columns = db
    .prepare("PRAGMA table_info(" + table + ")")
    .all() as Array<{ name: string }>;

  // Check if column already exists
  const exists = columns.some((col) => col.name === column);

  if (!exists) {
    // Column does not exist, add it
    db.exec("ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition);
  }
  // If exists, do nothing (idempotent)
}

/**
 * Runs all pending migrations.
 * Currently empty; T4 will add actual column migrations here.
 *
 * @param db - better-sqlite3 Database instance
 */
export function runMigrations(db: Database.Database): void {
  // Add category to intake_drafts
  addColumnIfNotExists(db, "intake_drafts", "category", "TEXT NOT NULL DEFAULT ''");
  // Add estimated_expiry_days to intake_drafts
  addColumnIfNotExists(db, "intake_drafts", "estimated_expiry_days", "INTEGER");
  // Add category to inventory_items
  addColumnIfNotExists(db, "inventory_items", "category", "TEXT NOT NULL DEFAULT ''");
  // Add purchase_date to inventory_items
  addColumnIfNotExists(db, "inventory_items", "purchase_date", "TEXT");
}
