/**
 * lib/db/client.ts
 * Singleton better-sqlite3 connection. Creates the data/ directory and
 * fridges.db on first access. Safe to import multiple times in the same
 * process — returns the same Database instance.
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "fridges.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  // Ensure the data directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  // Apply schema migrations inline (idempotent)
  _db.exec(`
    CREATE TABLE IF NOT EXISTS fridges (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      type         TEXT NOT NULL CHECK (type IN ('fridge', 'freezer')),
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS intake_drafts (
      id          TEXT PRIMARY KEY,
      fridge_id   TEXT NOT NULL REFERENCES fridges(id),
      name        TEXT NOT NULL,
      quantity    TEXT NOT NULL DEFAULT '',
      unit        TEXT NOT NULL DEFAULT '',
      confidence  TEXT NOT NULL DEFAULT 'high',
      status      TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'confirmed', 'rejected')),
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return _db;
}
