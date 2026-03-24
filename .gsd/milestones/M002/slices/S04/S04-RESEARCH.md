# S04: mDNS Hostname — Research

**Milestone:** M002
**Slice:** S04 (nice-to-have)
**Risk:** medium
**Depends on:** S01

---

## Summary

S04 is well-scoped: add `bonjour-service` advertisement from the running container so `http://thefridge.local:3000` resolves on the home LAN. Two things change: (1) a module that starts the mDNS advertisement, wired via Next.js instrumentation hook; (2) `docker-compose.yml` switches to `network_mode: host` and drops `ports:`. The work is straightforward except for one significant platform caveat: `network_mode: host` only works on Linux. On macOS (Docker Desktop), the container runs inside a Linux VM and its host-mode network is the VM's, not the Mac's — mDNS multicast won't reach the real LAN from Docker Desktop on macOS. This means the verified production target must be a Linux device (Pi, Mac Mini running Linux) for S04 to actually work.

---

## Requirement

**R031** `[quality-attribute]` (active, owner: M002/S04) — The app advertises itself as `thefridge.local` via mDNS/Bonjour so household members can use a stable hostname.

---

## Existing State

### docker-compose.yml (current — S01 bridge networking)

```yaml
services:
  fridge-app:
    ports:
      - "${HOST_PORT:-3000}:3000"
    environment:
      PORT: "3000"
      HOSTNAME: "0.0.0.0"
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://127.0.0.1:3000/api/health', ...)"]
    volumes:
      - fridge_data:/app/data
    restart: unless-stopped
```

### No `lib/mdns/` directory exists yet

`find . -path "*/lib/mdns*"` returns nothing. The module must be created from scratch.

### No `instrumentation.ts` exists at the project root

Next.js 15 supports `instrumentation.ts` natively — no config flag needed.

---

## Library: bonjour-service (v1.3.0)

**Chosen in D029** — pure TypeScript, no native compilation, based on `multicast-dns`.

### API surface (from inspecting packed dist)

```typescript
import Bonjour from 'bonjour-service';

const bonjour = new Bonjour();
const service = bonjour.publish({ name: 'thefridge', type: 'http', port: 3000 });
// service emits 'up' when published
// cleanup:
bonjour.unpublishAll(() => bonjour.destroy());
```

`ServiceConfig` requires `name: string`, `type: string`, `port: number`. Optional: `protocol` ('tcp'|'udp', defaults tcp), `host`. No native modules — pure JS multicast UDP sockets.

### Dependencies

- `multicast-dns@^7.2.5` — the actual UDP multicast implementation
- `fast-deep-equal@^3.1.3` — utility, no native code

Neither needs compilation. `bonjour-service` can be added as a `dependency` (not devDependency) — it must exist in the runner image.

### Docker runner stage impact

`bonjour-service` is pure JS, so the existing Dockerfile (which only copies native modules explicitly) does NOT need modification. With `output: 'standalone'`, Next.js's file-tracing (`nft`) **will** trace `bonjour-service` imports through `instrumentation.ts` and include it in `.next/standalone/node_modules/`. This is safe — no extra COPY needed in the Dockerfile.

---

## Integration Point: Next.js Instrumentation Hook

**Why instrumentation, not a custom server or direct import:**

- `output: 'standalone'` generates `server.js` — wrapping it with a custom server would require modifying the generated file on each build, which is brittle.
- Importing the mDNS module directly from a route/layout file would start multiple instances (one per worker process). Instrumentation runs **once per server process startup**, which is exactly what we need.
- Next.js 15 supports `instrumentation.ts` without any config flag. It must export a `register()` async function at the root level.

**Pattern:**

```typescript
// instrumentation.ts (project root)
export async function register() {
  // Only run in Node.js runtime (not edge), only in production
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    process.env.NODE_ENV === 'production'
  ) {
    const { startMdnsAdvertisement } = await import('@/lib/mdns/advertise');
    startMdnsAdvertisement();
  }
}
```

