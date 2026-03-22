# Responsive UX + QR Collapse + Settings Enhancements

## TL;DR

> **Quick Summary**: Make the app phone-first responsive across all pages, collapse the QR section on mobile viewports, add magic links to AI provider key pages with a clipboard paste button, and replace the free-text model input with a combobox dropdown.
> 
> **Deliverables**:
> - Full responsive audit and fix across landing, fridge context, settings, and inventory pages
> - Collapsible QR section (`<details>`) — collapsed on mobile, open on desktop
> - Per-provider "Get API Key" link + "Paste" clipboard button in settings
> - Model combobox (`<datalist>`) with popular models per provider + custom text
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: T1 (CSS + layout) → T2 (QR collapse) + T3 (settings) in parallel → T4 (responsive audit) → F1-F4

---

## Context

### Original Request
User wants 4 enhancements: general phone responsiveness, QR hidden on phone, magic link to provider API key pages with auto-paste, and model selection dropdown.

### Interview Summary
**Key Discussions**:
- QR collapse: viewport-based (`<640px`), not scan-detection
- Model selector: combobox (dropdown + custom text via `<datalist>`)
- API key UX: direct link to provider's API key page + "Paste" clipboard read button
- Responsive: all pages need audit — current state is minimal

**Research Findings**:
- Current CSS has only 2 mobile utility classes
- QR section uses 2-column grid that doesn't stack on mobile
- Landing page padding (4rem) too large for phone
- Header shows decorative text that wastes mobile space
- `<details>` + `<datalist>` are native HTML — zero dependencies needed
- `navigator.clipboard.readText()` requires HTTPS or localhost (works on LAN)

### Metis Review
**Identified Gaps** (addressed):
- Header divider and "local inventory" text waste phone space → collapse with `mobile-hide`
- `<details>` marker needs cross-browser reset (webkit + standard)
- Clipboard API may be denied → graceful error with fallback message
- Model list needs to stay current → static list is fine, user can type custom

---

## Work Objectives

### Core Objective
Make theFridge feel native on iPhone: responsive layout, smart QR collapse, and frictionless AI provider setup.

### Concrete Deliverables
- `app/globals.css` — Mobile utility classes + details marker reset
- `app/layout.tsx` — Header mobile optimization
- `app/page.tsx` — Landing page mobile padding
- `app/fridges/[fridgeId]/QrSection.tsx` — New client component for collapsible QR
- `app/fridges/[fridgeId]/page.tsx` — Wire QrSection, responsive QR grid
- `app/settings/SettingsForm.tsx` — Provider link, paste button, model combobox

### Definition of Done
- [x] All pages render correctly at 320px, 375px, and 640px+ widths
- [x] QR section collapsed by default on mobile, open on desktop
- [x] Settings shows provider-specific "Get API Key" link
- [x] Paste button reads clipboard into API key field (with error fallback)
- [x] Model input shows dropdown of popular models and accepts custom text
- [x] `npm run type-check` passes
- [x] `npm run build` passes
- [x] `npx vitest run` passes (no regressions)

### Must Have
- Viewport-based QR collapse using `<details>` element
- Provider-specific API key page links (OpenAI, Anthropic, Google)
- Clipboard paste button with graceful error handling
- Model combobox with `<datalist>` — popular models per provider + custom text
- Mobile-first responsive layout across all pages
- All interactive elements ≥ 44px touch targets on mobile

### Must NOT Have (Guardrails)
- No JavaScript-based viewport detection (use CSS media queries + `<details>` with `useEffect` for initial open)
- No external dependencies for combobox (native `<datalist>` only)
- No changes to the save/persist flow in settings
- No changes to provider factory or extraction logic
- No desktop layout regressions — mobile CSS is additive
- No service worker or offline changes

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: Tests-after — verify no regressions
- **Framework**: vitest

### QA Policy
Every task includes agent-executed QA scenarios.
- **Frontend/UI**: Playwright or curl+grep for HTML assertions
- **Library/Module**: Bash for type-check/build verification

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — CSS + layout responsiveness):
├── T1: Mobile CSS utilities + header + landing page responsive fixes [visual-engineering]

Wave 2 (Features — parallel, all depend on T1):
├── T2: QR collapsible section component + page wiring [visual-engineering]
├── T3: Settings enhancements (provider link, paste, model combobox) [unspecified-high]
├── T4: Full responsive audit — fridge page, inventory, intake sections [visual-engineering]

Wave FINAL (After ALL tasks):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Visual QA at 320px/375px/desktop (unspecified-high)
├── F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix
| Task | Depends On | Blocks |
|------|-----------|--------|
| T1 | — | T2, T3, T4 |
| T2 | T1 | — |
| T3 | T1 | — |
| T4 | T1 | — |

