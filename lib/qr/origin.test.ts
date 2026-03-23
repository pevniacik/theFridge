import { describe, expect, it } from "vitest";

import { resolveQrBaseUrl } from "@/lib/qr/origin";

function makeHeaders(values: Record<string, string | null>) {
  return {
    get(name: string) {
      return values[name.toLowerCase()] ?? null;
    },
  };
}

describe("resolveQrBaseUrl", () => {
  it("uses QR_BASE_URL override when provided", () => {
    const baseUrl = resolveQrBaseUrl(
      makeHeaders({ host: "localhost:3005" }),
      "http://192.168.1.22:3005/"
    );

    expect(baseUrl).toBe("http://192.168.1.22:3005");
  });

  it("prefers x-forwarded-host and x-forwarded-proto", () => {
    const baseUrl = resolveQrBaseUrl(
      makeHeaders({
        host: "localhost:3005",
        "x-forwarded-host": "192.168.1.22:3005",
        "x-forwarded-proto": "http",
      })
    );

    expect(baseUrl).toBe("http://192.168.1.22:3005");
  });

  it("uses first forwarded value when proxy headers contain a list", () => {
    const baseUrl = resolveQrBaseUrl(
      makeHeaders({
        "x-forwarded-host": "192.168.1.22:3005, proxy.internal",
        "x-forwarded-proto": "https, http",
      })
    );

    expect(baseUrl).toBe("https://192.168.1.22:3005");
  });

  it("falls back to host header with default http protocol", () => {
    const baseUrl = resolveQrBaseUrl(makeHeaders({ host: "192.168.1.22:3005" }));

    expect(baseUrl).toBe("http://192.168.1.22:3005");
  });

  it("falls back to localhost:3000 when no host header is present", () => {
    const baseUrl = resolveQrBaseUrl(makeHeaders({}));

    expect(baseUrl).toBe("http://localhost:3000");
  });
});
