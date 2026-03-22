export interface HeaderAccessor {
  get(name: string): string | null;
}

function firstValue(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first && first.length > 0 ? first : null;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/$/, "");
}

function normalizeProto(value: string | null): "http" | "https" {
  const proto = firstValue(value)?.toLowerCase();
  return proto === "https" ? "https" : "http";
}

export function resolveQrBaseUrl(
  headers: HeaderAccessor,
  envOverride?: string | null
): string {
  if (envOverride && envOverride.trim().length > 0) {
    return normalizeBaseUrl(envOverride);
  }

  const forwardedHost = firstValue(headers.get("x-forwarded-host"));
  const host = forwardedHost ?? firstValue(headers.get("host"));
  const proto = normalizeProto(headers.get("x-forwarded-proto"));

  if (host) {
    return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}
