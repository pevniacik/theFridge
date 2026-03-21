import type { LlmProviderConfig } from "@/lib/settings/types";

import { OpenAIProvider } from "./openai";
import { StubProvider } from "./stub";
import type { ExtractionProvider } from "./types";

export function createProvider(
  config: LlmProviderConfig | null
): ExtractionProvider {
  if (!config || !config.api_key) {
    return new StubProvider();
  }

  switch (config.provider) {
    case "openai":
      return new OpenAIProvider(config.api_key, config.model);
    default:
      return new StubProvider();
  }
}