The dynamic `import()` avoids bundling `bonjour-service` into the Edge runtime bundle.

**`lib/mdns/advertise.ts`:**

```typescript
import Bonjour from 'bonjour-service';

export function startMdnsAdvertisement(): void {
  const port = parseInt(process.env.PORT ?? '3000', 10);
  const bonjour = new Bonjour();
  bonjour.publish({ name: 'thefridge', type: 'http', port });
  console.log(`[mdns] Advertising thefridge.local on port ${port}`);

  // Graceful cleanup on process termination
  const cleanup = () => {
    bonjour.unpublishAll(() => bonjour.destroy());
  };
  process.once('SIGTERM', cleanup);
  process.once('SIGINT', cleanup);
}
```

---

## docker-compose.yml Change: Bridge → Host Networking

**D030** (locked): `network_mode: host` is the only reliable option for mDNS multicast from Docker.

`network_mode: host` is **incompatible** with `ports:` mapping — they must not coexist in the same service definition. The port is implicit (container binds directly to the host's 3000).

**S04 compose changes:**
1. Remove `ports:` entirely
2. Add `network_mode: host`
3. Keep `HOSTNAME: "0.0.0.0"` and `PORT: "3000"` — these still control binding

```yaml
services:
  fridge-app:
    network_mode: host
    # ports: removed — incompatible with host networking
    environment:
      PORT: "3000"
      HOSTNAME: "0.0.0.0"
      # ... rest unchanged
```

**Healthcheck**: Already uses `http://127.0.0.1:3000/api/health` — this still works with host networking.

**Volume mounts**: Unchanged — named volumes work with host networking.

**`restart: unless-stopped`**: Unchanged.

---

## Critical Platform Caveat: macOS vs Linux

| Platform | `network_mode: host` | mDNS works? |
|---|---|---|
| Linux (Pi, Mac Mini + Linux) | Container shares host network stack | ✅ Yes — multicast reaches LAN |
| macOS (Docker Desktop) | Container is in a Linux VM; "host" = VM's net | ❌ No — multicast stays in VM |

**Implication**: S04 cannot be verified on the dev machine if it's macOS with Docker Desktop. Verification must happen on the target Linux home device. The roadmap explicitly lists the Pi/Mac Mini/old Linux laptop as the target — so this is expected and acceptable.

**Document this in the verification script and README.**

---

## S01 Verification Script Compatibility

The existing `verify-s01-docker.sh` checks `docker inspect ... .NetworkSettings.Ports` for `"HostIp":"0.0.0.0"`. With `network_mode: host`, `NetworkSettings.Ports` will be **empty** — this check will fail against an S04 compose file.

**Resolution**: Create a separate `verify-s04-mdns.sh` script that tests S04-specific assertions (mDNS advertisement, hostname resolution). Do NOT modify `verify-s01-docker.sh`. If the operator wants to validate both, they run both scripts (S01 against the S01/S02/S03 bridge compose config, S04 against the host-mode config).

Alternatively, S04 could ship a second compose file (`docker-compose.host.yml`) that operators `--file`-select when they want mDNS, keeping the default `docker-compose.yml` (bridge) unchanged for S01–S03 compatibility. **This is the recommended approach** — it avoids breaking the verified S01–S03 setup for operators who don't need mDNS.

---

## Implementation Landscape

### Files to create

| File | What |
|------|------|
| `lib/mdns/advertise.ts` | `startMdnsAdvertisement()` — creates Bonjour instance, publishes service, registers SIGTERM/SIGINT cleanup |
| `instrumentation.ts` | Next.js instrumentation hook — calls `startMdnsAdvertisement()` in nodejs runtime + production only |
| `docker-compose.host.yml` | Variant compose file with `network_mode: host`, no `ports:`, otherwise identical to `docker-compose.yml` |
| `scripts/verify-s04-mdns.sh` | Verification: container starts with host networking; `ping thefridge.local` resolves; `GET http://thefridge.local:3000/api/health` returns `{"status":"ok"}` |

### Files to modify

| File | What |
|------|------|
| `package.json` | Add `"bonjour-service": "^1.3.0"` to `dependencies` |

### Files NOT to modify

| File | Why |
|------|-----|
| `docker-compose.yml` | Keep bridge networking for S01–S03 operators; host mode in separate file |
| `Dockerfile` | No change — `nft` traces `bonjour-service` through instrumentation.ts automatically; no native modules to copy |
| `next.config.ts` | No change needed; instrumentation is auto-detected at root |

---

## Verification Plan (R031)

The verification script (`verify-s04-mdns.sh`) must run on a **Linux** host. It should:

1. `docker compose -f docker-compose.host.yml up -d` — start with host networking
2. Wait for `http://127.0.0.1:3000/api/health` → `{"status":"ok"}` (same wait loop as verify-s01)
3. Check `docker inspect thefridge-local` for `network_mode: host` (not bridge)
4. Check container logs for `[mdns] Advertising thefridge.local on port 3000`
5. `ping -c 3 thefridge.local` → resolves (on Linux target device only; skip on macOS)
6. `curl http://thefridge.local:3000/api/health` → `{"status":"ok"}` (on Linux target device only)
7. `docker compose -f docker-compose.host.yml down` + cleanup

Checks 5 and 6 require being on the same LAN as the container and running on Linux. The script should detect the OS and skip/warn for macOS.

---

## Gotchas

1. **`network_mode: host` + `ports:` are mutually exclusive** — Docker will error if both are present. The S04 compose file must have `ports:` entirely absent (not just commented out).

2. **`NEXT_RUNTIME` guard is required** — `instrumentation.ts` `register()` is called for both `nodejs` and `edge` runtimes in Next.js 15. Without the guard, the edge runtime will try to import `bonjour-service` (a Node.js module with UDP sockets) and fail. Always check `process.env.NEXT_RUNTIME === 'nodejs'`.

3. **`bonjour-service` in standalone nft tracing** — Next.js nft (node-file-trace) traces dynamic imports in `instrumentation.ts`. The `await import('@/lib/mdns/advertise')` pattern means nft will follow the dependency chain and include `bonjour-service` + `multicast-dns` in `.next/standalone/node_modules/`. No explicit Dockerfile COPY is needed (unlike `better-sqlite3` which has native binaries excluded from tracing).

4. **Single advertisement instance** — if `NODE_ENV=development` reaches `startMdnsAdvertisement()`, HMR restarts will spawn multiple Bonjour instances. The production guard in `instrumentation.ts` prevents this, but add a `process.env.NODE_ENV === 'production'` check as a belt-and-suspenders measure.

5. **`verify-s01-docker.sh` LAN binding check** — the existing script inspects `NetworkSettings.Ports` for `"HostIp":"0.0.0.0"`. This passes only for bridge mode. S04's host mode has no `NetworkSettings.Ports`. This is expected; S04 verification is in its own script.

6. **macOS Docker Desktop — mDNS won't work** — document this explicitly in `docker-compose.host.yml` comments and the README. The feature requires a Linux host.

---

## Task Decomposition for Planner

Natural split into two independent tasks:

**T01 — mDNS advertisement module + instrumentation hook**
- Install `bonjour-service` in `package.json`
- Create `lib/mdns/advertise.ts`
- Create `instrumentation.ts` at project root
- Run `npm run type-check` to confirm no TS errors
- Run `npm run build` to confirm standalone includes `bonjour-service` in traced output

**T02 — Host-mode compose + verification script**
- Create `docker-compose.host.yml`
- Create `scripts/verify-s04-mdns.sh`
- Document macOS limitation in file comments
- Manual verification on Linux target device (Pi/Mac Mini) to retire R031

T01 must complete before T02 can be fully verified (need the built image to test), but the compose file and script can be authored in parallel.
