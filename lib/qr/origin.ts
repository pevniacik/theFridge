import * as os from "node:os";

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

function parseHost(value: string): { hostname: string; port: string } | null {
  try {
    const url = new URL(`http://${value}`);
    return { hostname: url.hostname.toLowerCase(), port: url.port };
  } catch {
    return null;
  }
}

function isPrivateIpv4(address: string): boolean {
  return (
    address.startsWith("10.") ||
    address.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  );
}

function detectLanIpv4(): string | null {
  const networks = os.networkInterfaces();
  let fallback: string | null = null;

  for (const entries of Object.values(networks)) {
    if (!entries) continue;

    for (const entry of entries) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      if (isPrivateIpv4(entry.address)) return entry.address;
      fallback ??= entry.address;
    }
  }

  return fallback;
}

function toReachableOrigin(
  proto: "http" | "https",
  host: string,
  lanIpOverride?: string | null
): string | null {
  const parsed = parseHost(host);
  if (!parsed) {
    return `${proto}://${host}`;
  }

  const { hostname, port } = parsed;
  const isLoopbackLike =
    hostname === "0.0.0.0" ||
    hostname === "127.0.0.1" ||
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname === "[::1]";

  if (!isLoopbackLike) {
    return `${proto}://${host}`;
  }

  const lanIp = lanIpOverride === undefined ? detectLanIpv4() : lanIpOverride;
  if (!lanIp) return null;

  return `${proto}://${lanIp}${port ? `:${port}` : ""}`;
}

export function resolveQrBaseUrl(
  headers: HeaderAccessor,
  envOverride?: string | null,
  lanIpOverride?: string | null
): string {
  if (envOverride && envOverride.trim().length > 0) {
    return normalizeBaseUrl(envOverride);
  }

  const proto = normalizeProto(headers.get("x-forwarded-proto"));
  const candidates = [
    firstValue(headers.get("x-forwarded-host")),
    firstValue(headers.get("host")),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const origin = toReachableOrigin(proto, candidate, lanIpOverride);
    if (origin) return origin;
  }

  const lanIp = lanIpOverride === undefined ? detectLanIpv4() : lanIpOverride;
  if (lanIp) {
    return `${proto}://${lanIp}:3000`;
  }

  return "http://localhost:3000";
}
