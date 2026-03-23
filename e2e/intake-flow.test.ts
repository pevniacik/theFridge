import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestDb } from "@/lib/db/test-helper";

let testDb: Database.Database;

vi.mock("@/lib/db/client", () => ({
  getDb: () => testDb,
}));

import { createFridge } from "@/lib/fridges/store";
import { saveDraftItems } from "@/lib/intake/store";
import { StubProvider } from "@/lib/intake/providers/stub";
import { extractDraftFromImage } from "@/lib/intake/extract";
import { promoteToInventory, listInventoryItems } from "@/lib/inventory/store";
import { upsertProvider, getActiveProvider } from "@/lib/settings/store";

const SAMPLE_PHOTO_PATH = path.join(process.cwd(), "test-fixtures", "sample-food.jpg");

describe("E2E: Intake happy-path flow", () => {
  beforeEach(() => {
    testDb = createTestDb();
  });

  it("sample food photo fixture exists and is a valid file", () => {
    expect(fs.existsSync(SAMPLE_PHOTO_PATH)).toBe(true);
    const stat = fs.statSync(SAMPLE_PHOTO_PATH);
    expect(stat.size).toBeGreaterThan(0);
  });

  it("stub provider extracts items from a photo (simulates AI extraction)", async () => {
    const provider = new StubProvider();
    const photoBytes = fs.readFileSync(SAMPLE_PHOTO_PATH);
    const base64 = photoBytes.toString("base64");

    const items = await provider.extract(base64, "image/jpeg", "photo");

    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toMatchObject({
      name: expect.any(String),
      quantity: expect.any(String),
      unit: expect.any(String),
      category: expect.any(String),
      confidence: expect.stringMatching(/^(high|low)$/),
    });
    expect(typeof items[0]?.id).toBe("string");
    expect(items[0]?.id.length).toBeGreaterThan(0);
  });

  it("stub provider extracts receipt items from a receipt photo", async () => {
    const provider = new StubProvider();
    const photoBytes = fs.readFileSync(SAMPLE_PHOTO_PATH);
    const base64 = photoBytes.toString("base64");

    const items = await provider.extract(base64, "image/jpeg", "receipt");

    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toMatchObject({ name: "Chicken Breast", category: "Meat" });
  });

  it("extractDraftFromImage uses stub when no provider configured", async () => {
    const photoBytes = fs.readFileSync(SAMPLE_PHOTO_PATH);
    const base64 = photoBytes.toString("base64");

    const items = await extractDraftFromImage(base64, "image/jpeg", null, "photo");

    expect(items.length).toBeGreaterThan(0);
    expect(items[0]?.name).toBe("Milk");
  });

  it("full flow: extract → save drafts → promote to inventory", async () => {
    const fridge = createFridge({ name: "Kitchen Fridge", type: "fridge" });

    const photoBytes = fs.readFileSync(SAMPLE_PHOTO_PATH);
    const base64 = photoBytes.toString("base64");
    const draftItems = await extractDraftFromImage(base64, "image/jpeg", null, "photo");

    expect(draftItems.length).toBeGreaterThan(0);

    saveDraftItems(fridge.id, draftItems);

    const inventoryInputs = draftItems.map((draft) => ({
      draft_id: draft.id,
      name: draft.name,
      quantity: draft.quantity,
      unit: draft.unit,
      category: draft.category,
      confidence: draft.confidence,
      expiry_date: null,
      purchase_date: null,
      expiry_estimated: false,
    }));

    promoteToInventory(fridge.id, inventoryInputs);

    const inventory = listInventoryItems(fridge.id);

    expect(inventory.length).toBe(draftItems.length);
    expect(inventory[0]?.fridge_id).toBe(fridge.id);
    expect(inventory[0]?.status).toBe("active");
    expect(inventory.map((i) => i.name)).toContain("Milk");
  });

  it("full flow: receipt photo → extract → save → promote", async () => {
    const fridge = createFridge({ name: "Kitchen Fridge", type: "fridge" });

    const photoBytes = fs.readFileSync(SAMPLE_PHOTO_PATH);
    const base64 = photoBytes.toString("base64");
    const draftItems = await extractDraftFromImage(base64, "image/jpeg", null, "receipt");

    expect(draftItems.length).toBeGreaterThan(0);
    expect(draftItems[0]?.name).toBe("Chicken Breast");

    saveDraftItems(fridge.id, draftItems);

    const inventoryInputs = draftItems.map((draft) => ({
      draft_id: draft.id,
      name: draft.name,
      quantity: draft.quantity,
      unit: draft.unit,
      category: draft.category,
      confidence: draft.confidence,
      expiry_date: null,
      purchase_date: null,
      expiry_estimated: false,
    }));

    promoteToInventory(fridge.id, inventoryInputs);

    const inventory = listInventoryItems(fridge.id);

    expect(inventory.length).toBe(draftItems.length);
    expect(inventory.map((i) => i.name)).toContain("Chicken Breast");
  });

  it("settings: save provider config and retrieve it", () => {
    upsertProvider({
      provider: "google",
      api_key: "AIzaSy-test-key",
      model: "gemini-2.0-flash",
    });

    const config = getActiveProvider();

    expect(config).not.toBeNull();
    expect(config?.provider).toBe("google");
    expect(config?.model).toBe("gemini-2.0-flash");
    expect(config?.api_key).toBe("AIzaSy-test-key");
    expect(config?.is_active).toBe(true);
  });

  it("settings: model-only update preserves existing API key", () => {
    upsertProvider({
      provider: "google",
      api_key: "AIzaSy-original-key",
      model: "gemini-2.0-flash",
    });

    upsertProvider({
      provider: "google",
      api_key: "AIzaSy-original-key",
      model: "gemini-2.5-pro",
    });

    const config = getActiveProvider();

    expect(config?.model).toBe("gemini-2.5-pro");
    expect(config?.api_key).toBe("AIzaSy-original-key");
  });
});
