import Link from "next/link";

interface Props {
  params: Promise<{ fridgeId: string }>;
}

export default async function FridgeContextPage({ params }: Props) {
  const { fridgeId } = await params;

  return (
    <div
      style={{
        maxWidth: "52rem",
        margin: "0 auto",
        padding: "3rem 1.5rem",
      }}
    >
      {/* Breadcrumb */}
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
        <Link
          href="/"
          style={{ color: "var(--color-muted)", textDecoration: "none" }}
        >
          theFridge
        </Link>
        <span>/</span>
        <span style={{ color: "var(--color-text)" }}>{fridgeId}</span>
      </nav>

      {/* Context header */}
      <div
        style={{
          padding: "1.5rem",
          background: "var(--color-panel)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-card)",
          marginBottom: "2rem",
        }}
      >
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
          storage context
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.5rem",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "var(--color-text)",
            marginBottom: "0.75rem",
          }}
        >
          {fridgeId}
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--color-muted)",
            lineHeight: 1.55,
          }}
        >
          This context ID will be resolved to a named fridge or freezer once
          identity records are wired in (T02). For now, the route is live and
          the QR entry plumbing is in place.
        </p>
      </div>

      {/* Placeholder inventory */}
      <div
        style={{
          padding: "2.5rem 1.5rem",
          border: "1px dashed var(--color-border)",
          borderRadius: "var(--radius-card)",
          textAlign: "center",
          color: "var(--color-muted)",
          fontSize: "0.875rem",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.6875rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: "0.5rem",
          }}
        >
          inventory
        </p>
        <p>Items will appear here once the data layer is connected (T02–T03).</p>
      </div>

      {/* Back */}
      <div style={{ marginTop: "2rem" }}>
        <Link
          href="/"
          style={{
            fontSize: "0.875rem",
            color: "var(--color-muted)",
            textDecoration: "none",
          }}
        >
          ← Back to overview
        </Link>
      </div>
    </div>
  );
}
