import Anthropic from "@anthropic-ai/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createMessageMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(function MockAnthropic() {
    return {
      messages: {
        create: createMessageMock,
      },
    };
  }),
}));

import { AnthropicProvider } from "@/lib/intake/providers/anthropic";

describe("AnthropicProvider", () => {
  beforeEach(() => {
    createMessageMock.mockReset();
    vi.mocked(Anthropic).mockClear();
  });

  it("extracts JSON wrapped in markdown and maps DraftItem[]", async () => {
    createMessageMock.mockResolvedValue({
      content: [
        {
          type: "text",
          text: [
            "Here you go:",
            "```json",
            '{"items":[{"name":"Eggs","quantity":"12","unit":"pcs","category":"Protein","confidence":"high","estimated_expiry_days":14}]}',
            "```",
          ].join("\n"),
        },
      ],
    });

    const provider = new AnthropicProvider(
      "sk-anthropic",
      "claude-3-5-sonnet-latest"
    );
    const result = await provider.extract("base64-image", "image/png");

    expect(vi.mocked(Anthropic)).toHaveBeenCalledWith({
      apiKey: "sk-anthropic",
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "Eggs",
      quantity: "12",
      unit: "pcs",
      category: "Protein",
      confidence: "high",
      estimated_expiry_days: 14,
    });
  });

  it("throws when provider returns non-text content (parse error surfaces to caller)", async () => {
    createMessageMock.mockResolvedValue({
      content: [{ type: "tool_use", id: "tool_1", name: "noop", input: {} }],
    });

    const provider = new AnthropicProvider(
      "sk-anthropic",
      "claude-3-5-sonnet-latest"
    );

    await expect(provider.extract("base64-image", "image/png")).rejects.toThrow(
      "Anthropic extraction failed"
    );
  });
});
