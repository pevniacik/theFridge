---
id: S02
parent: M001
milestone: M001
provides:
  - POST /api/intake/[fridgeId] route handler (photo upload → AI extraction → draft JSON)
  - intake_drafts SQLite table with FK to fridges (id, fridge_id, name, quantity, unit, confidence, status, created_at)
  - DraftItem TypeScript interface shared across API, review UI, and DB layer
  - extractDraftFromImage function with OpenAI gpt-4o-mini vision call + deterministic stub fallback
  - saveDraftItems synchronous persistence function (better-sqlite3 transaction)
  - IntakeSection React client component with 6-phase state machine (idle/uploading/review/confirming/done/error)
  - confirmDraftAction Server Action persisting validated DraftItems to intake_drafts
  - Fridge context page wired with IntakeSection (inventory placeholder removed)
requires:
  - slice: S01
    provides: getFridgeById store function, getDb() singleton, fridge context page at app/fridges/[fridgeId]/page.tsx
affects:
  - S03
  - S06
key_files:
  - lib/db/client.ts
  - lib/intake/types.ts
  - lib/intake/extract.ts
  - lib/intake/store.ts
  - app/api/intake/[fridgeId]/route.ts
  - app/fridges/[fridgeId]/IntakeSection.tsx
  - app/fridges/[fridgeId]/actions.ts
  - app/fridges/[fridgeId]/page.tsx
  - package.json
key_decisions:
  - openai npm package used for gpt-4o-mini vision extraction; stub returns hardcoded Milk/Greek Yogurt/Butter when OPENAI_API_KEY is absent
  - Server Action called imperatively from handleConfirm (not via form/useActionState) — confirm payload is programmatic JSON, not FormData
  - nanoid(10) IDs assigned client-side to draft rows after API response; same IDs flow into DB — avoids round-trip ID assignment
  - CSS keyframe animation injected via inline <style> tag inside the uploading phase — avoids separate CSS file for a single spinner
  - Inline style={{}} with var(--color-*) custom properties throughout IntakeSection — matches S01 component pattern, no Tailwind utility classes
  - request.formData() wrapped in try/catch — Next.js throws on empty/malformed multipart body, so catch is the only reliable 400 path for missing-photo case
patterns_established:
  - lib/intake/ module mirrors lib/fridges/ — types.ts / store.ts / extract.ts separation
  - DB migrations added inline to getDb() in lib/db/client.ts using idempotent CREATE TABLE IF NOT EXISTS blocks
  - Phase enum pattern for multi-step client flows: type Phase = "idle"|"uploading"|"review"|"confirming"|"done"|"error"
  - Server Actions imported directly into "use client" components and called imperatively — works in Next.js 15/React 19 without special setup
  - Return { success, count } or { success: false, error } from Server Actions — never throw across RSC boundary
observability_surfaces:
  - console.log("[intake] Using stub extraction (no OPENAI_API_KEY)") or "[intake] Calling OpenAI gpt-4o-mini for extraction" on every POST
  - console.log("[intake] Confirmed N draft items for fridge <id>") on successful confirmDraftAction
  - console.log("[intake] confirmDraftAction failed for fridge <id>: <message>") on failure
  - console.error("[intake] OpenAI response missing items array: ...") on parse failure
  - sqlite3 data/fridges.db "SELECT * FROM intake_drafts;" — ground truth for all drafts
  - JSON error responses on all API failure paths with descriptive messages
drill_down_paths:
  - .gsd/milestones/M001/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S02/tasks/T02-SUMMARY.md
duration: ~75m (T01: ~30m, T02: ~45m)
verification_result: passed
completed_at: 2026-03-21
---

# S02: Photo intake with review-first draft

**Photo-to-confirmed-draft pipeline ships end-to-end: upload a grocery photo, see 3 AI-extracted draft rows with editable fields and a low-confidence badge, delete a row, confirm — DB shows pending rows, done phase shows "✓ N items saved".**

## What Happened

S02 built the complete photo intake backend and review UI in two tasks:

