import { GoogleGenAI } from "@google/genai";
import { beforeEach, describe, expect, it, vi } from "vitest";

const generateContentMock = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function MockGoogleGenAI() {
    return {
      models: {
        generateContent: generateContentMock,
      },
    };
  }),
}));

import { GoogleProvider } from "@/lib/intake/providers/google";

describe("GoogleProvider", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
    vi.mocked(GoogleGenAI).mockClear();
  });

  it("parses JSON text response into DraftItem[]", async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({
        items: [
          {
            name: "Spinach",
            quantity: "1",
            unit: "bag",
            category: "Produce",
            confidence: "low",
            estimated_expiry_days: 5,
          },
        ],
      }),
    });

    const provider = new GoogleProvider("sk-google", "gemini-1.5-flash");
    const result = await provider.extract("base64-image", "image/webp");

    expect(vi.mocked(GoogleGenAI)).toHaveBeenCalledWith({
      apiKey: "sk-google",
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "Spinach",
      quantity: "1",
      unit: "bag",
      category: "Produce",
      confidence: "low",
      estimated_expiry_days: 5,
    });
  });

  it("returns empty array when response is malformed", async () => {
    generateContentMock.mockResolvedValue({ text: "{\"notItems\":[]}" });

    const provider = new GoogleProvider("sk-google", "gemini-1.5-flash");
    const result = await provider.extract("base64-image", "image/webp");

    expect(result).toEqual([]);
  });
});
