"use client";

import { useActionState, useRef, useState } from "react";
import { saveProvider } from "./actions";
import type { LlmProvider } from "@/lib/settings/types";

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  google: "gemini-2.0-flash",
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-20250514",
};

const PROVIDER_KEY_URLS: Record<LlmProvider, string> = {
  google: "https://aistudio.google.com/apikey",
  openai: "https://platform.openai.com/api-keys",
  anthropic: "https://console.anthropic.com/settings/keys",
};

const PROVIDER_LABELS: Record<LlmProvider, string> = {
  google: "Google AI Studio",
  openai: "OpenAI",
  anthropic: "Anthropic",
};

const POPULAR_MODELS: Record<LlmProvider, string[]> = {
  google: ["gemini-2.0-flash", "gemini-2.5-pro", "gemini-2.5-flash"],
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "o3-mini"],
  anthropic: ["claude-sonnet-4-20250514", "claude-haiku-3-5-20241022", "claude-opus-4-20250514"],
};

const ADVANCED_PROVIDERS: LlmProvider[] = ["openai", "anthropic"];

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
  fontSize: "16px",
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

  const initialProvider: LlmProvider = currentConfig?.provider ?? "google";
  const [selectedProvider, setSelectedProvider] = useState<LlmProvider>(initialProvider);
  const [model, setModel] = useState(currentConfig?.model ?? DEFAULT_MODELS[initialProvider]);
  const [clipboardError, setClipboardError] = useState<string | null>(null);
  const apiKeyRef = useRef<HTMLInputElement>(null);

  function handleProviderChange(p: LlmProvider) {
    setSelectedProvider(p);
    setModel(DEFAULT_MODELS[p]);
  }

  async function handlePaste() {
    setClipboardError(null);
    try {
      const text = await navigator.clipboard.readText();
      if (apiKeyRef.current) {
        apiKeyRef.current.value = text.trim();
      }
    } catch {
      setClipboardError("Clipboard access denied. Paste manually with Ctrl/Cmd+V.");
      setTimeout(() => setClipboardError(null), 4000);
    }
  }

  const isAdvancedSelected = ADVANCED_PROVIDERS.includes(selectedProvider);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      <div
        style={{
          padding: "1rem",
          border: `1px solid ${selectedProvider === "google" ? "var(--color-cold)" : "var(--color-border)"}`,
          borderRadius: "var(--radius-card)",
          background: selectedProvider === "google" ? "var(--color-cold-dim)" : "transparent",
          transition: "border-color 150ms ease, background 150ms ease",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            cursor: "pointer",
          }}
        >
          <input
            type="radio"
            name="provider"
            value="google"
            checked={selectedProvider === "google"}
            onChange={() => handleProviderChange("google")}
            style={{
              width: "1.125rem",
              height: "1.125rem",
              marginTop: "0.125rem",
              cursor: "pointer",
              accentColor: "var(--color-cold)",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "0.9375rem", color: "var(--color-text)" }}>
                Google AI Studio
              </span>
              <span
                style={{
                  fontSize: "0.625rem",
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--color-cold)",
                  border: "1px solid var(--color-cold)",
                  borderRadius: "0.25rem",
                  padding: "0.125rem 0.375rem",
                }}
              >
                free
              </span>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", lineHeight: 1.5, margin: 0 }}>
              Use your Google account. Generous free limits — no billing required.
            </p>
          </div>
        </label>
      </div>

      <details
        open={isAdvancedSelected}
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <summary
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            cursor: "pointer",
            listStyle: "none",
            fontSize: "0.8125rem",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: isAdvancedSelected ? "var(--color-accent)" : "var(--color-muted)",
            padding: "0.5rem 0",
            minHeight: "44px",
            userSelect: "none",
          }}
        >
          <span style={{ fontSize: "0.625rem" }}>▶</span>
          <span>Advanced Providers</span>
          {isAdvancedSelected && (
            <span
              style={{
                fontSize: "0.625rem",
                fontFamily: "var(--font-display)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--color-accent)",
                border: "1px solid var(--color-accent)",
                borderRadius: "0.25rem",
                padding: "0.125rem 0.375rem",
              }}
            >
              active
            </span>
          )}
        </summary>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid var(--color-border)",
            marginTop: "0.25rem",
          }}
        >
          <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", lineHeight: 1.5, marginBottom: "0.25rem" }}>
            Requires a paid API key from the provider. Use if you already have an existing subscription.
          </p>
          {ADVANCED_PROVIDERS.map((p) => (
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
                style={{
                  width: "1.125rem",
                  height: "1.125rem",
                  cursor: "pointer",
                  accentColor: "var(--color-accent)",
                }}
              />
              <span style={{ fontFamily: "var(--font-body)" }}>{PROVIDER_LABELS[p]}</span>
            </label>
          ))}
        </div>
      </details>

      <div>
        <label htmlFor="settings-model" style={labelStyle}>
          Model
        </label>
        <input
          id="settings-model"
          name="model"
          type="text"
          list="model-options"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={`e.g. ${DEFAULT_MODELS[selectedProvider]}`}
          style={inputStyle}
          autoComplete="off"
        />
        <datalist id="model-options">
          {POPULAR_MODELS[selectedProvider].map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>

      <div>
        <label htmlFor="settings-api-key" style={labelStyle}>
          API Key
        </label>
        <a
          href={PROVIDER_KEY_URLS[selectedProvider]}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            fontSize: "0.75rem",
            fontFamily: "var(--font-display)",
            color: "var(--color-cold)",
            textDecoration: "underline",
            textDecorationColor: "var(--color-border)",
            marginBottom: "0.5rem",
            letterSpacing: "0.03em",
          }}
        >
          Get {PROVIDER_LABELS[selectedProvider]} API key ↗
        </a>
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
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "stretch" }}>
          <input
            ref={apiKeyRef}
            id="settings-api-key"
            name="api_key"
            type="password"
            placeholder={currentConfig?.api_key_masked ? "Enter new key to replace" : "Paste your API key"}
            style={{ ...inputStyle, flex: 1 }}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={handlePaste}
            style={{
              minHeight: "44px",
              padding: "0 0.875rem",
              background: "transparent",
              border: "1px solid var(--color-cold)",
              borderRadius: "var(--radius-input, 0.375rem)",
              color: "var(--color-cold)",
              fontSize: "0.75rem",
              fontFamily: "var(--font-display)",
              letterSpacing: "0.05em",
              cursor: "pointer",
              touchAction: "manipulation",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Paste
          </button>
        </div>
        {clipboardError && (
          <p
            style={{
              fontSize: "0.75rem",
              color: "#f87171",
              marginTop: "0.375rem",
              lineHeight: 1.4,
            }}
          >
            {clipboardError}
          </p>
        )}
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
