/**
 * app/fridges/[fridgeId]/page.tsx
 * Storage-context page: resolves a fridge/freezer ID into its identity record,
 * renders the unit's details, and displays its printable QR code.
 *
 * Renders a clear not-found UI when the ID does not exist in the DB.
 */

import Link from "next/link";
import { headers } from "next/headers";
import { getFridgeById } from "@/lib/fridges/store";
import QrCode from "@/components/QrCode";

interface Props {
  params: Promise<{ fridgeId: string }>;
}

/** Derive the app's base URL for QR code generation. */
async function getBaseUrl(): Promise<string> {
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export default async function FridgeContextPage({ params }: Props) {
  const { fridgeId } = await params;
  const fridge = getFridgeById(fridgeId);

  // ── Not found ────────────────────────────────────────────────────────────
  if (!fridge) {
    return (
      <div
        style={{
          maxWidth: "40rem",
          margin: "0 auto",
          padding: "3rem 1.5rem",
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
          <span style={{ color: "#f87171" }}>not found</span>
        </nav>

        <div
          style={{
            padding: "2rem",
            background: "var(--color-panel)",
            border: "1px solid rgba(248,113,113,0.25)",
            borderRadius: "var(--radius-card)",
            marginBottom: "1.5rem",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "0.6875rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#f87171",
              marginBottom: "0.5rem",
            }}
          >
            storage not found
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "var(--color-text)",
              marginBottom: "0.75rem",
            }}
          >
            No storage with ID <code style={{ color: "var(--color-accent)" }}>{fridgeId}</code>
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", lineHeight: 1.6 }}>
            This QR code may point to a storage unit that was deleted, or the ID
            may be incorrect. Check the QR label on the unit or{" "}
            <Link href="/fridges/new" style={{ color: "var(--color-cold)" }}>
              add a new one
            </Link>
            .
          </p>
        </div>

        <Link href="/" style={{ fontSize: "0.875rem", color: "var(--color-muted)", textDecoration: "none" }}>
          ← Back to overview
        </Link>
      </div>
    );
  }

  // ── Found ─────────────────────────────────────────────────────────────────
  const baseUrl = await getBaseUrl();
  const typeLabel = fridge.type === "fridge" ? "Refrigerator" : "Freezer";
  const typeColor = fridge.type === "fridge" ? "var(--color-cold)" : "#a78bfa";

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
        <Link href="/" style={{ color: "var(--color-muted)", textDecoration: "none" }}>
          theFridge
        </Link>
        <span>/</span>
        <span style={{ color: "var(--color-text)" }}>{fridge.name}</span>
      </nav>

      {/* Identity card */}
      <div
        style={{
          padding: "1.5rem",
          background: "var(--color-panel)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-card)",
          marginBottom: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.6875rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: typeColor,
          }}
        >
          storage context · {typeLabel}
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.75rem",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "var(--color-text)",
          }}
        >
          {fridge.name}
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", fontFamily: "var(--font-display)" }}>
          ID: {fridge.id} · Added {new Date(fridge.created_at).toLocaleDateString()}
        </p>
      </div>

      {/* QR code + instructions */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "2rem",
          alignItems: "start",
          padding: "1.5rem",
          background: "var(--color-panel)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-card)",
          marginBottom: "2rem",
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
              marginBottom: "1rem",
            }}
          >
            printable QR
          </p>
          <QrCode baseUrl={baseUrl} fridgeId={fridge.id} size={180} />
        </div>

        <div>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "0.6875rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--color-cold)",
              marginBottom: "0.75rem",
            }}
          >
            instructions
          </p>
          <ol
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.625rem",
              paddingLeft: "1.25rem",
              fontSize: "0.875rem",
              color: "var(--color-muted)",
              lineHeight: 1.6,
            }}
          >
            <li>Print this page (Ctrl/Cmd + P) or screenshot the QR code.</li>
            <li>Stick the label on the door of <strong style={{ color: "var(--color-text)" }}>{fridge.name}</strong>.</li>
            <li>Scan with any phone on the same network to open this page instantly.</li>
          </ol>
        </div>
      </div>

      {/* Inventory placeholder (wired in T03) */}
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
        <p>Items will appear here once the data layer is connected.</p>
      </div>

      {/* Actions */}
      <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", alignItems: "center" }}>
        <Link href="/" style={{ fontSize: "0.875rem", color: "var(--color-muted)", textDecoration: "none" }}>
          ← Back to overview
        </Link>
        <Link
          href="/fridges/new"
          style={{ fontSize: "0.875rem", color: "var(--color-cold)", textDecoration: "none" }}
        >
          + Add another
        </Link>
      </div>
    </div>
  );
}
