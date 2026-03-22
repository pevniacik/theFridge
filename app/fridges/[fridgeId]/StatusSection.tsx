/**
 * app/fridges/[fridgeId]/StatusSection.tsx
 *
 * Server component — read-only, no client state needed.
 * Renders three sub-sections from pre-computed analysis data:
 *
 *   1. Status overview — urgency-count summary with color-coded pills
 *   2. Needs attention — alert rows for expired/expiring/forgotten items
 *   3. Cooking ideas  — suggestion cards grounded in actual item names
 *
 * All styling uses the project's inline-style + CSS-variable approach
 * matching InventorySection.tsx. No Tailwind, no CSS modules.
 *
 * D005: estimated-expiry-soon items get softer amber treatment than
 * hard-deadline expiring-soon items throughout this component.
 */

import type { InventoryStatus, ClassifiedItem, SuggestionCard, UrgencyLevel } from "@/lib/inventory/analysis";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  analysisResult: {
    status: InventoryStatus;
    classified: ClassifiedItem[];
  };
  suggestions: SuggestionCard[];
}

// ── Shared style constants (mirror InventorySection) ──────────────────────────

const card: React.CSSProperties = {
  padding: "1.5rem",
  background: "var(--color-panel)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-card)",
};

const sectionLabel: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "0.6875rem",
  letterSpacing: "0.15em",
  textTransform: "uppercase" as const,
  color: "var(--color-cold)",
  marginBottom: "1rem",
};

// ── Urgency helpers ───────────────────────────────────────────────────────────

/** Human-readable label per urgency level. */
function urgencyLabel(urgency: UrgencyLevel): string {
  switch (urgency) {
    case "expired":              return "expired";
    case "expiring-soon":        return "expiring soon";
    case "estimated-expiry-soon": return "expiring soon (est.)";
    case "forgotten":            return "not recently touched";
    case "ok":                   return "ok";
  }
}

/** Primary text color per urgency. */
function urgencyColor(urgency: UrgencyLevel): string {
  switch (urgency) {
    case "expired":               return "#f87171";
    case "expiring-soon":         return "#fbbf24";
    case "estimated-expiry-soon": return "#d97706";
    case "forgotten":             return "var(--color-muted)";
    case "ok":                    return "var(--color-cold)";
  }
}

/** Left-border accent color per urgency for alert rows. */
function urgencyBorderColor(urgency: UrgencyLevel): string {
  switch (urgency) {
    case "expired":               return "#f87171";
    case "expiring-soon":         return "#fbbf24";
    case "estimated-expiry-soon": return "#b45309";   // softer amber (D005)
    case "forgotten":             return "var(--color-border)";
    case "ok":                    return "var(--color-cold)";
  }
}

/**
 * Build a human-readable days string for an alert row.
 * "expired 2 days ago" / "expires today" / "not touched in 18 days"
 */
function daysInfo(ci: ClassifiedItem): string {
  if (ci.urgency === "forgotten") {
    return `not touched in ${ci.daysSinceUpdate} day${ci.daysSinceUpdate === 1 ? "" : "s"}`;
  }
  if (ci.daysUntilExpiry === null) return "";
  const d = ci.daysUntilExpiry;
  if (d < 0) {
    const ago = Math.abs(d);
    return `expired ${ago} day${ago === 1 ? "" : "s"} ago`;
  }
  if (d === 0) return "expires today";
  return `expires in ${d} day${d === 1 ? "" : "s"}`;
}

// ── StatusSection ─────────────────────────────────────────────────────────────

