"use client";

/**
 * app/fridges/[fridgeId]/InventorySection.tsx
 *
 * Shows pending draft items with per-item expiry inputs and a promote button.
 * After promotion, renders the current inventory list below with per-row
 * maintenance controls: edit (inline), mark-used, and mark-discarded.
 *
 * Phases (promote flow): idle → promoting → done | error
 * Per-row state: { pending, error } keyed by item.id
 * Edit mode: exclusive — only one row editable at a time via editingItemId
 *
 * Styling: inline style with var(--color-*) tokens, matching IntakeSection's
 * dark industrial aesthetic.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DraftItem } from "@/lib/intake/types";
import type { InventoryItem, InventoryItemInput, InventoryItemUpdateInput } from "@/lib/inventory/types";
import {
  promoteToInventoryAction,
  updateInventoryItemAction,
  setInventoryItemStatusAction,
} from "./actions";

type Phase = "idle" | "promoting" | "done" | "error";

interface ExpiryEntry {
  date: string;      // ISO "YYYY-MM-DD" or ""
  estimated: boolean;
}

/** Per-row async state for edit / use / discard actions. */
interface RowState {
  pending: boolean;
  error: string | null;
}

/** In-flight edit field values for the row currently in edit mode. */
interface EditDraft {
  name: string;
  quantity: string;
  unit: string;
  category: string;
  expiry_date: string; // "" means null
  expiry_estimated: boolean;
}

interface Props {
  fridgeId: string;
  pendingDrafts: DraftItem[];
  inventoryItems: InventoryItem[];
}

/** Compute an ISO date string N days from today using setDate (DST-safe). */
function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

const QUICK_PICKS: { label: string; days: number }[] = [
  { label: "3d", days: 3 },
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
];

