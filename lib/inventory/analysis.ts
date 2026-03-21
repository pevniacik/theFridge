/**
 * lib/inventory/analysis.ts
 * Pure synchronous functions that classify inventory items by urgency and
 * generate cooking suggestions from on-hand ingredients.
 *
 * All functions are deterministic, accept an optional `now` parameter for
 * testability, and run server-side only — no client imports needed.
 *
 * Urgency classification rules (priority order, first match wins):
 *   expired             — expiry_date non-null AND daysUntilExpiry < 0
 *   expiring-soon       — expiry_date non-null AND expiry_estimated=false AND daysUntilExpiry 0–3
 *   estimated-expiry-soon — expiry_date non-null AND expiry_estimated=true AND daysUntilExpiry 0–3
 *   forgotten           — daysSinceUpdate >= 14 (regardless of expiry)
 *   ok                  — everything else
 *
 * D005: estimated expiry dates get softer treatment ("estimated-expiry-soon")
 * so the UI can render them with less urgency than hard-deadline items.
 *
 * Forgotten detection uses `updated_at` (not `added_at`) per S04 forward
 * intelligence: the staleness clock resets whenever the item is touched.
 */

import type { InventoryItem } from "./types";

// ── Result types ─────────────────────────────────────────────────────────────

export type UrgencyLevel =
  | "expired"
  | "expiring-soon"
  | "estimated-expiry-soon"
  | "forgotten"
  | "ok";

export interface ClassifiedItem {
  item: InventoryItem;
  urgency: UrgencyLevel;
  /** Days until expiry (negative = already past). Null when expiry_date is absent. */
  daysUntilExpiry: number | null;
  /** Full days since the item was last updated via updated_at. */
  daysSinceUpdate: number;
}

export interface InventoryStatus {
  total: number;
  expired: number;
  expiringSoon: number;
  estimatedExpiringSoon: number;
  forgotten: number;
  ok: number;
}

export interface SuggestionCard {
  title: string;
  description: string;
  /** Actual item names from the inventory referenced by this suggestion. */
  ingredients: string[];
  /** True when the card was generated because of urgent/aging items. */
  urgencyDriven: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Difference in whole days between two dates (a – b, floored). */
function diffDays(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((a.getTime() - b.getTime()) / msPerDay);
}

/** Urgency sort order map for stable deterministic sorting. */
const URGENCY_ORDER: Record<UrgencyLevel, number> = {
  expired: 0,
  "expiring-soon": 1,
  "estimated-expiry-soon": 2,
  forgotten: 3,
  ok: 4,
};

// ── analyzeInventory ──────────────────────────────────────────────────────────

/**
 * Classify every active inventory item into an urgency bucket and compute
 * aggregate counts.
 *
 * @param items  Array of InventoryItem — typically the output of listInventoryItems()
 * @param now    Reference date for all comparisons; defaults to new Date(). Pass a
 *               fixed value in tests to make assertions deterministic.
 */
export function analyzeInventory(
  items: InventoryItem[],
  now: Date = new Date()
): { status: InventoryStatus; classified: ClassifiedItem[] } {
  const classified: ClassifiedItem[] = items.map((item) => {
    // Compute days-until-expiry (null when no date present)
    let daysUntilExpiry: number | null = null;
    if (item.expiry_date) {
      const expiryDate = new Date(item.expiry_date);
      // Compare day-granularity: strip time from 'now' before diffing
      const todayMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      daysUntilExpiry = diffDays(expiryDate, todayMidnight);
    }

    // Compute days since the item was last touched
    const updatedAt = new Date(item.updated_at);
    const daysSinceUpdate = diffDays(now, updatedAt);

    // Classify — priority order: first match wins
    let urgency: UrgencyLevel;

    if (daysUntilExpiry !== null && daysUntilExpiry < 0) {
      urgency = "expired";
    } else if (
      daysUntilExpiry !== null &&
      item.expiry_estimated === false &&
      daysUntilExpiry >= 0 &&
      daysUntilExpiry <= 3
    ) {
      urgency = "expiring-soon";
    } else if (
      daysUntilExpiry !== null &&
      item.expiry_estimated === true &&
      daysUntilExpiry >= 0 &&
      daysUntilExpiry <= 3
    ) {
      urgency = "estimated-expiry-soon";
    } else if (daysSinceUpdate >= 14) {
      urgency = "forgotten";
    } else {
      urgency = "ok";
    }

    return { item, urgency, daysUntilExpiry, daysSinceUpdate };
  });

  // Sort: expired → expiring-soon → estimated-expiry-soon → forgotten → ok
  classified.sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]);

  // Aggregate status counts
  const status: InventoryStatus = {
    total: classified.length,
    expired: 0,
    expiringSoon: 0,
    estimatedExpiringSoon: 0,
    forgotten: 0,
    ok: 0,
  };

  for (const ci of classified) {
    switch (ci.urgency) {
      case "expired":
        status.expired++;
        break;
      case "expiring-soon":
        status.expiringSoon++;
        break;
      case "estimated-expiry-soon":
        status.estimatedExpiringSoon++;
        break;
      case "forgotten":
        status.forgotten++;
        break;
      case "ok":
        status.ok++;
        break;
    }
  }

  return { status, classified };
}

