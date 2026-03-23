import { afterEach, describe, expect, it, vi } from "vitest";

// Mock getDb so we can control what the DB probe does
const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  getDb: mocks.getDb,
}));

import { GET } from "@/app/api/health/route";

afterEach(() => {
  mocks.getDb.mockReset();
});

describe("GET /api/health", () => {
  it("returns status:ok and a timestamp when the DB is reachable", async () => {
    // Simulate a working DB: prepare().get() returns something truthy
    mocks.getDb.mockReturnValue({
      prepare: () => ({ get: () => 1 }),
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(typeof body.timestamp).toBe("string");
    // timestamp should be a valid ISO-8601 date
    expect(() => new Date(body.timestamp)).not.toThrow();
  });

  it("returns 503 and an error message when the DB probe throws", async () => {
    mocks.getDb.mockReturnValue({
      prepare: () => {
        throw new Error("SQLITE_CANTOPEN: unable to open database file");
      },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("error");
    expect(typeof body.message).toBe("string");
    expect(body.message.length).toBeGreaterThan(0);
  });

  it("surfaces non-Error throws as a string message", async () => {
    mocks.getDb.mockReturnValue({
      prepare: () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "disk full";
      },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("error");
    expect(body.message).toBe("disk full");
  });
});
