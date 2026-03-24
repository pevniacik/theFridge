---
estimated_steps: 5
estimated_files: 4
skills_used: []
---

# T01: Add mDNS advertisement module and Next.js instrumentation hook

**Slice:** S04 — mDNS Hostname
**Milestone:** M002

## Description

Install `bonjour-service` and create the application-level mDNS advertisement capability. This is two files: `lib/mdns/advertise.ts` (the service advertisement logic) and `instrumentation.ts` (the Next.js hook that triggers it in production). The instrumentation hook must guard against Edge runtime and development mode to avoid multiple instances or missing Node.js APIs.

## Steps

1. Run `npm install bonjour-service@^1.3.0` to add it as a production dependency.

2. Create `lib/mdns/advertise.ts`:
   ```typescript
   import Bonjour from 'bonjour-service';

   export function startMdnsAdvertisement(): void {
     const port = parseInt(process.env.PORT ?? '3000', 10);
     const bonjour = new Bonjour();
     bonjour.publish({ name: 'thefridge', type: 'http', port });
     console.log(`[mdns] Advertising thefridge.local on port ${port}`);

     const cleanup = () => {
       console.log('[mdns] Stopping advertisement');
       bonjour.unpublishAll(() => bonjour.destroy());
     };
     process.once('SIGTERM', cleanup);
     process.once('SIGINT', cleanup);
   }
   ```

3. Create `instrumentation.ts` at the **project root** (not inside `app/` or `lib/`):
   ```typescript
   export async function register() {
     if (
       process.env.NEXT_RUNTIME === 'nodejs' &&
       process.env.NODE_ENV === 'production'
     ) {
       const { startMdnsAdvertisement } = await import('@/lib/mdns/advertise');
       startMdnsAdvertisement();
     }
   }
   ```
   **Critical guards:**
   - `NEXT_RUNTIME === 'nodejs'` — prevents Edge runtime from importing Node.js UDP socket modules
   - `NODE_ENV === 'production'` — prevents dev server HMR from spawning multiple Bonjour instances
   - Dynamic `import()` — ensures `bonjour-service` is never statically bundled into Edge

4. Run `npm run type-check` — must exit 0.

5. Run `npm run build` — must exit 0. After build, verify `bonjour-service` was traced into standalone:
   ```bash
   ls .next/standalone/node_modules/bonjour-service
   ```
   This directory should exist because Next.js nft (node-file-trace) follows the dynamic import chain in `instrumentation.ts`.

## Must-Haves

- [ ] `bonjour-service` is in `dependencies` (not `devDependencies`) in `package.json`
- [ ] `lib/mdns/advertise.ts` exports `startMdnsAdvertisement()` with SIGTERM/SIGINT cleanup
- [ ] `instrumentation.ts` exists at project root with both `NEXT_RUNTIME` and `NODE_ENV` guards
- [ ] Dynamic `import()` used (not static `import`) to avoid Edge bundling
- [ ] `npm run type-check` passes
- [ ] `npm run build` succeeds
- [ ] `bonjour-service` present in `.next/standalone/node_modules/`

## Verification

- `npm run type-check` exits 0
- `npm run build` exits 0
- `test -d .next/standalone/node_modules/bonjour-service` exits 0

## Inputs

- `package.json` — current dependency manifest to add `bonjour-service` to
- `next.config.ts` — confirms `output: "standalone"` is set (no modification needed)

## Expected Output

- `package.json` — updated with `bonjour-service` dependency
- `lib/mdns/advertise.ts` — new file: mDNS advertisement module
- `instrumentation.ts` — new file: Next.js instrumentation hook