export default function StatusSection({ analysisResult, suggestions }: Props) {
  const { status, classified } = analysisResult;
  const alertItems = classified.filter((ci) => ci.urgency !== "ok");

  return (
    <div
      style={{
        marginTop: "1.5rem",
        marginBottom: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      {/* ── 1. Status overview ──────────────────────────────────────────── */}
      <StatusOverview status={status} />

      {/* ── 2. Needs attention ──────────────────────────────────────────── */}
      {alertItems.length > 0 && (
        <AlertsSection alertItems={alertItems} />
      )}

      {/* ── 3. Cooking ideas ─────────────────────────────────────────────── */}
      {suggestions.length > 0 && (
        <SuggestionsSection suggestions={suggestions} />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusOverview({ status }: { status: InventoryStatus }) {
  const hasItems = status.total > 0;
  const hasProblems =
    status.expired + status.expiringSoon + status.estimatedExpiringSoon + status.forgotten > 0;

  return (
    <div style={card}>
      <p style={sectionLabel}>status overview</p>

      {!hasItems ? (
        /* Empty fridge */
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--color-muted)",
            lineHeight: 1.6,
            fontFamily: "var(--font-body)",
          }}
        >
          No items in inventory. Upload a grocery photo above to get started.
        </p>
      ) : (
        <>
          {/* Total count */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.5rem",
              marginBottom: "0.875rem",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "2rem",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "var(--color-text)",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
              }}
            >
              {status.total}
            </span>
            <span
              style={{
                fontSize: "0.8125rem",
                color: "var(--color-muted)",
                fontFamily: "var(--font-display)",
                letterSpacing: "0.06em",
              }}
            >
              active item{status.total !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Urgency pills row */}
          {!hasProblems ? (
            /* All-good state */
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.3125rem 0.75rem",
                background: "var(--color-cold-dim)",
                border: "1px solid var(--color-cold)",
                borderRadius: "999px",
                fontSize: "0.6875rem",
                fontFamily: "var(--font-display)",
                letterSpacing: "0.08em",
                color: "var(--color-cold)",
              }}
            >
              <span>✓</span>
              <span>all good</span>
            </div>
          ) : (
            /* Urgency breakdown pills */
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                alignItems: "center",
              }}
            >
              {status.expired > 0 && (
                <UrgencyPill
                  count={status.expired}
                  label={`expired`}
                  color="#f87171"
                  bg="rgba(248,113,113,0.1)"
                  border="rgba(248,113,113,0.35)"
                />
              )}
              {status.expiringSoon > 0 && (
                <UrgencyPill
                  count={status.expiringSoon}
                  label="expiring soon"
                  color="#fbbf24"
                  bg="rgba(251,191,36,0.1)"
                  border="rgba(251,191,36,0.35)"
                />
              )}
              {status.estimatedExpiringSoon > 0 && (
                <UrgencyPill
                  count={status.estimatedExpiringSoon}
                  label="expiring soon (est.)"
                  color="#d97706"
                  bg="rgba(217,119,6,0.08)"
                  border="rgba(217,119,6,0.3)"
                />
              )}
              {status.forgotten > 0 && (
                <UrgencyPill
                  count={status.forgotten}
                  label="forgotten"
                  color="var(--color-muted)"
                  bg="rgba(255,255,255,0.04)"
                  border="var(--color-border)"
                />
              )}
              {status.ok > 0 && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--color-muted)",
                    fontFamily: "var(--font-display)",
                    letterSpacing: "0.04em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  · {status.ok} ok
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function UrgencyPill({
  count,
  label,
  color,
  bg,
  border,
}: {
  count: number;
  label: string;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        padding: "0.25rem 0.625rem",
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: "999px",
        fontSize: "0.6875rem",
        fontFamily: "var(--font-display)",
        letterSpacing: "0.06em",
        color: color,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
      }}
    >
      <strong style={{ fontWeight: 700 }}>{count}</strong>
      <span>{label}</span>
    </span>
  );
}

function AlertsSection({ alertItems }: { alertItems: ClassifiedItem[] }) {
  return (
    <div style={card}>
      <p style={sectionLabel}>needs attention</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {alertItems.map((ci) => {
          const borderColor = urgencyBorderColor(ci.urgency);
          const color = urgencyColor(ci.urgency);
          const label = urgencyLabel(ci.urgency);
          const days = daysInfo(ci);

          return (
            <div
              key={ci.item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.625rem 0.875rem",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderLeft: `3px solid ${borderColor}`,
                borderRadius: "var(--radius-card)",
                flexWrap: "wrap",
              }}
            >
              {/* Item name */}
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
                {ci.item.name}
              </span>

              {/* Days info */}
              {days && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--color-muted)",
                    fontFamily: "var(--font-display)",
                    letterSpacing: "0.04em",
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                  }}
                >
                  {days}
                </span>
              )}

              {/* Urgency badge */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "0.125rem 0.5rem",
                  background: ci.urgency === "expired"
                    ? "rgba(248,113,113,0.1)"
                    : ci.urgency === "expiring-soon"
                    ? "rgba(251,191,36,0.1)"
                    : ci.urgency === "estimated-expiry-soon"
                    ? "rgba(217,119,6,0.08)"
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${borderColor}`,
                  borderRadius: "0.25rem",
                  fontSize: "0.5625rem",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: color,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SuggestionsSection({ suggestions }: { suggestions: SuggestionCard[] }) {
  return (
    <div style={card}>
      <p style={sectionLabel}>cooking ideas</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        {suggestions.map((s, idx) => (
          <SuggestionCard key={idx} suggestion={s} />
        ))}
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: SuggestionCard }) {
  const isUrgent = suggestion.urgencyDriven;
  const accentColor = isUrgent ? "#d97706" : "var(--color-cold)";
  const accentBorder = isUrgent ? "rgba(217,119,6,0.3)" : "var(--color-border)";
  const accentBg = isUrgent ? "rgba(217,119,6,0.06)" : "var(--color-surface)";

  return (
    <div
      style={{
        padding: "0.875rem 1rem",
        background: accentBg,
        border: `1px solid ${accentBorder}`,
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: "var(--radius-card)",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      {/* Title */}
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "0.8125rem",
          fontWeight: 700,
          letterSpacing: "0.04em",
          color: accentColor,
          margin: 0,
        }}
      >
        {suggestion.title}
      </p>

      {/* Description */}
      <p
        style={{
          fontSize: "0.8125rem",
          color: "var(--color-muted)",
          fontFamily: "var(--font-body)",
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {suggestion.description}
      </p>

      {/* Ingredient pills */}
      {suggestion.ingredients.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.3125rem",
            marginTop: "0.125rem",
          }}
        >
          {suggestion.ingredients.map((name, i) => (
            <span
              key={i}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.125rem 0.5rem",
                background: isUrgent ? "rgba(217,119,6,0.1)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${accentBorder}`,
                borderRadius: "999px",
                fontSize: "0.6875rem",
                fontFamily: "var(--font-display)",
                letterSpacing: "0.04em",
                color: isUrgent ? "#fbbf24" : "var(--color-cold)",
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
