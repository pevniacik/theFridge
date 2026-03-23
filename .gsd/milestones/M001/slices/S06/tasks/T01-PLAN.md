---
estimated_steps: 5
estimated_files: 5
skills_used:
  - test
---

# T01: Enable LAN-safe runtime defaults and operational diagnostics

**Slice:** S06 — Local-first runtime and end-to-end proof
**Milestone:** M001

## Description

Make the dev/runtime entrypoint actually usable on the home network and lock the operational diagnostics around it. This task closes R011 at the runtime-entrypoint layer: the app must bind to all interfaces in dev mode, expose a DB-backed health endpoint, and preserve LAN-safe QR-origin resolution under test.

## Steps

1. Update `package.json` so `npm run dev` binds Next.js to `0.0.0.0`.
2. Add or update `app/api/health/route.test.ts` to prove `/api/health` returns `status:"ok"` when SQLite is reachable and a 503 + message when the DB probe fails.
3. Extend `lib/qr/origin.test.ts` if needed so LAN host, forwarded-host, and env-override QR-origin resolution are all covered.
4. Update `README.md` with the concrete LAN-start and QR-origin verification commands a future agent should run.
5. Run focused tests plus a build to ensure the operational path is stable.

## Must-Haves

- [ ] `npm run dev` binds to all interfaces (`0.0.0.0`) instead of localhost-only.
- [ ] `/api/health` has explicit automated proof for both success and failure modes.
- [ ] QR-origin resolution stays mechanically verified for LAN host / forwarded host / override paths.
- [ ] README documents the LAN verification path without requiring guesswork.

## Verification

- `npm run test -- app/api/health/route.test.ts lib/qr/origin.test.ts`
- `npm run build`
- `node -e "console.log(require('./package.json').scripts.dev)" | grep -- '--hostname 0.0.0.0'`

## Observability Impact

- Signals added/changed: explicit health-route test coverage; dev server now advertises LAN binding in the startup banner.
- How a future agent inspects this: `curl http://localhost:3000/api/health`, `curl http://<lan-ip>:3000/api/health`, README LAN verification section.
- Failure state exposed: `/api/health` returns 503 + diagnostic message when DB access fails.

## Inputs

- `package.json` — current `dev` script still binds Next.js with its default host behavior
- `app/api/health/route.ts` — DB-backed liveness endpoint already exists
- `lib/qr/origin.ts` — QR origin resolution logic under test
- `lib/qr/origin.test.ts` — existing LAN/forwarded-host origin tests
- `README.md` — current runbook for local/LAN usage

## Expected Output

- `package.json` — LAN-safe dev script using `--hostname 0.0.0.0`
- `app/api/health/route.test.ts` — focused health endpoint success/failure tests
- `lib/qr/origin.test.ts` — LAN-origin contract coverage kept current
- `README.md` — concrete LAN runtime and QR verification instructions
