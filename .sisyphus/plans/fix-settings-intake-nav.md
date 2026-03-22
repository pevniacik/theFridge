# Fix: Settings Save, Intake Upload, Navigation, Active Status

## TL;DR

> **Quick Summary**: Fix 4 bugs: settings save rejects model-only changes, photo upload error not surfaced, "Back to overview" goes to landing instead of fridges list, no active provider status indicator.
> 
> **Deliverables**:
> - Settings save works when changing model without re-entering API key
> - Photo upload errors surfaced with clear messages
> - "Back to overview" navigates to `/fridges` (the list) not `/` (landing)
> - Active provider badge visible on settings and fridge pages
> - E2E test scenarios with a sample food photo in repo
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves

---

## Context

### Root Cause Analysis

**Bug 1 — Settings save rejects model-only changes:**
`app/settings/actions.ts:31-33` rejects when `api_key` is empty string — but the form sends empty `api_key` when user doesn't type a new key. Fix: resolve to existing key when empty + same provider.

**Bug 2 — Photo upload error not surfaced:**
`lib/intake/providers/google.ts:74-77` catches all errors and returns `[]` silently. The intake route returns `{ items: [] }` with 200 status. `IntakeSection.tsx` shows "0 items extracted" or similar — no useful error message. Fix: propagate error info to client.

**Bug 3 — "Back to overview" goes to landing:**
`app/fridges/[fridgeId]/page.tsx:252` has `href="/"` which is the landing page hero. User expects to go back to their fridge list. Fix: change to `/fridges`.

**Bug 4 — No active provider indicator:**
After saving, the "Settings saved" message is temporary. No persistent visual indicator of which provider is active. Fix: show active provider badge in settings page header and in the fridge page header/banner area.

---

## Work Objectives

### Must Have
- Settings save preserves existing API key when user changes only model/provider-back
- Photo upload errors surface with clear messages (not silent empty array)
- "Back to overview" navigates to `/fridges` list page
- Active provider status visible on settings page (persistent, not just flash message)
- E2E happy-path test with a sample food photo committed to repo

### Must NOT Have (Guardrails)
- No changes to provider factory or extraction logic (only error propagation)
- No changes to DB schema
- No breaking changes to existing test assertions

---

## TODOs

- [ ] 1. Fix settings save — allow model-only updates without re-entering API key

  **What to do**:
  - `app/settings/actions.ts`: In `saveProvider`, when `api_key` is empty/blank, check if the same provider is already active via `getActiveProvider()`. If yes, reuse its existing `api_key`. If switching to a different provider with no key, return error "API key is required for a new provider."
  - Remove the early return on line 31-33 that blanket-rejects empty keys.

  **Must NOT do**:
  - Do not change the `upsertProvider` store function signature
  - Do not expose the raw API key to the client

  **References**:
  - `app/settings/actions.ts:19-48` — saveProvider function
  - `app/settings/actions.ts:31-33` — the bug: empty key rejection
  - `lib/settings/store.ts` — `getActiveProvider()` returns full config with `api_key`

  **Acceptance Criteria**:
  - [ ] Changing model without entering new key → saves successfully, key preserved
  - [ ] Switching provider without entering key → shows "API key is required"
  - [ ] Entering a new key → replaces the old key
  - [ ] `npm run build` passes

  **Commit**: YES
  - Message: `fix(settings): allow model-only updates without re-entering API key`
  - Files: `app/settings/actions.ts`

- [ ] 2. Surface photo upload errors to user

  **What to do**:
  - `app/api/intake/[fridgeId]/route.ts`: Wrap the `extractDraftFromImage` call in try/catch. On error, return `{ items: [], error: message }` with 200 status (so client can show the message). Also check if items is empty AND config was provided — return a hint like "AI extraction returned no items. Check your API key in Settings."
  - `app/fridges/[fridgeId]/IntakeSection.tsx`: In the fetch response handler, check for `data.error` field. If present, show it as an error message instead of proceeding to empty review.

  **Must NOT do**:
  - Do not change the provider extract() method signatures
  - Do not expose raw API keys in error messages

  **References**:
  - `app/api/intake/[fridgeId]/route.ts:57-62` — extraction call
  - `app/fridges/[fridgeId]/IntakeSection.tsx` — fetch handler for `/api/intake/`
  - `lib/intake/providers/google.ts:74-77` — catch block that swallows errors

  **Acceptance Criteria**:
  - [ ] Upload with invalid API key → shows error message, not empty review
  - [ ] Upload with valid key but no items detected → shows "no items" hint
  - [ ] Upload success → shows items for review as before
  - [ ] `npm run build` passes

  **Commit**: YES
  - Message: `fix(intake): surface extraction errors to user instead of silent empty result`
  - Files: `app/api/intake/[fridgeId]/route.ts`, `app/fridges/[fridgeId]/IntakeSection.tsx`

