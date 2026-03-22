# Google AI Studio as Default LLM Provider

## TL;DR

> **Quick Summary**: Make Google AI Studio the default (free) AI provider, demote OpenAI/Anthropic behind an "Advanced" toggle, and add an onboarding banner guiding unconfigured users to set up AI in 30 seconds.
> 
> **Deliverables**:
> - Settings page restructured: Google prominent, others in collapsible "Advanced" section
> - Onboarding banner on fridge page when no provider configured
> - Default provider changed from OpenAI to Google everywhere
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: T1 (settings restructure) → T2 (onboarding banner) in parallel with T3 (defaults cleanup)

---

## Context

### Original Request
User doesn't want separate API billing. Wants to use Google AI Studio free tier (tied to Google account, 1-click key generation) as the primary integration path.

### Interview Summary
- Google AI Studio free key is acceptable — no separate billing
- OpenAI/Anthropic kept behind "Advanced" toggle, not removed
- Onboarding banner on fridge page when no provider configured
- All provider code stays intact; this is a UI/UX restructure only

---

## Work Objectives

### Core Objective
Make AI setup frictionless by defaulting to the free Google AI Studio path and guiding new users to configure it.

### Concrete Deliverables
- `app/settings/SettingsForm.tsx` — Restructured: Google section at top, "Advanced Providers" collapsible
- `app/fridges/[fridgeId]/SetupBanner.tsx` — New component: shows when no provider configured
- `app/fridges/[fridgeId]/page.tsx` — Wire SetupBanner with provider status
- Default provider changed from "openai" to "google" in SettingsForm

### Must Have
- Google AI Studio as default/primary provider in settings
- OpenAI and Anthropic behind a collapsible "Advanced Providers" section
- Onboarding banner on fridge page linking to settings when no provider configured
- "Get Google API key" link prominent and easy to find
- All existing provider code (factory, extraction, tests) unchanged

### Must NOT Have (Guardrails)
- No removal of OpenAI/Anthropic provider code
- No changes to provider factory, extraction logic, or store layer
- No auto-detection or OAuth flows (keep simple API key input)
- No changes to recipe, intake, or inventory business logic
- Banner must not be intrusive (dismissable feel, not blocking)

---

## TODOs

- [ ] 1. Settings page restructure — Google default, Advanced toggle

  **What to do**:
  - `app/settings/SettingsForm.tsx`:
    - Change `initialProvider` default from `"openai"` to `"google"`
    - Restructure the provider radio buttons:
      - Google shown first and prominently (outside any collapsible) with its "Get Google API key ↗" link, model combobox, and API key input directly visible
      - Below Google section: a `<details>` "Advanced Providers" toggle containing OpenAI and Anthropic options with their respective links/inputs
    - When user selects an advanced provider, the model/key fields update to that provider (existing behavior)
    - Move the "Get API key" link, model datalist, and key input to update based on selected provider (keep current reactive behavior)
  - `app/settings/page.tsx`: Update description text to mention Google AI Studio as the recommended free option

  **Must NOT do**:
  - Do not change the form action or save logic
  - Do not remove any provider from the radio list

  **Acceptance Criteria**:
  - [ ] Google is pre-selected by default for new users
  - [ ] Google section with key link + model picker is immediately visible
  - [ ] OpenAI/Anthropic are inside a collapsed "Advanced Providers" section
  - [ ] Selecting an advanced provider switches all fields correctly
  - [ ] `npm run build` passes

  **Commit**: YES
  - Message: `feat(settings): default to Google AI Studio, demote others to Advanced`
  - Files: `app/settings/SettingsForm.tsx`, `app/settings/page.tsx`

- [ ] 2. Onboarding banner on fridge page

  **What to do**:
  - Create `app/fridges/[fridgeId]/SetupBanner.tsx`: a server component that accepts `hasProvider: boolean` prop. When `false`, renders a styled banner: "Set up free AI extraction in 30 seconds" with a link to `/settings`. When `true`, renders nothing.
  - `app/fridges/[fridgeId]/page.tsx`: Import SetupBanner. Pass `hasProvider={!!getActiveProvider()}` (already imported in scope). Place it above IntakeSection.

  **Must NOT do**:
  - Do not block the page or require setup before using the app
  - Do not use client-side state for the banner — server component is sufficient

  **Acceptance Criteria**:
  - [ ] Banner appears when no provider is configured
  - [ ] Banner links to `/settings`
  - [ ] Banner does not appear when a provider is configured
  - [ ] `npm run build` passes

  **Commit**: YES
  - Message: `feat(onboarding): setup banner when no AI provider configured`
  - Files: `app/fridges/[fridgeId]/SetupBanner.tsx`, `app/fridges/[fridgeId]/page.tsx`

- [ ] 3. Defaults cleanup and documentation

  **What to do**:
  - `AGENTS.md`: Update env vars note to mention Google AI Studio as recommended default
  - `README.md`: Add a "Quick AI Setup" section mentioning Google AI Studio free tier
  - `.env.example`: Reorder to show Google key example first
  - Verify all existing tests still pass (no behavior changes)

  **Must NOT do**:
  - Do not remove OPENAI_API_KEY references
  - Do not change provider factory logic

  **Acceptance Criteria**:
  - [ ] Docs mention Google AI Studio as recommended
  - [ ] `npx vitest run` passes (no regressions)
  - [ ] `npm run build` passes

  **Commit**: YES
  - Message: `docs: recommend Google AI Studio as default free provider`
  - Files: `AGENTS.md`, `README.md`, `.env.example`

---

## Final Verification

- [ ] F1. Build + tests pass
- [ ] F2. Settings defaults to Google for new users
- [ ] F3. Advanced toggle hides/shows OpenAI/Anthropic
- [ ] F4. Banner appears on fridge page without provider, disappears with provider

---

## Success Criteria

```bash
npm run type-check   # Expected: exit 0
npm run build        # Expected: exit 0
npx vitest run       # Expected: all tests pass
```
