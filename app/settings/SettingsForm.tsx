"use client";

import { useActionState, useState } from "react";
import { saveProvider } from "./actions";
import type { LlmProvider } from "@/lib/settings/types";

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-20250514",
  google: "gemini-2.0-flash",
};

type MaskedConfig = {
  provider: LlmProvider;
  model: string;
  api_key_masked: string;
} | null;

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "44px",
  padding: "0.625rem 0.875rem",
  background: "var(--color-bg)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-input, 0.375rem)",
  color: "var(--color-text)",
  fontSize: "0.9375rem",
  fontFamily: "var(--font-body)",
  boxSizing: "border-box",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8125rem",
  fontWeight: 500,
  color: "var(--color-muted)",
  marginBottom: "0.5rem",
  fontFamily: "var(--font-display)",
  letterSpacing: "0.04em",
};

export default function SettingsForm({ currentConfig }: { currentConfig: MaskedConfig }) {
  const [state, formAction, isPending] = useActionState(saveProvider, null);

  const initialProvider: LlmProvider = currentConfig?.provider ?? "openai";
  const [selectedProvider, setSelectedProvider] = useState<LlmProvider>(initialProvider);
  const [model, setModel] = useState(currentConfig?.model ?? DEFAULT_MODELS[initialProvider]);

  function handleProviderChange(p: LlmProvider) {
    setSelectedProvider(p);
    setModel(DEFAULT_MODELS[p]);
  }

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <span style={labelStyle}>AI Provider</span>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {(["openai", "anthropic", "google"] as LlmProvider[]).map((p) => (
            <label
              key={p}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                minHeight: "44px",
                padding: "0 0.25rem",
                cursor: "pointer",
                color: "var(--color-text)",
                fontSize: "0.9375rem",
              }}
            >
              <input
                type="radio"
                name="provider"
                value={p}
                checked={selectedProvider === p}
                onChange={() => handleProviderChange(p)}
                style={{ width: "1.125rem", height: "1.125rem", cursor: "pointer", accentColor: "var(--color-accent)" }}
              />
              <span style={{ fontFamily: "var(--font-body)" }}>
                {p === "openai" ? "OpenAI" : p === "anthropic" ? "Anthropic" : "Google"}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="settings-model" style={labelStyle}>
          Model
        </label>
        <input
          id="settings-model"
          name="model"
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="e.g. gpt-4o-mini"
          style={inputStyle}
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="settings-api-key" style={labelStyle}>
          API Key
        </label>
        {currentConfig?.api_key_masked && (
          <p
            style={{
              fontSize: "0.8125rem",
              color: "var(--color-muted)",
              marginBottom: "0.5rem",
              fontFamily: "var(--font-display)",
            }}
          >
            Current: {currentConfig.api_key_masked}
          </p>
        )}
        <input
          id="settings-api-key"
          name="api_key"
          type="password"
          placeholder={currentConfig?.api_key_masked ? "Enter new key to replace" : "Enter API key"}
          style={inputStyle}
          autoComplete="new-password"
        />
      </div>

      {state && !state.success && state.error && (
        <div
          role="alert"
          style={{
            padding: "0.75rem 1rem",
            background: "color-mix(in srgb, var(--color-warn, #ef4444) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-warn, #ef4444) 40%, transparent)",
            borderRadius: "var(--radius-input, 0.375rem)",
            color: "var(--color-warn, #ef4444)",
            fontSize: "0.875rem",
          }}
        >
          {state.error}
        </div>
      )}

      {state?.success && (
        <div
          role="status"
          style={{
            padding: "0.75rem 1rem",
            background: "color-mix(in srgb, var(--color-cold, #22d3ee) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-cold, #22d3ee) 40%, transparent)",
            borderRadius: "var(--radius-input, 0.375rem)",
            color: "var(--color-cold, #22d3ee)",
            fontSize: "0.875rem",
          }}
        >
          Settings saved.
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        style={{
          minHeight: "44px",
          padding: "0 1.5rem",
          background: isPending ? "var(--color-border)" : "var(--color-accent)",
          color: isPending ? "var(--color-muted)" : "var(--color-bg)",
          border: "none",
          borderRadius: "var(--radius-input, 0.375rem)",
          fontSize: "0.9375rem",
          fontWeight: 600,
          fontFamily: "var(--font-display)",
          cursor: isPending ? "not-allowed" : "pointer",
          transition: "background 0.15s",
          alignSelf: "flex-start",
        }}
      >
        {isPending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
