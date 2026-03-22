# Mobile-First AI-Powered Fridge Evolution

## TL;DR

> **Quick Summary**: Evolve theFridge from desktop-first demo to phone-first AI-powered household tool. Add multi-LLM provider support (GPT/Claude/Gemini) with persistent settings, single-item add flow (photo + manual), mobile-optimized camera UX, and PWA installability.
> 
> **Deliverables**:
> - Multi-LLM provider factory (OpenAI, Anthropic, Google) with DB-stored settings
> - Single-item addition flow (photo of single item OR manual entry with AI enrichment)
> - Mobile-first UX: viewport, PWA manifest, 44px touch targets, camera capture, responsive layout
> - Schema evolution: category + purchase_date on items, llm_providers settings table
> - Enhanced AI prompt: extracts category + estimates expiry
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: T1 (migration helper) → T3 (schema) → T5 (types) → T8 (provider factory) → T13 (settings UI) → T15 (single-item) → Final

---

## Context

### Original Request
User's core insight: this app is PHONE-FIRST. All real usage flows from iPhone QR scan → fridge context → actions. Current app has zero mobile optimization, hardcoded OpenAI, and no single-item addition.

### Interview Summary
**Key Discussions**:
- Single item add: Both options (photo of single item + manual type name)
- LLM config: Global (one config for all fridges)
- Offline: Always connected is fine
- Item history: Disappear from active list (current behavior kept)
- Purchase date = when photo is taken (today)
- AI fills: category + estimated expiry

**Research Findings**:
- Vercel AI SDK overkill; simple factory pattern better for single-shot extraction
- iOS 17+ needs label+hidden-input for camera capture
- Anthropic has NO native JSON mode — needs response cleaning
- `@google/genai` (NOT deprecated `@google/generative-ai`) for Gemini
- Next.js App Router supports typed `app/manifest.ts` for PWA

### Metis Review
**Identified Gaps** (addressed):
- Migration helper needed (SQLite has no `ALTER TABLE ADD COLUMN IF NOT EXISTS`)
- Settings table should be multi-row (preserve keys when switching providers)
- `InventoryItemInput.draft_id` must become optional for manual adds
- Anthropic requires explicit `max_tokens` and JSON response cleaning
- Mobile photos 4-12MB need client-side compression
- Body size limit may need increase for photo uploads

---

## Work Objectives

### Core Objective
Transform theFridge into a phone-first household tool with pluggable AI providers and flexible item addition.

### Concrete Deliverables
- `lib/db/migrations.ts` — Idempotent migration helper
- `lib/settings/store.ts` + `types.ts` — LLM provider CRUD
- `lib/intake/providers/` — Factory + OpenAI/Anthropic/Google extractors
- `app/settings/page.tsx` — Settings UI for LLM configuration
- Enhanced `IntakeSection.tsx` — Single-item add (photo + manual)
- `app/manifest.ts` — PWA manifest
- Updated `app/layout.tsx` — Viewport meta, apple-mobile-web-app
- Responsive CSS across all components

### Definition of Done
- [x] `npm run type-check` passes with zero errors
- [x] `npm run build` succeeds
- [x] All three LLM providers produce DraftItem[] from photo (when API key configured)
- [x] Settings persist across app restarts (stored in SQLite)
- [x] Single item addable via photo or manual entry
- [x] All interactive elements ≥ 44px touch targets on mobile
- [x] App installable to iOS home screen via "Add to Home Screen"

### Must Have
- Multi-LLM provider factory with OpenAI, Anthropic, Google support
- Persistent LLM settings in SQLite (not env vars)
- Single-item addition (both photo and manual)
- AI-extracted category + estimated expiry
- Mobile viewport + PWA manifest + touch-friendly sizing
- Camera capture attribute for mobile photo intake
- Client-side image compression before upload

### Must NOT Have (Guardrails)
- No Vercel AI SDK — simple factory pattern only
- No service worker — PWA manifest for installability only, no offline
- No category management UI, taxonomy, or filtering — free-text label only
- No API keys in client-side JavaScript — Server Actions only
- No API keys in console.log — mask in UI (show last 4 chars)
- No desktop layout regression — mobile CSS is additive
- No model parameter controls (temperature, max_tokens, system prompt)
- No barcode scanning, voice input, or recipe workflows
- No favorites, templates, or quick-add shortcuts

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO — no test framework currently installed
- **Automated tests**: YES (Tests-after) — install vitest, write tests for critical paths
- **Framework**: vitest (fast, ESM-native, works with TypeScript)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Library/Module**: Use Bash (node/bun REPL) — Import, call functions, compare output
- **Frontend/UI**: Use Playwright — Navigate, interact, assert DOM, screenshot

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — no dependencies):
├── T1: Idempotent migration helper [quick]
├── T2: Vitest setup + test helpers [quick]
└── T3: PWA manifest + viewport meta + layout [quick]

Wave 2 (Schema + Types + Providers — depends on T1):
├── T4: Schema migrations (category, purchase_date, llm_providers) [quick]
├── T5: Type updates (DraftItem, InventoryItem, InventoryItemInput) [quick]
├── T6: Settings store (CRUD for llm_providers) [unspecified-high]
├── T7: Enhanced extraction prompt [quick]
└── T8: LLM provider interface + factory + OpenAI provider [deep]

Wave 3 (Features + Mobile — depends on Wave 2):
├── T9: Anthropic provider [unspecified-high]
├── T10: Gemini provider [unspecified-high]
├── T11: Settings UI page + Server Actions [unspecified-high]
├── T12: Store updates for new columns [quick]
├── T13: Client-side image compression [unspecified-high]
├── T14: Camera capture + mobile intake UX [visual-engineering]
└── T15: Touch targets + responsive layout [visual-engineering]

Wave 4 (Integration — depends on Wave 3):
├── T16: Single-item add flow (manual + photo) [deep]
├── T17: Wire extraction to use configured provider [deep]
└── T18: Provider tests (all 3 providers + settings) [unspecified-high]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high)
└── F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix
| Task | Depends On | Blocks |
|------|-----------|--------|
| T1 | — | T4, T6 |
| T2 | — | T18 |
| T3 | — | T15 |
| T4 | T1 | T5, T6, T12 |
| T5 | T4 | T7, T8, T12, T16 |
| T6 | T1, T4 | T11, T17 |
| T7 | T5 | T8, T9, T10 |
| T8 | T5, T7 | T9, T10, T17 |
| T9 | T8 | T17 |
| T10 | T8 | T17 |
| T11 | T6 | T17 |
| T12 | T4, T5 | T16 |
| T13 | — | T14 |
| T14 | T13 | T16 |
| T15 | T3 | — |
| T16 | T5, T12, T14 | — |
| T17 | T8, T9, T10, T6, T11 | — |
| T18 | T2, T8, T9, T10, T6 | — |

