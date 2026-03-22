import OpenAI from "openai";
import { nanoid } from "nanoid";

import type { DraftItem, IntakeSource } from "@/lib/intake/types";

import { getExtractionPrompt } from "./constants";
import type { ExtractionProvider } from "./types";

export class OpenAIProvider implements ExtractionProvider {
  readonly providerName = "openai";

  constructor(
    private readonly apiKey: string,
    private readonly model: string
  ) {}

  async extract(
    base64: string,
    mimeType: string,
    source: IntakeSource = "photo"
  ): Promise<DraftItem[]> {
    console.log(`[intake] Calling OpenAI ${this.model} for extraction`);

    const extractionPrompt = getExtractionPrompt(source);

    const client = new OpenAI({ apiKey: this.apiKey });

    try {
      const response = await client.chat.completions.create({
        model: this.model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: extractionPrompt },
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
      console.error("[intake] OpenAI extraction failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`OpenAI extraction failed: ${message}`);
    }
  }
}
