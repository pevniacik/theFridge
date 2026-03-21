import type { LlmProviderConfig } from "@/lib/settings/types";

import { AnthropicProvider } from "./anthropic";
import { GoogleProvider } from "./google";
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
    case "anthropic":
      return new AnthropicProvider(config.api_key, config.model);
    case "google":
      return new GoogleProvider(config.api_key, config.model);
    default:
      return new StubProvider();
  }
}
