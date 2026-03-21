import { GoogleGenAI } from "@google/genai";
import { nanoid } from "nanoid";

import type { DraftItem } from "@/lib/intake/types";

import { EXTRACTION_PROMPT } from "./constants";
import type { ExtractionProvider } from "./types";

export class GoogleProvider implements ExtractionProvider {
  readonly providerName = "google";

  constructor(
    private readonly apiKey: string,
    private readonly model: string
  ) {}

  async extract(base64: string, mimeType: string): Promise<DraftItem[]> {
    console.log(`[intake] Calling Google ${this.model} for extraction`);

    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    try {
      const response = await ai.models.generateContent({
        model: this.model,
        contents: [
          {
            parts: [
              { text: EXTRACTION_PROMPT },
              { inlineData: { mimeType, data: base64 } },
            ],
          },
        ],
        config: { responseMimeType: "application/json" },
      });

      const raw = response.text ?? "";
      const parsed = JSON.parse(raw) as { items?: unknown[] };

      if (!Array.isArray(parsed.items)) {
        console.error("[intake] Google response missing items array:", raw);
        return [];
      }

      return parsed.items
        .filter(
          (
            item
          ): item is { name: string; quantity: string; unit: string; confidence: string } =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as Record<string, unknown>).name === "string"
        )
        .map((item) => {
          const estimatedDays = (item as Record<string, unknown>)
            .estimated_expiry_days;

          return {
            id: nanoid(10),
            name: item.name,
            quantity: item.quantity ?? "",
            unit: item.unit ?? "",
            category: ((item as Record<string, unknown>).category as string) ?? "",
            confidence: item.confidence === "low" ? "low" : "high",
            estimated_expiry_days:
              typeof estimatedDays === "number" ? estimatedDays : null,
          };
        });
    } catch (err) {
      console.error("[intake] Extraction failed:", err);
      return [];
    }
  }
}
