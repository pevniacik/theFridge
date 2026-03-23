---
id: T01
parent: S06
milestone: M001
provides:
  - package.json dev script binds Next.js to 0.0.0.0 (LAN-safe default, D024)
  - app/api/health/route.test.ts — 3 Vitest tests covering success and failure modes of the /api/health endpoint
  - lib/qr/origin.test.ts extended with localhost-fallback case (5 tests, all passing)
  - README.md LAN reachability verification section with concrete curl commands
key_files:
  - package.json
  - app/api/health/route.test.ts
  - lib/qr/origin.test.ts
  - README.md
key_decisions:
  - package.json dev script updated to next dev --hostname 0.0.0.0 per D024 (decided during S06 planning)
  - health route test mocks @/lib/db/client via vi.mock; uses the same vi.hoisted pattern from existing route tests
  - QR origin tests are unit-level (pure function with a header accessor stub) — no runtime dependency
patterns_established:
  - Health-route test pattern: vi.mock @/lib/db/client, stub prepare().get() for success, throw from prepare() for failure
observability_surfaces:
  - "curl http://localhost:3000/api/health — returns {status:ok,timestamp} when healthy, {status:error,message} with 503 when DB fails"
  - "curl http://<lan-ip>:3000/api/health — same contract over LAN; works once dev server is started with --hostname 0.0.0.0"
  - "node -e \"console.log(require('./package.json').scripts.dev)\" | grep -- '--hostname 0.0.0.0' — confirms binding flag is present"
duration: 20m
verification_result: passed
completed_at: 2026-03-23
blocker_discovered: false
---

# T01: Enable LAN-safe runtime defaults and operational diagnostics

**Updated dev binding to 0.0.0.0, added health-route tests for success/failure/non-Error throw, extended QR origin tests with localhost-fallback case, and documented LAN verification commands in README.**

## What Happened

**Step 1 — `package.json` binding flag.** Changed `"dev": "next dev"` to `"dev": "next dev --hostname 0.0.0.0"`. This is the D024 decision made during S06 planning; the flag makes the dev server listen on all interfaces so household devices on the same LAN can reach it without any `QR_BASE_URL` override.

**Step 2 — `app/api/health/route.test.ts`.** The health endpoint (`app/api/health/route.ts`) already existed and was correct, but had no automated test coverage. Created three Vitest tests using `vi.mock("@/lib/db/client")` with the same `vi.hoisted` pattern as the existing intake route tests. Cases covered: (1) DB probe returns a value → 200 with `status:"ok"` and a parseable timestamp, (2) `prepare()` throws an Error → 503 with `status:"error"` and a non-empty `message`, (3) `prepare()` throws a non-Error string → 503 with `status:"error"` and `message === "disk full"` (covers the `instanceof Error` branch in the handler).

**Step 3 — `lib/qr/origin.test.ts` extension.** The four existing cases already covered: env-override, x-forwarded-host, proxy-list, and bare host header. Added a fifth case: all headers absent → falls back to `"http://localhost:3000"`. This locks the fallback behavior so any future change to `resolveQrBaseUrl` that drops the localhost fallback will be caught.

**Step 4 — `README.md` LAN section.** Added a "LAN Reachability Verification" section immediately after the run-locally notes block. Includes step-by-step commands: find LAN IP (macOS/Linux), curl localhost health, curl LAN health, grep fridge page for the LAN IP in the QR payload. Also documents the `QR_BASE_URL` escape hatch if the QR still shows localhost.

## Verification

- `npm run test -- app/api/health/route.test.ts lib/qr/origin.test.ts` → all 8 tests pass (3 health + 5 origin)
- `npm run build` → exit 0, 10 routes, no type errors
- `node -e "console.log(require('./package.json').scripts.dev)" | grep -- '--hostname 0.0.0.0'` → "next dev --hostname 0.0.0.0" (BINDING OK)

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm run test -- app/api/health/route.test.ts lib/qr/origin.test.ts` | 0 | ✅ pass (8/8) | ~0.4s |
| 2 | `npm run build` | 0 | ✅ pass | ~27s |
| 3 | `node -e "..." \| grep '--hostname 0.0.0.0'` | 0 | ✅ BINDING OK | <1s |

## Diagnostics

- `curl -sf http://localhost:3000/api/health` → `{"status":"ok","timestamp":"..."}` when app is running and DB is healthy
- `curl -sf http://localhost:3000/api/health` → `{"status":"error","message":"..."}` with HTTP 503 when DB probe fails
- `curl -sf http://<lan-ip>:3000/api/health` → same JSON contract over the home LAN
- `npm run test -- app/api/health/route.test.ts` → run isolated health tests; each case name maps directly to a failure mode
- README "LAN Reachability Verification" section — step-by-step commands a future agent can copy-paste

## Deviations

None. The plan was followed exactly. The health route and origin module were correct; only test coverage and documentation were missing.

## Known Issues

Two pre-existing test failures exist in the nested `.gsd/worktrees/M001` Vitest discovery path:
1. `.gsd/worktrees/M001/e2e/intake-flow.test.ts` — 6 tests fail because the worktree copy references `test-fixtures/sample-food.jpg` which no longer exists at the root (that fixture was deleted from main between milestone sessions). These are in the worktree copy, not the root repo. T02 (this task's sibling) will create the fixture.
2. `.gsd/worktrees/M001/lib/intake/providers/anthropic.test.ts` — 1 test expects a rejected promise but gets `[]`; this is in the worktree copy of a stale test written against an older provider API. The root repo's `lib/intake/providers/anthropic.test.ts` passes 2/2.

Both are outside T01 scope and pre-existing relative to the main branch.

## Files Created/Modified

- `package.json` — `dev` script updated: `next dev` → `next dev --hostname 0.0.0.0`
- `app/api/health/route.test.ts` — new; 3 tests for /api/health success and failure modes
- `lib/qr/origin.test.ts` — extended with localhost-fallback case (4 → 5 tests)
- `README.md` — added LAN Reachability Verification section with concrete curl commands
