---
estimated_steps: 5
estimated_files: 4
skills_used:
  - agent-browser
---

# T03: Capture live LAN acceptance for QR entry and cross-device usage

**Slice:** S06 — Local-first runtime and end-to-end proof
**Milestone:** M001

## Description

Perform the real final-assembly proof that cannot be fully automated inside the repo: run the app on the LAN, prove health and QR-origin behavior against the LAN IP, exercise the assembled fridge flow over the live runtime, and capture reusable acceptance artifacts for milestone closure.

## Steps

1. Write `scripts/verify-s06-lan.sh` to run the mechanical checks (`curl` localhost health, LAN health, LAN fridge-page QR-origin grep, tests, type-check, build).
2. Start the app with the LAN-safe runtime and run the script against a concrete LAN IP and fridge ID.
3. Exercise the live fridge page over the LAN IP in the browser: verify QR render, intake/review flow, inventory truth, status alerts, and cooking suggestions.
4. Perform the human-controlled cross-device / QR entry check and record the manual steps and expected outcomes in `S06-UAT.md`.
5. Update requirement and milestone proof artifacts with the actual LAN verification evidence gathered in this task.

## Must-Haves

- [ ] A reusable script performs the mechanical LAN verification checks for S06.
- [ ] Live LAN runtime proof is captured against a real LAN IP and real fridge route.
- [ ] Human QR/device acceptance is documented as part of the slice proof, not implied.
- [ ] Requirement / milestone artifacts include the actual LAN evidence from this task.

## Verification

- `bash scripts/verify-s06-lan.sh <lan-ip> <fridge-id>`
- Browser/manual review — live LAN fridge page renders and the assembled loop works end-to-end

## Observability Impact

- Signals added/changed: `scripts/verify-s06-lan.sh` becomes the one-command S06 smoke proof; S06-UAT captures the human-only acceptance path.
- How a future agent inspects this: run the script, inspect its command output, then follow `S06-UAT.md` for the device/QR-only checks.
- Failure state exposed: the script will fail at the first broken layer (health, route, tests, build, QR-origin grep), localizing operational issues quickly.

## Inputs

- `package.json` — LAN-safe dev runtime from T01
- `README.md` — LAN runbook / QR-origin instructions from T01
- `e2e/intake-flow.test.ts` — automated integrated proof from T02
- `.gsd/REQUIREMENTS.md` — R011 and supporting proof targets for milestone closure

## Expected Output

- `scripts/verify-s06-lan.sh` — reusable mechanical LAN verification script
- `.gsd/milestones/M001/slices/S06/S06-UAT.md` — human acceptance script and observed LAN proof notes
- `.gsd/REQUIREMENTS.md` — refreshed R011 validation evidence using actual S06 run results
- `.gsd/milestones/M001/M001-SUMMARY.md` — milestone-level closure evidence for the final assembled loop
