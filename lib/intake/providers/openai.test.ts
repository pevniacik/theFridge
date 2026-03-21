import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(function MockOpenAI() {
    return {
      chat: {
        completions: {
          create: createMock,
        },
      },
    };
  }),
}));

import OpenAI from "openai";

import { OpenAIProvider } from "@/lib/intake/providers/openai";

describe("OpenAIProvider", () => {
  beforeEach(() => {
    createMock.mockReset();
    vi.mocked(OpenAI).mockClear();
  });

  it("parses JSON response into DraftItem[]", async () => {
    createMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [
                {
                  name: "Milk",
                  quantity: "1",
                  unit: "litre",
                  category: "Dairy",
                  confidence: "high",
                  estimated_expiry_days: 7,
                },
              ],
            }),
          },
        },
      ],
    });

    const provider = new OpenAIProvider("sk-openai", "gpt-4o-mini");
    const result = await provider.extract("base64-image", "image/jpeg");

    expect(vi.mocked(OpenAI)).toHaveBeenCalledWith({ apiKey: "sk-openai" });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "Milk",
      quantity: "1",
      unit: "litre",
      category: "Dairy",
      confidence: "high",
      estimated_expiry_days: 7,
    });
    expect(typeof result[0]?.id).toBe("string");
  });

  it("returns empty array when response has no items array", async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ notItems: [] }) } }],
    });

    const provider = new OpenAIProvider("sk-openai", "gpt-4o-mini");
    const result = await provider.extract("base64-image", "image/jpeg");

    expect(result).toEqual([]);
  });
});