### Agent Dispatch Summary
- **Wave 1**: 1 task — T1 `visual-engineering`
- **Wave 2**: 3 tasks — T2 `visual-engineering`, T3 `unspecified-high`, T4 `visual-engineering`
- **Final**: 4 tasks — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [x] 1. Mobile CSS utilities + header + landing page responsive fixes

  **What to do**:
  - `app/globals.css`: Inside existing `@media (max-width: 640px)` block, add `.mobile-hide { display: none !important; }` and `.qr-grid { grid-template-columns: 1fr !important; }`. After the media block, add `details.qr-collapse summary` marker reset (`::-webkit-details-marker { display: none }`, `::marker { display: none; content: "" }`, `list-style: none`, `cursor: pointer`).
  - `app/layout.tsx`: Add `className="mobile-hide"` to the header divider `<span>` (line ~69) and "local inventory" `<span>` (line ~82), and the "Settings" text `<span>` (line ~101) — keep the gear emoji visible.
  - `app/page.tsx`: Change hero container padding from `"4rem 1.5rem"` to `"2rem 1rem"`. Add `className="mobile-stack mobile-full"` to the CTA flex wrapper at line ~132.

  **Must NOT do**:
  - Do not change color scheme, fonts, or branding
  - Do not add any JavaScript for viewport detection — CSS only

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (solo)
  - **Blocks**: T2, T3, T4
  - **Blocked By**: None

  **References**:
  - `app/globals.css:43-46` — Existing mobile media query with 2 utility classes
  - `app/layout.tsx:48-104` — Header with divider, "local inventory", settings link
  - `app/page.tsx:8-9` — Hero padding; line 132 CTA wrapper

  **Acceptance Criteria**:
  - [ ] `npm run build` passes
  - [ ] Header shows only brand name + gear icon on mobile (<640px)
  - [ ] Landing page CTA buttons stack vertically on mobile
  - [ ] `details.qr-collapse summary` marker is hidden cross-browser

  **QA Scenarios**:
  ```
  Scenario: Header collapses decorative text on mobile
    Tool: Bash (curl + grep)
    Steps:
      1. curl fridge page HTML
      2. grep for class="mobile-hide"
    Expected Result: Found on divider, "local inventory", and "Settings" text spans
    Evidence: .sisyphus/evidence/task-1-mobile-hide.txt
  ```

  **Commit**: YES
  - Message: `feat(mobile): responsive CSS utilities + header + landing page`
  - Files: `app/globals.css`, `app/layout.tsx`, `app/page.tsx`
  - Pre-commit: `npm run build`

- [x] 2. QR collapsible section component + page wiring

  **What to do**:
  - Create `app/fridges/[fridgeId]/QrSection.tsx` — `"use client"` component wrapping children in `<details className="qr-collapse">`. Summary shows "printable QR" label + "tap to toggle" hint. Uses `useEffect` to set `ref.current.open = true` when `window.innerWidth >= 640` (so desktop starts open, mobile starts collapsed).
  - Update `app/fridges/[fridgeId]/page.tsx`: Import `QrSection`, wrap the QR grid inside `<QrSection>`. Add `className="qr-grid"` to the grid `<div>`. Remove the outer panel wrapper (QrSection provides its own). Remove the duplicate "printable QR" label (summary replaces it).
  - QR grid: keep `gridTemplateColumns: "auto 1fr"` in inline style — the `.qr-grid` CSS override makes it 1-column on mobile.

  **Must NOT do**:
  - Do not use JavaScript-based mobile detection beyond the initial `useEffect` open check
  - Do not change QR generation logic
  - Do not remove the QR URL text below the QR image

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T3, T4)
  - **Blocks**: None
  - **Blocked By**: T1

  **References**:
  - `app/fridges/[fridgeId]/page.tsx:191-250` — Current QR grid section
  - `app/globals.css` (from T1) — `.qr-grid` and `details.qr-collapse` styles
  - `components/QrCode.tsx` — Existing server component that renders SVG

  **Acceptance Criteria**:
  - [ ] `npm run build` passes
  - [ ] QR section is collapsed by default on viewports < 640px
  - [ ] QR section is open by default on viewports >= 640px
  - [ ] Tapping summary toggles QR visibility on mobile
  - [ ] QR grid stacks to 1-column on mobile

  **QA Scenarios**:
  ```
  Scenario: QR collapsed on mobile viewport
    Tool: Playwright or Bash (curl)
    Steps:
      1. Open fridge page at 375px width
      2. Assert: details element does NOT have open attribute
      3. Click summary
      4. Assert: QR SVG now visible
    Expected Result: Collapsed by default, toggleable
    Evidence: .sisyphus/evidence/task-2-qr-collapse.png

  Scenario: QR open on desktop viewport
    Tool: Playwright or Bash (curl)
    Steps:
      1. Open fridge page at 1024px width
      2. Assert: details element has open attribute (set by useEffect)
    Expected Result: Open by default on desktop
    Evidence: .sisyphus/evidence/task-2-qr-desktop.png
  ```

  **Commit**: YES
  - Message: `feat(qr): collapsible QR section on mobile viewports`
  - Files: `app/fridges/[fridgeId]/QrSection.tsx`, `app/fridges/[fridgeId]/page.tsx`
  - Pre-commit: `npm run build`

