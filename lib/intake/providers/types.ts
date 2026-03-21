import type { DraftItem, IntakeSource } from "@/lib/intake/types";

export interface ExtractionProvider {
  readonly providerName: string;
  extract(base64: string, mimeType: string, source?: IntakeSource): Promise<DraftItem[]>;
}
