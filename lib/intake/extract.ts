import type { DraftItem } from "@/lib/intake/types";
import type { LlmProviderConfig } from "@/lib/settings/types";

import { createProvider } from "@/lib/intake/providers/factory";

export { EXTRACTION_PROMPT } from "@/lib/intake/providers/constants";

/**
 * Extract draft grocery items from a base64-encoded image.
 *
 * Falls back to a deterministic stub when OPENAI_API_KEY is absent.
 * Returns an empty array on parse failure (caller decides how to surface this).
 */
export async function extractDraftFromImage(
  base64: string,
  mimeType: string,
  config?: LlmProviderConfig | null
): Promise<DraftItem[]> {
  const provider = createProvider(config ?? null);
  return provider.extract(base64, mimeType);
}