- [x] 3. Settings enhancements — provider link, paste button, model combobox

  **What to do**:
  - `app/settings/SettingsForm.tsx`:
    - Add constants: `PROVIDER_KEY_URLS` (openai → `https://platform.openai.com/api-keys`, anthropic → `https://console.anthropic.com/settings/keys`, google → `https://aistudio.google.com/apikey`), `PROVIDER_LABELS`, `POPULAR_MODELS` (3-4 models per provider).
    - Add `useRef` import, `apiKeyRef` on API key input, `clipboardError` state.
    - Add `handlePaste()` async function: `navigator.clipboard.readText()` → set input value; catch → show "Clipboard access denied" error that auto-clears after 4s.
    - **Model input**: Add `list="model-options"` attribute. Add `<datalist id="model-options">` after input with `POPULAR_MODELS[selectedProvider].map(m => <option key={m} value={m} />)`.
    - **API Key section**: Add `<a>` link before input: "Get {ProviderLabel} API key ↗" → opens provider key page in new tab. Wrap input + paste button in a flex row. Paste button is `type="button"` with `onClick={handlePaste}`, styled with cold border, 44px min-height. Show `clipboardError` below if set.
    - Update `handleProviderChange`: when provider changes, model list updates automatically (already works since `POPULAR_MODELS[selectedProvider]` is reactive).

  **Must NOT do**:
  - Do not change the save/persist flow (formAction, server action)
  - Do not add external combobox libraries — use native `<datalist>`
  - Do not store clipboard content anywhere beyond the input field
  - Do not auto-read clipboard without user click (browser blocks it)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T2, T4)
  - **Blocks**: None
  - **Blocked By**: T1

  **References**:
  - `app/settings/SettingsForm.tsx:1-186` — Current full settings form
  - `lib/settings/types.ts:6` — `LlmProvider` type
  - OpenAI API keys: `https://platform.openai.com/api-keys`
  - Anthropic API keys: `https://console.anthropic.com/settings/keys`
  - Google AI Studio: `https://aistudio.google.com/apikey`

  **Acceptance Criteria**:
  - [ ] `npm run build` passes
  - [ ] Each provider shows correct "Get API Key" link
  - [ ] Link opens in new tab (`target="_blank"`)
  - [ ] Paste button reads clipboard into API key field
  - [ ] Clipboard error shows friendly message if denied
  - [ ] Model input shows dropdown of popular models for selected provider
  - [ ] User can type a custom model name not in the list
  - [ ] Changing provider updates the model dropdown options

  **QA Scenarios**:
  ```
  Scenario: Provider link points to correct URL
    Tool: Bash (curl + grep)
    Steps:
      1. curl /settings HTML
      2. grep for "platform.openai.com/api-keys"
    Expected Result: Link present in HTML
    Evidence: .sisyphus/evidence/task-3-provider-link.txt

  Scenario: Model datalist has popular models
    Tool: Bash (curl + grep)
    Steps:
      1. curl /settings HTML
      2. grep for "model-options"
      3. grep for "gpt-4o-mini"
    Expected Result: datalist with model options present
    Evidence: .sisyphus/evidence/task-3-datalist.txt

  Scenario: Clipboard error is graceful
    Tool: Playwright
    Steps:
      1. Open settings page
      2. Deny clipboard permission
      3. Click Paste button
      4. Assert: error message appears, auto-clears after 4s
    Expected Result: "Clipboard access denied" shown briefly
    Evidence: .sisyphus/evidence/task-3-clipboard-error.png
  ```

  **Commit**: YES
  - Message: `feat(settings): provider API key link + paste button + model combobox`
  - Files: `app/settings/SettingsForm.tsx`
  - Pre-commit: `npm run build`

