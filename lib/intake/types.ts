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
  category: string;
  confidence: "high" | "low";
  estimated_expiry_days: number | null;
}
