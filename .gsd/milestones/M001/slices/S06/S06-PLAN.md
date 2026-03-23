# S06: Local-first runtime and end-to-end proof

**Goal:** Prove that the assembled app is actually usable as a local-first household system on the home network, not just as isolated slice artifacts.
**Demo:** Start the app on a LAN-reachable host, open the fridge page over the LAN IP, confirm the QR encodes the LAN origin, run the real intake → review → inventory → status → maintain → suggestion loop, and show that the same flow remains healthy under test/build verification.

## Must-Haves

- Dev/runtime entrypoint is LAN-reachable (`0.0.0.0` binding) and exposes a working health endpoint
- QR origin resolves to the LAN host (or configured override) so printed/scanned QR links are usable off localhost
- The assembled intake → inventory → status → maintain → suggestion loop is exercised end-to-end against the real runtime and persisted SQLite state
- Automated verification covers the integrated data path so regressions are caught without re-doing the full manual loop every time
- Final acceptance evidence includes both operational proof (LAN reachability) and human QR/device validation guidance

## Proof Level

- This slice proves: final-assembly
- Real runtime required: yes
- Human/UAT required: yes

## Verification

- `npm run test` — integrated regression suite passes, including the S06 end-to-end proof tests
- `npm run type-check` — no TypeScript regressions
- `npm run build` — production build succeeds with the assembled runtime path
- `curl -sf http://localhost:3000/api/health` — local runtime health works
- `curl -sf http://<lan-ip>:3000/api/health` — LAN runtime health works from the host against the LAN address
- `curl -s http://<lan-ip>:3000/fridges/<fridge-id> | grep "<lan-ip>"` — fridge page HTML / QR payload contains the LAN origin rather than localhost
- Browser: open `http://<lan-ip>:3000/fridges/<fridge-id>` and confirm QR, status, alerts, and suggestions render from real inventory data
- Browser/manual: upload a real grocery photo, review/correct the draft, promote to inventory, mutate an item, and confirm status/suggestions update truthfully

## Observability / Diagnostics

- Runtime signals: Next.js dev banner shows host/port binding; `/api/health` returns `{ status, timestamp }`; existing `[intake]` and `[inventory]` logs reveal extraction and mutation paths
- Inspection surfaces: fridge page over LAN, `curl` against health + fridge route, `sqlite3 data/fridges.db ...` for inventory truth, QR origin tests in `lib/qr/origin.test.ts`
- Failure visibility: health endpoint returns 503 + message on DB failure; intake errors surface in UI/API JSON; inventory actions surface per-row structured errors
- Redaction constraints: do not log or store raw API keys in proof artifacts or scripts

## Integration Closure

- Upstream surfaces consumed: `app/fridges/[fridgeId]/page.tsx`, `StatusSection.tsx`, `InventorySection.tsx`, `IntakeSection.tsx`, `RecipeSection.tsx`, `app/api/health/route.ts`, `lib/qr/origin.ts`, `lib/inventory/store.ts`, `lib/inventory/analysis.ts`
- New wiring introduced in this slice: LAN-safe dev runtime binding, executable end-to-end verification artifacts, and final live acceptance proof for the assembled loop
- What remains before the milestone is truly usable end-to-end: nothing

## Tasks

- [x] **T01: Enable LAN-safe runtime defaults and operational diagnostics** `est:45m`
  - Why: S06 owns R011. The app cannot be proven usable on the home network if `npm run dev` still binds to localhost only or if LAN health/origin checks are not mechanically verifiable.
  - Files: `package.json`, `app/api/health/route.ts`, `app/api/health/route.test.ts`, `lib/qr/origin.test.ts`, `README.md`
  - Do: Change the dev script to `next dev --hostname 0.0.0.0`; keep `/api/health` as the operational liveness endpoint and add/update route tests so DB-backed health is explicitly covered; extend QR-origin tests if needed so LAN host / forwarded-host / override behavior is locked; document the LAN run command and QR-origin verification path in README without overclaiming printed-scan proof.
  - Verify: `npm run test -- app/api/health/route.test.ts lib/qr/origin.test.ts && npm run build`
  - Done when: the app starts LAN-reachable by default in dev mode, health/origin behavior is test-covered, and README tells a future agent how to verify LAN reachability

- [x] **T02: Add automated end-to-end proof for the assembled inventory loop** `est:1h`
  - Why: Final-assembly proof should not depend only on one-off manual checks. The full intake → review → promote → status/suggestion data path needs an automated regression artifact.
  - Files: `e2e/intake-flow.test.ts`, `test-fixtures/sample-food.jpg`, `lib/db/test-helper.ts`, `app/api/intake/[fridgeId]/route.test.ts`, `lib/inventory/analysis.ts`
  - Do: Add a Vitest integration test file that exercises the happy-path loop with deterministic data: photo extraction via stub provider, draft confirmation/promotion into inventory, expiry-aware status analysis, and cooking suggestions grounded in actual stored item names; add a small committed sample grocery photo fixture; update test helpers only as needed to keep the flow deterministic and isolated.
  - Verify: `npm run test -- e2e/intake-flow.test.ts app/api/intake/[fridgeId]/route.test.ts`
  - Done when: a future agent can run one automated test target and see the assembled data path pass without relying on browser interaction

- [ ] **T03: Capture live LAN acceptance for QR entry and cross-device usage** `est:1h`
  - Why: Automated tests cannot fully prove the real home-network entrypoint or printed/scanned QR behavior. S06 needs explicit live acceptance evidence for the milestone definition of done.
  - Files: `scripts/verify-s06-lan.sh`, `.gsd/milestones/M001/slices/S06/S06-UAT.md`, `.gsd/REQUIREMENTS.md`, `.gsd/milestones/M001/M001-SUMMARY.md`
  - Do: Write a reusable verification script that runs the mechanical LAN checks (localhost health, LAN-IP health, LAN fridge-page QR-origin grep, test/type-check/build); then run the real app on the LAN, exercise the fridge page over the LAN IP, perform the human-controlled QR/photo/update/suggestion acceptance loop, and record the results in S06-UAT and requirement/milestone summary artifacts; update R011 validation evidence with the actual LAN run results.
  - Verify: `bash scripts/verify-s06-lan.sh <lan-ip> <fridge-id>` plus manual browser/phone acceptance over the LAN
  - Done when: S06 has reusable mechanical verification, human UAT instructions/results, and milestone-level proof that the assembled product works on the home network

## Files Likely Touched

- `package.json`
- `app/api/health/route.ts`
- `app/api/health/route.test.ts`
- `lib/qr/origin.test.ts`
- `README.md`
- `e2e/intake-flow.test.ts`
- `test-fixtures/sample-food.jpg`
- `lib/db/test-helper.ts`
- `scripts/verify-s06-lan.sh`
- `.gsd/milestones/M001/slices/S06/S06-UAT.md`
- `.gsd/REQUIREMENTS.md`
- `.gsd/milestones/M001/M001-SUMMARY.md`
