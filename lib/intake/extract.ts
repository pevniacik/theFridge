/**
 * lib/intake/extract.ts
 * Extracts grocery items from a base64-encoded image.
 *
 * Observability:
 *   - Logs "[intake] Using stub extraction (no OPENAI_API_KEY)" or
 *     "[intake] Calling OpenAI gpt-4o-mini for extraction" on every call.
 *   - Parse failures are caught and logged; the function returns [] so the
 *     route handler can surface a meaningful error to the client.
 */

import OpenAI from "openai";
import { nanoid } from "nanoid";
import type { DraftItem } from "./types";

const EXTRACTION_PROMPT =
  'Extract all visible grocery or food items from this photo. ' +
  'Return JSON: { "items": [ { "name": string, "quantity": string, "unit": string, ' +
  '"confidence": "high" | "low" } ] }. ' +
  'Use confidence="low" for anything unclear, partially visible, or uncertain. ' +
  'For quantity and unit, use empty string if not detectable.';

/** Stub items returned when OPENAI_API_KEY is not set. */
function stubItems(): DraftItem[] {
  return [
    { id: nanoid(10), name: "Milk", quantity: "1", unit: "litre", category: "", confidence: "high" },
    { id: nanoid(10), name: "Greek Yogurt", quantity: "2", unit: "pots", category: "", confidence: "high" },
    { id: nanoid(10), name: "Butter", quantity: "", unit: "", category: "", confidence: "low" },
  ];
}

/**
 * Extract draft grocery items from a base64-encoded image.
 *
 * Falls back to a deterministic stub when OPENAI_API_KEY is absent.
 * Returns an empty array on parse failure (caller decides how to surface this).
 */
export async function extractDraftFromImage(
  base64: string,
  mimeType: string
): Promise<DraftItem[]> {
  if (!process.env.OPENAI_API_KEY) {
    console.log("[intake] Using stub extraction (no OPENAI_API_KEY)");
    return stubItems();
  }

  console.log("[intake] Calling OpenAI gpt-4o-mini for extraction");

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: EXTRACTION_PROMPT },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as { items?: unknown[] };

    if (!Array.isArray(parsed.items)) {
      console.error("[intake] OpenAI response missing items array:", raw);
      return [];
    }

    return parsed.items
      .filter(
        (item): item is { name: string; quantity: string; unit: string; confidence: string } =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as Record<string, unknown>).name === "string"
      )
      .map((item) => ({
        id: nanoid(10),
        name: item.name,
        quantity: item.quantity ?? "",
        unit: item.unit ?? "",
        category: ((item as Record<string, unknown>).category as string) ?? "",
        confidence: item.confidence === "low" ? "low" : "high",
      }));
  } catch (err) {
    console.error("[intake] Extraction failed:", err);
    return [];
  }
}
