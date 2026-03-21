"use server";

/**
 * app/fridges/[fridgeId]/actions.ts
 * Server Actions for the fridge context page.
 */

import { saveDraftItems } from "@/lib/intake/store";
import type { DraftItem } from "@/lib/intake/types";
import { promoteToInventory, updateInventoryItem, setInventoryItemStatus } from "@/lib/inventory/store";
import type { InventoryItemInput, InventoryItemUpdateInput } from "@/lib/inventory/types";

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

/**
 * Atomically promote pending draft items to inventory_items and mark the
 * source drafts as 'confirmed'.
 *
 * Called from the InventorySection client component after the user reviews
 * pending drafts and optionally sets expiry dates.
 *
 * @returns { success, count } on success; { success: false, count: 0, error } on failure.
 */
export async function promoteToInventoryAction(
  fridgeId: string,
  items: InventoryItemInput[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (items.length === 0) {
    return { success: false, count: 0, error: "No items to promote." };
  }

  try {
    promoteToInventory(fridgeId, items);
    console.log(`[inventory] Promoted ${items.length} items to inventory for fridge ${fridgeId}`);
    return { success: true, count: items.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[inventory] promoteToInventoryAction failed for fridge ${fridgeId}: ${message}`);
    return { success: false, count: 0, error: message };
  }
}

/**
 * Edit a single inventory item's name, quantity, unit, and expiry fields.
 *
 * Validates that name is non-empty. Scoped by both itemId and fridgeId.
 *
 * @returns { success: true } on success; { success: false, error } on failure.
 */
export async function updateInventoryItemAction(
  fridgeId: string,
  itemId: string,
  input: InventoryItemUpdateInput
): Promise<{ success: boolean; error?: string }> {
  if (!input.name.trim()) {
    return { success: false, error: "Item name cannot be empty." };
  }

  try {
    updateInventoryItem(fridgeId, itemId, input);
    console.log(`[inventory] Updated item ${itemId} in fridge ${fridgeId}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[inventory] updateInventoryItemAction failed for fridge ${fridgeId}: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * Mark a single active inventory item as 'used' or 'discarded'.
 *
 * Validates status is one of the two allowed values. Scoped by both
 * itemId and fridgeId. Never deletes the row.
 *
 * @returns { success: true } on success; { success: false, error } on failure.
 */
export async function setInventoryItemStatusAction(
  fridgeId: string,
  itemId: string,
  status: "used" | "discarded"
): Promise<{ success: boolean; error?: string }> {
  if (status !== "used" && status !== "discarded") {
    return { success: false, error: `Invalid status: ${status}. Must be 'used' or 'discarded'.` };
  }

  try {
    setInventoryItemStatus(fridgeId, itemId, status);
    console.log(`[inventory] Marked item ${itemId} as ${status} in fridge ${fridgeId}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[inventory] setInventoryItemStatusAction failed for fridge ${fridgeId}: ${message}`);
    return { success: false, error: message };
  }
}
