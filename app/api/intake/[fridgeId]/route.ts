/**
 * app/api/intake/[fridgeId]/route.ts
 * POST /api/intake/[fridgeId]
 *
 * Accepts a multipart/form-data upload with a "photo" file.
 * Validates fridge existence, base64-encodes the image, calls the
 * extraction function, and returns { items: DraftItem[] }.
 *
 * Error responses:
 *   404 { error: "Storage not found" }       — unknown fridgeId
 *   400 { error: "No photo provided" }        — missing or non-file "photo" field
 *   500 { error: "Extraction failed" }        — extraction returned no items (unexpected)
 */

import { NextResponse } from "next/server";
import { getFridgeById } from "@/lib/fridges/store";
import { extractDraftFromImage } from "@/lib/intake/extract";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ fridgeId: string }> }
) {
  const { fridgeId } = await params;

  // Validate fridge existence
  const fridge = getFridgeById(fridgeId);
  if (!fridge) {
    return NextResponse.json({ error: "Storage not found" }, { status: 404 });
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("photo");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No photo provided" }, { status: 400 });
  }

  // Convert to base64 for the extraction function
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  // Run extraction (stub or OpenAI)
  const items = await extractDraftFromImage(base64, file.type || "image/jpeg");

  return NextResponse.json({ items }, { status: 200 });
}
