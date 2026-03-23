/**
 * lib/db/test-helper.ts
 * Creates an in-memory SQLite database for testing with the full schema.
 */

import Database from "better-sqlite3";

export function createTestDb(): Database.Database {
  const db = new Database(":memory:");

  // Enable WAL mode and foreign keys
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Create all tables with the same schema as production
  db.exec(`
    CREATE TABLE IF NOT EXISTS fridges (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      type         TEXT NOT NULL CHECK (type IN ('fridge', 'freezer')),
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS intake_drafts (
      id                    TEXT PRIMARY KEY,
      fridge_id             TEXT NOT NULL REFERENCES fridges(id),
      name                  TEXT NOT NULL,
      quantity              TEXT NOT NULL DEFAULT '',
      unit                  TEXT NOT NULL DEFAULT '',
      category              TEXT NOT NULL DEFAULT '',
      confidence            TEXT NOT NULL DEFAULT 'high',
      estimated_expiry_days INTEGER,
      status                TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'confirmed', 'rejected')),
      created_at            TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id               TEXT PRIMARY KEY,
      fridge_id        TEXT NOT NULL REFERENCES fridges(id),
      draft_id         TEXT REFERENCES intake_drafts(id),
      name             TEXT NOT NULL,
      quantity         TEXT NOT NULL DEFAULT '',
      unit             TEXT NOT NULL DEFAULT '',
      category         TEXT NOT NULL DEFAULT '',
      confidence       TEXT NOT NULL DEFAULT 'high',
      expiry_date      TEXT,
      expiry_estimated INTEGER NOT NULL DEFAULT 0,
      purchase_date    TEXT,
      status           TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'used', 'discarded')),
      added_at         TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS llm_providers (
      provider TEXT PRIMARY KEY,
      api_key TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 0
    );
  `);

  return db;
}
