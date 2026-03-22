import Link from "next/link";
import { getMaskedConfig } from "./actions";
import SettingsForm from "./SettingsForm";

export const metadata = {
  title: "Settings — theFridge",
};

export default async function SettingsPage() {
  const currentConfig = await getMaskedConfig();

  return (
    <div
      style={{
        maxWidth: "40rem",
        margin: "0 auto",
        padding: "clamp(1rem, 4vw, 3rem) clamp(1rem, 4vw, 1.5rem)",
      }}
    >
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "2.5rem",
          fontSize: "0.8125rem",
          color: "var(--color-muted)",
        }}
      >
        <Link href="/" style={{ color: "var(--color-muted)", textDecoration: "none" }}>
          theFridge
        </Link>
        <span>/</span>
        <span style={{ color: "var(--color-text)" }}>settings</span>
      </nav>

      <div style={{ marginBottom: "2.5rem" }}>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.6875rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--color-cold)",
            marginBottom: "0.5rem",
          }}
        >
          configuration
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.75rem",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "var(--color-text)",
            marginBottom: "0.75rem",
          }}
        >
          AI Provider Settings
        </h1>
        <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", lineHeight: 1.6 }}>
          Google AI Studio is recommended — free with your Google account, no billing required.
          Your API key is stored locally and never shared.
        </p>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            marginTop: "0.875rem",
            padding: "0.375rem 0.75rem",
            borderRadius: "var(--radius-card)",
            background: currentConfig ? "var(--color-cold-dim)" : "color-mix(in srgb, #f87171 12%, transparent)",
            border: `1px solid ${currentConfig ? "var(--color-cold)" : "#f87171"}`,
          }}
        >
          <span
            style={{
              width: "0.5rem",
              height: "0.5rem",
              borderRadius: "50%",
              background: currentConfig ? "var(--color-cold)" : "#f87171",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "0.75rem",
              letterSpacing: "0.04em",
              color: currentConfig ? "var(--color-cold)" : "#f87171",
            }}
          >
            {currentConfig
              ? `Active: ${currentConfig.provider === "google" ? "Google AI Studio" : currentConfig.provider === "openai" ? "OpenAI" : "Anthropic"} · ${currentConfig.model}`
              : "No provider configured"}
          </span>
        </div>
      </div>

      <div
        style={{
        padding: "clamp(1rem, 4vw, 2rem)",
        background: "var(--color-panel)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-card)",
        }}
      >
        <SettingsForm currentConfig={currentConfig} />
      </div>

      <div style={{ marginTop: "2rem" }}>
        <Link href="/fridges" style={{ fontSize: "0.875rem", color: "var(--color-muted)", textDecoration: "none" }}>
          ← Back to overview
        </Link>
      </div>
    </div>
  );
}