- [ ] 3. Fix "Back to overview" navigation

  **What to do**:
  - `app/fridges/[fridgeId]/page.tsx`: Change the "← Back to overview" link `href` from `"/"` to `"/fridges"`.
  - `app/settings/page.tsx`: Change the "← Back to overview" link `href` from `"/"` to `"/fridges"`.
  - Verify that `/fridges` route exists and lists created fridges (it's `app/api/fridges/route.ts` for API, need to check if there's a page).

  **Must NOT do**:
  - Do not create a new page if `/fridges` doesn't exist as a page route — use `/` in that case but with the list section anchor

  **References**:
  - `app/fridges/[fridgeId]/page.tsx:252` — "← Back to overview" link
  - `app/settings/page.tsx:80` — "← Back to overview" link
  - `app/page.tsx` — landing page (current "/" target)
  - Check if `app/fridges/page.tsx` exists

  **Acceptance Criteria**:
  - [ ] "Back to overview" from fridge page goes to fridge list, not landing hero
  - [ ] "Back to overview" from settings goes to fridge list
  - [ ] `npm run build` passes

  **Commit**: YES
  - Message: `fix(nav): back to overview links to fridges list instead of landing page`
  - Files: `app/fridges/[fridgeId]/page.tsx`, `app/settings/page.tsx`

- [ ] 4. Show active provider status indicator

  **What to do**:
  - `app/settings/page.tsx`: Below the page title, show a status line: "Active: Google AI Studio · gemini-2.0-flash" (or "No provider configured" with a warning color). Use `getMaskedConfig()` which is already called.
  - `app/fridges/[fridgeId]/SetupBanner.tsx`: When provider IS configured, show a subtle status line instead of nothing: "AI: Google · gemini-2.0-flash" in muted text. Pass the provider name and model as props.
  - `app/fridges/[fridgeId]/page.tsx`: Pass provider info to SetupBanner.

  **Must NOT do**:
  - Do not expose the API key (only provider name + model)
  - Do not make the status indicator intrusive or distracting

  **References**:
  - `app/settings/page.tsx:9-10` — `getMaskedConfig()` already called
  - `app/settings/actions.ts:56-76` — `getMaskedConfig()` returns provider, model, masked key
  - `app/fridges/[fridgeId]/SetupBanner.tsx` — currently renders null when provider exists

  **Acceptance Criteria**:
  - [ ] Settings page shows "Active: {provider} · {model}" when configured
  - [ ] Settings page shows "No provider configured" when not configured
  - [ ] Fridge page shows subtle AI status when provider is configured
  - [ ] `npm run build` passes

  **Commit**: YES
  - Message: `feat(status): show active AI provider indicator on settings and fridge pages`
  - Files: `app/settings/page.tsx`, `app/fridges/[fridgeId]/SetupBanner.tsx`, `app/fridges/[fridgeId]/page.tsx`

- [ ] 5. E2E happy-path test scenarios with sample food photo

  **What to do**:
  - Add a small sample food photo to `test-fixtures/sample-food.jpg` (a simple JPEG of groceries, ~50-100KB, committed to repo).
  - Create `e2e/intake-flow.test.ts` using vitest:
    - Scenario 1: Upload photo via POST /api/intake/[fridgeId] with stub provider → verify response has items array with expected stub items
    - Scenario 2: Confirm drafts via server action → verify items appear in inventory
    - Scenario 3: Save provider settings → verify getMaskedConfig returns correct provider/model
  - These tests use the test DB helper (in-memory SQLite) and don't need a running server.

  **Must NOT do**:
  - Do not use Playwright or browser automation (keep as vitest unit/integration tests)
  - Do not make real API calls to Google/OpenAI (use stub provider)
  - Do not add large images (keep sample under 200KB)

  **References**:
  - `lib/db/test-helper.ts` — createTestDb() for in-memory SQLite
  - `app/api/intake/[fridgeId]/route.test.ts` — existing route test pattern
  - `lib/intake/providers/stub.ts` — stub provider returns deterministic items

  **Acceptance Criteria**:
  - [ ] Sample food photo exists at `test-fixtures/sample-food.jpg`
  - [ ] `npx vitest run` passes with new E2E tests
  - [ ] Tests verify stub extraction returns items
  - [ ] Tests verify draft confirmation creates inventory entries
  - [ ] `npm run build` passes

  **Commit**: YES
  - Message: `test(e2e): add happy-path intake flow tests with sample food photo`
  - Files: `test-fixtures/sample-food.jpg`, `e2e/intake-flow.test.ts`

---

## Final Verification

- [ ] F1. Build + tests pass
- [ ] F2. Settings save works without re-entering key
- [ ] F3. Photo upload shows error on failure, items on success
- [ ] F4. Back links go to fridge list
- [ ] F5. Active provider badge visible

---

## Success Criteria

```bash
npm run type-check   # Expected: exit 0
npm run build        # Expected: exit 0
npx vitest run       # Expected: all tests pass (including new E2E)
```
