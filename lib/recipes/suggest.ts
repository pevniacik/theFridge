import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

import type { InventoryItem } from "@/lib/inventory/types";
import type { LlmProviderConfig } from "@/lib/settings/types";

import type { RecipeSuggestion } from "./types";

const STAPLE_KEYWORDS = [
  "salt",
  "pepper",
  "sauce",
  "soy",
  "vinegar",
  "oil",
  "ketchup",
  "mustard",
  "mayo",
  "mayonnaise",
  "spice",
  "seasoning",
  "powder",
  "syrup",
  "honey",
  "sugar",
  "flour",
  "stock",
  "broth",
  "herb",
];

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function isLikelyStaple(name: string): boolean {
  const normalized = normalizeName(name);
  return STAPLE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function pickMainIngredientNames(items: InventoryItem[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const name = item.name.trim();
    if (!name) continue;
    if (isLikelyStaple(name)) continue;

    const key = normalizeName(name);
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(name);
  }

  return result;
}

function buildRecipePrompt(mainIngredients: string[]): string {
  return [
    "You are a meal-planning assistant.",
    "Given the main ingredients currently available in a fridge, suggest up to 3 practical recipes.",
    "Assume pantry staples like salt, pepper, oil, and basic sauces already exist at home.",
    "Use ONLY the provided main ingredients in main_ingredients.",
    `Main ingredients: ${mainIngredients.join(", ")}`,
    "Return JSON only in this format:",
    '{"recipes":[{"title":"string","description":"string","main_ingredients":["string"]}]}',
  ].join(" ");
}

function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return text;
  }

  return text.slice(start, end + 1);
}

function normalizeRecipes(raw: unknown, mainIngredients: string[]): RecipeSuggestion[] {
  if (typeof raw !== "object" || raw === null) {
    return [];
  }

  const recipesUnknown = (raw as { recipes?: unknown }).recipes;
  if (!Array.isArray(recipesUnknown)) {
    return [];
  }

  const allowedMap = new Map(
    mainIngredients.map((ingredient) => [normalizeName(ingredient), ingredient])
  );

  const recipes: RecipeSuggestion[] = [];

  for (const recipe of recipesUnknown) {
    if (typeof recipe !== "object" || recipe === null) {
      continue;
    }

    const title = (recipe as { title?: unknown }).title;
    if (typeof title !== "string" || title.trim().length === 0) {
      continue;
    }

    const descriptionUnknown = (recipe as { description?: unknown }).description;
    const description =
      typeof descriptionUnknown === "string" && descriptionUnknown.trim().length > 0
        ? descriptionUnknown.trim()
        : "Use your available main ingredients with pantry staples.";

    const ingredientsUnknown = (recipe as { main_ingredients?: unknown }).main_ingredients;
    const recipeIngredients = Array.isArray(ingredientsUnknown)
      ? ingredientsUnknown
          .filter((value): value is string => typeof value === "string")
          .map((value) => normalizeName(value))
          .map((value) => allowedMap.get(value))
          .filter((value): value is string => Boolean(value))
      : [];

    const dedupedIngredients = Array.from(new Set(recipeIngredients));
    const fallbackIngredients = mainIngredients.slice(0, Math.min(mainIngredients.length, 3));

    recipes.push({
      title: title.trim(),
      description,
      main_ingredients:
        dedupedIngredients.length > 0 ? dedupedIngredients : fallbackIngredients,
    });

    if (recipes.length === 3) {
      break;
    }
  }

  return recipes;
}

function parseRecipePayload(text: string, mainIngredients: string[]): RecipeSuggestion[] {
  try {
    const parsed = JSON.parse(extractJson(text)) as unknown;
    return normalizeRecipes(parsed, mainIngredients);
  } catch {
    return [];
  }
}

function buildFallbackRecipes(mainIngredients: string[]): RecipeSuggestion[] {
  if (mainIngredients.length === 0) {
    return [];
  }

  const first = mainIngredients[0];
  const second = mainIngredients[1] ?? first;
  const third = mainIngredients[2] ?? second;

  return [
    {
      title: `${first} Skillet Bowl`,
      description: "Saute the main ingredients together and finish with pantry staples.",
      main_ingredients: Array.from(new Set([first, second])),
    },
    {
      title: `${second} Sheet-Pan Bake`,
      description: "Roast with oil, salt, and pepper until caramelized and tender.",
      main_ingredients: Array.from(new Set([second, third])),
    },
    {
      title: `${third} Quick Soup`,
      description: "Simmer with water or stock and basic seasonings for a fast meal.",
      main_ingredients: Array.from(new Set([first, third])),
    },
  ].slice(0, Math.min(3, mainIngredients.length + 1));
}

async function suggestWithOpenAi(
  config: LlmProviderConfig,
  mainIngredients: string[]
): Promise<RecipeSuggestion[]> {
  const client = new OpenAI({ apiKey: config.api_key });
  const response = await client.chat.completions.create({
    model: config.model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: buildRecipePrompt(mainIngredients) }],
      },
    ],
  });

  return parseRecipePayload(response.choices[0]?.message?.content ?? "", mainIngredients);
}

async function suggestWithAnthropic(
  config: LlmProviderConfig,
  mainIngredients: string[]
): Promise<RecipeSuggestion[]> {
  const client = new Anthropic({ apiKey: config.api_key });
  const response = await client.messages.create({
    model: config.model,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: buildRecipePrompt(mainIngredients),
          },
        ],
      },
    ],
  });

  const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
  return parseRecipePayload(raw, mainIngredients);
}

async function suggestWithGoogle(
  config: LlmProviderConfig,
  mainIngredients: string[]
): Promise<RecipeSuggestion[]> {
  const client = new GoogleGenAI({ apiKey: config.api_key });
  const response = await client.models.generateContent({
    model: config.model,
    contents: [
      {
        parts: [{ text: buildRecipePrompt(mainIngredients) }],
      },
    ],
    config: { responseMimeType: "application/json" },
  });

  return parseRecipePayload(response.text ?? "", mainIngredients);
}

export async function suggestRecipesWithAi(
  items: InventoryItem[],
  config: LlmProviderConfig | null
): Promise<RecipeSuggestion[]> {
  const mainIngredients = pickMainIngredientNames(items);

  if (mainIngredients.length === 0) {
    return [];
  }

  if (!config || !config.api_key) {
    return buildFallbackRecipes(mainIngredients);
  }

  try {
    let suggested: RecipeSuggestion[] = [];

    switch (config.provider) {
      case "openai":
        suggested = await suggestWithOpenAi(config, mainIngredients);
        break;
      case "anthropic":
        suggested = await suggestWithAnthropic(config, mainIngredients);
        break;
      case "google":
        suggested = await suggestWithGoogle(config, mainIngredients);
        break;
    }

    return suggested.length > 0 ? suggested : buildFallbackRecipes(mainIngredients);
  } catch {
    return buildFallbackRecipes(mainIngredients);
  }
}