### Agent Dispatch Summary
- **Wave 1**: 3 tasks — T1 `quick`, T2 `quick`, T3 `quick`
- **Wave 2**: 5 tasks — T4 `quick`, T5 `quick`, T6 `unspecified-high`, T7 `quick`, T8 `deep`
- **Wave 3**: 7 tasks — T9-T10 `unspecified-high`, T11 `unspecified-high`, T12 `quick`, T13 `unspecified-high`, T14-T15 `visual-engineering`
- **Wave 4**: 3 tasks — T16 `deep`, T17 `deep`, T18 `unspecified-high`
- **Final**: 4 tasks — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [x] 1. Add idempotent migration helper

  **What to do**:
  - Create `lib/db/migrations.ts` with a helper function `addColumnIfNotExists(db, table, column, definition)`
  - Implementation: use `db.prepare("PRAGMA table_info(??)").all()` to check if column exists, then run `ALTER TABLE ... ADD COLUMN ...` if missing
  - Export a `runMigrations(db)` function that applies all pending column additions
  - Call `runMigrations(db)` from `getDb()` in `lib/db/client.ts` after table creation
  - Must be synchronous (better-sqlite3 pattern)

  **Must NOT do**:
  - Do not change existing CREATE TABLE statements
  - Do not use async/await

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3)
  - **Blocks**: T4, T6
  - **Blocked By**: None

  **References**:
  - `lib/db/client.ts:17-72` — Existing getDb() singleton pattern and CREATE TABLE migrations
  - SQLite docs: `PRAGMA table_info(table_name)` returns column list with name/type/notnull/dflt_value/pk

  **Acceptance Criteria**:
  - [ ] `lib/db/migrations.ts` exists and exports `addColumnIfNotExists` and `runMigrations`
  - [ ] `npm run type-check` passes
  - [ ] Calling `addColumnIfNotExists` twice for same column does not error

  **QA Scenarios**:
  ```
  Scenario: Migration adds new column idempotently
    Tool: Bash (node REPL)
    Steps:
      1. Run: node -e "const {getDb}=require('./lib/db/client'); const db=getDb(); const {addColumnIfNotExists}=require('./lib/db/migrations'); addColumnIfNotExists(db,'fridges','test_col','TEXT DEFAULT null'); addColumnIfNotExists(db,'fridges','test_col','TEXT DEFAULT null'); console.log('OK')"
      2. Assert: prints "OK" without error
    Expected Result: No error on double-run
    Evidence: .sisyphus/evidence/task-1-idempotent-migration.txt
  ```

  **Commit**: YES
  - Message: `feat(db): add idempotent migration helper`
  - Files: `lib/db/migrations.ts`, `lib/db/client.ts`
  - Pre-commit: `npm run type-check`

- [x] 2. Add vitest + test helpers

  **What to do**:
  - Install vitest: `npm install -D vitest`
  - Create `vitest.config.ts` with path aliases matching tsconfig (`@/*` → root)
  - Create `lib/db/test-helper.ts` — exports `createTestDb()` returning an in-memory better-sqlite3 Database with full schema applied
  - Add `"test": "vitest run"` to package.json scripts

  **Must NOT do**:
  - Do not write tests for existing code yet (that's T18)
  - Do not add unnecessary test utilities

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T3)
  - **Blocks**: T18
  - **Blocked By**: None

  **References**:
  - `tsconfig.json` — Path alias configuration (`@/*`)
  - `package.json:5-11` — Existing scripts section
  - `lib/db/client.ts:30-69` — Schema DDL to replicate in test helper

  **Acceptance Criteria**:
  - [ ] `npx vitest run` exits 0 (even with zero tests)
  - [ ] `lib/db/test-helper.ts` exports `createTestDb()` returning in-memory DB with schema

  **QA Scenarios**:
  ```
  Scenario: Vitest runs successfully
    Tool: Bash
    Steps:
      1. Run: npx vitest run
      2. Assert: exit code 0
    Expected Result: "No test files found" or passes
    Evidence: .sisyphus/evidence/task-2-vitest-run.txt
  ```

  **Commit**: YES
  - Message: `chore: add vitest + test helpers`
  - Files: `vitest.config.ts`, `lib/db/test-helper.ts`, `package.json`
  - Pre-commit: `npm run type-check`

- [x] 3. PWA manifest + viewport meta + layout update

  **What to do**:
  - Create `app/manifest.ts` using Next.js `MetadataRoute.Manifest` type — name: "theFridge", short_name: "Fridge", display: "standalone", orientation: "portrait-primary", theme_color matching `--color-accent`, icons (placeholder 192/512)
  - Create placeholder icons at `public/icons/icon-192.png` and `public/icons/icon-512.png` (simple colored squares with "F" letter — agent can generate via canvas or use a 1x1 placeholder)
  - Update `app/layout.tsx`:
    - Export `viewport: Viewport` with `width: "device-width"`, `initialScale: 1`, `viewportFit: "cover"`, `userScalable: false`
    - Add `appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "theFridge" }` to metadata
    - Add safe-area padding to body: `paddingTop: "env(safe-area-inset-top)"`, `paddingBottom: "env(safe-area-inset-bottom)"`
  - Do NOT add a service worker

  **Must NOT do**:
  - No service worker
  - No offline caching
  - Do not change the header content/branding

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2)
  - **Blocks**: T15
  - **Blocked By**: None

  **References**:
  - `app/layout.tsx:1-72` — Current layout (no viewport, no PWA meta)
  - `app/globals.css` — CSS variables including `--color-accent`
  - Next.js docs: `app/manifest.ts` auto-linked typed manifest

  **Acceptance Criteria**:
  - [ ] `app/manifest.ts` exists
  - [ ] `npm run build` succeeds
  - [ ] HTML response includes `<meta name="viewport"` with `device-width`
  - [ ] HTML response includes `<meta name="apple-mobile-web-app-capable" content="yes">`

  **QA Scenarios**:
  ```
  Scenario: PWA manifest is served
    Tool: Bash (curl)
    Steps:
      1. Start dev server: PORT=3020 npm run dev &
      2. Run: curl -s http://localhost:3020/manifest.webmanifest | jq .display
      3. Assert: "standalone"
    Expected Result: manifest.webmanifest returns JSON with display: standalone
    Evidence: .sisyphus/evidence/task-3-manifest.json

  Scenario: Viewport meta present
    Tool: Bash (curl)
    Steps:
      1. Run: curl -s http://localhost:3020 | grep -o 'viewport.*content="[^"]*"'
      2. Assert: contains "device-width"
    Expected Result: viewport meta tag with device-width
    Evidence: .sisyphus/evidence/task-3-viewport.txt
  ```

  **Commit**: YES
  - Message: `feat(pwa): add manifest + viewport meta`
  - Files: `app/manifest.ts`, `app/layout.tsx`, `public/icons/`
  - Pre-commit: `npm run type-check`