- [x] 4. Full responsive audit — fridge page, inventory, intake sections

  **What to do**:
  - `app/fridges/[fridgeId]/page.tsx`: Reduce top padding from `"3rem 1.5rem"` to `"1.5rem 1rem"` on the main container. Make identity card padding responsive. Make breadcrumb wrap-friendly.
  - `app/fridges/[fridgeId]/InventorySection.tsx`: Ensure inventory item cards stack fully on mobile. Action buttons (Edit/Used/Discard) should wrap to full-width row on narrow screens. Ensure all inputs are ≥ 16px font (no iOS zoom).
  - `app/fridges/[fridgeId]/IntakeSection.tsx`: Verify all form inputs use `fontSize: "16px"` to prevent iOS zoom. Ensure photo/receipt/single-add buttons fill width on mobile. Check that review grid items stack vertically.
  - `app/fridges/[fridgeId]/RecipeSection.tsx`: Ensure recipe cards fill full width on mobile.
  - `app/settings/page.tsx`: Reduce container padding for mobile.
  - General: No element should cause horizontal scroll at 320px width.

  **Must NOT do**:
  - Do not redesign any component — only adjust spacing, stacking, and sizing
  - Do not add new CSS frameworks or utilities
  - Do not change business logic

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T2, T3)
  - **Blocks**: None
  - **Blocked By**: T1

  **References**:
  - `app/fridges/[fridgeId]/page.tsx:126-277` — Fridge context page layout
  - `app/fridges/[fridgeId]/InventorySection.tsx` — Inventory list and inline edit
  - `app/fridges/[fridgeId]/IntakeSection.tsx` — Photo/receipt/single-add forms
  - `app/fridges/[fridgeId]/RecipeSection.tsx` — Recipe cards
  - `app/settings/page.tsx` — Settings page container
  - Apple HIG: 44x44pt minimum touch targets, 16px input font for iOS

  **Acceptance Criteria**:
  - [ ] `npm run build` passes
  - [ ] No horizontal scroll at 320px width on any page
  - [ ] All inputs ≥ 16px font size
  - [ ] All interactive elements ≥ 44px touch height
  - [ ] Inventory items stack cleanly on mobile
  - [ ] Action buttons wrap to full width on narrow screens

  **QA Scenarios**:
  ```
  Scenario: No horizontal overflow at 320px
    Tool: Playwright
    Steps:
      1. Open fridge page at 320px width
      2. Assert: document.documentElement.scrollWidth <= document.documentElement.clientWidth
    Expected Result: No horizontal scroll
    Evidence: .sisyphus/evidence/task-4-no-overflow.png

  Scenario: Touch targets meet minimum on mobile
    Tool: Playwright
    Steps:
      1. Open fridge page at 375px width
      2. Query all button, a, input elements
      3. Assert: boundingBox height >= 44 for each
    Expected Result: All interactive elements >= 44px
    Evidence: .sisyphus/evidence/task-4-touch-targets.png
  ```

  **Commit**: YES
  - Message: `feat(mobile): full responsive audit across fridge and inventory pages`
  - Files: `app/fridges/[fridgeId]/page.tsx`, `app/fridges/[fridgeId]/InventorySection.tsx`, `app/fridges/[fridgeId]/IntakeSection.tsx`, `app/fridges/[fridgeId]/RecipeSection.tsx`, `app/settings/page.tsx`
  - Pre-commit: `npm run build`

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `npm run type-check` + `npm run build` + `npx vitest run`. Review changed files for type safety, unused imports, console.log. Check AI slop.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [x] F3. **Visual QA** — `unspecified-high` (+ `playwright` skill if available)
  Test at 320px, 375px, and 1024px widths. Verify: QR collapsed on mobile / open on desktop. Settings shows provider link + paste button + model dropdown. All touch targets ≥ 44px. No horizontal overflow.
  Output: `Scenarios [N/N pass] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", verify actual changes. Check "Must NOT do" compliance. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | VERDICT`

---

## Commit Strategy

| Commit | Scope | Pre-commit |
|--------|-------|------------|
| 1 | `feat(mobile): responsive CSS utilities + header + landing page` | npm run build |
| 2 | `feat(qr): collapsible QR section on mobile viewports` | npm run build |
| 3 | `feat(settings): provider API key link + paste button + model combobox` | npm run build |
| 4 | `feat(mobile): full responsive audit across fridge and inventory pages` | npm run build |

---

## Success Criteria

### Verification Commands
```bash
npm run type-check   # Expected: exit 0
npm run build        # Expected: exit 0
npx vitest run       # Expected: all tests pass
```

### Final Checklist
- [x] All "Must Have" present
- [x] All "Must NOT Have" absent
- [x] QR collapsed on mobile, open on desktop
- [x] Provider link opens correct URL per provider
- [x] Paste button works or shows graceful error
- [x] Model combobox shows popular models and accepts custom text
- [x] No horizontal scroll at 320px
- [x] All touch targets ≥ 44px
