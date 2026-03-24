# S02: PWA Shell & Home Screen — Research

**Milestone:** M002
**Slice:** S02
**Researched:** 2026-03-24
**Complexity:** Targeted — known technology (Serwist), new to this codebase

---

## Summary

S02 is three distinct tasks packaged as one slice:

1. **Real icons** — replace the 1×1 pixel placeholder PNGs with actual 192×192 and 512×512 artwork
2. **Serwist service worker** — install `@serwist/next` + `serwist`, wire into `next.config.ts`, create `app/sw.ts` and `app/~offline/page.tsx`
3. **Offline fallback page** — simple page shown when server is unreachable (SW active only on HTTPS; see limitation below)

The PWA manifest (`app/manifest.ts`) is already complete and correct — `display: "standalone"`, `start_url: "/"`, correct theme/background colors, portrait orientation, icon paths declared. No changes needed. The Apple Web App meta in `app/layout.tsx` is also already correct (`capable: true`, `black-translucent` status bar). The `output: "standalone"` config is already set in `next.config.ts` from S01.

---

## Implementation Landscape

### Files That Change

| File | Change |
|------|--------|
| `next.config.ts` | Wrap existing config with `withSerwistInit(...)`, keeping `output: "standalone"` |
| `tsconfig.json` | Add `"webworker"` to `lib` array for SW type support |
| `app/sw.ts` | New — Serwist service worker with precache manifest, offline fallback |
| `app/~offline/page.tsx` | New — offline fallback page (static, no data fetching) |
| `public/icons/icon-192.png` | Replace 1×1 placeholder with real 192×192 icon |
| `public/icons/icon-512.png` | Replace 1×1 placeholder with real 512×512 icon |
| `scripts/generate-icons.mjs` | New — one-off Node script to produce icons from SVG via `sharp` |
| `package.json` | Add `@serwist/next`, `serwist`; add `sharp` as devDependency for icon generation |

### Files That Do NOT Change

- `app/manifest.ts` — already correct
- `app/layout.tsx` — Apple Web App meta already correct
- `Dockerfile` / `docker-compose.yml` — no changes (S01 already copies `public/` and `.next/static/` correctly)
- All M001 application files — untouched

---

## Icon Generation Strategy

The two PNGs at `public/icons/icon-192.png` and `public/icons/icon-512.png` are confirmed 1×1 pixel placeholders (PNG RGBA data verified with `file`). They must be replaced before a real "Add to Home Screen" prompt will show a meaningful icon.

**Recommended approach: `sharp` + SVG → PNG script**

`sharp` accepts an SVG buffer as input and outputs PNG at any resolution. It handles all rasterization internally — no ImageMagick, no canvas native module. Install as a devDependency (`npm install -D sharp`).

```mjs
// scripts/generate-icons.mjs
import sharp from "sharp";
import { writeFileSync } from "fs";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#0f1011"/>
  <text x="256" y="340" font-size="320" text-anchor="middle" fill="#f59c2b">🧊</text>
</svg>`;

const buf = Buffer.from(svg);
await sharp(buf).resize(192).png().toFile("public/icons/icon-192.png");
await sharp(buf).resize(512).png().toFile("public/icons/icon-512.png");
console.log("Icons generated.");
```

Use the app's existing theme colors: background `#0f1011`, accent `#f59c2b`. A fridge/snowflake emoji on a dark rounded rectangle reads clearly at both sizes. The executor can iterate on the SVG design — the important constraint is producing valid PNG files at exactly 192×192 and 512×512.

**Alternative considered:** `canvas` npm package — requires native compilation (rejected; adds a build dependency comparable to `better-sqlite3`). `jimp` — pure JS but much slower and no SVG support. `sharp` is the right choice.

---

## Serwist Integration

### Installation

```bash
npm install @serwist/next serwist
```

No other packages needed. `@serwist/next` provides the `withSerwistInit` Next.js config wrapper and the `defaultCache` worker export. `serwist` provides the `Serwist` class used in the SW itself.

### next.config.ts Pattern

Keep `output: "standalone"` from S01. Wrap with `withSerwistInit`:

```typescript
import { spawnSync } from "node:child_process";
import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ??
  crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
});

const nextConfig: NextConfig = {
  output: "standalone",
};

export default withSerwist(nextConfig);
```

Key points:
- `disable: process.env.NODE_ENV === "development"` — prevents stale-cache confusion in dev (D027)
- `swDest: "public/sw.js"` — output lands in `public/`, which S01's Dockerfile already copies into the standalone image
- `additionalPrecacheEntries` for `/~offline` — must be listed explicitly so Serwist precaches it; the offline page won't be fetchable when the network is down otherwise

### app/sw.ts

```typescript
/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
```

### tsconfig.json

Add `"webworker"` to the `lib` array (currently `["dom", "dom.iterable", "esnext"]`):

```json
"lib": ["dom", "dom.iterable", "esnext", "webworker"]
```

