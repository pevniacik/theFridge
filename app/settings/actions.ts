"use server";

/**
 * app/settings/actions.ts
 * Server Actions for LLM provider configuration.
 */

import { getActiveProvider, upsertProvider } from "@/lib/settings/store";
import type { LlmProvider } from "@/lib/settings/types";

const VALID_PROVIDERS: LlmProvider[] = ["openai", "anthropic", "google"];

/**
 * Save (upsert) a provider configuration.
 * useActionState-compatible: (prevState, formData) signature.
 *
 * @returns { success: true } on success; { success: false, error } on failure.
 */
export async function saveProvider(
  prevState: { success: boolean; error?: string } | null,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const provider = formData.get("provider") as string;
  const api_key = formData.get("api_key") as string;
  const model = formData.get("model") as string;

  if (!VALID_PROVIDERS.includes(provider as LlmProvider)) {
    return { success: false, error: `Invalid provider: ${provider}. Must be one of: openai, anthropic, google.` };
  }

  if (!api_key || api_key.trim().length === 0) {
    return { success: false, error: "API key cannot be empty." };
  }

  if (!model || model.trim().length === 0) {
    return { success: false, error: "Model cannot be empty." };
  }

  try {
    upsertProvider({ provider: provider as LlmProvider, api_key: api_key.trim(), model: model.trim() });
    console.log(`[settings] Saved provider config for ${provider}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[settings] saveProvider failed for ${provider}: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * Read the active provider config, masking the API key.
 * Safe to call from Server Components — never sends raw key to client.
 *
 * @returns masked config or null if none configured.
 */
export async function getMaskedConfig(): Promise<{
  provider: LlmProvider;
  model: string;
  api_key_masked: string;
} | null> {
  const config = getActiveProvider();
  if (!config) return null;

  const masked =
    config.api_key.length >= 4
      ? "****" + config.api_key.slice(-4)
      : config.api_key.length > 0
      ? "****"
      : "";

  return {
    provider: config.provider,
    model: config.model,
    api_key_masked: masked,
  };
}
