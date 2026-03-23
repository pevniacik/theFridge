---
estimated_steps: 5
estimated_files: 5
skills_used:
  - test
---

# T02: Add automated end-to-end proof for the assembled inventory loop

**Slice:** S06 — Local-first runtime and end-to-end proof
**Milestone:** M001

## Description

Create an automated regression artifact that proves the assembled non-LAN data path works end-to-end: image input becomes draft items, drafts are confirmed/promoted into inventory, status analysis classifies the resulting rows, and cooking suggestions reference the same stored item names.

## Steps

1. Add a committed lightweight grocery photo fixture under `test-fixtures/` for deterministic route/integration tests.
2. Create `e2e/intake-flow.test.ts` to exercise the happy path using the existing test DB helper and stub provider.
3. Assert on the full chain: extraction result shape, draft confirmation / inventory promotion, resulting inventory rows, urgency classification, and suggestion-card ingredients.
4. Adjust `lib/db/test-helper.ts` or existing route tests only as needed to support isolated DB setup for the integrated flow.
5. Run the focused end-to-end test target and the broader test suite to ensure the new proof artifact is stable.

## Must-Haves

- [ ] A deterministic Vitest file proves the assembled intake → inventory → status/suggestion data path.
- [ ] The proof uses actual persisted inventory rows, not only mocked analysis inputs.
- [ ] Cooking suggestion assertions verify real stored item names appear in the output.
- [ ] The proof artifact is runnable by a future agent with one test command.

## Verification

- `npm run test -- e2e/intake-flow.test.ts app/api/intake/[fridgeId]/route.test.ts`
- `npm run test`

## Observability Impact

- Signals added/changed: a dedicated S06 integration test file becomes the primary regression signal for the assembled loop.
- How a future agent inspects this: run `npm run test -- e2e/intake-flow.test.ts` and read failing assertions to localize which stage broke.
- Failure state exposed: the first broken stage in the integrated path (extract / promote / analyze / suggest) surfaces as a specific failing assertion instead of an ambiguous browser symptom.

## Inputs

- `app/api/intake/[fridgeId]/route.ts` — real intake extraction route
- `lib/db/test-helper.ts` — in-memory SQLite helper for deterministic tests
- `lib/inventory/store.ts` — real draft→inventory persistence path
- `lib/inventory/analysis.ts` — urgency analysis and suggestion generation
- `app/api/intake/[fridgeId]/route.test.ts` — existing test style to mirror for route invocation

## Expected Output

- `e2e/intake-flow.test.ts` — integrated proof of the assembled non-LAN inventory loop
- `test-fixtures/sample-food.jpg` — lightweight committed fixture for repeatable tests
- `lib/db/test-helper.ts` — helper updates only if needed for isolation/setup
- `app/api/intake/[fridgeId]/route.test.ts` — any supporting assertions needed to keep route coverage aligned
