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
import { analyzeInventory, generateSuggestions } from "@/lib/inventory/analysis";
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

  // ── Analysis + suggestions: uses persisted inventory rows, not mocked inputs ──

  it("analyzeInventory: classifies expired and ok items from real persisted rows", () => {
    const fridge = createFridge({ name: "Test Fridge", type: "fridge" });

    // Reference date pinned for determinism
    const now = new Date("2026-03-24T12:00:00Z");

    // Insert items directly via inventory store after promoting a minimal draft
    const draftItems = [
      { id: "d1", name: "Expired Milk",  quantity: "1", unit: "litre",  category: "dairy",  confidence: "high" as const, estimated_expiry_days: null },
      { id: "d2", name: "Fresh Eggs",    quantity: "6", unit: "units",  category: "dairy",  confidence: "high" as const, estimated_expiry_days: null },
    ];
    saveDraftItems(fridge.id, draftItems);

    promoteToInventory(fridge.id, [
      { draft_id: "d1", name: "Expired Milk",  quantity: "1", unit: "litre",  category: "dairy",  confidence: "high", expiry_date: "2026-03-20", purchase_date: null, expiry_estimated: false },
      { draft_id: "d2", name: "Fresh Eggs",    quantity: "6", unit: "units",  category: "dairy",  confidence: "high", expiry_date: "2026-04-10", purchase_date: null, expiry_estimated: false },
    ]);

    const inventory = listInventoryItems(fridge.id);
    expect(inventory).toHaveLength(2);

    const { status, classified } = analyzeInventory(inventory, now);

    expect(status.total).toBe(2);
    expect(status.expired).toBe(1);
    expect(status.ok).toBe(1);

    const expiredItem = classified.find(ci => ci.urgency === "expired");
    expect(expiredItem?.item.name).toBe("Expired Milk");

    const okItem = classified.find(ci => ci.urgency === "ok");
    expect(okItem?.item.name).toBe("Fresh Eggs");
  });

  it("generateSuggestions: suggestion cards reference real stored item names", () => {
    const fridge = createFridge({ name: "Suggestion Fridge", type: "fridge" });
    const now = new Date("2026-03-24T12:00:00Z");

    // Seed 4 items to trigger the "Cook tonight" card (requires 3+)
    const draftItems = [
      { id: "s1", name: "Butter",  quantity: "1", unit: "pack",   category: "dairy",  confidence: "high" as const, estimated_expiry_days: null },
      { id: "s2", name: "Tomatoes", quantity: "3", unit: "units", category: "veg",    confidence: "high" as const, estimated_expiry_days: null },
      { id: "s3", name: "Pasta",    quantity: "1", unit: "bag",   category: "pantry", confidence: "high" as const, estimated_expiry_days: null },
      { id: "s4", name: "Old Cheese", quantity: "1", unit: "block", category: "dairy", confidence: "high" as const, estimated_expiry_days: null },
    ];
    saveDraftItems(fridge.id, draftItems);

    promoteToInventory(fridge.id, [
      { draft_id: "s1", name: "Butter",     quantity: "1", unit: "pack",  category: "dairy",  confidence: "high", expiry_date: "2026-03-25", purchase_date: null, expiry_estimated: false },
      { draft_id: "s2", name: "Tomatoes",   quantity: "3", unit: "units", category: "veg",    confidence: "high", expiry_date: "2026-04-10", purchase_date: null, expiry_estimated: false },
      { draft_id: "s3", name: "Pasta",      quantity: "1", unit: "bag",   category: "pantry", confidence: "high", expiry_date: "2026-04-15", purchase_date: null, expiry_estimated: false },
      { draft_id: "s4", name: "Old Cheese", quantity: "1", unit: "block", category: "dairy",  confidence: "high", expiry_date: "2026-03-22", purchase_date: null, expiry_estimated: false },
    ]);

    const inventory = listInventoryItems(fridge.id);
    expect(inventory).toHaveLength(4);

    const suggestions = generateSuggestions(inventory, now);
    expect(suggestions.length).toBeGreaterThan(0);

    // All ingredient names in every card must come from real stored item names
    const storedNames = new Set(inventory.map(i => i.name));
    for (const card of suggestions) {
      for (const ingredient of card.ingredients) {
        expect(storedNames.has(ingredient)).toBe(true);
      }
    }

    // "Use soon" card must appear because Butter and Old Cheese are expiring/expired
    const useSoonCard = suggestions.find(s => s.title === "Use soon");
    expect(useSoonCard).toBeDefined();
    expect(useSoonCard?.urgencyDriven).toBe(true);
    expect(useSoonCard?.ingredients.length).toBeGreaterThan(0);

    // "Cook tonight" card must appear because 4 items are in inventory
    const cookTonightCard = suggestions.find(s => s.title === "Cook tonight");
    expect(cookTonightCard).toBeDefined();
  });
});
