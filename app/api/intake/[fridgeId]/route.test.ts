import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getFridgeById: vi.fn(),
  getActiveProvider: vi.fn(),
  extractDraftFromImage: vi.fn(),
}));

vi.mock("@/lib/fridges/store", () => ({
  getFridgeById: mocks.getFridgeById,
}));

vi.mock("@/lib/settings/store", () => ({
  getActiveProvider: mocks.getActiveProvider,
}));

vi.mock("@/lib/intake/extract", () => ({
  extractDraftFromImage: mocks.extractDraftFromImage,
}));

import { POST } from "@/app/api/intake/[fridgeId]/route";

describe("POST /api/intake/[fridgeId]", () => {
  beforeEach(() => {
    mocks.getFridgeById.mockReset();
    mocks.getActiveProvider.mockReset();
    mocks.extractDraftFromImage.mockReset();

    mocks.getFridgeById.mockReturnValue({
      id: "fridge-1",
      name: "Kitchen",
      type: "fridge",
      created_at: "2026-01-01T00:00:00.000Z",
    });

    mocks.extractDraftFromImage.mockResolvedValue([]);
  });

  it("passes configured provider to extraction", async () => {
    mocks.getActiveProvider.mockReturnValue({
      provider: "openai",
      api_key: "sk-openai",
      model: "gpt-4o-mini",
      is_active: true,
    });

    const formData = new FormData();
    formData.append(
      "photo",
      new File([new Uint8Array([1, 2, 3])], "photo.jpg", { type: "image/jpeg" })
    );

    const request = new Request("http://localhost/api/intake/fridge-1", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request, { params: Promise.resolve({ fridgeId: "fridge-1" }) });

    expect(response.status).toBe(200);
    expect(mocks.extractDraftFromImage).toHaveBeenCalledWith(
      expect.any(String),
      "image/jpeg",
      {
        provider: "openai",
        api_key: "sk-openai",
        model: "gpt-4o-mini",
        is_active: true,
      },
      "photo"
    );
  });

  it("falls back when no provider is configured", async () => {
    mocks.getActiveProvider.mockReturnValue(null);

    const formData = new FormData();
    formData.append(
      "photo",
      new File([new Uint8Array([9, 8, 7])], "photo.jpg", { type: "image/jpeg" })
    );

    const request = new Request("http://localhost/api/intake/fridge-1", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request, { params: Promise.resolve({ fridgeId: "fridge-1" }) });

    expect(response.status).toBe(200);
    expect(mocks.extractDraftFromImage).toHaveBeenCalledWith(
      expect.any(String),
      "image/jpeg",
      null,
      "photo"
    );
  });

  it("uses receipt source when explicitly provided", async () => {
    mocks.getActiveProvider.mockReturnValue(null);

    const formData = new FormData();
    formData.append(
      "photo",
      new File([new Uint8Array([1, 1, 1])], "receipt.jpg", { type: "image/jpeg" })
    );
    formData.append("source", "receipt");

    const request = new Request("http://localhost/api/intake/fridge-1", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request, { params: Promise.resolve({ fridgeId: "fridge-1" }) });

    expect(response.status).toBe(200);
    expect(mocks.extractDraftFromImage).toHaveBeenCalledWith(
      expect.any(String),
      "image/jpeg",
      null,
      "receipt"
    );
  });

  it("accepts photos larger than 5MB", async () => {
    mocks.getActiveProvider.mockReturnValue(null);

    const largeImage = new Uint8Array(5 * 1024 * 1024 + 512);
    largeImage.fill(1);

    const formData = new FormData();
    formData.append(
      "photo",
      new File([largeImage], "large.jpg", { type: "image/jpeg" })
    );

    const request = new Request("http://localhost/api/intake/fridge-1", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request, { params: Promise.resolve({ fridgeId: "fridge-1" }) });

    expect(response.status).toBe(200);
    expect(mocks.extractDraftFromImage).toHaveBeenCalledWith(
      expect.stringMatching(/^[A-Za-z0-9+/=]+$/),
      "image/jpeg",
      null,
      "photo"
    );
  });
});
