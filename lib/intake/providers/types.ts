import type { DraftItem } from "@/lib/intake/types";

export interface ExtractionProvider {
  readonly providerName: string;
  extract(base64: string, mimeType: string): Promise<DraftItem[]>;
}