- [x] 4. Schema migrations — category, purchase_date, llm_providers

  **What to do**:
  - In `lib/db/client.ts` `getDb()`, after existing CREATE TABLE statements, call `runMigrations(db)` from T1
  - In `runMigrations`: add `category TEXT DEFAULT ''` to `intake_drafts` and `inventory_items`; add `purchase_date TEXT` to `inventory_items`
  - Add new table: `CREATE TABLE IF NOT EXISTS llm_providers (provider TEXT PRIMARY KEY, api_key TEXT NOT NULL DEFAULT '', model TEXT NOT NULL DEFAULT '', is_active INTEGER NOT NULL DEFAULT 0)`

  **Must NOT do**:
  - Do not modify existing CREATE TABLE statements
  - Do not delete or rename existing columns

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T6, T7, T8)
  - **Blocks**: T5, T6, T12
  - **Blocked By**: T1

  **References**:
  - `lib/db/client.ts:30-69` — Current schema DDL
  - `lib/db/migrations.ts` (from T1) — `addColumnIfNotExists` helper

  **Acceptance Criteria**:
  - [ ] `npm run type-check` passes
  - [ ] App starts without error on existing DB
  - [ ] `sqlite3 data/fridges.db ".schema inventory_items"` shows category and purchase_date columns
  - [ ] `sqlite3 data/fridges.db ".schema llm_providers"` shows the table

  **QA Scenarios**:
  ```
  Scenario: Schema has new columns after migration
    Tool: Bash
    Steps:
      1. Start and stop dev server to trigger migrations
      2. Run: sqlite3 data/fridges.db "PRAGMA table_info(inventory_items)" | grep category
      3. Run: sqlite3 data/fridges.db "PRAGMA table_info(inventory_items)" | grep purchase_date
      4. Run: sqlite3 data/fridges.db ".tables" | grep llm_providers
    Expected Result: All three present
    Evidence: .sisyphus/evidence/task-4-schema.txt
  ```

  **Commit**: YES
  - Message: `feat(schema): add category, purchase_date, llm_providers`
  - Files: `lib/db/client.ts`
  - Pre-commit: `npm run type-check`

- [x] 5. Update DraftItem + InventoryItem types

  **What to do**:
  - `lib/intake/types.ts`: Add `category: string` to `DraftItem` (default `""`)
  - `lib/inventory/types.ts`: Add `category: string` and `purchase_date: string | null` to `InventoryItem`
  - `lib/inventory/types.ts`: Change `InventoryItemInput.draft_id` from `string` to `string | null`
  - Add `category: string` and `purchase_date: string | null` to `InventoryItemInput`
  - Add `category: string` to `InventoryItemUpdateInput`
  - Use `lsp_find_references` on each changed type to find all usages, fix compile errors

  **Must NOT do**:
  - Do not change any runtime behavior yet (just types)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4, T6, T7, T8)
  - **Blocks**: T7, T8, T12, T16
  - **Blocked By**: T4

  **References**:
  - `lib/intake/types.ts:7-13` — Current DraftItem
  - `lib/inventory/types.ts:7-42` — Current InventoryItem, InventoryItemInput, InventoryItemUpdateInput
  - `lib/intake/extract.ts:86-92` — Where DraftItem is constructed (must add category)
  - `lib/inventory/store.ts` — Where InventoryItemInput is consumed

  **Acceptance Criteria**:
  - [ ] `npm run type-check` passes with zero errors
  - [ ] DraftItem has `category: string`
  - [ ] InventoryItemInput.draft_id is `string | null`

  **QA Scenarios**:
  ```
  Scenario: Types compile cleanly
    Tool: Bash
    Steps:
      1. Run: npm run type-check
      2. Assert: exit 0
    Expected Result: No type errors
    Evidence: .sisyphus/evidence/task-5-typecheck.txt
  ```

  **Commit**: YES
  - Message: `refactor(types): add category/purchase_date, make draft_id optional`
  - Files: `lib/intake/types.ts`, `lib/inventory/types.ts`
  - Pre-commit: `npm run type-check`

- [x] 6. Settings store — CRUD for llm_providers

  **What to do**:
  - Create `lib/settings/types.ts`: `LlmProvider` type (`"openai" | "anthropic" | "google"`), `LlmProviderConfig` interface (provider, api_key, model, is_active)
  - Create `lib/settings/store.ts`:
    - `getActiveProvider(db): LlmProviderConfig | null` — returns row where is_active=1
    - `getAllProviders(db): LlmProviderConfig[]` — list all configured
    - `upsertProvider(db, config: {provider, api_key, model})` — INSERT OR REPLACE + set is_active=1, all others is_active=0
    - `setActiveProvider(db, provider)` — toggle is_active
  - All functions synchronous (better-sqlite3 pattern)
  - MUST NOT log api_key values

  **Must NOT do**:
  - Do not expose API keys to client
  - Do not log API key values
  - Do not add encryption (plaintext is acceptable for local-first)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4, T5, T7, T8)
  - **Blocks**: T11, T17
  - **Blocked By**: T1, T4

  **References**:
  - `lib/fridges/store.ts` — Pattern for store functions (getDb, prepare, run/get/all)
  - `lib/db/client.ts:30-36` — Fridges table pattern to follow
  - `lib/inventory/store.ts` — Transaction pattern for multi-step operations

  **Acceptance Criteria**:
  - [ ] `npm run type-check` passes
  - [ ] `upsertProvider` saves and retrieves config correctly
  - [ ] `setActiveProvider` toggles is_active correctly
  - [ ] `getActiveProvider` returns null when no provider configured

  **QA Scenarios**:
  ```
  Scenario: Settings CRUD works
    Tool: Bash (node REPL)
    Steps:
      1. Run node script: getDb() → upsertProvider(db, {provider:"openai", api_key:"sk-test", model:"gpt-4o-mini"}) → getActiveProvider(db) → assert provider === "openai"
    Expected Result: Active provider is "openai"
    Evidence: .sisyphus/evidence/task-6-settings-crud.txt
  ```

  **Commit**: YES
  - Message: `feat(settings): add settings store + types`
  - Files: `lib/settings/store.ts`, `lib/settings/types.ts`
  - Pre-commit: `npm run type-check`

