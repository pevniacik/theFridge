---
id: T02
parent: S06
milestone: M001
provides:
  - e2e/intake-flow.test.ts — 10-test integrated proof of the assembled non-LAN inventory loop, including analysis and suggestion chain
  - test-fixtures/sample-food.jpg — committed 280-byte minimal JPEG fixture for deterministic route/integration tests
  - analyzeInventory assertions on real persisted rows (expired vs. ok classification)
  - generateSuggestions assertions verifying every ingredient card references actual stored item names
key_files:
  - e2e/intake-flow.test.ts
  - test-fixtures/sample-food.jpg
key_decisions:
  - Analysis/suggestion tests use db.transaction-persisted inventory rows (not mocked) to satisfy the "actual persisted rows" must-have
  - Reference date pinned via optional `now` parameter on both analysis functions — deterministic without mocking Date
  - saveDraftItems called before promoteToInventory so FK constraint on draft_id is satisfied in the in-memory test DB
patterns_established:
  - Integration test pattern for analysis chain: createFridge → saveDraftItems → promoteToInventory → listInventoryItems → analyzeInventory/generateSuggestions → assert on classified/suggestions
  - Suggestion ingredient verification: collect storedNames as a Set, then assert every card ingredient is present in that Set
observability_surfaces:
  - "npm run test -- e2e/intake-flow.test.ts — single command to run the full assembled-loop proof; first failing assertion names the broken stage"
  - "[intake] Using stub extraction — printed to stdout by each extraction call; confirms stub provider is active"
duration: 25m
verification_result: passed
completed_at: 2026-03-23
blocker_discovered: false
---

# T02: Add automated end-to-end proof for the assembled inventory loop

**Extended `e2e/intake-flow.test.ts` with analysis/suggestion chain tests that assert on real persisted inventory rows — all 10 E2E tests pass, covering extract→promote→analyze→suggest end-to-end.**

## What Happened

`e2e/intake-flow.test.ts` and `test-fixtures/sample-food.jpg` were already present on main (created by the `fix/settings-intake-nav` PR that was merged between milestone sessions). The existing 8 tests covered the extract→save-drafts→promote portion of the chain but stopped short of the analysis/suggestion layer, leaving the T02 must-have ("cooking suggestion assertions verify real stored item names") unmet.

Added the `analyzeInventory` and `generateSuggestions` imports and two new tests:

**Test 9 — `analyzeInventory: classifies expired and ok items from real persisted rows`**  
Creates a fridge in the in-memory test DB, seeds two draft items, promotes them with controlled expiry dates (one past, one future), reads back the live inventory rows via `listInventoryItems`, and calls `analyzeInventory` with a pinned reference date. Asserts `status.expired === 1`, `status.ok === 1`, and that the classified items have the expected names. Proves the analysis layer operates on actual persisted rows, not mocked inputs.

**Test 10 — `generateSuggestions: suggestion cards reference real stored item names`**  
Seeds 4 items (2 expiring/expired, 2 fresh) to trigger both "Use soon" and "Cook tonight" cards. After promoting all 4 through the full intake→inventory path, calls `generateSuggestions` with the same pinned date. Asserts every ingredient in every card is present in the set of stored item names, "Use soon" is `urgencyDriven: true`, and "Cook tonight" appears because 4+ items exist.

No changes to `lib/db/test-helper.ts` were needed — the schema already had `estimated_expiry_days` and all required columns.

## Verification

- `npm run test -- e2e/intake-flow.test.ts` → 10/10 pass (root file); worktree copy 8/8 pass (unchanged)
- `npm run test` → 28 test files, 115 tests — all pass, no regressions

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npm run test -- e2e/intake-flow.test.ts` | 0 | ✅ 10/10 pass | ~0.7s |
| 2 | `npm run test` | 0 | ✅ 115/115 pass (28 files) | ~2.0s |

## Diagnostics

- `npm run test -- e2e/intake-flow.test.ts` — primary regression command; each test name maps to one stage of the assembled loop
- First assertion to fail identifies the broken stage: fixture existence → extraction → draft save → promotion → inventory read → analysis → suggestions
- `[intake] Using stub extraction` in stdout confirms the stub provider is active and no live API calls are made

## Deviations

The fixture and the basic extract→promote tests already existed on `main` (created by the `fix/settings-intake-nav` PR). T02 was reduced to extending the test file with the analysis/suggestion chain rather than creating it from scratch. This is a narrower scope than the plan anticipated but meets all four must-haves.

## Known Issues

Vitest discovers the worktree copy at `.gsd/worktrees/M001/e2e/intake-flow.test.ts` alongside the root copy. The worktree copy still shows only 8 tests (the 2 new tests are only in the root file). This inflates the reported test count by 8 in `npm run test` but does not affect correctness of the root repo's coverage.

## Files Created/Modified

- `e2e/intake-flow.test.ts` — extended: added `analyzeInventory`/`generateSuggestions` imports and 2 new integration tests (8 → 10 tests)
- `test-fixtures/sample-food.jpg` — pre-existing 280-byte JPEG fixture; no changes
