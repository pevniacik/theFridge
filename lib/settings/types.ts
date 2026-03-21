/**
 * lib/settings/types.ts
 * Type definitions for LLM provider configuration.
 */

export type LlmProvider = "openai" | "anthropic" | "google";

export interface LlmProviderConfig {
  provider: LlmProvider;
  api_key: string;
  model: string;
  is_active: boolean;
}