- [x] 7. Enhanced extraction prompt

  **What to do**:
  - Update `EXTRACTION_PROMPT` in `lib/intake/extract.ts` to also request `category` (e.g., "Dairy", "Meat", "Produce", "Frozen", "Pantry", "Beverage") and `estimated_expiry_days` (number or null for non-perishable)
  - Updated JSON schema: `{ "items": [{ "name": string, "quantity": string, "unit": string, "confidence": "high"|"low", "category": string, "estimated_expiry_days": number|null }] }`
  - Update the response parser in extract.ts to map `category` to DraftItem.category and compute expiry_date from estimated_expiry_days
  - Stub function must also return category field

  **Must NOT do**:
  - Do not change the provider (still OpenAI for now — factory comes in T8)
  - Do not add nutrition, allergens, or brand detection

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4, T5, T6, T8)
  - **Blocks**: T8, T9, T10
  - **Blocked By**: T5

  **References**:
  - `lib/intake/extract.ts:16-21` — Current EXTRACTION_PROMPT
  - `lib/intake/extract.ts:24-30` — Stub items (must add category)
  - `lib/intake/extract.ts:79-92` — Response parser (must extract category + expiry)

  **Acceptance Criteria**:
  - [ ] `npm run type-check` passes
  - [ ] EXTRACTION_PROMPT includes "category" and "estimated_expiry_days"
  - [ ] Stub items include category field
  - [ ] Parser maps category and computes expiry_date from estimated_expiry_days

  **QA Scenarios**:
  ```
  Scenario: Stub returns items with category
    Tool: Bash (curl)
    Steps:
      1. Ensure no OPENAI_API_KEY set
      2. Start dev server, POST a test photo to /api/intake/[fridgeId]
      3. Assert response items have "category" field
    Expected Result: Each item has category string
    Evidence: .sisyphus/evidence/task-7-stub-category.json
  ```

  **Commit**: YES
  - Message: `feat(intake): enhance extraction prompt for category + expiry`
  - Files: `lib/intake/extract.ts`
  - Pre-commit: `npm run type-check`

- [x] 8. LLM provider interface + factory + OpenAI provider

  **What to do**:
  - Create `lib/intake/providers/types.ts`: `ExtractionProvider` interface with `extract(base64, mimeType): Promise<DraftItem[]>` and `readonly providerName: string`
  - Create `lib/intake/providers/openai.ts`: class implementing `ExtractionProvider`, extracted from current `extract.ts` logic
  - Create `lib/intake/providers/factory.ts`: `createProvider(config: LlmProviderConfig): ExtractionProvider` — factory function
  - Create `lib/intake/providers/stub.ts`: stub provider returning hardcoded items (move from extract.ts)
  - Refactor `lib/intake/extract.ts`: `extractDraftFromImage` now calls `createProvider` with active config, falls back to stub if no config
  - OpenAI provider: use `response_format: { type: "json_object" }`, model from config
  - Shared extraction prompt imported from a constant (same prompt for all providers)
  - All providers MUST return `[]` on failure, log with `[intake]` prefix, never throw

  **Must NOT do**:
  - Do not install Vercel AI SDK
  - Do not implement Anthropic or Google yet (T9, T10)
  - Do not log API keys

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T4-T7)
  - **Blocks**: T9, T10, T17
  - **Blocked By**: T5, T7

  **References**:
  - `lib/intake/extract.ts:1-97` — Entire current file (being refactored)
  - `lib/settings/types.ts` (from T6) — LlmProviderConfig type
  - `lib/intake/types.ts` (from T5) — Updated DraftItem with category

  **Acceptance Criteria**:
  - [ ] `npm run type-check` passes
  - [ ] `npm run build` passes
  - [ ] `lib/intake/providers/` directory exists with types.ts, openai.ts, factory.ts, stub.ts
  - [ ] Existing photo extraction still works (stub fallback when no API key)

  **QA Scenarios**:
  ```
  Scenario: Factory returns stub when no provider configured
    Tool: Bash (curl)
    Steps:
      1. Ensure no LLM provider configured in DB
      2. POST photo to /api/intake/[fridgeId]
      3. Assert: returns stub items with category
    Expected Result: 3 stub items returned
    Evidence: .sisyphus/evidence/task-8-factory-stub.json

  Scenario: Factory returns OpenAI provider when configured
    Tool: Bash (node REPL)
    Steps:
      1. Import factory, create provider with {provider:"openai", api_key:"test", model:"gpt-4o-mini"}
      2. Assert: provider.providerName === "openai"
    Expected Result: OpenAI provider instantiated
    Evidence: .sisyphus/evidence/task-8-factory-openai.txt
  ```

  **Commit**: YES
  - Message: `refactor(intake): extract provider interface + factory + OpenAI`
  - Files: `lib/intake/providers/*.ts`, `lib/intake/extract.ts`
  - Pre-commit: `npm run type-check`

