/**
 * lib/inventory/types.ts
 * Shared interfaces for inventory items used by the store, Server Actions,
 * and UI components.
 */

export interface InventoryItem {
  id: string;
  fridge_id: string;
  draft_id: string | null;
  name: string;
  quantity: string;
  unit: string;
  confidence: "high" | "low";
  expiry_date: string | null; // ISO "YYYY-MM-DD" or null
  expiry_estimated: boolean;
  status: "active" | "used" | "discarded";
  added_at: string;
  updated_at: string;
}

export interface InventoryItemInput {
  draft_id: string;
  name: string;
  quantity: string;
  unit: string;
  confidence: "high" | "low";
  expiry_date: string | null;
  expiry_estimated: boolean;
}
