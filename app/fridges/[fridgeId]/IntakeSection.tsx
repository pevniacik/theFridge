"use client";

/**
 * app/fridges/[fridgeId]/IntakeSection.tsx
 *
 * Review-first photo intake flow.
 * Phases: idle → uploading → review → confirming → done | error
 *
 * Styling: inline style with var(--color-*) tokens to match the dark industrial
 * aesthetic established by S01 components.
 */

import { useState, useRef } from "react";
import { nanoid } from "nanoid";
import type { DraftItem } from "@/lib/intake/types";
import { confirmDraftAction } from "./actions";
import { compressImage } from "@/lib/image/compress";

type Phase = "idle" | "uploading" | "review" | "confirming" | "done" | "error" | "single-add";

interface Props {
  fridgeId: string;
}

export default function IntakeSection({ fridgeId }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File selection handler ────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhase("uploading");
    setError(null);

    try {
      const compressed = await compressImage(file);
      const compressedFile = new File([compressed], file.name, { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("photo", compressedFile);

      const res = await fetch(`/api/intake/${fridgeId}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !Array.isArray(data.items)) {
        const msg = data.error ?? `Extraction failed (HTTP ${res.status})`;
        setError(msg);
        setPhase("error");
        return;
      }

      if (data.items.length === 0) {
        setError("No items were detected in the photo. Try a different image.");
        setPhase("error");
        return;
      }

      // Assign stable client-side IDs for React keys and the DB write.
      const drafts: DraftItem[] = (data.items as DraftItem[]).map((item) => ({
        ...item,
        id: nanoid(10),
      }));

      setItems(drafts);
      setPhase("review");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      setPhase("error");
    } finally {
      // Reset file input so the same file can be re-selected if needed.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ── Item field update ─────────────────────────────────────────────────────
  function updateItem(id: string, field: keyof DraftItem, value: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  // ── Delete a row ──────────────────────────────────────────────────────────
  function deleteItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  // ── Confirm handler ───────────────────────────────────────────────────────
  async function handleConfirm() {
    if (items.length === 0) return;
    setPhase("confirming");

    const result = await confirmDraftAction(fridgeId, items);

    if (result.success) {
      setConfirmedCount(result.count);
      setPhase("done");
    } else {
      setError(result.error ?? "Confirm failed");
      setPhase("error");
    }
  }

  // ── Reset to idle ─────────────────────────────────────────────────────────
  function reset() {
    setPhase("idle");
    setItems([]);
    setError(null);
    setConfirmedCount(0);
  }

  // ── Shared card wrapper ───────────────────────────────────────────────────
  const card: React.CSSProperties = {
    padding: "1.5rem",
    background: "var(--color-panel)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-card)",
  };

  const label: React.CSSProperties = {
    fontFamily: "var(--font-display)",
    fontSize: "0.6875rem",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "var(--color-cold)",
    marginBottom: "1rem",
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // IDLE PHASE
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === "idle") {
    return (
      <div style={card}>
        <p style={label}>grocery intake</p>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1rem",
            fontWeight: 700,
            color: "var(--color-text)",
            marginBottom: "0.375rem",
            letterSpacing: "-0.02em",
          }}
        >
          Add groceries
        </h2>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--color-muted)",
            marginBottom: "1.25rem",
            lineHeight: 1.6,
          }}
        >
          Take a photo of your groceries. AI will extract a draft list — you can
          edit it before confirming.
        </p>

        {/* Visible trigger buttons */}
        <style>{`
          .intake-actions {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          @media (min-width: 640px) {
            .intake-actions {
              flex-direction: row;
            }
            .intake-actions > * {
              flex: 1;
            }
          }
        `}</style>
        <div className="intake-actions">
          <label
            htmlFor="photo-input"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              minHeight: "56px",
              background: "var(--color-cold-dim)",
              color: "var(--color-cold)",
              border: "1px solid var(--color-cold)",
              borderRadius: "var(--radius-card)",
              fontFamily: "var(--font-display)",
              fontSize: "1rem",
              letterSpacing: "0.05em",
              cursor: "pointer",
              transition: "opacity 150ms ease, transform 100ms ease",
              touchAction: "manipulation",
              width: "100%",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <span style={{ fontSize: "1.25rem" }}>📷</span>
            Take Photo
          </label>
          <input
            id="photo-input"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          <button
            onClick={() => setPhase("single-add")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              minHeight: "56px",
              background: "transparent",
              color: "var(--color-text)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-card)",
              fontFamily: "var(--font-display)",
              fontSize: "1rem",
              letterSpacing: "0.05em",
              cursor: "pointer",
              transition: "border-color 150ms ease, transform 100ms ease",
              touchAction: "manipulation",
              width: "100%",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-cold)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <span style={{ fontSize: "1.25rem" }}>➕</span>
            Add Single Item
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SINGLE ADD PHASE (Placeholder for T16)
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === "single-add") {
    return (
      <div style={card}>
        <p style={label}>grocery intake</p>
        <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
          Single item form will be implemented here.
        </p>
        <button
          onClick={reset}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-muted)",
            fontSize: "0.8125rem",
            cursor: "pointer",
            padding: "0.25rem 0",
            fontFamily: "var(--font-body)",
            textDecoration: "underline",
            textDecorationColor: "var(--color-border)",
            touchAction: "manipulation",
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPLOADING PHASE
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === "uploading") {
    return (
      <div style={card}>
        <p style={label}>grocery intake</p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            color: "var(--color-muted)",
            fontSize: "0.875rem",
          }}
        >
          {/* Simple CSS spinner */}
          <span
            style={{
              display: "inline-block",
              width: "1rem",
              height: "1rem",
              border: "2px solid var(--color-border)",
              borderTopColor: "var(--color-cold)",
              borderRadius: "50%",
              animation: "intake-spin 0.7s linear infinite",
            }}
          />
          <style>{`@keyframes intake-spin { to { transform: rotate(360deg); } }`}</style>
          Analyzing photo…
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REVIEW PHASE
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === "review" || phase === "confirming") {
    const isConfirming = phase === "confirming";

    return (
      <div style={card}>
        <p style={label}>review draft · {items.length} item{items.length !== 1 ? "s" : ""}</p>

        {/* Draft rows */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "0.75rem",
            marginBottom: "1.25rem",
          }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 4.5rem 4.5rem auto auto",
                gap: "0.5rem",
                alignItems: "center",
                background: "var(--color-surface)",
                padding: "0.5rem",
                borderRadius: "var(--radius-card)",
                border: "1px solid var(--color-border)",
              }}
            >
              {/* Name */}
              <input
                type="text"
                value={item.name}
                placeholder="Item name"
                onChange={(e) => updateItem(item.id, "name", e.target.value)}
                disabled={isConfirming}
                style={{
                  padding: "0.375rem 0.625rem",
                  minHeight: "44px",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-card)",
                  color: "var(--color-text)",
                  fontFamily: "var(--font-body)",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border-color 120ms ease",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-cold)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
              />

              {/* Quantity */}
              <input
                type="text"
                value={item.quantity}
                placeholder="Qty"
                onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                disabled={isConfirming}
                style={{
                  padding: "0.375rem 0.5rem",
                  minHeight: "44px",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-card)",
                  color: "var(--color-text)",
                  fontFamily: "var(--font-body)",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border-color 120ms ease",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-cold)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
              />

              {/* Unit */}
              <input
                type="text"
                value={item.unit}
                placeholder="Unit"
                onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                disabled={isConfirming}
                style={{
                  padding: "0.375rem 0.5rem",
                  minHeight: "44px",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-card)",
                  color: "var(--color-text)",
                  fontFamily: "var(--font-body)",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border-color 120ms ease",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-cold)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
              />

              {/* Low-confidence badge */}
              <span
                title={item.confidence === "low" ? "Low confidence — please verify" : undefined}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "1.25rem",
                  height: "1.25rem",
                  background: item.confidence === "low" ? "#78350f" : "transparent",
                  border: item.confidence === "low" ? "1px solid #d97706" : "1px solid transparent",
                  borderRadius: "0.25rem",
                  fontSize: "0.625rem",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  color: item.confidence === "low" ? "#fbbf24" : "transparent",
                  cursor: item.confidence === "low" ? "help" : "default",
                  flexShrink: 0,
                }}
              >
                {item.confidence === "low" ? "?" : ""}
              </span>

              {/* Delete button */}
              <button
                onClick={() => deleteItem(item.id)}
                disabled={isConfirming}
                title="Remove item"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "2.75rem",
                  height: "2.75rem",
                  background: "transparent",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-card)",
                  color: "var(--color-muted)",
                  cursor: "pointer",
                  fontSize: "1.25rem",
                  lineHeight: 1,
                  flexShrink: 0,
                  transition: "border-color 120ms ease, color 120ms ease",
                  touchAction: "manipulation",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#f87171";
                  e.currentTarget.style.color = "#f87171";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-border)";
                  e.currentTarget.style.color = "var(--color-muted)";
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Action row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={handleConfirm}
            disabled={items.length === 0 || isConfirming}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.5rem 1.125rem",
              minHeight: "44px",
              background: items.length === 0 || isConfirming ? "var(--color-cold-dim)" : "var(--color-cold-dim)",
              color: items.length === 0 || isConfirming ? "var(--color-muted)" : "var(--color-cold)",
              border: `1px solid ${items.length === 0 || isConfirming ? "var(--color-border)" : "var(--color-cold)"}`,
              borderRadius: "var(--radius-card)",
              fontFamily: "var(--font-display)",
              fontSize: "0.8125rem",
              letterSpacing: "0.05em",
              cursor: items.length === 0 || isConfirming ? "not-allowed" : "pointer",
              opacity: items.length === 0 ? 0.45 : 1,
              transition: "opacity 150ms ease, transform 100ms ease",
              touchAction: "manipulation",
            }}
            onMouseEnter={(e) => {
              if (items.length > 0 && !isConfirming) e.currentTarget.style.opacity = "0.85";
            }}
            onMouseLeave={(e) => {
              if (items.length > 0 && !isConfirming) e.currentTarget.style.opacity = "1";
            }}
            onMouseDown={(e) => {
              if (items.length > 0 && !isConfirming) e.currentTarget.style.transform = "scale(0.96)";
            }}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {isConfirming ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: "0.75rem",
                    height: "0.75rem",
                    border: "2px solid var(--color-border)",
                    borderTopColor: "var(--color-cold)",
                    borderRadius: "50%",
                    animation: "intake-spin 0.7s linear infinite",
                  }}
                />
                Saving…
              </>
            ) : (
              <>Confirm {items.length} item{items.length !== 1 ? "s" : ""} →</>
            )}
          </button>

          <button
            onClick={reset}
            disabled={isConfirming}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-muted)",
              fontSize: "0.8125rem",
              cursor: isConfirming ? "not-allowed" : "pointer",
              padding: "0.25rem 0",
              minHeight: "44px",
              fontFamily: "var(--font-body)",
              textDecoration: "underline",
              textDecorationColor: "var(--color-border)",
              transition: "color 120ms ease",
              touchAction: "manipulation",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-muted)")}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DONE PHASE
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === "done") {
    return (
      <div
        style={{
          ...card,
          border: "1px solid var(--color-cold-dim)",
        }}
      >
        <p style={label}>grocery intake</p>
        <p
          style={{
            fontSize: "0.9375rem",
            color: "var(--color-cold)",
            fontFamily: "var(--font-display)",
            marginBottom: "0.375rem",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          ✓ {confirmedCount} item{confirmedCount !== 1 ? "s" : ""} saved
        </p>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--color-muted)",
            marginBottom: "1.25rem",
            lineHeight: 1.6,
          }}
        >
          Ready for inventory confirmation.
        </p>
        <button
          onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              minHeight: "44px",
              background: "transparent",
              color: "var(--color-muted)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-card)",
              fontFamily: "var(--font-display)",
              fontSize: "0.8125rem",
              letterSpacing: "0.05em",
              cursor: "pointer",
              transition: "border-color 120ms ease, color 120ms ease",
              touchAction: "manipulation",
            }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--color-cold)";
            e.currentTarget.style.color = "var(--color-cold)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--color-border)";
            e.currentTarget.style.color = "var(--color-muted)";
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          Upload more
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR PHASE
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        ...card,
        border: "1px solid rgba(248,113,113,0.3)",
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
        intake error
      </p>
      <p
        style={{
          fontSize: "0.875rem",
          color: "var(--color-muted)",
          marginBottom: "1.25rem",
          lineHeight: 1.6,
        }}
      >
        {error ?? "Something went wrong."}
      </p>
      <button
        onClick={reset}
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0.5rem 1rem",
          minHeight: "44px",
          background: "transparent",
          color: "#f87171",
          border: "1px solid rgba(248,113,113,0.4)",
          borderRadius: "var(--radius-card)",
          fontFamily: "var(--font-display)",
          fontSize: "0.8125rem",
          letterSpacing: "0.05em",
          cursor: "pointer",
          transition: "border-color 120ms ease, opacity 120ms ease",
          touchAction: "manipulation",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        Try again
      </button>
    </div>
  );
}
