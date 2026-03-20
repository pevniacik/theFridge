# S02: Photo intake with review-first draft

**Goal:** From a storage context, a user can upload a grocery photo, get a draft list of candidate items extracted by AI (or a deterministic stub when no API key is set), review and edit the draft, then confirm it into the `intake_drafts` DB table.
**Demo:** Navigate to `/fridges/[fridgeId]`, upload a photo, see editable draft rows with confidence badges, edit a name, delete a row, confirm — then `sqlite3 data/fridges.db "SELECT * FROM intake_drafts WHERE fridge_id = '<id>';"` shows the confirmed rows with status "pending".

## Must-Haves

- Photo upload via route handler at `/api/intake/[fridgeId]` (not a Server Action — avoids 1 MB body limit)
- AI extraction using OpenAI gpt-4o-mini with structured JSON output, isolated in `lib/intake/extract.ts`
- Deterministic stub fallback when `OPENAI_API_KEY` is not set (so the full flow is testable without a live key)
- `intake_drafts` table with `id, fridge_id, name, quantity, unit, confidence, status, created_at` — FK to `fridges(id)`
- `DraftItem` TypeScript interface shared between API response, review UI, and DB write
- Review UI as a client component (`IntakeSection.tsx`) with state machine: idle → uploading → review → confirming → done | error
- Each draft row is editable (name, quantity, unit) with a delete button; low-confidence items show a warning badge
- Confirm step writes to `intake_drafts` via Server Action (text-only payload, safe for Server Action size limit)
- Fridge existence validated before both extraction and confirmation (FK constraint enforced)
- Error states visible: invalid fridge ID returns 404 JSON, missing photo returns 400 JSON, extraction failure shows error in UI

## Proof Level

- This slice proves: integration (photo → AI extraction → review UI → DB persistence)
- Real runtime required: yes (dev server, SQLite, OpenAI API or stub)
- Human/UAT required: yes (review UI usability — but functional verification via curl + sqlite3 is the objective gate)

## Verification

- `sqlite3 data/fridges.db ".schema intake_drafts"` — table exists with correct columns
- `curl -s -X POST http://localhost:3000/api/intake/<fridgeId> -F "photo=@test-photo.jpg" | python3 -c "import sys,json; d=json.load(sys.stdin); assert len(d['items'])>0"` — stub extraction returns items
- `curl -s -X POST http://localhost:3000/api/intake/bad-id -F "photo=@test-photo.jpg" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'error' in d"` — invalid fridge returns error JSON
- `curl -s -X POST http://localhost:3000/api/intake/<fridgeId> | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'error' in d"` — missing photo returns error JSON
- `npx tsc --noEmit` exits 0
- Browser: navigate to `/fridges/[fridgeId]`, upload a photo, see draft rows, edit one, delete one, confirm → success message shown
- `sqlite3 data/fridges.db "SELECT COUNT(*) FROM intake_drafts WHERE fridge_id = '<id>' AND status = 'pending';"` returns > 0 after confirm

## Observability / Diagnostics

- Runtime signals: extraction function logs whether it used the real OpenAI call or stub fallback; route handler returns structured JSON errors with descriptive messages
- Inspection surfaces: `sqlite3 data/fridges.db "SELECT * FROM intake_drafts;"` — ground truth for all draft items; `/api/intake/[fridgeId]` POST — testable without browser
- Failure visibility: API returns `{ error: "..." }` on all failure paths (missing photo, invalid fridge, extraction parse failure); UI shows error state with message
- Redaction constraints: `OPENAI_API_KEY` must never appear in responses or logs; photo data stays in-memory (not persisted to disk)

## Integration Closure

