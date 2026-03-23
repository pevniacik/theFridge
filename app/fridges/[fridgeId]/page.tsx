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
import { listPendingDrafts, listInventoryItems } from "@/lib/inventory/store";
import { analyzeInventory, generateSuggestions } from "@/lib/inventory/analysis";
import QrCode from "@/components/QrCode";
import { resolveQrBaseUrl } from "@/lib/qr/origin";
import { getActiveProvider } from "@/lib/settings/store";
import IntakeSection from "./IntakeSection";
import SetupBanner from "./SetupBanner";
import InventorySection from "./InventorySection";
import RecipeSection from "./RecipeSection";
import QrSection from "./QrSection";
import StatusSection from "./StatusSection";

interface Props {
  params: Promise<{ fridgeId: string }>;
}

/** Derive the app's base URL for QR code generation. */
async function getBaseUrl(): Promise<string> {
  const hdrs = await headers();
  return resolveQrBaseUrl(hdrs, process.env.QR_BASE_URL ?? null);
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
  const pendingDrafts = listPendingDrafts(fridge.id);
  const inventoryItems = listInventoryItems(fridge.id);
  const activeProvider = getActiveProvider();
  const providerLabelMap: Record<string, string> = {
    google: "Google AI Studio",
    openai: "OpenAI",
    anthropic: "Anthropic",
  };

  // ── Server-side analysis (S05) ────────────────────────────────────────────
  // analyzeInventory and generateSuggestions are pure synchronous functions
  // that run entirely on the server — no client fetch, no useEffect.
  // Results are passed as props to StatusSection in T02.
  const analysisResult = analyzeInventory(inventoryItems);
  const suggestions = generateSuggestions(inventoryItems);

  return (
    <div
      style={{
        maxWidth: "52rem",
        margin: "0 auto",
        padding: "clamp(1rem, 4vw, 3rem) clamp(1rem, 4vw, 1.5rem)",
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

      {/* QR code + instructions (collapsible on mobile) */}
      <QrSection>
        <div
          className="qr-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "2rem",
            alignItems: "start",
          }}
        >
          <div>
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
      </QrSection>

      <SetupBanner
        hasProvider={!!activeProvider}
        providerLabel={activeProvider ? providerLabelMap[activeProvider.provider] : undefined}
        model={activeProvider?.model}
      />

      <StatusSection analysisResult={analysisResult} suggestions={suggestions} />

      <IntakeSection fridgeId={fridge.id} storageType={fridge.type} />

      {fridge.type === "fridge" && <RecipeSection fridgeId={fridge.id} />}

      <InventorySection
        fridgeId={fridge.id}
        pendingDrafts={pendingDrafts}
        inventoryItems={inventoryItems}
        storageType={fridge.type}
      />

      {/* Actions */}
      <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", alignItems: "center" }}>
        <Link href="/fridges" style={{ fontSize: "0.875rem", color: "var(--color-muted)", textDecoration: "none" }}>
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
