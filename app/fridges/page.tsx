import Link from "next/link";
import { listFridges } from "@/lib/fridges/store";

export const metadata = {
  title: "My Fridges — theFridge",
};

export default function FridgesPage() {
  const fridges = listFridges();

  return (
    <div
      style={{
        maxWidth: "52rem",
        margin: "0 auto",
        padding: "clamp(1rem, 4vw, 3rem) clamp(1rem, 4vw, 1.5rem)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "2rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "0.6875rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--color-cold)",
              marginBottom: "0.375rem",
            }}
          >
            storage contexts
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "var(--color-text)",
            }}
          >
            My Fridges & Freezers
          </h1>
        </div>
        <Link
          href="/fridges/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            minHeight: "44px",
            padding: "0.5rem 1rem",
            background: "var(--color-accent)",
            color: "var(--color-surface)",
            borderRadius: "var(--radius-card)",
            fontFamily: "var(--font-display)",
            fontSize: "0.8125rem",
            letterSpacing: "0.04em",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          + Add new
        </Link>
      </div>

      {fridges.length === 0 ? (
        <div
          style={{
            padding: "2rem",
            background: "var(--color-panel)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-card)",
            textAlign: "center",
          }}
        >
          <p style={{ color: "var(--color-muted)", fontSize: "0.9375rem", marginBottom: "1rem" }}>
            No storage contexts yet.
          </p>
          <Link
            href="/fridges/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              minHeight: "44px",
              padding: "0.5rem 1.25rem",
              background: "var(--color-accent)",
              color: "var(--color-surface)",
              borderRadius: "var(--radius-card)",
              fontFamily: "var(--font-display)",
              fontSize: "0.875rem",
              textDecoration: "none",
            }}
          >
            + Add your first fridge or freezer
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {fridges.map((fridge) => (
            <Link
              key={fridge.id}
              href={`/fridges/${fridge.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                padding: "1rem 1.25rem",
                background: "var(--color-panel)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-card)",
                textDecoration: "none",
              }}
            >
              <div>
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "0.6875rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: fridge.type === "fridge" ? "var(--color-cold)" : "#a78bfa",
                    marginBottom: "0.25rem",
                  }}
                >
                  {fridge.type}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "var(--color-text)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {fridge.name}
                </p>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--color-muted)",
                    fontFamily: "var(--font-display)",
                    marginTop: "0.25rem",
                  }}
                >
                  Added {new Date(fridge.created_at).toLocaleDateString()}
                </p>
              </div>
              <span style={{ color: "var(--color-cold)", fontSize: "1.25rem", flexShrink: 0 }}>
                →
              </span>
            </Link>
          ))}
        </div>
      )}

      <div style={{ marginTop: "2rem" }}>
        <Link href="/" style={{ fontSize: "0.875rem", color: "var(--color-muted)", textDecoration: "none" }}>
          ← Home
        </Link>
      </div>
    </div>
  );
}