**T01** delivered the data and API layer. The `openai` package was installed, the `intake_drafts` table was added as a migration in `getDb()` (FK to `fridges(id)`, status check constraint), and three new modules were created in `lib/intake/`: `types.ts` with the shared `DraftItem` interface, `extract.ts` with `extractDraftFromImage` (logs its code path, returns stub items when `OPENAI_API_KEY` is absent), and `store.ts` with `saveDraftItems` (synchronous better-sqlite3 transaction, validates fridge exists before insert). The POST route handler at `app/api/intake/[fridgeId]/route.ts` reads FormData, base64-encodes the image buffer, calls extract, and returns `{ items }`. A notable implementation detail: `request.formData()` was wrapped in try/catch because Next.js throws — not returns null — when the body is empty or malformed multipart, making the catch block the only reliable 400 path for the missing-photo case.

**T02** delivered the review UI and wired it into the fridge context page. `actions.ts` exports `confirmDraftAction(fridgeId, items)`, a server action that validates items, calls `saveDraftItems`, and returns `{ success, count }` — never throwing across the RSC boundary. `IntakeSection.tsx` is a client component with a 6-phase state machine: idle shows an "Upload photo" button backed by a hidden file input triggered via ref; uploading fetches `/api/intake/[fridgeId]` with FormData and assigns `nanoid(10)` IDs to returned items; review renders an editable grid (name/qty/unit inputs, amber "?" badge for confidence < "high", × delete button, live item count in the section header); confirming calls `confirmDraftAction` imperatively; done shows "✓ N items saved" with "Upload more" to reset; error shows a red alert card with the error message and "Try again". The inventory placeholder div in `page.tsx` was replaced with `<IntakeSection fridgeId={fridge.id} />`.

## Verification

