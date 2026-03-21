import { NextResponse } from "next/server";

import { getFridgeById } from "@/lib/fridges/store";
import { listInventoryItems } from "@/lib/inventory/store";
import { suggestRecipesWithAi } from "@/lib/recipes/suggest";
import { getActiveProvider } from "@/lib/settings/store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ fridgeId: string }> }
) {
  const { fridgeId } = await params;

  const fridge = getFridgeById(fridgeId);
  if (!fridge) {
    return NextResponse.json({ error: "Storage not found" }, { status: 404 });
  }

  if (fridge.type !== "fridge") {
    return NextResponse.json(
      { error: "Recipe suggestions are available only for fridge contexts." },
      { status: 400 }
    );
  }

  const inventoryItems = listInventoryItems(fridgeId);
  const providerConfig = getActiveProvider();

  if (!providerConfig || !providerConfig.api_key) {
    return NextResponse.json(
      { error: "Configure an AI provider in Settings before requesting recipes." },
      { status: 400 }
    );
  }

  const recipes = await suggestRecipesWithAi(inventoryItems, providerConfig);

  return NextResponse.json(
    {
      recipes,
      provider: providerConfig?.provider ?? "stub",
      ingredient_count: inventoryItems.length,
    },
    { status: 200 }
  );
}
