import Link from "next/link";

interface Props {
  hasProvider: boolean;
  providerLabel?: string;
  model?: string;
}

export default function SetupBanner({ hasProvider, providerLabel, model }: Props) {
  if (hasProvider) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          padding: "0.5rem 0.875rem",
          background: "var(--color-cold-dim)",
          border: "1px solid var(--color-cold)",
          borderRadius: "var(--radius-card)",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            width: "0.5rem",
            height: "0.5rem",
            borderRadius: "50%",
            background: "var(--color-cold)",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.75rem",
            letterSpacing: "0.04em",
            color: "var(--color-cold)",
          }}
        >
          AI: {providerLabel ?? "configured"}{model ? ` · ${model}` : ""}
        </span>
        <Link
          href="/settings"
          style={{
            marginLeft: "auto",
            fontSize: "0.75rem",
            fontFamily: "var(--font-display)",
            color: "var(--color-muted)",
            textDecoration: "none",
            letterSpacing: "0.04em",
          }}
        >
          change ↗
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        padding: "0.875rem 1.25rem",
        background: "var(--color-cold-dim)",
        border: "1px solid var(--color-cold)",
        borderRadius: "var(--radius-card)",
        marginBottom: "1.5rem",
        flexWrap: "wrap",
      }}
    >
      <div>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.8125rem",
            color: "var(--color-cold)",
            marginBottom: "0.25rem",
          }}
        >
          AI extraction not configured
        </p>
        <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", lineHeight: 1.5 }}>
          Set up Google AI Studio for free — takes 30 seconds with your Google account.
        </p>
      </div>
      <Link
        href="/settings"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.375rem",
          minHeight: "44px",
          padding: "0.5rem 1rem",
          background: "var(--color-cold)",
          color: "var(--color-surface)",
          borderRadius: "var(--radius-card)",
          fontFamily: "var(--font-display)",
          fontSize: "0.75rem",
          letterSpacing: "0.05em",
          textDecoration: "none",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Set up AI ↗
      </Link>
    </div>
  );
}
