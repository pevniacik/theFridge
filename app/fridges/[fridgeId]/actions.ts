"use server";

/**
 * app/fridges/[fridgeId]/actions.ts
 * Server Actions for the fridge context page.
 */

import { saveDraftItems } from "@/lib/intake/store";
import type { DraftItem } from "@/lib/intake/types";

/**
 * Persist a reviewed draft batch to intake_drafts.
 *
 * Called imperatively from the IntakeSection client component after the user
 * reviews and optionally edits the extracted items.
 *
 * @returns { success, count } on success; { success: false, count: 0, error } on failure.
 */
export async function confirmDraftAction(
  fridgeId: string,
  items: DraftItem[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (items.length === 0) {
    return { success: false, count: 0, error: "No items to confirm." };
  }

  // Filter out items without a name (can happen if a user blanks a field).
  const validItems = items.filter((item) => item.name.trim().length > 0);

  if (validItems.length === 0) {
    return { success: false, count: 0, error: "All items have empty names — add at least one name before confirming." };
  }

  try {
    saveDraftItems(fridgeId, validItems);
    console.log(`[intake] Confirmed ${validItems.length} draft items for fridge ${fridgeId}`);
    return { success: true, count: validItems.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[intake] confirmDraftAction failed for fridge ${fridgeId}: ${message}`);
    return { success: false, count: 0, error: message };
  }
}
