import { describe, expect, it } from "vitest";

import { getExtractionPrompt } from "@/lib/intake/providers/constants";

describe("getExtractionPrompt", () => {
  it("returns a receipt-specific prompt", () => {
    const prompt = getExtractionPrompt("receipt");

    expect(prompt).toContain("shopping receipt photo");
    expect(prompt).toContain("Ignore totals, taxes, payment lines");
  });

  it("returns the grocery photo prompt for photo source", () => {
    const prompt = getExtractionPrompt("photo");

    expect(prompt).toContain("visible grocery or food items");
    expect(prompt).not.toContain("shopping receipt photo");
  });
});
