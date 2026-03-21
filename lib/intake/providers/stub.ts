import { nanoid } from "nanoid";

import type { DraftItem } from "@/lib/intake/types";

import type { ExtractionProvider } from "./types";

export class StubProvider implements ExtractionProvider {
  readonly providerName = "stub";

  async extract(_base64: string, _mimeType: string): Promise<DraftItem[]> {
    console.log("[intake] Using stub extraction");

    return [
      {
        id: nanoid(10),
        name: "Milk",
        quantity: "1",
        unit: "litre",
        category: "Dairy",
        confidence: "high",
        estimated_expiry_days: 7,
      },
      {
        id: nanoid(10),
        name: "Greek Yogurt",
        quantity: "2",
        unit: "pots",
        category: "Dairy",
        confidence: "high",
        estimated_expiry_days: 14,
      },
      {
        id: nanoid(10),
        name: "Butter",
        quantity: "",
        unit: "",
        category: "Dairy",
        confidence: "low",
        estimated_expiry_days: 30,
      },
    ];
  }
}
