/**
 * lib/intake/types.ts
 * Shared DraftItem interface used by the extraction function, API response,
 * review UI, and DB write layer.
 */

export interface DraftItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  confidence: "high" | "low";
}
