# Learnings

## 2026-03-21 Session ses_2f0882d6effejbYyF2VgM4aBFV — Plan Start

### Codebase Conventions
- Store functions: synchronous only (better-sqlite3), throw on changes===0
- Server Actions: (prevState, formData) => {success, error?}, always try/catch
- Imports: @/* alias for cross-directory, relative only within same dir
- Styles: inline style objects + CSS vars, no Tailwind utilities in components
- Logging: [context] prefix (e.g. [intake], [settings])
- Status flips only — never DELETE rows

### Key Files
- lib/db/client.ts — singleton getDb(), idempotent CREATE TABLE IF NOT EXISTS
- lib/intake/extract.ts — hardcoded OpenAI, being refactored to factory in T8
- lib/intake/types.ts — DraftItem (adding category in T5)
- lib/inventory/types.ts — InventoryItem, InventoryItemInput (draft_id → optional in T5)
- app/fridges/[fridgeId]/IntakeSection.tsx — Phase enum pattern for multi-step flows

### Critical Decisions
- Factory pattern (NOT Vercel AI SDK) for multi-LLM
- llm_providers table: multi-row with is_active flag (preserves keys when switching)
- Anthropic: no JSON mode, needs response cleaning (strip markdown fences)
- @google/genai (NOT deprecated @google/generative-ai)
- Anthropic requires max_tokens: 1024 explicitly
- API keys: never log, never send to client, mask in UI (last 4 chars)
- Client-side image compression: max 2048px, 0.85 quality before upload

## 2026-03-21 T3 — Migration Helper Created

### Migration Pattern
- `addColumnIfNotExists(db, table, column, definition)` uses PRAGMA table_info() to check existence
- Idempotent: calling twice for same column is safe (second call is no-op)
- All synchronous (better-sqlite3 constraint)
- Type import: `import type Database from "better-sqlite3"`
- Call `runMigrations(db)` at end of getDb(), before return

### Implementation Details
- PRAGMA table_info() returns array of {cid, name, type, notnull, dflt_value, pk}
- Check via `.some((col) => col.name === column)` to detect existence
- Use string concatenation for table/column names (not parameterized — PRAGMA doesn't support params)
- ALTER TABLE ADD COLUMN only runs if column doesn't exist
- runMigrations() body empty for now; T4 will add actual migrations

### Files Modified
- Created: lib/db/migrations.ts (addColumnIfNotExists, runMigrations)
- Updated: lib/db/client.ts (import runMigrations, call at end of getDb)
- Type-check: ✓ zero errors
- Idempotency test: ✓ passed (calling twice doesn't throw)

## 2026-03-21 T2 — Vitest Setup + Test DB Helper

### Vitest Configuration
- `vitest.config.ts`: environment: "node", @/* path alias, passWithNoTests: true
- `npm install -D vitest` adds vitest@^4.1.0 to devDependencies
- `"test": "vitest run"` added to package.json scripts
- `npx vitest run` exits 0 when no test files found (passWithNoTests: true)

### Test DB Helper (lib/db/test-helper.ts)
- `createTestDb(): Database.Database` creates in-memory DB (":memory:")
- Applies PRAGMA journal_mode=WAL and foreign_keys=ON (matches production)
- Creates all 4 tables: fridges, intake_drafts, inventory_items, llm_providers
- llm_providers table: provider (PK), api_key, model, is_active (for T4 multi-LLM)
- Schema copied exactly from lib/db/client.ts CREATE TABLE statements
- Synchronous only (better-sqlite3 constraint)

### Files Created/Modified
- Created: vitest.config.ts
- Created: lib/db/test-helper.ts
- Updated: package.json (added "test" script)
- Type-check: ✓ zero errors
- Vitest run: ✓ exits 0 with no test files