export default function InventorySection({
  fridgeId,
  pendingDrafts,
  inventoryItems,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // ── Promote-flow state ───────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [promotedCount, setPromotedCount] = useState(0);

  // Per-item expiry state: keyed by draft.id
  const [expiryData, setExpiryData] = useState<Record<string, ExpiryEntry>>(
    () =>
      Object.fromEntries(
        pendingDrafts.map((d) => [d.id, { date: "", estimated: false }])
      )
  );

  // ── Inventory row maintenance state ─────────────────────────────────────
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

  // ── Shared styles (mirror IntakeSection) ────────────────────────────────
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

  // ── Expiry helpers (promote flow) ────────────────────────────────────────
  function setExplicitDate(draftId: string, value: string) {
    setExpiryData((prev) => ({
      ...prev,
      [draftId]: { date: value, estimated: false },
    }));
  }

  function setQuickPick(draftId: string, days: number) {
    setExpiryData((prev) => ({
      ...prev,
      [draftId]: { date: daysFromNow(days), estimated: true },
    }));
  }

  function clearExpiry(draftId: string) {
    setExpiryData((prev) => ({
      ...prev,
      [draftId]: { date: "", estimated: false },
    }));
  }

  /** True if the quick-pick's computed date matches the current stored date. */
  function isQuickPickActive(draftId: string, days: number): boolean {
    const entry = expiryData[draftId];
    if (!entry?.date || !entry.estimated) return false;
    return entry.date === daysFromNow(days);
  }

  // ── Promote handler ──────────────────────────────────────────────────────
  async function handlePromote() {
    if (pendingDrafts.length === 0 || phase === "promoting") return;
    setPhase("promoting");
    setError(null);

    const inputs: InventoryItemInput[] = pendingDrafts.map((draft) => ({
      draft_id: draft.id,
      name: draft.name,
      quantity: draft.quantity,
      unit: draft.unit,
      category: draft.category,
      confidence: draft.confidence,
      expiry_date: expiryData[draft.id]?.date || null,
      purchase_date: null,
      expiry_estimated: expiryData[draft.id]?.estimated || false,
    }));

    const result = await promoteToInventoryAction(fridgeId, inputs);

    if (result.success) {
      setPromotedCount(result.count);
      setPhase("done");
      startTransition(() => {
        router.refresh();
      });
    } else {
      setError(result.error ?? "Promote failed");
      setPhase("error");
    }
  }

  // ── Row state helpers ────────────────────────────────────────────────────
  function setRowPending(itemId: string, pending: boolean) {
    setRowStates((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], pending, error: prev[itemId]?.error ?? null },
    }));
  }

  function setRowError(itemId: string, error: string | null) {
    setRowStates((prev) => ({
      ...prev,
      [itemId]: { pending: false, error },
    }));
  }

  function clearRowError(itemId: string) {
    setRowStates((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }

  // ── Edit mode handlers ───────────────────────────────────────────────────
  function startEditing(item: InventoryItem) {
    setEditingItemId(item.id);
    setEditDraft({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      expiry_date: item.expiry_date ?? "",
      expiry_estimated: item.expiry_estimated,
    });
  }

  function cancelEditing() {
    setEditingItemId(null);
    setEditDraft(null);
  }

  async function handleSave(itemId: string) {
    if (!editDraft) return;

    const input: InventoryItemUpdateInput = {
      name: editDraft.name,
      quantity: editDraft.quantity,
      unit: editDraft.unit,
      category: editDraft.category,
      expiry_date: editDraft.expiry_date || null,
      expiry_estimated: editDraft.expiry_estimated,
    };

    setRowPending(itemId, true);
    const result = await updateInventoryItemAction(fridgeId, itemId, input);

    if (result.success) {
      setEditingItemId(null);
      setEditDraft(null);
      setRowStates((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      startTransition(() => router.refresh());
    } else {
      setRowError(itemId, result.error ?? "Save failed.");
    }
  }

  // ── Use / Discard handlers ───────────────────────────────────────────────
  async function handleStatusChange(itemId: string, status: "used" | "discarded") {
    setRowPending(itemId, true);
    const result = await setInventoryItemStatusAction(fridgeId, itemId, status);

    if (result.success) {
      // Item will vanish from the active list after router.refresh()
      startTransition(() => router.refresh());
    } else {
      setRowError(itemId, result.error ?? `Failed to mark as ${status}.`);
    }
  }

  // ── Small reusable button style factories ───────────────────────────────
  function actionBtnStyle(variant: "edit" | "used" | "discard", disabled: boolean): React.CSSProperties {
    const base: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0.1875rem 0.5rem",
      minHeight: "44px",
      touchAction: "manipulation",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-card)",
      fontFamily: "var(--font-display)",
      fontSize: "13px",
      letterSpacing: "0.07em",
      textTransform: "uppercase",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "border-color 120ms ease, color 120ms ease, opacity 120ms ease",
      background: "transparent",
      opacity: disabled ? 0.45 : 1,
      flexShrink: 0,
    };
    if (variant === "edit") {
      return { ...base, color: "var(--color-cold)", borderColor: "var(--color-border)" };
    }
    if (variant === "used") {
      return { ...base, color: "var(--color-muted)", borderColor: "var(--color-border)" };
    }
    // discard
    return { ...base, color: "#f87171", borderColor: "var(--color-border)" };
  }

  function saveBtnStyle(disabled: boolean): React.CSSProperties {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0.25rem 0.625rem",
      minHeight: "44px",
      touchAction: "manipulation",
      background: "var(--color-cold-dim)",
      border: `1px solid ${disabled ? "var(--color-border)" : "var(--color-cold)"}`,
      borderRadius: "var(--radius-card)",
      color: disabled ? "var(--color-muted)" : "var(--color-cold)",
      fontFamily: "var(--font-display)",
      fontSize: "13px",
      letterSpacing: "0.05em",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "opacity 120ms ease",
      flexShrink: 0,
    };
  }

  function cancelBtnStyle(): React.CSSProperties {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0.25rem 0.625rem",
      minHeight: "44px",
      touchAction: "manipulation",
      background: "transparent",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-card)",
      color: "var(--color-muted)",
      fontFamily: "var(--font-display)",
      fontSize: "13px",
      letterSpacing: "0.05em",
      cursor: "pointer",
      transition: "border-color 120ms ease, color 120ms ease",
      flexShrink: 0,
    };
  }

  function inputStyle(highlighted?: boolean): React.CSSProperties {
    return {
      padding: "0.3125rem 0.5rem",
      minHeight: "44px",
      background: "var(--color-panel)",
      border: `1px solid ${highlighted ? "var(--color-cold)" : "var(--color-border)"}`,
      borderRadius: "var(--radius-card)",
      color: "var(--color-text)",
      fontFamily: "var(--font-body)",
      fontSize: "16px",
      outline: "none",
      transition: "border-color 120ms ease",
      colorScheme: "dark",
    };
  }

  // ── Empty state (no pending, no inventory) ───────────────────────────────
  if (pendingDrafts.length === 0 && inventoryItems.length === 0) {
    return (
      <div style={{ ...card, marginTop: "1.5rem" }}>
        <p style={label}>inventory</p>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--color-muted)",
            lineHeight: 1.6,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          No items yet — upload a grocery photo above to get started.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Pending drafts section ─────────────────────────────────────── */}
      {pendingDrafts.length > 0 && (
        <div style={card}>
          <p style={label}>
            pending items ·{" "}
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {pendingDrafts.length} item{pendingDrafts.length !== 1 ? "s" : ""}
            </span>
          </p>

          {/* Draft rows */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.875rem",
              marginBottom: "1.25rem",
            }}
          >
            {pendingDrafts.map((draft) => {
              const entry = expiryData[draft.id] ?? { date: "", estimated: false };
              const isPromoting = phase === "promoting";

              return (
                <div
                  key={draft.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    padding: "0.875rem",
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-card)",
                    transition: "opacity 150ms ease",
                    opacity: isPromoting ? 0.6 : 1,
                  }}
                >
                  {/* Item identity row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--color-text)",
                        fontFamily: "var(--font-body)",
                        fontWeight: 500,
                        flexGrow: 1,
                        minWidth: "8rem",
                      }}
                    >
                      {draft.name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.8125rem",
                        color: "var(--color-muted)",
                        fontFamily: "var(--font-display)",
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {draft.quantity} {draft.unit}
                    </span>
                    {draft.confidence === "low" && (
                      <span
                        title="Low confidence — please verify"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "1.25rem",
                          height: "1.25rem",
                          background: "#78350f",
                          border: "1px solid #d97706",
                          borderRadius: "0.25rem",
                          fontSize: "0.625rem",
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                          color: "#fbbf24",
                          cursor: "help",
                          flexShrink: 0,
                        }}
                      >
                        ?
                      </span>
                    )}
                  </div>

                  {/* Expiry row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Date input */}
                    <input
                      type="date"
                      value={entry.date}
                      disabled={isPromoting}
                      aria-label={`Expiry date for ${draft.name}`}
                      onChange={(e) => setExplicitDate(draft.id, e.target.value)}
                      style={{
                        padding: "0.3125rem 0.5rem",
                        minHeight: "44px",
                        background: "var(--color-panel)",
                        border: `1px solid ${entry.date && !entry.estimated ? "var(--color-cold)" : "var(--color-border)"}`,
                        borderRadius: "var(--radius-card)",
                        color: entry.date ? "var(--color-text)" : "var(--color-muted)",
                        fontFamily: "var(--font-body)",
                        fontSize: "16px",
                        outline: "none",
                        transition: "border-color 120ms ease",
                        cursor: isPromoting ? "not-allowed" : "pointer",
                        colorScheme: "dark",
                      }}
                      onFocus={(e) => {
                        if (!isPromoting) e.currentTarget.style.borderColor = "var(--color-cold)";
                      }}
                      onBlur={(e) => {
                        if (!entry.estimated) {
                          e.currentTarget.style.borderColor = entry.date
                            ? "var(--color-cold)"
                            : "var(--color-border)";
                        } else {
                          e.currentTarget.style.borderColor = "var(--color-border)";
                        }
                      }}
                    />

                    {/* Quick-pick day buttons */}
                    {QUICK_PICKS.map(({ label: qLabel, days }) => {
                      const active = isQuickPickActive(draft.id, days);
                      return (
                        <button
                          key={qLabel}
                          onClick={() => setQuickPick(draft.id, days)}
                          disabled={isPromoting}
                          title={`Set expiry to ${days} days from now (estimated)`}
                          style={{
                            padding: "0.25rem 0.5rem",
                            minHeight: "44px",
                            minWidth: "44px",
                            touchAction: "manipulation",
                            background: active ? "var(--color-cold-dim)" : "transparent",
                            border: `1px solid ${active ? "var(--color-cold)" : "var(--color-border)"}`,
                            borderRadius: "999px",
                            color: active ? "var(--color-cold)" : "var(--color-muted)",
                            fontFamily: "var(--font-display)",
                            fontSize: "13px",
                            letterSpacing: "0.05em",
                            cursor: isPromoting ? "not-allowed" : "pointer",
                            transition: "border-color 120ms ease, color 120ms ease, background 120ms ease",
                            flexShrink: 0,
                          }}
                          onMouseEnter={(e) => {
                            if (!isPromoting && !active) {
                              e.currentTarget.style.borderColor = "var(--color-cold)";
                              e.currentTarget.style.color = "var(--color-cold)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!active) {
                              e.currentTarget.style.borderColor = "var(--color-border)";
                              e.currentTarget.style.color = "var(--color-muted)";
                            }
                          }}
                          onMouseDown={(e) => {
                            if (!isPromoting) e.currentTarget.style.transform = "scale(0.96)";
                          }}
                          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        >
                          {qLabel}
                        </button>
                      );
                    })}

                    {/* Clear button — only shown when a date is set */}
                    {entry.date && (
                      <button
                        onClick={() => clearExpiry(draft.id)}
                        disabled={isPromoting}
                        title="Clear expiry date"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "44px",
                          height: "44px",
                          minHeight: "44px",
                          minWidth: "44px",
                          touchAction: "manipulation",
                          background: "transparent",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-card)",
                          color: "var(--color-muted)",
                          cursor: isPromoting ? "not-allowed" : "pointer",
                          fontSize: "16px",
                          transition: "border-color 120ms ease, color 120ms ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!isPromoting) {
                            e.currentTarget.style.borderColor = "#f87171";
                            e.currentTarget.style.color = "#f87171";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--color-border)";
                          e.currentTarget.style.color = "var(--color-muted)";
                        }}
                        onMouseDown={(e) => {
                          if (!isPromoting) e.currentTarget.style.transform = "scale(0.96)";
                        }}
                        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Phase: done banner (before router.refresh() clears pending list) */}
          {phase === "done" && (
            <div
              style={{
                padding: "0.75rem 1rem",
                background: "var(--color-cold-dim)",
                border: "1px solid var(--color-cold)",
                borderRadius: "var(--radius-card)",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.875rem",
                color: "var(--color-cold)",
                fontFamily: "var(--font-display)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              ✓{" "}
              {promotedCount} item{promotedCount !== 1 ? "s" : ""} added to
              inventory
            </div>
          )}

          {/* Phase: error banner */}
          {phase === "error" && (
            <div
              style={{
                padding: "0.75rem 1rem",
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.3)",
                borderRadius: "var(--radius-card)",
                marginBottom: "1rem",
                fontSize: "0.8125rem",
                color: "#f87171",
                lineHeight: 1.5,
              }}
            >
              <strong>Error: </strong>{error ?? "Something went wrong."}{" "}
              <button
                onClick={() => setPhase("idle")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#f87171",
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                  fontFamily: "var(--font-body)",
                }}
              >
                Try again
              </button>
            </div>
          )}

          {/* Promote button */}
          {phase !== "done" && (
            <button
              onClick={handlePromote}
              disabled={pendingDrafts.length === 0 || phase === "promoting"}
              className="mobile-full"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.375rem",
                padding: "0.5rem 1.125rem",
                minHeight: "44px",
                touchAction: "manipulation",
                background: "var(--color-cold-dim)",
                color:
                  phase === "promoting"
                    ? "var(--color-muted)"
                    : "var(--color-cold)",
                border: `1px solid ${phase === "promoting" ? "var(--color-border)" : "var(--color-cold)"}`,
                borderRadius: "var(--radius-card)",
                fontFamily: "var(--font-display)",
                fontSize: "13px",
                letterSpacing: "0.05em",
                cursor:
                  phase === "promoting" ? "not-allowed" : "pointer",
                transition: "opacity 150ms ease, transform 100ms ease",
              }}
              onMouseEnter={(e) => {
                if (phase !== "promoting") e.currentTarget.style.opacity = "0.85";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
              onMouseDown={(e) => {
                if (phase !== "promoting")
                  e.currentTarget.style.transform = "scale(0.96)";
              }}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              {phase === "promoting" ? (
                <>
                  <span
                    style={{
                      display: "inline-block",
                      width: "0.75rem",
                      height: "0.75rem",
                      border: "2px solid var(--color-border)",
                      borderTopColor: "var(--color-cold)",
                      borderRadius: "50%",
                      animation: "inventory-spin 0.7s linear infinite",
                    }}
                  />
                  <style>{`@keyframes inventory-spin { to { transform: rotate(360deg); } }`}</style>
                  Saving…
                </>
              ) : (
                <>
                  Promote {pendingDrafts.length} item
                  {pendingDrafts.length !== 1 ? "s" : ""} to inventory →
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* ── Inventory list section ─────────────────────────────────────── */}
      {inventoryItems.length > 0 && (
        <div style={card}>
          <p style={label}>
            inventory ·{" "}
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {inventoryItems.length} item{inventoryItems.length !== 1 ? "s" : ""}
            </span>
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            {inventoryItems.map((item) => {
              const rowState = rowStates[item.id] ?? { pending: false, error: null };
              const isEditing = editingItemId === item.id;
              const isPending = rowState.pending;

              return (
                <div key={item.id} style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                  {/* ── Row ── */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: isEditing ? "flex-start" : "center",
                      gap: "0.75rem",
                      padding: "0.625rem 0.875rem",
                      background: "var(--color-surface)",
                      border: `1px solid ${isEditing ? "var(--color-cold)" : "var(--color-border)"}`,
                      borderRadius: "var(--radius-card)",
                      flexWrap: "wrap",
                      transition: "opacity 150ms ease, border-color 120ms ease",
                      opacity: isPending && !isEditing ? 0.5 : 1,
                    }}
                  >
                    {isEditing && editDraft ? (
                      /* ── Edit mode ── */
                      <>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.5rem",
                            flexGrow: 1,
                            minWidth: "0",
                          }}
                        >
                          {/* Row 1: name */}
                          <input
                            type="text"
                            value={editDraft.name}
                            aria-label="Item name"
                            disabled={isPending}
                            onChange={(e) =>
                              setEditDraft((prev) => prev ? { ...prev, name: e.target.value } : prev)
                            }
                            style={{ ...inputStyle(true), width: "100%" }}
                          />

                          {/* Row 1b: category */}
                          <input
                            type="text"
                            value={editDraft.category}
                            aria-label="Category"
                            disabled={isPending}
                            onChange={(e) =>
                              setEditDraft((prev) => prev ? { ...prev, category: e.target.value } : prev)
                            }
                            style={{ ...inputStyle(), width: "100%" }}
                            placeholder="category"
                          />

                          {/* Row 2: quantity + unit */}
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            <input
                              type="text"
                              value={editDraft.quantity}
                              aria-label="Quantity"
                              disabled={isPending}
                              onChange={(e) =>
                                setEditDraft((prev) => prev ? { ...prev, quantity: e.target.value } : prev)
                              }
                              style={{ ...inputStyle(), width: "5rem" }}
                              placeholder="qty"
                            />
                            <input
                              type="text"
                              value={editDraft.unit}
                              aria-label="Unit"
                              disabled={isPending}
                              onChange={(e) =>
                                setEditDraft((prev) => prev ? { ...prev, unit: e.target.value } : prev)
                              }
                              style={{ ...inputStyle(), width: "6rem" }}
                              placeholder="unit"
                            />
                          </div>

                          {/* Row 3: expiry date + estimated toggle */}
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                            <input
                              type="date"
                              value={editDraft.expiry_date}
                              aria-label="Expiry date"
                              disabled={isPending}
                              onChange={(e) =>
                                setEditDraft((prev) =>
                                  prev ? { ...prev, expiry_date: e.target.value, expiry_estimated: false } : prev
                                )
                              }
                              style={inputStyle()}
                            />
                            <label
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.3125rem",
                                fontSize: "0.75rem",
                                color: "var(--color-muted)",
                                fontFamily: "var(--font-display)",
                                letterSpacing: "0.04em",
                                cursor: isPending ? "not-allowed" : "pointer",
                                userSelect: "none",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={editDraft.expiry_estimated}
                                disabled={isPending}
                                onChange={(e) =>
                                  setEditDraft((prev) =>
                                    prev ? { ...prev, expiry_estimated: e.target.checked } : prev
                                  )
                                }
                                style={{ accentColor: "var(--color-cold)", cursor: isPending ? "not-allowed" : "pointer" }}
                              />
                              est.
                            </label>
                          </div>
                        </div>

                        {/* Save / Cancel */}
                        <div style={{ display: "flex", gap: "0.375rem", alignItems: "center", flexShrink: 0 }}>
                          <button
                            onClick={() => handleSave(item.id)}
                            disabled={isPending || !editDraft.name.trim()}
                            style={saveBtnStyle(isPending || !editDraft.name.trim())}
                          >
                            {isPending ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={cancelEditing}
                            disabled={isPending}
                            style={cancelBtnStyle()}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      /* ── Read-only mode ── */
                      <>
                        {/* Name */}
                        <span
                          style={{
                            fontSize: "0.875rem",
                            color: "var(--color-text)",
                            fontFamily: "var(--font-body)",
                            fontWeight: 500,
                            flexGrow: 1,
                            minWidth: "8rem",
                          }}
                        >
                          {item.name}
                        </span>

                        {/* Quantity + unit */}
                        <span
                          style={{
                            fontSize: "0.8125rem",
                            color: "var(--color-muted)",
                            fontFamily: "var(--font-display)",
                            fontVariantNumeric: "tabular-nums",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.quantity} {item.unit}
                        </span>

                        {/* Expiry info */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.375rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.expiry_date ? (
                            <>
                              <span
                                style={{
                                  fontSize: "0.8125rem",
                                  color: "var(--color-muted)",
                                  fontFamily: "var(--font-display)",
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                {item.expiry_date}
                              </span>
                              {item.expiry_estimated && (
                                <span
                                  title="Expiry is estimated"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    padding: "0.0625rem 0.3125rem",
                                    background: "#78350f",
                                    border: "1px solid #d97706",
                                    borderRadius: "0.25rem",
                                    fontSize: "0.5625rem",
                                    fontFamily: "var(--font-display)",
                                    fontWeight: 700,
                                    letterSpacing: "0.05em",
                                    color: "#fbbf24",
                                    cursor: "help",
                                  }}
                                >
                                  est.
                                </span>
                              )}
                            </>
                          ) : (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--color-border)",
                                fontFamily: "var(--font-display)",
                                letterSpacing: "0.05em",
                              }}
                            >
                              no expiry
                            </span>
                          )}
                        </div>

                        {/* Action buttons: Edit | Used | Discard */}
                        <div
                          style={{
                            display: "flex",
                            gap: "0.375rem",
                            alignItems: "center",
                            flexShrink: 0,
                            marginLeft: "auto",
                          }}
                        >
                          <button
                            onClick={() => startEditing(item)}
                            disabled={isPending || editingItemId !== null}
                            title="Edit item"
                            style={actionBtnStyle("edit", isPending || editingItemId !== null)}
                            onMouseEnter={(e) => {
                              if (!isPending && editingItemId === null)
                                e.currentTarget.style.borderColor = "var(--color-cold)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "var(--color-border)";
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleStatusChange(item.id, "used")}
                            disabled={isPending || editingItemId !== null}
                            title="Mark as used"
                            style={actionBtnStyle("used", isPending || editingItemId !== null)}
                            onMouseEnter={(e) => {
                              if (!isPending && editingItemId === null)
                                e.currentTarget.style.color = "var(--color-text)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = "var(--color-muted)";
                            }}
                          >
                            Used
                          </button>
                          <button
                            onClick={() => handleStatusChange(item.id, "discarded")}
                            disabled={isPending || editingItemId !== null}
                            title="Mark as discarded"
                            style={actionBtnStyle("discard", isPending || editingItemId !== null)}
                            onMouseEnter={(e) => {
                              if (!isPending && editingItemId === null)
                                e.currentTarget.style.borderColor = "#f87171";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "var(--color-border)";
                            }}
                          >
                            Discard
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ── Per-row error banner ── */}
                  {rowState.error && (
                    <div
                      style={{
                        padding: "0.5rem 0.875rem",
                        background: "rgba(248,113,113,0.08)",
                        border: "1px solid rgba(248,113,113,0.3)",
                        borderRadius: "var(--radius-card)",
                        fontSize: "0.75rem",
                        color: "#f87171",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        lineHeight: 1.4,
                      }}
                    >
                      <span style={{ flexGrow: 1 }}>{rowState.error}</span>
                      <button
                        onClick={() => clearRowError(item.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#f87171",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                          padding: "0 0.25rem",
                          textDecoration: "underline",
                          fontFamily: "var(--font-body)",
                          flexShrink: 0,
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
