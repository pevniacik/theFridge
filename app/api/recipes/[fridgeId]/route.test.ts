import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getFridgeById: vi.fn(),
  listInventoryItems: vi.fn(),
  getActiveProvider: vi.fn(),
  suggestRecipesWithAi: vi.fn(),
}));

vi.mock("@/lib/fridges/store", () => ({
  getFridgeById: mocks.getFridgeById,
}));

vi.mock("@/lib/inventory/store", () => ({
  listInventoryItems: mocks.listInventoryItems,
}));

vi.mock("@/lib/settings/store", () => ({
  getActiveProvider: mocks.getActiveProvider,
}));

vi.mock("@/lib/recipes/suggest", () => ({
  suggestRecipesWithAi: mocks.suggestRecipesWithAi,
}));

import { POST } from "@/app/api/recipes/[fridgeId]/route";

describe("POST /api/recipes/[fridgeId]", () => {
  beforeEach(() => {
    mocks.getFridgeById.mockReset();
    mocks.listInventoryItems.mockReset();
    mocks.getActiveProvider.mockReset();
    mocks.suggestRecipesWithAi.mockReset();

    mocks.getFridgeById.mockReturnValue({
      id: "fridge-1",
      name: "Kitchen",
      type: "fridge",
      created_at: "2026-01-01T00:00:00.000Z",
    });
    mocks.listInventoryItems.mockReturnValue([]);
    mocks.getActiveProvider.mockReturnValue(null);
    mocks.suggestRecipesWithAi.mockResolvedValue([]);
  });

  it("returns 404 when storage does not exist", async () => {
    mocks.getFridgeById.mockReturnValue(null);

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ fridgeId: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 400 for freezer contexts", async () => {
    mocks.getFridgeById.mockReturnValue({
      id: "freezer-1",
      name: "Garage",
      type: "freezer",
      created_at: "2026-01-01T00:00:00.000Z",
    });

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ fridgeId: "freezer-1" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 400 when AI provider is not configured", async () => {
    mocks.getActiveProvider.mockReturnValue(null);

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ fridgeId: "fridge-1" }),
    });

    expect(response.status).toBe(400);
    expect(mocks.suggestRecipesWithAi).not.toHaveBeenCalled();
  });

  it("returns AI recipe suggestions for fridge contexts", async () => {
    mocks.listInventoryItems.mockReturnValue([
      {
        id: "item-1",
        fridge_id: "fridge-1",
        draft_id: null,
        name: "Chicken Breast",
        quantity: "1",
        unit: "pack",
        category: "Meat",
        confidence: "high",
        expiry_date: null,
        expiry_estimated: false,
        purchase_date: "2026-03-21",
        status: "active",
        added_at: "2026-03-21T10:00:00.000Z",
        updated_at: "2026-03-21T10:00:00.000Z",
      },
    ]);

    mocks.getActiveProvider.mockReturnValue({
      provider: "openai",
      api_key: "sk-openai",
      model: "gpt-4o-mini",
      is_active: true,
    });

    mocks.suggestRecipesWithAi.mockResolvedValue([
      {
        title: "Chicken Skillet Bowl",
        description: "Cook chicken with pantry staples.",
        main_ingredients: ["Chicken Breast"],
      },
    ]);

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ fridgeId: "fridge-1" }),
    });

    const body = (await response.json()) as {
      recipes: Array<{ title: string }>;
      provider: string;
      ingredient_count: number;
    };

    expect(response.status).toBe(200);
    expect(body.recipes).toHaveLength(1);
    expect(body.provider).toBe("openai");
    expect(body.ingredient_count).toBe(1);
  });
});