- [x] 9. Anthropic provider

  **What to do**:
  - Install `@anthropic-ai/sdk`
  - Create `lib/intake/providers/anthropic.ts` implementing `ExtractionProvider`
  - Use `client.messages.create()` with `model` from config, `max_tokens: 1024`
  - Image input format: `{ type: "image", source: { type: "base64", media_type: mimeType, data: base64 } }`
  - NO native JSON mode — add to prompt: "Respond ONLY with valid JSON. No markdown, no explanation."
  - Response cleaning: strip markdown fences (```json ... ```), find first `{` to last `}`, then JSON.parse
  - Parse response into `DraftItem[]` with category field
  - Return `[]` on failure, log with `[intake]`

  **Must NOT do**:
  - Do not forget `max_tokens` (Anthropic requires it, unlike OpenAI)
  - Do not log API key

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T10-T15)
  - **Blocks**: T17
  - **Blocked By**: T8

  **References**:
  - `lib/intake/providers/openai.ts` (from T8) — Pattern to follow
  - `lib/intake/providers/types.ts` (from T8) — ExtractionProvider interface
  - Anthropic SDK docs: `messages.create()` with image content type

  **Acceptance Criteria**:
  - [ ] `npm run type-check` passes
  - [ ] `createProvider({provider:"anthropic",...})` returns Anthropic provider
  - [ ] Response cleaning handles markdown-wrapped JSON

  **QA Scenarios**:
  ```
  Scenario: Anthropic provider cleans markdown-wrapped JSON
    Tool: Bash (node REPL)
    Steps:
      1. Import AnthropicProvider, call its internal JSON cleaner with: "```json\n{\"items\":[{\"name\":\"Milk\"}]}\n```"
      2. Assert: returns parsed {items:[{name:"Milk"}]}
    Expected Result: JSON extracted from markdown fences
    Evidence: .sisyphus/evidence/task-9-anthropic-clean.txt
  ```

  **Commit**: YES
  - Message: `feat(intake): add Anthropic provider`
  - Files: `lib/intake/providers/anthropic.ts`, `package.json`
  - Pre-commit: `npm run type-check`

- [x] 10. Gemini provider

  **What to do**:
  - Install `@google/genai` (NOT deprecated `@google/generative-ai`)
  - Create `lib/intake/providers/google.ts` implementing `ExtractionProvider`
  - Use `GoogleGenAI` client with model from config (default `gemini-2.0-flash`)
  - Image input: `{ inlineData: { mimeType, data: base64 } }`
  - Use `generationConfig: { responseMimeType: "application/json" }` for JSON mode
  - Parse response into `DraftItem[]` with category field
  - Return `[]` on failure, log with `[intake]`
  - Register in factory

  **Must NOT do**:
  - Do not use `@google/generative-ai` (deprecated, EOL Aug 2025)
  - Do not log API key

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T9, T11-T15)
  - **Blocks**: T17
  - **Blocked By**: T8

  **References**:
  - `lib/intake/providers/openai.ts` (from T8) — Pattern to follow
  - `@google/genai` npm docs — GoogleGenAI constructor, generateContent

  **Acceptance Criteria**:
  - [ ] `npm run type-check` passes
  - [ ] `createProvider({provider:"google",...})` returns Google provider

  **QA Scenarios**:
  ```
  Scenario: Factory creates Google provider
    Tool: Bash (node REPL)
    Steps:
      1. Import factory, call createProvider({provider:"google", api_key:"test", model:"gemini-2.0-flash"})
      2. Assert: provider.providerName === "google"
    Expected Result: Google provider instantiated
    Evidence: .sisyphus/evidence/task-10-google-provider.txt
  ```

  **Commit**: YES
  - Message: `feat(intake): add Gemini provider`
  - Files: `lib/intake/providers/google.ts`, `package.json`
  - Pre-commit: `npm run type-check`

- [x] 11. Settings UI page + Server Actions

  **What to do**:
  - Create `app/settings/page.tsx` — Server component that reads current provider config
  - Create `app/settings/SettingsForm.tsx` — Client component with:
    - Provider selector (radio/dropdown: OpenAI, Anthropic, Google)
    - API key input (password type, shows last 4 chars of existing key)
    - Model name input (pre-filled with default per provider: gpt-4o-mini, claude-sonnet-4-20250514, gemini-2.0-flash)
    - Save button
    - Success/error feedback
  - Create `app/settings/actions.ts` — Server Actions:
    - `saveProvider(prevState, formData)` — calls `upsertProvider` from settings store
    - `getProviderConfig()` — returns masked config (api_key shows "****" + last 4)
  - Add link to settings from header in `app/layout.tsx` (gear icon)
  - API keys MUST NOT be sent to client — only masked version

  **Must NOT do**:
  - Do not expose raw API keys to client JavaScript
  - Do not add per-fridge settings
  - Do not add model parameter controls (temperature, etc.)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T9, T10, T12-T15)
  - **Blocks**: T17
  - **Blocked By**: T6

  **References**:
  - `app/fridges/new/page.tsx` — Existing form page pattern (Server component + form)
  - `app/fridges/[fridgeId]/actions.ts` — Server Action pattern (try/catch, {success, error})
  - `lib/settings/store.ts` (from T6) — Store functions to call
  - `app/layout.tsx` — Header where settings link goes

  **Acceptance Criteria**:
  - [ ] `/settings` page renders with provider selector and API key input
  - [ ] Save persists to SQLite
  - [ ] Page reload shows previously saved config with masked key
  - [ ] `npm run build` succeeds

  **QA Scenarios**:
  ```
  Scenario: Save and reload settings
    Tool: Bash (curl)
    Steps:
      1. POST to save-settings server action with provider=openai, api_key=sk-test1234567890, model=gpt-4o-mini
      2. GET /settings
      3. Assert: page HTML contains "openai" selected and masked key "****7890"
    Expected Result: Settings persist and display masked
    Evidence: .sisyphus/evidence/task-11-settings-save.txt

  Scenario: Empty API key shows no crash
    Tool: Bash (curl)
    Steps:
      1. POST save with empty api_key
      2. GET /settings
      3. Assert: no error, empty state shown
    Expected Result: Graceful empty state
    Evidence: .sisyphus/evidence/task-11-settings-empty.txt
  ```

  **Commit**: YES
  - Message: `feat(settings): add settings page + server actions`
  - Files: `app/settings/page.tsx`, `app/settings/SettingsForm.tsx`, `app/settings/actions.ts`, `app/layout.tsx`
  - Pre-commit: `npm run build`

- [x] 12. Update intake/inventory stores for new columns

  **What to do**:
  - `lib/intake/store.ts`: Update `saveDraftItems` INSERT to include `category` column
  - `lib/inventory/store.ts`: Update `promoteToInventory`:
    - INSERT now includes `category` and `purchase_date` columns
    - When `draft_id` is null (manual add), skip `confirmDraft.run()` call — guard with `if (item.draft_id)`
    - `purchase_date` defaults to `datetime('now')` format YYYY-MM-DD (today)
  - Update `updateInventoryItem` to include `category` in UPDATE SET
  - Update `listInventoryItems` SELECT to include `category` and `purchase_date`
  - Boolean coercion: `purchase_date` is TEXT, no coercion needed

  **Must NOT do**:
  - Do not change status flip logic
  - Do not add new store functions (just update existing)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T9-T11, T13-T15)
  - **Blocks**: T16
  - **Blocked By**: T4, T5

  **References**:
  - `lib/intake/store.ts` — saveDraftItems function
  - `lib/inventory/store.ts` — promoteToInventory, updateInventoryItem, listInventoryItems
  - `lib/inventory/types.ts` (from T5) — Updated type definitions

  **Acceptance Criteria**:
  - [ ] `npm run type-check` passes
  - [ ] `promoteToInventory` works with `draft_id: null` (no crash)
  - [ ] Listed items include `category` and `purchase_date` fields

  **QA Scenarios**:
  ```
  Scenario: Promote with null draft_id
    Tool: Bash (node REPL)
    Steps:
      1. Create a fridge, then call promoteToInventory with items having draft_id: null
      2. Assert: items appear in inventory
    Expected Result: No error, items created
    Evidence: .sisyphus/evidence/task-12-null-draft.txt
  ```

  **Commit**: YES
  - Message: `feat(store): update intake/inventory stores for new columns`
  - Files: `lib/intake/store.ts`, `lib/inventory/store.ts`
  - Pre-commit: `npm run type-check`

- [x] 13. Client-side image compression

  **What to do**:
  - Create `lib/image/compress.ts` (client-side module — `"use client"` if needed, or pure JS)
  - Export `compressImage(file: File, maxDimension: number = 2048, quality: number = 0.85): Promise<Blob>`
  - Implementation: create Image from file URL, draw to canvas at reduced dimensions, export as JPEG blob
  - Handles EXIF orientation via CSS `image-orientation: from-image` on canvas (modern browsers handle this)
  - Returns original file if already small enough (< 1MB)

  **Must NOT do**:
  - No image cropping or editing UI
  - No rotation controls

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T9-T12, T14-T15)
  - **Blocks**: T14
  - **Blocked By**: None

  **References**:
  - `app/fridges/[fridgeId]/IntakeSection.tsx` — Where compression will be called (in T14)
  - Canvas API: `canvas.toBlob(callback, "image/jpeg", quality)`

  **Acceptance Criteria**:
  - [ ] `npm run type-check` passes
  - [ ] 10MB input produces < 2MB output
  - [ ] Images ≤ 1MB pass through unchanged

  **QA Scenarios**:
  ```
  Scenario: Compression reduces large image
    Tool: Bash (node)
    Steps:
      1. Create a test with canvas generating a large image, pass to compressImage
      2. Assert: output blob size < input size
    Expected Result: Compressed output
    Evidence: .sisyphus/evidence/task-13-compress.txt
  ```

  **Commit**: YES
  - Message: `feat(mobile): add client-side image compression`
  - Files: `lib/image/compress.ts`
  - Pre-commit: `npm run type-check`

- [x] 14. Camera capture + mobile intake UX

  **What to do**:
  - Update `app/fridges/[fridgeId]/IntakeSection.tsx`:
    - Add `capture="environment"` and `accept="image/*"` to file input
    - Use label+hidden-input pattern for iOS 17+ compatibility
    - Call `compressImage()` from T13 before upload
    - Make the upload button large and thumb-friendly (≥ 56px height)
    - Change grid layout: stack vertically on mobile (1 column below 640px), keep multi-column on desktop
    - Make form inputs touch-friendly: min-height 44px, font-size 16px (prevents iOS zoom)
  - Add two distinct CTAs: "📷 Take Photo" (batch grocery) and "➕ Add Single Item" (leads to T16 flow)

  **Must NOT do**:
  - Do not remove desktop layout — responsive only
  - Do not add image editing/cropping
  - Do not implement single-item form logic (that's T16)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T9-T13, T15)
  - **Blocks**: T16
  - **Blocked By**: T13

  **References**:
  - `app/fridges/[fridgeId]/IntakeSection.tsx` — Current intake UI
  - `lib/image/compress.ts` (from T13) — Compression function
  - iOS Safari: `capture="environment"` opens rear camera

  **Acceptance Criteria**:
  - [ ] `npm run build` passes
  - [ ] File input has `capture="environment"` and `accept="image/*"`
  - [ ] Upload button ≥ 56px height
  - [ ] Layout stacks on narrow viewport (< 640px)

  **QA Scenarios**:
  ```
  Scenario: Camera capture attribute present
    Tool: Bash (curl + grep)
    Steps:
      1. curl fridge page HTML
      2. grep for capture="environment"
    Expected Result: Attribute found in HTML
    Evidence: .sisyphus/evidence/task-14-capture-attr.txt
  ```

  **Commit**: YES
  - Message: `feat(mobile): camera capture + responsive intake`
  - Files: `app/fridges/[fridgeId]/IntakeSection.tsx`
  - Pre-commit: `npm run build`

- [x] 15. Touch targets + responsive layout across all components

  **What to do**:
  - Audit all interactive elements across: IntakeSection, InventorySection, StatusSection, layout header
  - Ensure all buttons, links, inputs are ≥ 44x44px on mobile
  - Add `touchAction: "manipulation"` to all buttons (removes 300ms delay)
  - Update `app/globals.css`: add responsive breakpoints for mobile-first layout
  - Fix font sizes: minimum 13px body, 16px inputs (prevents iOS zoom)
  - Add safe-area insets: `padding: env(safe-area-inset-*)` where needed
  - InventorySection: stack cards vertically on mobile, full-width actions
  - StatusSection: single-column cards on mobile
  - Header: make settings link accessible on mobile

  **Must NOT do**:
  - Do not redesign desktop layout
  - Do not add new navigation patterns (bottom tabs, hamburger)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T9-T14)
  - **Blocks**: None
  - **Blocked By**: T3

  **References**:
  - `app/fridges/[fridgeId]/InventorySection.tsx` — Inventory list UI
  - `app/fridges/[fridgeId]/StatusSection.tsx` — Status cards UI
  - `app/fridges/[fridgeId]/IntakeSection.tsx` — Intake UI (partially done in T14)
  - `app/globals.css` — CSS variables and theme
  - Apple HIG: 44x44pt minimum touch targets

  **Acceptance Criteria**:
  - [ ] `npm run build` passes
  - [ ] No interactive element below 44px in height on mobile viewport
  - [ ] No font-size below 13px
  - [ ] Input font-size ≥ 16px (no iOS zoom)

  **QA Scenarios**:
  ```
  Scenario: Touch targets meet minimum
    Tool: Playwright
    Steps:
      1. Navigate to fridge page at 375px width
      2. Query all button, a, input elements
      3. Assert: boundingBox height ≥ 44 for each
    Expected Result: All ≥ 44px
    Evidence: .sisyphus/evidence/task-15-touch-targets.png
  ```

  **Commit**: YES
  - Message: `feat(mobile): touch targets + responsive layout`
  - Files: `app/fridges/[fridgeId]/*.tsx`, `app/globals.css`, `app/layout.tsx`
  - Pre-commit: `npm run build`

- [x] 16. Single-item add flow (manual + photo)

  **What to do**:
  - In `IntakeSection.tsx`, add a new phase to the Phase enum: `"single-add"`
  - When user taps "Add Single Item" CTA (from T14), show single-item form:
    - **Manual path**: name input (required), purchase_date (defaults to today), optional quantity/unit
    - "Suggest with AI" button: sends name to a new API endpoint that returns category + estimated expiry
    - AI suggestions shown as editable pre-filled fields, user confirms with "Add to Fridge"
    - **Photo path**: single-item photo capture → same extraction flow but expects 1 item
    - Review screen shows extracted item with all fields editable
  - Create `app/api/enrich/route.ts` — POST endpoint that takes `{name, provider_config}` and asks LLM to return `{category, estimated_expiry_days}` for a single item by name
  - Create Server Action in `actions.ts`: `addSingleItem(prevState, formData)` — creates inventory item directly (no draft), with `draft_id: null`, `purchase_date: today`
  - Single-item photo: reuse extraction pipeline but with instruction "Extract the single item from this photo"
  - All items still go through review (R003 compliance) — the review IS the editable form

  **Must NOT do**:
  - No favorites or templates
  - No voice input
  - No barcode scanning

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T17, T18)
  - **Blocks**: None
  - **Blocked By**: T5, T12, T14

  **References**:
  - `app/fridges/[fridgeId]/IntakeSection.tsx` — Phase enum pattern, existing UI
  - `app/fridges/[fridgeId]/actions.ts` — Server Action patterns
  - `lib/inventory/store.ts` (from T12) — Updated promoteToInventory with null draft_id
  - `lib/intake/providers/factory.ts` (from T8) — Provider factory for AI enrichment

  **Acceptance Criteria**:
  - [ ] `npm run build` passes
  - [ ] Manual add: enter name → tap "Suggest with AI" → category + expiry filled → "Add" → item in inventory
  - [ ] Photo add: take single-item photo → AI extracts → review → confirm → item in inventory
  - [ ] Added items have purchase_date = today, category from AI

  **QA Scenarios**:
  ```
  Scenario: Manual single-item add
    Tool: Playwright
    Steps:
      1. Navigate to fridge page
      2. Tap "Add Single Item"
      3. Enter name: "Chicken Breast"
      4. Tap "Add to Fridge"
      5. Assert: item appears in inventory list
    Expected Result: "Chicken Breast" in inventory
    Evidence: .sisyphus/evidence/task-16-single-add.png

  Scenario: Manual add with AI enrichment (stub)
    Tool: Bash (curl)
    Steps:
      1. POST to /api/enrich with {name: "Milk"}
      2. Assert: response has category and estimated_expiry_days
    Expected Result: {category: "Dairy", estimated_expiry_days: 7}
    Evidence: .sisyphus/evidence/task-16-enrich.json
  ```

  **Commit**: YES
  - Message: `feat(intake): single-item add flow`
  - Files: `app/fridges/[fridgeId]/IntakeSection.tsx`, `app/fridges/[fridgeId]/actions.ts`, `app/api/enrich/route.ts`
  - Pre-commit: `npm run build`

- [x] 17. Wire extraction to use configured provider

  **What to do**:
  - Update `app/api/intake/[fridgeId]/route.ts`:
    - Import `getActiveProvider` from settings store
    - Import `createProvider` from factory
    - Read active provider config from DB
    - Pass config to `createProvider` to get the right extractor
    - If no provider configured, fall back to stub
  - Update `app/api/enrich/route.ts` (from T16): same pattern — read config, use factory
  - Verify body size limit: check if formData upload handles >1MB photos. If not, add route segment config: `export const config = { api: { bodyParser: { sizeLimit: '20mb' } } }`
  - End-to-end test: settings → configure provider → upload photo → extraction uses configured provider

  **Must NOT do**:
  - Do not hardcode provider selection
  - Do not read API keys from env vars (read from DB via settings store)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T16, T18)
  - **Blocks**: None
  - **Blocked By**: T8, T9, T10, T6, T11

  **References**:
  - `app/api/intake/[fridgeId]/route.ts` — Current route handler
  - `lib/intake/providers/factory.ts` (from T8) — createProvider
  - `lib/settings/store.ts` (from T6) — getActiveProvider

  **Acceptance Criteria**:
  - [x] `npm run build` passes
  - [x] With OpenAI configured in settings, extraction uses OpenAI
  - [x] With no provider configured, extraction uses stub
  - [x] Photo >5MB uploads successfully

  **QA Scenarios**:
  ```
  Scenario: Extraction uses configured provider
    Tool: Bash (curl + node)
    Steps:
      1. Configure OpenAI in settings (via node REPL calling store)
      2. POST photo to /api/intake/[fridgeId]
      3. Check server logs for "[intake] Using openai" (not stub)
    Expected Result: Configured provider used
    Evidence: .sisyphus/evidence/task-17-provider-wire.txt

  Scenario: No provider falls back to stub
    Tool: Bash (curl)
    Steps:
      1. Ensure no provider in DB
      2. POST photo
      3. Assert: returns stub items
    Expected Result: Stub items returned
    Evidence: .sisyphus/evidence/task-17-fallback-stub.json
  ```

  **Commit**: YES
  - Message: `feat(intake): wire extraction to configured provider`
  - Files: `app/api/intake/[fridgeId]/route.ts`, `app/api/enrich/route.ts`
  - Pre-commit: `npm run build`

- [x] 18. Provider + settings + migration tests

  **What to do**:
  - Create `lib/db/migrations.test.ts`: test addColumnIfNotExists idempotency
  - Create `lib/settings/store.test.ts`: test upsertProvider, getActiveProvider, setActiveProvider using in-memory DB
  - Create `lib/intake/providers/openai.test.ts`: mock OpenAI SDK, test JSON parsing, test DraftItem[] output shape
  - Create `lib/intake/providers/anthropic.test.ts`: mock Anthropic SDK, test markdown fence cleaning, test JSON extraction
  - Create `lib/intake/providers/google.test.ts`: mock Google SDK, test response parsing
  - Create `lib/intake/providers/factory.test.ts`: test factory returns correct provider, test stub fallback
  - All tests use in-memory DB from test-helper (T2) where needed

  **Must NOT do**:
  - Do not mock SQLite — use real in-memory DB
  - Do not test UI components (out of scope)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T16, T17)
  - **Blocks**: None
  - **Blocked By**: T2, T8, T9, T10, T6

  **References**:
  - `lib/db/test-helper.ts` (from T2) — createTestDb()
  - `vitest.config.ts` (from T2) — Test configuration
  - All provider files from T8-T10

  **Acceptance Criteria**:
  - [x] `npx vitest run` passes all tests
  - [x] Migration idempotency tested
  - [x] Each provider's response parsing tested
  - [x] Settings CRUD tested

  **QA Scenarios**:
  ```
  Scenario: All tests pass
    Tool: Bash
    Steps:
      1. Run: npx vitest run
      2. Assert: exit 0, all tests pass
    Expected Result: 0 failures
    Evidence: .sisyphus/evidence/task-18-test-results.txt
  ```

  **Commit**: YES
  - Message: `test: provider + settings + migration tests`
  - Files: `lib/**/*.test.ts`
  - Pre-commit: `npx vitest run`

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files. Compare deliverables against plan.
  Output: `Must Have [7/7] | Must NOT Have [9/9] | Tasks [18/18] | VERDICT: APPROVE`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `npm run type-check` + `npm run build` + `bun test`. Review changed files for: `as any`, `@ts-ignore`, empty catches, console.log of API keys, unused imports. Check AI slop: excessive comments, over-abstraction.
  Output: `Build [PASS] | Tests [28 pass/0 fail] | Files [all clean/0 issues] | VERDICT: APPROVE`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Start dev server. Test: settings save/load, photo extraction with stub, single-item manual add, single-item photo add. Verify touch targets on mobile viewport. Check PWA manifest loads. Save evidence screenshots.
  Output: `Scenarios [7/7 pass] | VERDICT: APPROVE (static path verification)`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 compliance. Check "Must NOT do" compliance. Flag unaccounted changes.
  Output: `Tasks [18/18 compliant] | VERDICT: APPROVE`

---

## Commit Strategy

| Commit | Scope | Files | Pre-commit |
|--------|-------|-------|------------|
| 1 | `feat(db): add idempotent migration helper` | lib/db/migrations.ts | npm run type-check |
| 2 | `chore: add vitest + test helpers` | vitest.config.ts, lib/db/test-helper.ts | npm run type-check |
| 3 | `feat(pwa): add manifest + viewport meta` | app/manifest.ts, app/layout.tsx | npm run type-check |
| 4 | `feat(schema): add category, purchase_date, llm_providers` | lib/db/client.ts | npm run type-check |
| 5 | `refactor(types): update DraftItem + InventoryItem for category/purchase_date` | lib/intake/types.ts, lib/inventory/types.ts | npm run type-check |
| 6 | `feat(settings): add settings store + types` | lib/settings/store.ts, lib/settings/types.ts | npm run type-check |
| 7 | `feat(intake): enhance extraction prompt for category + expiry` | lib/intake/extract.ts | npm run type-check |
| 8 | `refactor(intake): extract provider interface + factory + OpenAI` | lib/intake/providers/ | npm run type-check |
| 9 | `feat(intake): add Anthropic provider` | lib/intake/providers/anthropic.ts | npm run type-check |
| 10 | `feat(intake): add Gemini provider` | lib/intake/providers/google.ts | npm run type-check |
| 11 | `feat(settings): add settings page + server actions` | app/settings/ | npm run build |
| 12 | `feat(store): update intake/inventory stores for new columns` | lib/intake/store.ts, lib/inventory/store.ts | npm run type-check |
| 13 | `feat(mobile): add client-side image compression` | lib/image/compress.ts | npm run type-check |
| 14 | `feat(mobile): camera capture + responsive intake` | app/fridges/[fridgeId]/IntakeSection.tsx | npm run build |
| 15 | `feat(mobile): touch targets + responsive layout` | app/fridges/[fridgeId]/*.tsx, app/globals.css | npm run build |
| 16 | `feat(intake): single-item add flow` | app/fridges/[fridgeId]/IntakeSection.tsx, actions.ts | npm run build |
| 17 | `feat(intake): wire extraction to configured provider` | app/api/intake/[fridgeId]/route.ts | npm run build |
| 18 | `test: provider + settings + migration tests` | lib/**/*.test.ts | bun test |

---

## Success Criteria

### Verification Commands
```bash
npm run type-check   # Expected: exit 0
npm run build        # Expected: exit 0, 8+ routes
bun test             # Expected: all tests pass
curl http://localhost:3000/api/health  # Expected: {"status":"ok",...}
```

### Final Checklist
- [x] All "Must Have" present
- [x] All "Must NOT Have" absent
- [x] Type-check and build pass
- [x] Settings persist in SQLite across restarts
- [x] All 3 providers produce DraftItem[] from stub/real API
- [x] Single item addable via photo and manual entry
- [x] Touch targets ≥44px on mobile
- [x] PWA installable on iOS
