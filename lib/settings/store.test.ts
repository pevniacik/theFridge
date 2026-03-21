import type Database from "better-sqlite3";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestDb } from "@/lib/db/test-helper";

let testDb: Database.Database;

vi.mock("@/lib/db/client", () => ({
  getDb: () => testDb,
}));

import {
  getActiveProvider,
  getAllProviders,
  setActiveProvider,
  upsertProvider,
} from "@/lib/settings/store";

describe("settings store", () => {
  beforeEach(() => {
    testDb = createTestDb();
  });

  it("returns null when no provider is active", () => {
    expect(getActiveProvider()).toBeNull();
  });

  it("upserts provider and marks it active", () => {
    upsertProvider({
      provider: "openai",
      api_key: "sk-test",
      model: "gpt-4o-mini",
    });

    expect(getActiveProvider()).toEqual({
      provider: "openai",
      api_key: "sk-test",
      model: "gpt-4o-mini",
      is_active: true,
    });
  });

  it("activates one provider and deactivates others", () => {
    upsertProvider({
      provider: "openai",
      api_key: "sk-openai",
      model: "gpt-4o-mini",
    });

    upsertProvider({
      provider: "anthropic",
      api_key: "sk-anthropic",
      model: "claude-3-5-sonnet-latest",
    });

    expect(getActiveProvider()?.provider).toBe("anthropic");

    setActiveProvider("openai");
    expect(getActiveProvider()?.provider).toBe("openai");

    const all = getAllProviders();
    const openai = all.find((provider) => provider.provider === "openai");
    const anthropic = all.find((provider) => provider.provider === "anthropic");

    expect(openai?.is_active).toBe(true);
    expect(anthropic?.is_active).toBe(false);
  });

  it("throws when activating provider that does not exist", () => {
    expect(() => setActiveProvider("google")).toThrow(
      'Provider "google" not found'
    );
  });
});
