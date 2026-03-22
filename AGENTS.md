# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-21
**Commit:** 6aaa5b4
**Branch:** gsd/M001

## OVERVIEW

Local-first household fridge/freezer inventory app. Next.js 15 (App Router) + React 19 + TypeScript (strict) + Tailwind CSS v4 + SQLite (better-sqlite3). QR codes route to storage contexts; photos produce AI-extracted drafts that humans confirm before inventory becomes truth.

## STRUCTURE

```
theFridge/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout, global header
│   ├── page.tsx                # Landing page
│   ├── globals.css             # Tailwind v4 @theme + CSS vars
│   ├── fridges/
│   │   ├── new/                # Create fridge form + server action
│   │   └── [fridgeId]/         # Core context page: intake, inventory, status
│   │       ├── page.tsx        # Server component — orchestrates all sections
│   │       ├── actions.ts      # Server Actions: confirm drafts, promote, edit, status flip
│   │       ├── IntakeSection.tsx    # Client — photo upload + draft review (phase enum)
│   │       ├── InventorySection.tsx # Client — item list, inline edit, use/discard
│   │       └── StatusSection.tsx    # Server — alerts, cooking suggestions
│   └── api/
│       ├── fridges/route.ts         # GET list, POST create
│       └── intake/[fridgeId]/route.ts  # POST photo → draft extraction
├── lib/                        # Domain logic (sync, no async/await in stores)
│   ├── db/client.ts            # Singleton better-sqlite3, WAL, schema migrations
│   ├── fridges/store.ts        # Fridge CRUD + types (FridgeRecord, StorageType)
│   ├── intake/
│   │   ├── types.ts            # DraftItem interface
│   │   ├── store.ts            # saveDraftItems (FK-validated, transactional)
│   │   └── extract.ts          # OpenAI gpt-4o-mini extraction + stub fallback
│   ├── inventory/
│   │   ├── types.ts            # InventoryItem, InventoryItemInput, UpdateInput
│   │   ├── store.ts            # promoteToInventory (atomic txn), update, status flip
│   │   └── analysis.ts         # Pure: analyzeInventory, generateSuggestions
│   └── qr/generate.ts          # SVG QR from request headers (baked URL)
├── components/QrCode.tsx       # Server component, SVG render with fallback
├── data/                       # SQLite DB files (fridges.db + WAL)
└── .gsd/                       # Project management (tracked in git)
    ├── PROJECT.md, DECISIONS.md, REQUIREMENTS.md, KNOWLEDGE.md, STATE.md
    └── milestones/M001/         # Slice tracking (S01-S05)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add new domain module | `lib/{domain}/` | Follow types.ts + store.ts pattern |
| Add/edit UI for a fridge context | `app/fridges/[fridgeId]/` | Server Actions in actions.ts |
| Add API endpoint | `app/api/` | Route handlers, not Server Actions |
| Modify DB schema | `lib/db/client.ts` | Idempotent migrations in getDb() |
| Change styling/theme | `app/globals.css` | CSS vars: `--color-*`, `--font-*` |
| Understand a decision | `.gsd/DECISIONS.md` | Append-only register, D001-D022 |
| Check requirement status | `.gsd/REQUIREMENTS.md` | R001-R022 with validation proofs |
| Find gotchas/patterns | `.gsd/KNOWLEDGE.md` | Append-only, saves re-investigation |

## CONVENTIONS

### Imports
- Always `@/*` path alias (maps to root). No relative imports across directories.
- Relative imports only within same directory (`./actions`, `./IntakeSection`).

### Naming
- Components: PascalCase files (`QrCode.tsx`, `IntakeSection.tsx`)
- Utilities/stores: camelCase files (`store.ts`, `extract.ts`, `analysis.ts`)
- Constants: `UPPER_SNAKE_CASE` (`DB_PATH`, `EXTRACTION_PROMPT`)
- Types/interfaces: PascalCase (`FridgeRecord`, `DraftItem`, `InventoryItem`)

### Database
- **Synchronous only** — better-sqlite3 has no async API. Never `await` store functions.
- Singleton via `getDb()` — lazy-initialized, schema migrations run once per process.
- WAL mode + foreign keys enabled.
- All mutations scoped by `id AND fridge_id` (dual-key) — prevents cross-fridge writes.
- Status flips (`active` → `used`/`discarded`), never DELETE rows.
- `db.transaction()` for multi-step mutations (draft → inventory promotion).
- Store functions **throw** on `changes===0`, not return boolean.

### Server Actions
- Signature: `(prevState, formData) => { success, error?, count? }` for form-driven; imperative call for programmatic JSON.
- Always try/catch; return structured result. Never throw across RSC boundary.
- `[context]` prefix in all console.log/error (`[intake]`, `[inventory]`).

### Components
- `useState` initializer function (not useEffect) for prop-derived state — avoids hydration flash.
- Phase enum pattern for multi-step client flows: `type Phase = "idle" | "uploading" | "review" | ...`
- `useTransition` wraps `router.refresh()` after mutations.
- Single `editingItemId: string | null` for exclusive edit mode.

### Styling
- Inline `style` objects + CSS variables (`var(--color-text)`, `var(--color-border)`).
- Tailwind v4 utilities for layout. **No tailwind.config.ts** — config is CSS-only via `@theme {}`.

## ANTI-PATTERNS

- **Silent AI inventory mutation** — drafts MUST go through human review before becoming truth (R003, R020)
- **Partial transactions** — draft confirmation + inventory insert MUST be atomic (D019)
- **Cross-fridge writes** — always scope mutations by `id AND fridge_id` (D022)
- **Async in store layer** — better-sqlite3 is sync-only; no async/await in store functions (D011)
- **Downgrading Next.js** — never below 15.5.14 (CVE-2025-66478) (D010)
- **Double-acting items** — `setInventoryItemStatus` guards on `status='active'`; double-act surfaces as error, not silent no-op (D022)
- **Throwing across RSC boundary** — Server Actions return `{ success, error }`, never unhandled throw
- **v3-style Tailwind config** — no `tailwind.config.ts`; Tailwind v4 uses CSS `@theme {}` only

## GOTCHAS

- **`request.formData()` throws** on empty/malformed multipart bodies — wrap in try/catch, return 400 (D015)
- **Next.js 15 params are async** — `await params` in page/layout components
- **QR URLs baked at generation time** — if LAN IP/port changes, QR codes go stale; regenerate by reloading context page. If host headers are rewritten, set `QR_BASE_URL` to force QR origin.
- **`useActionState` requires `(prevState, formData)` signature** — missing prevState param causes TypeScript error
- **Next.js dev server picks alternate port silently** when 3000 is occupied
- **SQLite INTEGER 0/1 → boolean** coerced at store read boundary; no casting in components (D018)
- **Playwright `fill()` doesn't trigger React controlled input `onChange`** — use `slowly: true` for character-by-character input

## COMMANDS

```bash
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build
npm start            # Production server
npm run lint         # Next.js linting
npm run type-check   # tsc --noEmit
```

## GIT WORKFLOW POLICY

- Create a feature branch for every change; do not develop directly on `main`.
- Push the feature branch and open a PR targeting `main`.
- PR description must include what changed, why, files/modules touched, and verification evidence.
- Merge to `main` only through PR review flow (except urgent hotfixes).

## NOTES

- **No tests** — codebase is architecturally testable (pure functions accept `now: Date`, stub fallback for AI) but no test framework installed
- **No CI/CD** — manual build/deploy only
- **S01-S04 complete**, S05 (status/alerts/cooking suggestions) in progress
- **M002 planned** — public web deployment (future milestone)
- **Env vars**: `GOOGLE_AI_API_KEY` recommended (free via Google AI Studio at aistudio.google.com/apikey); `OPENAI_API_KEY` optional (paid, advanced); `QR_BASE_URL` optional override for generated QR destination origin. All configured via Settings UI — env vars are for reference only.
- **AI provider default**: Google AI Studio (free). OpenAI/Anthropic available under "Advanced Providers" in settings.
- **Project decisions**: `.gsd/DECISIONS.md` is the source of truth (22 decisions, append-only)