// ── generateSuggestions ───────────────────────────────────────────────────────

/**
 * Generate 0–3 cooking suggestion cards grounded in actual item names.
 * Cards are deterministic (no randomness) and prefer urgent/aging items.
 *
 * @param items  Same InventoryItem array passed to analyzeInventory
 * @param now    Reference date; defaults to new Date()
 */
export function generateSuggestions(
  items: InventoryItem[],
  now: Date = new Date()
): SuggestionCard[] {
  if (items.length === 0) return [];

  const { classified } = analyzeInventory(items, now);
  const suggestions: SuggestionCard[] = [];

  // ── Card 1: "Use soon" — urgent items that need immediate attention ────────
  const urgent = classified.filter(
    (ci) => ci.urgency === "expired" || ci.urgency === "expiring-soon" || ci.urgency === "estimated-expiry-soon"
  );
  if (urgent.length > 0) {
    const names = urgent.map((ci) => ci.item.name);
    const itemList = formatItemList(names.slice(0, 4));
    suggestions.push({
      title: "Use soon",
      description: `Prioritise ${itemList} — ${names.length === 1 ? "it is" : "they are"} nearing or past their use-by date.`,
      ingredients: names,
      urgencyDriven: true,
    });
  }

  // ── Card 2: "Cook tonight" — combine 2–4 available items ─────────────────
  // Use ok + forgotten items for this card (urgent ones already covered above)
  const available = classified.filter(
    (ci) => ci.urgency === "ok" || ci.urgency === "forgotten"
  );
  const cookCandidates = [...urgent, ...available].slice(0, 4);

  if (classified.length >= 3) {
    const cookNames = cookCandidates.map((ci) => ci.item.name).slice(0, 4);
    const itemList = formatItemList(cookNames);
    suggestions.push({
      title: "Cook tonight",
      description: `You have ${itemList} on hand — a good base for a quick meal.`,
      ingredients: cookNames,
      urgencyDriven: urgent.length > 0,
    });
  }

  // ── Card 3: "Rediscover" — forgotten items not touched in 14+ days ────────
  const forgotten = classified.filter((ci) => ci.urgency === "forgotten");
  if (forgotten.length > 0) {
    const names = forgotten.map((ci) => ci.item.name);
    const itemList = formatItemList(names.slice(0, 4));
    suggestions.push({
      title: "Rediscover",
      description: `${itemList} ${names.length === 1 ? "has" : "have"} been sitting untouched for over two weeks — consider using or clearing ${names.length === 1 ? "it" : "them"}.`,
      ingredients: names,
      urgencyDriven: false,
    });
  }

  return suggestions;
}

// ── Formatting helper ─────────────────────────────────────────────────────────

/** Format ["a","b","c"] → "a, b, and c" (Oxford comma). */
function formatItemList(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  const last = names[names.length - 1];
  const rest = names.slice(0, -1).join(", ");
  return `${rest}, and ${last}`;
}
