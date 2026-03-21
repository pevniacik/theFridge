export const EXTRACTION_PROMPT =
  'Extract all visible grocery or food items from this photo. ' +
  'Return JSON: { "items": [ { "name": string, "quantity": string, "unit": string, ' +
  '"confidence": "high" | "low", "category": string, "estimated_expiry_days": number | null } ] }. ' +
  'For category, use one of: Dairy, Meat, Produce, Frozen, Pantry, Beverage, Bakery, Other. ' +
  'For estimated_expiry_days, estimate typical shelf life in days from today (null for non-perishable). ' +
  'Use confidence="low" for anything unclear, partially visible, or uncertain. ' +
  'For quantity and unit, use empty string if not detectable.';
