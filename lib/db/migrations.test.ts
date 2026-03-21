import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { createTestDb } from "@/lib/db/test-helper";
import { addColumnIfNotExists, runMigrations } from "@/lib/db/migrations";

function getColumnNames(db: Database.Database, table: string): string[] {
  return (
    db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  ).map((col) => col.name);
}

describe("addColumnIfNotExists", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it("adds a column when it does not exist", () => {
    addColumnIfNotExists(db, "fridges", "notes", "TEXT NOT NULL DEFAULT ''");
    expect(getColumnNames(db, "fridges")).toContain("notes");
  });

  it("is idempotent — calling twice does not throw", () => {
    expect(() => {
      addColumnIfNotExists(db, "fridges", "notes", "TEXT NOT NULL DEFAULT ''");
      addColumnIfNotExists(db, "fridges", "notes", "TEXT NOT NULL DEFAULT ''");
    }).not.toThrow();
  });

  it("does not duplicate columns — count stays the same after second call", () => {
    addColumnIfNotExists(db, "fridges", "notes", "TEXT NOT NULL DEFAULT ''");
    const countAfterFirst = getColumnNames(db, "fridges").length;
    addColumnIfNotExists(db, "fridges", "notes", "TEXT NOT NULL DEFAULT ''");
    const countAfterSecond = getColumnNames(db, "fridges").length;
    expect(countAfterSecond).toBe(countAfterFirst);
  });

  it("does not modify existing columns already present in schema", () => {
    const before = getColumnNames(db, "fridges");
    addColumnIfNotExists(db, "fridges", "name", "TEXT NOT NULL DEFAULT ''");
    const after = getColumnNames(db, "fridges");
    expect(after).toEqual(before);
  });
});

describe("runMigrations", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it("runs without error on a fresh DB", () => {
    expect(() => runMigrations(db)).not.toThrow();
  });

  it("is idempotent — calling twice does not throw", () => {
    expect(() => {
      runMigrations(db);
      runMigrations(db);
    }).not.toThrow();
  });

  it("adds category column to intake_drafts", () => {
    runMigrations(db);
    expect(getColumnNames(db, "intake_drafts")).toContain("category");
  });

  it("adds estimated_expiry_days column to intake_drafts", () => {
    runMigrations(db);
    expect(getColumnNames(db, "intake_drafts")).toContain(
      "estimated_expiry_days"
    );
  });

  it("adds category column to inventory_items", () => {
    runMigrations(db);
    expect(getColumnNames(db, "inventory_items")).toContain("category");
  });

  it("adds purchase_date column to inventory_items", () => {
    runMigrations(db);
    expect(getColumnNames(db, "inventory_items")).toContain("purchase_date");
  });
});
