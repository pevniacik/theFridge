import Link from "next/link";

export default function HomePage() {
  return (
    <div
      style={{
        maxWidth: "52rem",
        margin: "0 auto",
        padding: "4rem 1.5rem",
      }}
    >
      {/* Hero */}
      <div style={{ marginBottom: "3.5rem" }}>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.6875rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--color-accent)",
            marginBottom: "1rem",
          }}
        >
          v1 · local-first
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            color: "var(--color-text)",
            marginBottom: "1.25rem",
          }}
        >
          Every fridge.
          <br />
          Every freezer.
          <br />
          <span style={{ color: "var(--color-cold)" }}>Always in context.</span>
        </h1>
        <p
          style={{
            fontSize: "1.0625rem",
            lineHeight: 1.65,
            color: "var(--color-muted)",
            maxWidth: "36rem",
          }}
        >
          Stick a QR code on the door. Scan it on your home network. The right
          storage context opens instantly — no app downloads, no accounts, just
          your inventory.
        </p>
      </div>

      {/* How it works */}
      <div style={{ marginBottom: "3.5rem" }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.6875rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--color-muted)",
            marginBottom: "1.5rem",
          }}
        >
          How it works
        </h2>
        <ol
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            listStyle: "none",
            padding: 0,
            margin: 0,
          }}
        >
          {steps.map((step, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                gap: "1rem",
                alignItems: "flex-start",
                padding: "1rem 1.25rem",
                background: "var(--color-panel)",
                borderRadius: "var(--radius-card)",
                border: "1px solid var(--color-border)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--color-accent)",
                  minWidth: "1.5rem",
                  paddingTop: "0.125rem",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p
                  style={{
                    fontWeight: 500,
                    marginBottom: "0.25rem",
                    color: "var(--color-text)",
                  }}
                >
                  {step.title}
                </p>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--color-muted)",
                    lineHeight: 1.55,
                  }}
                >
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* CTA */}
      <div style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap" }}>
        <Link
          href="/fridges/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.625rem 1.25rem",
            background: "var(--color-accent)",
            color: "#0f1011",
            fontWeight: 600,
            fontSize: "0.9375rem",
            borderRadius: "var(--radius-card)",
            textDecoration: "none",
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.02em",
          }}
        >
          + Add storage context
        </Link>
        <Link
          href="/fridges"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0.625rem 1.25rem",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
            fontWeight: 500,
            fontSize: "0.9375rem",
            borderRadius: "var(--radius-card)",
            textDecoration: "none",
          }}
        >
          View all →
        </Link>
      </div>
    </div>
  );
}

const steps = [
  {
    title: "Name your fridge or freezer",
    description:
      'Give it a label like "Kitchen Fridge" or "Garage Freezer". The app assigns it a stable ID.',
  },
  {
    title: "Print the QR code",
    description:
      "One page, one code. Stick it on the door. The code encodes this device's local URL.",
  },
  {
    title: "Scan to open the context",
    description:
      "From any device on the same network, scanning the code opens that storage context directly.",
  },
  {
    title: "Track what's inside",
    description:
      "Add, update, and remove items. Review AI-suggested intakes before they become truth.",
  },
];
