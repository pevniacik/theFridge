"use client";

import { useState } from "react";

interface RecipeSuggestion {
  title: string;
  description: string;
  main_ingredients: string[];
}

interface Props {
  fridgeId: string;
}

type Phase = "idle" | "loading" | "done" | "error";

export default function RecipeSection({ fridgeId }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>("stub");

  async function requestRecipes() {
    if (phase === "loading") return;

    setPhase("loading");
    setError(null);

    try {
      const response = await fetch(`/api/recipes/${fridgeId}`, { method: "POST" });
      const data = (await response.json()) as {
        recipes?: RecipeSuggestion[];
        provider?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? `Recipe suggestion failed (HTTP ${response.status})`);
        setPhase("error");
        return;
      }

      setRecipes(Array.isArray(data.recipes) ? data.recipes : []);
      setProvider(data.provider ?? "stub");
      setPhase("done");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Recipe suggestion failed";
      setError(message);
      setPhase("error");
    }
  }

  const card: React.CSSProperties = {
    padding: "1.5rem",
    background: "var(--color-panel)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-card)",
    marginTop: "1.5rem",
  };

  const label: React.CSSProperties = {
    fontFamily: "var(--font-display)",
    fontSize: "0.6875rem",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "var(--color-cold)",
    marginBottom: "1rem",
  };

  return (
    <div style={card}>
      <p style={label}>ai recipes</p>
      <p
        style={{
          fontSize: "0.8125rem",
          color: "var(--color-muted)",
          marginBottom: "1rem",
          lineHeight: 1.6,
        }}
      >
        Ask AI for recipe ideas from your current main ingredients. Pantry staples
        like salt, pepper, oil, and sauces are assumed to be available.
      </p>

      {(phase === "idle" || phase === "error") && (
        <button
          onClick={requestRecipes}
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
          ✨ Suggest Recipes
        </button>
      )}

      {phase === "loading" && (
        <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
          Suggesting recipes...
        </p>
      )}

      {phase === "error" && error && (
        <p style={{ marginTop: "0.75rem", fontSize: "0.8125rem", color: "#f87171" }}>
          {error}
        </p>
      )}

      {phase === "done" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--color-muted)",
              fontFamily: "var(--font-display)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            provider: {provider}
          </p>

          {recipes.length === 0 ? (
            <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>
              Not enough main ingredients yet. Add more items to get recipe ideas.
            </p>
          ) : (
            recipes.map((recipe, index) => (
              <div
                key={`${recipe.title}-${index}`}
                style={{
                  padding: "0.875rem",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-card)",
                  background: "var(--color-surface)",
                }}
              >
                <p
                  style={{
                    fontSize: "0.9375rem",
                    color: "var(--color-text)",
                    fontFamily: "var(--font-display)",
                    marginBottom: "0.375rem",
                  }}
                >
                  {recipe.title}
                </p>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--color-muted)",
                    lineHeight: 1.6,
                    marginBottom: "0.5rem",
                  }}
                >
                  {recipe.description}
                </p>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--color-cold)",
                    fontFamily: "var(--font-display)",
                    letterSpacing: "0.04em",
                  }}
                >
                  Main: {recipe.main_ingredients.join(", ")}
                </p>
              </div>
            ))
          )}

          <button
            onClick={requestRecipes}
            style={{
              alignSelf: "flex-start",
              minHeight: "44px",
              padding: "0.5rem 0.875rem",
              background: "transparent",
              color: "var(--color-muted)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-card)",
              fontFamily: "var(--font-display)",
              fontSize: "0.75rem",
              letterSpacing: "0.05em",
              cursor: "pointer",
              touchAction: "manipulation",
            }}
          >
            Refresh Suggestions
          </button>
        </div>
      )}
    </div>
  );
}
