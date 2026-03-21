import type { IntakeSource } from "@/lib/intake/types";

const JSON_RESPONSE_SHAPE =
  'Return JSON: { "items": [ { "name": string, "quantity": string, "unit": string, ' +
  '"confidence": "high" | "low", "category": string, "estimated_expiry_days": number | null } ] }. ';

const CATEGORY_GUIDANCE =
  "For category, use one of: Dairy, Meat, Produce, Frozen, Pantry, Beverage, Bakery, Other. ";

const CONFIDENCE_GUIDANCE =
  'Use confidence="low" for anything unclear, partially visible, or uncertain. ';

const SHARED_GUIDANCE =
  'For estimated_expiry_days, estimate typical shelf life in days from today (null for non-perishable). ' +
  "For quantity and unit, use empty string if not detectable.";

const PHOTO_PROMPT =
  "Extract all visible grocery or food items from this photo. " +
  JSON_RESPONSE_SHAPE +
  CATEGORY_GUIDANCE +
  SHARED_GUIDANCE +
  CONFIDENCE_GUIDANCE;

const RECEIPT_PROMPT =
  "Extract grocery food items from this shopping receipt photo. " +
  "Ignore totals, taxes, payment lines, and store metadata. " +
  "Normalize short receipt labels into clear product names when possible. " +
  JSON_RESPONSE_SHAPE +
  CATEGORY_GUIDANCE +
  SHARED_GUIDANCE +
  CONFIDENCE_GUIDANCE;

export function getExtractionPrompt(source: IntakeSource): string {
  return source === "receipt" ? RECEIPT_PROMPT : PHOTO_PROMPT;
}

export const EXTRACTION_PROMPT = getExtractionPrompt("photo");
