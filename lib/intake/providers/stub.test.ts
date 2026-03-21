import { describe, expect, it } from "vitest";

import { StubProvider } from "@/lib/intake/providers/stub";

describe("StubProvider", () => {
  it("returns receipt-shaped items for receipt source", async () => {
    const provider = new StubProvider();
    const items = await provider.extract("base64-image", "image/jpeg", "receipt");

    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toMatchObject({
      name: "Chicken Breast",
      category: "Meat",
      estimated_expiry_days: 3,
    });
  });

  it("keeps grocery-photo fallback items for photo source", async () => {
    const provider = new StubProvider();
    const items = await provider.extract("base64-image", "image/jpeg", "photo");

    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toMatchObject({
      name: "Milk",
      category: "Dairy",
      estimated_expiry_days: 7,
    });
  });
});
