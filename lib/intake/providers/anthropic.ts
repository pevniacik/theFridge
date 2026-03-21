import Anthropic from "@anthropic-ai/sdk";
import { nanoid } from "nanoid";

import type { DraftItem } from "@/lib/intake/types";

import { EXTRACTION_PROMPT } from "./constants";
import type { ExtractionProvider } from "./types";

function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return text;
  return text.slice(start, end + 1);
}

export class AnthropicProvider implements ExtractionProvider {
  readonly providerName = "anthropic";

  constructor(
    private readonly apiKey: string,
    private readonly model: string
  ) {}

  async extract(base64: string, mimeType: string): Promise<DraftItem[]> {
    console.log(`[intake] Calling Anthropic ${this.model} for extraction`);

    const client = new Anthropic({ apiKey: this.apiKey });

    try {
      const response = await client.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: EXTRACTION_PROMPT + "\nRespond ONLY with valid JSON. No markdown, no explanation.",
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                  data: base64,
                },
              },
            ],
          },
        ],
      });

      const rawText =
        response.content[0].type === "text" ? response.content[0].text : "";

      const cleaned = extractJson(rawText);
      const parsed = JSON.parse(cleaned) as { items?: unknown[] };

      if (!Array.isArray(parsed.items)) {
        console.error("[intake] Anthropic response missing items array:", rawText);
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
      console.error("[intake] Anthropic extraction failed:", err);
      return [];
    }
  }
}