- Upstream surfaces consumed: `lib/fridges/store.ts` (`getFridgeById`) for fridge validation; `lib/db/client.ts` (`getDb`) for DB access and schema migration; `app/fridges/[fridgeId]/page.tsx` as the host page for the intake UI
- New wiring introduced in this slice: `/api/intake/[fridgeId]` route handler; `IntakeSection` client component rendered inside the fridge context page; `intake_drafts` DB table
- What remains before the milestone is truly usable end-to-end: S03 (confirmed drafts → inventory), S04 (maintenance), S05 (status/suggestions), S06 (end-to-end proof)

## Tasks

- [x] **T01: Build extraction pipeline, route handler, and intake data layer** `est:45m`
  - Why: Creates the complete backend for photo intake — DB table, AI extraction with stub fallback, persistence, and HTTP endpoint. Everything the review UI needs to function.
  - Files: `lib/db/client.ts`, `lib/intake/types.ts`, `lib/intake/extract.ts`, `lib/intake/store.ts`, `app/api/intake/[fridgeId]/route.ts`, `package.json`
  - Do: Add `intake_drafts` CREATE TABLE to `lib/db/client.ts` migration block. Define `DraftItem` interface in `lib/intake/types.ts`. Implement `extractDraftFromImage` in `lib/intake/extract.ts` with OpenAI gpt-4o-mini call and deterministic stub fallback when no API key. Implement `saveDraftItems` in `lib/intake/store.ts` (synchronous, validates fridge exists). Build POST route handler that reads FormData file, base64-encodes, calls extract, returns JSON. Install `openai` npm package. Validate fridge existence before extraction (404 if missing). Return structured JSON errors for missing photo (400) and parse failures.
  - Verify: `sqlite3 data/fridges.db ".schema intake_drafts"` shows the table; `curl -s -X POST http://localhost:3000/api/intake/<fridgeId> -F "photo=@<any-jpg>" | jq '.items | length'` returns > 0; `npx tsc --noEmit` exits 0
  - Done when: Route handler returns draft items from stub extraction for a valid fridge, returns 404 JSON for invalid fridge, returns 400 JSON for missing photo, and `intake_drafts` table exists in schema

- [x] **T02: Build review UI and wire intake flow into fridge context page** `est:45m`
  - Why: Closes the slice by providing the human review-and-confirm interface that makes photo intake trustworthy. Replaces the inventory placeholder on the fridge context page with the full intake section.
  - Files: `app/fridges/[fridgeId]/IntakeSection.tsx`, `app/fridges/[fridgeId]/actions.ts`, `app/fridges/[fridgeId]/page.tsx`
  - Do: Build `IntakeSection.tsx` client component with state machine (idle → uploading → review → confirming → done | error). File picker triggers POST to `/api/intake/[fridgeId]`. Draft rows are editable (name, quantity, unit) with delete button; low-confidence rows show yellow warning badge. Confirm button calls `confirmDraftAction` Server Action. Create `actions.ts` with `confirmDraftAction` that validates items and writes to `intake_drafts` via `saveDraftItems`. Replace the dashed "inventory" placeholder div in `page.tsx` with `<IntakeSection fridgeId={fridge.id} />`. Use `var(--color-*)` CSS custom properties matching the existing dark industrial design. Assign `nanoid(10)` IDs to draft rows on the client for stable React keys.
  - Verify: Browser: navigate to `/fridges/[fridgeId]` → intake section visible (not placeholder) → upload photo → draft rows appear → edit a name → confirm → success message; `sqlite3 data/fridges.db "SELECT * FROM intake_drafts;"` shows rows; `npx tsc --noEmit` exits 0
  - Done when: Full photo → review → confirm → DB persistence flow works in the browser, placeholder is replaced, and TypeScript compiles clean

## Files Likely Touched

- `lib/db/client.ts`
- `lib/intake/types.ts`
- `lib/intake/extract.ts`
- `lib/intake/store.ts`
- `app/api/intake/[fridgeId]/route.ts`
- `app/fridges/[fridgeId]/IntakeSection.tsx`
- `app/fridges/[fridgeId]/actions.ts`
- `app/fridges/[fridgeId]/page.tsx`
- `package.json`
