import { describe, expect, it } from "vitest";

import type { InventoryItem } from "@/lib/inventory/types";
import { pickMainIngredientNames, suggestRecipesWithAi } from "@/lib/recipes/suggest";

function makeItem(name: string): InventoryItem {
  return {
    id: `${name}-id`,
    fridge_id: "fridge-1",
    draft_id: null,
    name,
    quantity: "1",
    unit: "pcs",
    category: "Produce",
    confidence: "high",
    expiry_date: null,
    expiry_estimated: false,
    purchase_date: "2026-03-21",
    status: "active",
    added_at: "2026-03-21T10:00:00.000Z",
    updated_at: "2026-03-21T10:00:00.000Z",
  };
}

describe("pickMainIngredientNames", () => {
  it("filters likely staples and deduplicates names", () => {
    const items = [
      makeItem("Chicken Breast"),
      makeItem("Soy Sauce"),
      makeItem("Black Pepper"),
      makeItem("chicken breast"),
      makeItem("Broccoli"),
    ];

    expect(pickMainIngredientNames(items)).toEqual(["Chicken Breast", "Broccoli"]);
  });
});

describe("suggestRecipesWithAi", () => {
  it("returns deterministic fallback recipes when provider config is missing", async () => {
    const items = [
      makeItem("Chicken Breast"),
      makeItem("Broccoli"),
      makeItem("Rice"),
      makeItem("Olive Oil"),
    ];

    const recipes = await suggestRecipesWithAi(items, null);

    expect(recipes.length).toBeGreaterThan(0);
    expect(recipes[0]?.main_ingredients.length).toBeGreaterThan(0);
    expect(recipes.flatMap((recipe) => recipe.main_ingredients)).not.toContain("Olive Oil");
  });

  it("returns empty list when no main ingredients are available", async () => {
    const items = [makeItem("Salt"), makeItem("Pepper"), makeItem("Soy Sauce")];

    const recipes = await suggestRecipesWithAi(items, null);

    expect(recipes).toEqual([]);
  });
});
