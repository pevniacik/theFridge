/**
 * app/fridges/new/page.tsx
 * Create a new fridge or freezer identity record.
 * Server component shell — the actual form is a client component.
 */

import Link from "next/link";
import CreateFridgeForm from "./CreateFridgeForm";

export const metadata = {
  title: "Add storage — theFridge",
};

export default function NewFridgePage() {
  return (
    <div
      style={{
        maxWidth: "40rem",
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
        <span style={{ color: "var(--color-text)" }}>add storage</span>
      </nav>

      {/* Header */}
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
          new storage unit
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
          Add a fridge or freezer
        </h1>
        <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", lineHeight: 1.6 }}>
          Give your storage unit a name and type. A printable QR code will be
          generated — stick it on the door so anyone on the network can scan
          to open its inventory.
        </p>
      </div>

      {/* Card wrapping the form */}
      <div
        style={{
          padding: "2rem",
          background: "var(--color-panel)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <CreateFridgeForm />
      </div>

      {/* Back */}
      <div style={{ marginTop: "2rem" }}>
        <Link href="/" style={{ fontSize: "0.875rem", color: "var(--color-muted)", textDecoration: "none" }}>
          ← Back to overview
        </Link>
      </div>
    </div>
  );
}