All slice-level verification checks passed:

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` exits 0 | ✅ pass |
| `sqlite3 ... ".schema intake_drafts"` shows correct schema | ✅ pass |
| `curl POST /api/intake/<id> -F photo=@file` → 200 `{items: [...3 items...]}` | ✅ pass |
| `curl POST /api/intake/bad-id -F photo=@file` → 404 `{error: "Storage not found"}` | ✅ pass |
| `curl POST /api/intake/<id>` (no body) → 400 `{error: "Invalid form data"}` | ✅ pass |
| Browser: upload → review draft with 3 rows → amber badge on Butter → edit name → delete row → confirm → "✓ 3 items saved" | ✅ pass |
| `sqlite3 ... COUNT(*) FROM intake_drafts WHERE fridge_id='2O1snSYsoa' AND status='pending'` returns > 0 | ✅ pass |
| Observability: `[intake] Using stub extraction...` and `[intake] Confirmed N draft items for fridge <id>` visible in server log | ✅ pass |

## New Requirements Surfaced

- none

## Deviations

**Missing-photo error path**: Plan specified checking `!file || !(file instanceof File)` to return 400 "No photo provided". In practice, Next.js throws a TypeError when `request.formData()` is called on an empty or non-multipart body — the file check never runs. The implementation wraps `formData()` in try/catch and returns 400 `{ error: "Invalid form data" }` from the catch block. The `instanceof File` check is still present after a successful parse. Functionally equivalent — all missing-photo cases return 400 JSON — and the behavior is now documented in KNOWLEDGE.md.

## Known Limitations

- The stub extraction always returns exactly 3 hardcoded items (Milk 1 litre, Greek Yogurt 2 pots, Butter) regardless of photo content — this is correct behavior for the stub path and intentional until a real OpenAI key is configured.
- Confirmed intake items land in `intake_drafts` with `status = 'pending'` but are not yet promoted to a live inventory model — that promotion is S03's job.
- No deduplication or merge logic exists for repeat uploads to the same fridge — each intake creates fresh rows regardless of existing drafts.
- The "Upload more" reset after confirm does not clear existing `intake_drafts` rows — the DB accumulates all confirmed sessions, which is the intended behavior for S03 to consume.

## Follow-ups

- S03 should query `intake_drafts WHERE status = 'pending'` as its input feed and flip status to `'confirmed'` after promoting rows to inventory.
- The `status` field has a check constraint allowing `'pending' | 'confirmed' | 'rejected'` — S03 should use `'confirmed'` after promotion and `'rejected'` if a draft is explicitly discarded.
- The `confidence` field is stored as TEXT (`'high'` / `'low'`) — S03 should preserve it in the inventory model for surfacing uncertain items to users.
- `test-photo.jpg` (a minimal JPEG created for verification curl tests) can be deleted from the project root — it is not needed in production.

## Files Created/Modified

- `lib/db/client.ts` — added `intake_drafts` CREATE TABLE migration after existing `fridges` migration
- `lib/intake/types.ts` — new: `DraftItem` interface (`id, name, quantity, unit, confidence`)
- `lib/intake/extract.ts` — new: `extractDraftFromImage` with OpenAI gpt-4o-mini vision + deterministic stub fallback
- `lib/intake/store.ts` — new: `saveDraftItems` synchronous persistence function with fridge existence validation
- `app/api/intake/[fridgeId]/route.ts` — new: POST route handler (FormData → base64 → extract → JSON response)
- `app/fridges/[fridgeId]/IntakeSection.tsx` — new: client component with 6-phase intake state machine
- `app/fridges/[fridgeId]/actions.ts` — new: `confirmDraftAction` Server Action
- `app/fridges/[fridgeId]/page.tsx` — modified: added IntakeSection import, replaced inventory placeholder div
- `package.json` — added `openai` dependency

## Forward Intelligence

### What the next slice should know

- **`intake_drafts` is the input contract for S03.** Rows arrive with `status = 'pending'`. S03 should read from this table, promote rows to inventory, and update status to `'confirmed'`. The `confidence` column is available and should inform how S03 surfaces uncertain items.
- **The `DraftItem` interface in `lib/intake/types.ts` is the shared type.** S03's inventory model should either extend it or map from it — don't redefine the same fields.
- **`saveDraftItems` is a synchronous better-sqlite3 transaction.** Any S03 promotion logic that touches `intake_drafts` can use the same `getDb()` singleton and run atomically in one transaction.
- **The Server Action pattern in `actions.ts` works well for Next.js 15/React 19.** Import the action directly into the client component, call it imperatively (not via form submission), return structured `{ success, count }` or `{ success: false, error }` — never throw across the boundary. Apply this pattern for S03 inventory confirmation actions.

### What's fragile

- **Stub extraction is hardcoded to 3 items** — any test that asserts on item content (not just count) will be tightly coupled to "Milk, Greek Yogurt, Butter". S03 and later integration tests should use count-based assertions or parameterize the expected items.
- **No request size limit on the upload route** — very large photos could cause memory pressure in the base64-encode step. Fine for single-household local use; worth noting if the app ever goes multi-user.
- **`intake_drafts` has no index on `fridge_id`** — scans are negligible at household scale but S03 should be aware of this if it does frequent per-fridge queries.

### Authoritative diagnostics

- **Server log `[intake] ...` lines** — the most reliable signal for which extraction path was taken and whether confirmation succeeded. Check these first when debugging intake issues.
- **`sqlite3 data/fridges.db "SELECT * FROM intake_drafts;"`** — ground truth for all draft state; check this after any confirm operation to verify persistence.
- **`curl -s -X POST http://localhost:3000/api/intake/<fridgeId> -F "photo=@<any-file>" | jq .`** — tests the full backend stack without touching the browser; useful for isolating API vs. UI issues.

### What assumptions changed

- **Missing-photo detection assumed a file-check was sufficient** — the actual implementation required a try/catch around `request.formData()` because Next.js throws before the check can run. This is now documented in KNOWLEDGE.md.
- **The stub fallback was assumed to log silently** — it logs `[intake] Using stub extraction (no OPENAI_API_KEY)` on every POST, which is intentional for operator visibility and confirmed working.
