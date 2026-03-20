"use client";

/**
 * CreateFridgeForm.tsx
 * Client component — handles the interactive create-fridge/freezer form.
 * Calls the `createFridgeAction` server action on submit.
 */

import { useActionState } from "react";
import { createFridgeAction, type CreateFridgeState } from "./actions";

const initialState: CreateFridgeState = {};

export default function CreateFridgeForm() {
  const [state, formAction, isPending] = useActionState(
    createFridgeAction,
    initialState
  );

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Name */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <label
          htmlFor="name"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.6875rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--color-cold)",
          }}
        >
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. Kitchen Fridge, Garage Freezer"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-card)",
            padding: "0.75rem 1rem",
            color: "var(--color-text)",
            fontFamily: "var(--font-body)",
            fontSize: "1rem",
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--color-cold)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--color-border)";
          }}
        />
      </div>

      {/* Type */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
          <legend
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "0.6875rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--color-cold)",
              marginBottom: "0.5rem",
            }}
          >
            Type
          </legend>
          <div style={{ display: "flex", gap: "1rem" }}>
            {(["fridge", "freezer"] as const).map((t) => (
              <label
                key={t}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
                  fontSize: "0.9375rem",
                  color: "var(--color-text)",
                }}
              >
                <input
                  type="radio"
                  name="type"
                  value={t}
                  defaultChecked={t === "fridge"}
                  style={{ accentColor: "var(--color-cold)" }}
                />
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Error */}
      {state?.error && (
        <p
          role="alert"
          style={{
            color: "#f87171",
            fontSize: "0.875rem",
            padding: "0.75rem 1rem",
            background: "rgba(248,113,113,0.08)",
            borderRadius: "var(--radius-card)",
            border: "1px solid rgba(248,113,113,0.2)",
          }}
        >
          {state.error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        style={{
          padding: "0.875rem 1.5rem",
          background: isPending ? "var(--color-panel)" : "var(--color-cold-dim)",
          border: "1px solid var(--color-cold)",
          borderRadius: "var(--radius-card)",
          color: isPending ? "var(--color-muted)" : "var(--color-cold)",
          fontFamily: "var(--font-display)",
          fontSize: "0.875rem",
          letterSpacing: "0.08em",
          cursor: isPending ? "not-allowed" : "pointer",
          transition: "all 0.15s ease",
          alignSelf: "flex-start",
        }}
      >
        {isPending ? "Creating…" : "Create & generate QR →"}
      </button>
    </form>
  );
}
