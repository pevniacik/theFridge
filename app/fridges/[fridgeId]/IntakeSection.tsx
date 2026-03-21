"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import type { DraftItem } from "@/lib/intake/types";
import { confirmDraftAction, addSingleItem } from "./actions";
import { compressImage } from "@/lib/image/compress";

type Phase = "idle" | "uploading" | "review" | "confirming" | "done" | "error" | "single-add";
type UploadTarget = "batch" | "single" | "receipt";
type SingleAddMode = "manual" | "photo";
type StorageType = "fridge" | "freezer";

interface Props {
  fridgeId: string;
  storageType: StorageType;
}

interface SingleItemInput {
  name: string;
  quantity: string;
  unit: string;
  category: string;
  expiry_date: string | null;
  expiry_estimated: boolean;
  purchase_date: string;
}

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayIsoDate(): string {
  return toLocalIsoDate(new Date());
}

function dateFromDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toLocalIsoDate(d);
}

function createSingleItemInitialState(): SingleItemInput {
  return {
    name: "",
    quantity: "",
    unit: "",
    category: "",
    expiry_date: null,
    expiry_estimated: false,
    purchase_date: todayIsoDate(),
  };
}

export default function IntakeSection({ fridgeId, storageType }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [phase, setPhase] = useState<Phase>("idle");
  const [uploadTarget, setUploadTarget] = useState<UploadTarget>("batch");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmedCount, setConfirmedCount] = useState(0);

  const [singleMode, setSingleMode] = useState<SingleAddMode>("manual");
  const [singleItem, setSingleItem] = useState<SingleItemInput>(() => createSingleItemInitialState());
  const [singleError, setSingleError] = useState<string | null>(null);
  const [singleSuggesting, setSingleSuggesting] = useState(false);
  const [singleSubmitting, setSingleSubmitting] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const singlePhotoInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File, target: UploadTarget) {
    setUploadTarget(target);
    setPhase("uploading");
    setError(null);

    try {
      const compressed = await compressImage(file);
      const compressedFile = new File([compressed], file.name, { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("photo", compressedFile);
      formData.append("source", target === "receipt" ? "receipt" : "photo");

      const res = await fetch(`/api/intake/${fridgeId}`, {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as { items?: DraftItem[]; error?: string };

      if (!res.ok || !Array.isArray(data.items)) {
        setError(data.error ?? `Extraction failed (HTTP ${res.status})`);
        setPhase("error");
        return;
      }

      if (data.items.length === 0) {
        setError("No items were detected in the photo. Try a different image.");
        setPhase("error");
        return;
      }

      if (target === "single") {
        const first = data.items[0];
        setSingleItem((prev) => ({
          ...prev,
          name: first.name,
          quantity: first.quantity,
          unit: first.unit,
          category: first.category,
          expiry_date:
            first.estimated_expiry_days !== null ? dateFromDays(first.estimated_expiry_days) : null,
          expiry_estimated: first.estimated_expiry_days !== null,
          purchase_date: todayIsoDate(),
        }));
        setSingleMode("photo");
        setSingleError(null);
        setPhase("single-add");
        return;
      }

      const drafts: DraftItem[] = data.items.map((item) => ({
        ...item,
        id: nanoid(10),
      }));

      setItems(drafts);
      setPhase("review");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      setPhase("error");
    }
  }

  async function handleBatchPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleUpload(file, "batch");
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  async function handleSinglePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleUpload(file, "single");
    if (singlePhotoInputRef.current) singlePhotoInputRef.current.value = "";
  }

  async function handleReceiptPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleUpload(file, "receipt");
    if (receiptInputRef.current) receiptInputRef.current.value = "";
  }

  function updateItem(id: string, field: keyof DraftItem, value: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  function deleteItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleConfirm() {
    if (items.length === 0) return;
    setPhase("confirming");

    const result = await confirmDraftAction(fridgeId, items);
    if (result.success) {
      setConfirmedCount(result.count);
      setPhase("done");
      startTransition(() => {
        router.refresh();
      });
      return;
    }

    setError(result.error ?? "Confirm failed");
    setPhase("error");
  }

  async function handleSuggestWithAi() {
    if (!singleItem.name.trim()) {
      setSingleError("Enter an item name first.");
      return;
    }

    setSingleSuggesting(true);
    setSingleError(null);

    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: singleItem.name }),
      });

      const data = (await res.json()) as {
        category?: string;
        estimated_expiry_days?: number | null;
        error?: string;
      };

      if (!res.ok) {
        setSingleError(data.error ?? `Enrichment failed (HTTP ${res.status})`);
        return;
      }

      const estimatedDays =
        typeof data.estimated_expiry_days === "number" ? data.estimated_expiry_days : null;

      setSingleItem((prev) => ({
        ...prev,
        category: data.category ?? prev.category,
        expiry_date: estimatedDays !== null ? dateFromDays(estimatedDays) : null,
        expiry_estimated: estimatedDays !== null,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Enrichment failed";
      setSingleError(message);
    } finally {
      setSingleSuggesting(false);
    }
  }

  async function handleAddSingleItem() {
    if (!singleItem.name.trim() || singleSubmitting) {
      if (!singleItem.name.trim()) {
        setSingleError("Item name is required.");
      }
      return;
    }

    setSingleSubmitting(true);
    setSingleError(null);

    const result = await addSingleItem(fridgeId, {
      name: singleItem.name.trim(),
      quantity: singleItem.quantity,
      unit: singleItem.unit,
      category: singleItem.category || "Other",
      expiry_date: singleItem.expiry_date,
      expiry_estimated: singleItem.expiry_estimated,
      purchase_date: singleItem.purchase_date || null,
    });

    if (!result.success) {
      setSingleError(result.error ?? "Failed to add item.");
      setSingleSubmitting(false);
      return;
    }

    reset();
    startTransition(() => {
      router.refresh();
    });
  }

  function resetSingleState() {
    setSingleMode("manual");
    setSingleItem(createSingleItemInitialState());
    setSingleError(null);
    setSingleSuggesting(false);
    setSingleSubmitting(false);
  }

  function reset() {
    setPhase("idle");
    setUploadTarget("batch");
    setItems([]);
    setError(null);
    setConfirmedCount(0);
    resetSingleState();
  }

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

  if (phase === "idle") {
    return (
      <div style={card}>
        <p style={label}>{storageType === "freezer" ? "freezer intake" : "grocery intake"}</p>
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
          {storageType === "freezer" ? "Add freezer items" : "Add groceries"}
        </h2>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--color-muted)",
            marginBottom: "1.25rem",
            lineHeight: 1.6,
          }}
        >
          {storageType === "freezer"
            ? "Manually add freezer items and choose the date they were added."
            : "Take a grocery photo or upload a receipt photo. AI extracts a draft list, then you review and confirm before it becomes inventory truth."}
        </p>

        {storageType === "freezer" ? (
          <button
            onClick={() => {
              resetSingleState();
              setSingleMode("manual");
              setPhase("single-add");
            }}
            style={{
              display: "inline-flex",
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
              touchAction: "manipulation",
            }}
          >
            <span style={{ fontSize: "1.25rem" }}>➕</span>
            Add Freezer Item
          </button>
        ) : (
          <>
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
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={handleBatchPhotoChange}
              />

              <label
                htmlFor="receipt-input"
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
                <span style={{ fontSize: "1.25rem" }}>🧾</span>
                Upload Receipt
              </label>
              <input
                id="receipt-input"
                ref={receiptInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={handleReceiptPhotoChange}
              />

              <button
                onClick={() => {
                  resetSingleState();
                  setPhase("single-add");
                }}
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
          </>
        )}
      </div>
    );
  }

  if (phase === "single-add") {
    return (
      <div style={card}>
        <p style={label}>single item intake</p>

        {storageType === "fridge" && (
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <button
              onClick={() => setSingleMode("manual")}
              style={{
                minHeight: "44px",
                padding: "0.5rem 0.875rem",
                background: singleMode === "manual" ? "var(--color-cold-dim)" : "transparent",
                color: singleMode === "manual" ? "var(--color-cold)" : "var(--color-muted)",
                border: `1px solid ${singleMode === "manual" ? "var(--color-cold)" : "var(--color-border)"}`,
                borderRadius: "var(--radius-card)",
                fontFamily: "var(--font-display)",
                fontSize: "0.75rem",
                letterSpacing: "0.05em",
                cursor: "pointer",
                touchAction: "manipulation",
              }}
            >
              Manual
            </button>

            <button
              onClick={() => setSingleMode("photo")}
              style={{
                minHeight: "44px",
                padding: "0.5rem 0.875rem",
                background: singleMode === "photo" ? "var(--color-cold-dim)" : "transparent",
                color: singleMode === "photo" ? "var(--color-cold)" : "var(--color-muted)",
                border: `1px solid ${singleMode === "photo" ? "var(--color-cold)" : "var(--color-border)"}`,
                borderRadius: "var(--radius-card)",
                fontFamily: "var(--font-display)",
                fontSize: "0.75rem",
                letterSpacing: "0.05em",
                cursor: "pointer",
                touchAction: "manipulation",
              }}
            >
              Photo
            </button>
          </div>
        )}

        {storageType === "fridge" && singleMode === "photo" && (
          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="single-photo-input"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                minHeight: "44px",
                padding: "0.5rem 0.875rem",
                background: "var(--color-cold-dim)",
                color: "var(--color-cold)",
                border: "1px solid var(--color-cold)",
                borderRadius: "var(--radius-card)",
                fontFamily: "var(--font-display)",
                fontSize: "0.75rem",
                letterSpacing: "0.05em",
                cursor: "pointer",
                touchAction: "manipulation",
              }}
            >
              📷 Take Single-Item Photo
            </label>
            <input
              id="single-photo-input"
              ref={singlePhotoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={handleSinglePhotoChange}
            />
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
          <input
            type="text"
            value={singleItem.name}
            placeholder="Item name"
            onChange={(e) => setSingleItem((prev) => ({ ...prev, name: e.target.value }))}
            style={{
              width: "100%",
              minHeight: "44px",
              padding: "0.5rem 0.625rem",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-card)",
              color: "var(--color-text)",
              fontFamily: "var(--font-body)",
              fontSize: "16px",
              outline: "none",
            }}
          />

          <button
            onClick={handleSuggestWithAi}
            disabled={singleSuggesting || singleSubmitting}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "44px",
              padding: "0.5rem 0.875rem",
              background: "transparent",
              color: "var(--color-cold)",
              border: "1px solid var(--color-cold)",
              borderRadius: "var(--radius-card)",
              fontFamily: "var(--font-display)",
              fontSize: "0.75rem",
              letterSpacing: "0.05em",
              cursor: singleSuggesting || singleSubmitting ? "not-allowed" : "pointer",
              opacity: singleSuggesting || singleSubmitting ? 0.6 : 1,
              touchAction: "manipulation",
            }}
          >
            {singleSuggesting ? "Suggesting..." : "Suggest with AI"}
          </button>

          <input
            type="text"
            value={singleItem.category}
            placeholder="Category"
            onChange={(e) => setSingleItem((prev) => ({ ...prev, category: e.target.value }))}
            style={{
              width: "100%",
              minHeight: "44px",
              padding: "0.5rem 0.625rem",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-card)",
              color: "var(--color-text)",
              fontFamily: "var(--font-body)",
              fontSize: "16px",
              outline: "none",
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--color-muted)",
                fontFamily: "var(--font-display)",
                letterSpacing: "0.04em",
              }}
            >
              Expiry date (optional)
            </p>
            <input
              type="date"
              aria-label="Expiry date"
              value={singleItem.expiry_date ?? ""}
              onChange={(e) =>
                setSingleItem((prev) => ({
                  ...prev,
                  expiry_date: e.target.value || null,
                  expiry_estimated: false,
                }))
              }
              style={{
                width: "100%",
                minHeight: "44px",
                padding: "0.5rem 0.625rem",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-card)",
                color: "var(--color-text)",
                fontFamily: "var(--font-body)",
                fontSize: "16px",
                outline: "none",
                colorScheme: "dark",
              }}
            />
          </div>

          {storageType === "freezer" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--color-muted)",
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.04em",
                }}
              >
                Date added to freezer
              </p>
              <input
                type="date"
                aria-label="Date added to freezer"
                value={singleItem.purchase_date}
                onChange={(e) =>
                  setSingleItem((prev) => ({
                    ...prev,
                    purchase_date: e.target.value || todayIsoDate(),
                  }))
                }
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "0.5rem 0.625rem",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-card)",
                  color: "var(--color-text)",
                  fontFamily: "var(--font-body)",
                  fontSize: "16px",
                  outline: "none",
                  colorScheme: "dark",
                }}
              />
            </div>
          )}

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              value={singleItem.quantity}
              placeholder="Quantity"
              onChange={(e) => setSingleItem((prev) => ({ ...prev, quantity: e.target.value }))}
              style={{
                flex: 1,
                minHeight: "44px",
                padding: "0.5rem 0.625rem",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-card)",
                color: "var(--color-text)",
                fontFamily: "var(--font-body)",
                fontSize: "16px",
                outline: "none",
              }}
            />
            <input
              type="text"
              value={singleItem.unit}
              placeholder="Unit"
              onChange={(e) => setSingleItem((prev) => ({ ...prev, unit: e.target.value }))}
              style={{
                flex: 1,
                minHeight: "44px",
                padding: "0.5rem 0.625rem",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-card)",
                color: "var(--color-text)",
                fontFamily: "var(--font-body)",
                fontSize: "16px",
                outline: "none",
              }}
            />
          </div>
        </div>

        {singleError && (
          <p
            style={{
              fontSize: "0.8125rem",
              color: "#f87171",
              lineHeight: 1.5,
              marginBottom: "1rem",
            }}
          >
            {singleError}
          </p>
        )}

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={handleAddSingleItem}
            disabled={singleSubmitting || !singleItem.name.trim()}
            style={{
              minHeight: "44px",
              padding: "0.5rem 0.875rem",
              background: "var(--color-cold-dim)",
              color: "var(--color-cold)",
              border: "1px solid var(--color-cold)",
              borderRadius: "var(--radius-card)",
              fontFamily: "var(--font-display)",
              fontSize: "0.75rem",
              letterSpacing: "0.05em",
              cursor: singleSubmitting || !singleItem.name.trim() ? "not-allowed" : "pointer",
              opacity: singleSubmitting || !singleItem.name.trim() ? 0.6 : 1,
              touchAction: "manipulation",
            }}
          >
            {singleSubmitting
              ? "Adding..."
              : storageType === "freezer"
                ? "Add to Freezer"
                : "Add to Fridge"}
          </button>

          <button
            onClick={reset}
            disabled={singleSubmitting}
            style={{
              minHeight: "44px",
              padding: "0.5rem 0.875rem",
              background: "transparent",
              color: "var(--color-muted)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-card)",
              fontFamily: "var(--font-display)",
              fontSize: "0.75rem",
              letterSpacing: "0.05em",
              cursor: singleSubmitting ? "not-allowed" : "pointer",
              touchAction: "manipulation",
            }}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

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
          {uploadTarget === "single"
            ? "Analyzing single item photo..."
            : uploadTarget === "receipt"
              ? "Reading receipt..."
              : "Analyzing photo..."}
        </div>
      </div>
    );
  }

  if (phase === "review" || phase === "confirming") {
    const isConfirming = phase === "confirming";

    return (
      <div style={card}>
        <p style={label}>review draft · {items.length} item{items.length !== 1 ? "s" : ""}</p>
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
                }}
              />

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
                }}
              />

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
                }}
              />

              <span
                title={item.confidence === "low" ? "Low confidence - please verify" : undefined}
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
                  touchAction: "manipulation",
                }}
              >
                x
              </button>
            </div>
          ))}
        </div>

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
              background: "var(--color-cold-dim)",
              color: items.length === 0 || isConfirming ? "var(--color-muted)" : "var(--color-cold)",
              border: `1px solid ${items.length === 0 || isConfirming ? "var(--color-border)" : "var(--color-cold)"}`,
              borderRadius: "var(--radius-card)",
              fontFamily: "var(--font-display)",
              fontSize: "0.8125rem",
              letterSpacing: "0.05em",
              cursor: items.length === 0 || isConfirming ? "not-allowed" : "pointer",
              opacity: items.length === 0 ? 0.45 : 1,
              touchAction: "manipulation",
            }}
          >
            {isConfirming ? "Saving..." : `Confirm ${items.length} item${items.length !== 1 ? "s" : ""} ->`}
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
              touchAction: "manipulation",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

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
            touchAction: "manipulation",
          }}
        >
          Upload more
        </button>
      </div>
    );
  }

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
          touchAction: "manipulation",
        }}
      >
        Try again
      </button>
    </div>
  );
}
