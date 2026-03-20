/**
 * app/fridges/new/actions.ts
 * Server Action for creating a fridge/freezer from the UI form.
 * Signature follows useActionState contract: (prevState, formData) => newState | redirect.
 * Redirects to the new fridge's context page on success.
 */

"use server";

import { redirect } from "next/navigation";
import { createFridge } from "@/lib/fridges/store";

export interface CreateFridgeState {
  error?: string;
}

export async function createFridgeAction(
  _prevState: CreateFridgeState,
  formData: FormData
): Promise<CreateFridgeState> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const type = formData.get("type") as string | null;

  if (!name) {
    return { error: "Name is required." };
  }

  if (type !== "fridge" && type !== "freezer") {
    return { error: 'Type must be "fridge" or "freezer".' };
  }

  let record;
  try {
    record = createFridge({ name, type });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error.";
    console.error("[createFridgeAction] failed:", message);
    return { error: message };
  }

  redirect(`/fridges/${record.id}`);
}