This is required for the triple-slash references in `app/sw.ts` to resolve `ServiceWorkerGlobalScope` etc.

### app/~offline/page.tsx

Simple static page, no client-side JavaScript needed. Should match app visual language but carry no data dependencies:

```tsx
export default function OfflinePage() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <p>🌐 You're offline</p>
      <p>theFridge server is unreachable. Check that the home device is running.</p>
    </div>
  );
}
```

The `~offline` route uses a tilde prefix — Next.js App Router handles this fine; the directory name is `app/~offline/` with `page.tsx` inside.

---

## Known Constraints & Gotchas

### Service Worker on Plain HTTP LAN (D028)

**This is a documented, accepted limitation.** iOS Safari and Chrome require HTTPS or `localhost` to register a service worker. At `http://192.168.x.x:3000`, the SW will not be installed and the offline fallback will never activate. The manifest-based standalone install ("Add to Home Screen") and real icons work regardless of this restriction. S02 delivers the maximum the platform allows over HTTP LAN.

### SW disabled in development

With `disable: process.env.NODE_ENV === "development"`, running `npm run dev` will never register the SW. Testing SW behavior requires a production build (`npm run build && node .next/standalone/server.js` or the Docker container). Verify with `docker compose up` after S01.

### Build-time precache manifest

`self.__SW_MANIFEST` is injected at build time by `withSerwistInit`. If the build is not run, the SW will have an empty precache. The executor must run `npm run build` (or verify via Docker build) to confirm the manifest is populated.

### `public/sw.js` path stability

The generated SW file lands at `public/sw.js`. S01's Dockerfile copies `public/` into the standalone image, so the file will be served at `/sw.js`. No Dockerfile changes are needed — this just works.

### Icon file at exact dimensions

Safari iOS requires icons at declared sizes. The manifest declares `192x192` and `512x512`. The `sharp` script must output at exactly these dimensions — the `.resize(192)` call produces a 192×192 output from any SVG viewport.

---

## Verification Plan

1. **Build check**: `npm run build` succeeds with Serwist config (no TypeScript errors; precache manifest injected)
2. **Icon check**: `file public/icons/icon-192.png` reports `192 x 192`; same for 512
3. **Manifest check**: `curl http://localhost:3000/manifest.webmanifest | python3 -m json.tool` — valid JSON, icons array present with correct paths
4. **SW file served**: `curl http://localhost:3000/sw.js` — returns JS (not 404)
5. **Offline page**: `curl http://localhost:3000/~offline` — returns HTML
6. **Docker build**: `docker compose build` succeeds with new `public/sw.js` and updated icons
7. **Real device (human verification)**: On a phone connected to home LAN, open `http://<LAN-IP>:3000`, tap "Add to Home Screen" — icon appears correctly; standalone launch shows no browser chrome

---

## Decomposition for Planner

Natural task order:

**T01: Generate real icons** — Install `sharp` as devDep, write `scripts/generate-icons.mjs`, run it, verify PNG dimensions. Independent — no other task depends on completing this first, but icon files must exist before real-device verification.

**T02: Install Serwist, wire next.config.ts, create app/sw.ts, update tsconfig.json** — Core SW integration. Can be done in parallel with T01 (no dependency on icon files). Must verify `npm run build` succeeds and `public/sw.js` is generated.

**T03: Create app/~offline/page.tsx** — Trivial; depends on T02 only insofar as the offline URL must be precached in sw.ts.

**T04: Docker build + verification** — Depends on T01+T02+T03 complete. Runs `docker compose build` and verifies all artifacts appear in the container.

---

## Forward Intelligence

- **`withSerwistInit` is the wrapper name** — not `withSerwist`; the pattern `const withSerwist = withSerwistInit({...})` creates the wrapping function, then `withSerwist(nextConfig)` applies it. Don't confuse the two names.
- **`disable` flag uses `process.env.NODE_ENV`** at config evaluation time, not runtime — this is evaluated during `next build`/`next dev`, so the flag correctly disables SW generation in dev and enables it in production builds.
- **Sharp and `output: standalone`** — `sharp` is a devDependency used only at icon-generation time (a build script), not imported into the Next.js app itself. It does not need to be in the standalone bundle and does not complicate the Docker build.
- **No existing Serwist config** — the codebase has zero Serwist packages installed. This is a fresh integration with no prior config to conflict with.
- **`app/~offline/` directory** — the tilde in the directory name is fine on macOS/Linux filesystems and is the Serwist-recommended convention. Next.js App Router treats it as a normal route segment.
- **tsconfig `lib` array conflict** — adding `"webworker"` alongside `"dom"` could in theory create type conflicts (both define `fetch`, `Request`, etc.). In practice, with the triple-slash `/// <reference no-default-lib="true" />` in `sw.ts`, the SW file opts out of the global lib entirely and uses only `esnext` + `webworker`. The main app files are unaffected.
