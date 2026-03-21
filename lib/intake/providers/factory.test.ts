import { describe, expect, it } from "vitest";

import { createProvider } from "@/lib/intake/providers/factory";

describe("createProvider", () => {
  it("returns stub provider when config is null", () => {
    const provider = createProvider(null);
    expect(provider.providerName).toBe("stub");
  });

  it("returns stub provider when api key is empty", () => {
    const provider = createProvider({
      provider: "openai",
      api_key: "",
      model: "gpt-4o-mini",
      is_active: true,
    });

    expect(provider.providerName).toBe("stub");
  });

  it("returns OpenAI provider for openai config", () => {
    const provider = createProvider({
      provider: "openai",
      api_key: "sk-openai",
      model: "gpt-4o-mini",
      is_active: true,
    });

    expect(provider.providerName).toBe("openai");
  });

  it("returns Anthropic provider for anthropic config", () => {
    const provider = createProvider({
      provider: "anthropic",
      api_key: "sk-anthropic",
      model: "claude-3-5-sonnet-latest",
      is_active: true,
    });

    expect(provider.providerName).toBe("anthropic");
  });

  it("returns Google provider for google config", () => {
    const provider = createProvider({
      provider: "google",
      api_key: "sk-google",
      model: "gemini-1.5-flash",
      is_active: true,
    });

    expect(provider.providerName).toBe("google");
  });
});
