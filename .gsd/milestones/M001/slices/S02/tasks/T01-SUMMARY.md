---
id: T01
parent: S02
milestone: M001
provides:
  - intake_drafts SQLite table with FK to fridges
  - DraftItem TypeScript interface (lib/intake/types.ts)
  - extractDraftFromImage function with OpenAI stub fallback (lib/intake/extract.ts)
  - saveDraftItems persistence function (lib/intake/store.ts)
  - POST /api/intake/[fridgeId] route handler
key_files:
  - lib/db/client.ts
  - lib/intake/types.ts
  - lib/intake/extract.ts
  - lib/intake/store.ts
  - app/api/intake/[fridgeId]/route.ts
  - package.json
key_decisions:
  - openai npm package used for gpt-4o-mini vision extraction
  - Stub returns hardcoded Milk/Greek Yogurt/Butter items when OPENAI_API_KEY is absent
  - formData parse errors caught explicitly and returned as 400 (Next.js throws on malformed multipart)
patterns_established:
  - lib/intake/ module structure mirrors lib/fridges/ — types.ts / store.ts / extract.ts
  - DB migrations added inline to getDb() in lib/db/client.ts using exec() blocks
observability_surfaces:
  - console.log("[intake] Using stub extraction (no OPENAI_API_KEY)") or "[intake] Calling OpenAI gpt-4o-mini for extraction" on every POST
  - console.error("[intake] OpenAI response missing items array: ...") on parse failure
  - sqlite3 data/fridges.db "SELECT * FROM intake_drafts;" — ground truth for all drafts
  - JSON error responses on all failure paths with descriptive messages
duration: ~30m
verification_result: passed
completed_at: 2026-03-21
blocker_discovered: false
---

# T01: Build extraction pipeline, route handler, and intake data layer

**Added intake_drafts DB table, DraftItem type, AI extraction with deterministic stub, saveDraftItems store, and POST /api/intake/[fridgeId] route — all verified via curl with correct status codes and JSON payloads.**

## What Happened

Implemented the complete photo-intake backend in 5 steps:

1. Installed `openai` npm package (1 added package, 0 vulnerabilities).
2. Added `intake_drafts` CREATE TABLE migration to `lib/db/client.ts` after the existing `fridges` migration — idempotent, runs on every cold start via `getDb()`.
3. Created `lib/intake/types.ts` with the `DraftItem` interface shared by extraction, API, review UI, and DB layer.
4. Created `lib/intake/extract.ts` — checks `OPENAI_API_KEY`, logs its path, returns 3 stub items (Milk, Greek Yogurt, Butter) when key is absent; calls `gpt-4o-mini` with `response_format: { type: "json_object" }` and a structured image prompt when present.
5. Created `lib/intake/store.ts` — `saveDraftItems` validates fridge existence, runs all INSERTs in a single better-sqlite3 transaction.
6. Created `app/api/intake/[fridgeId]/route.ts` — awaits `params`, validates fridge (404), validates photo file (400), base64-encodes the buffer, calls `extractDraftFromImage`, returns `{ items }`.

One minor deviation from the plan: `request.formData()` throws when the request body is empty/malformed, so the missing-photo case is caught via a try/catch around formData parsing rather than just checking the file field. This still returns 400 with a JSON error, which satisfies the spec.

## Verification

TypeScript — `npx tsc --noEmit` exits 0. No type errors.

Schema — `sqlite3 data/fridges.db ".schema intake_drafts"` shows the full CREATE TABLE definition with all columns and FK.

API curl tests:
- Valid fridge + photo → 200 `{"items":[...3 stub items...]}` (items count = 3)
- Invalid fridge + photo → 404 `{"error":"Storage not found"}`
- Valid fridge + no photo → 400 `{"error":"Invalid form data"}`

All slice-level verification checks that apply to T01 passed.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | ~5s |
| 2 | `sqlite3 data/fridges.db ".schema intake_drafts"` | 0 | ✅ pass | <1s |
| 3 | `curl -s POST /api/intake/<id> -F photo=@file \| python3 assert len(items)>0` | 0 | ✅ pass | ~200ms |
| 4 | `curl -s POST /api/intake/nonexistent -F photo=@file \| python3 assert 'error' in d` | 0 | ✅ pass | ~100ms |
| 5 | `curl -s POST /api/intake/<id> (no photo) \| python3 assert 'error' in d` | 0 | ✅ pass | ~100ms |
| 6 | HTTP status 200/404/400 verified via curl `-w %{http_code}` | 0 | ✅ pass | <1s |

## Diagnostics

**Runtime signals:**
- Every POST to `/api/intake/[fridgeId]` logs one of:
  - `[intake] Using stub extraction (no OPENAI_API_KEY)` — stub path
  - `[intake] Calling OpenAI gpt-4o-mini for extraction` — live API path
  - `[intake] OpenAI response missing items array: <raw>` — parse failure
  - `[intake] Extraction failed: <error>` — network/API error

**Inspection commands:**
```bash
# All draft items
sqlite3 data/fridges.db "SELECT * FROM intake_drafts;"

# Draft items for a specific fridge
sqlite3 data/fridges.db "SELECT * FROM intake_drafts WHERE fridge_id = '<id>';"

# Test extraction endpoint directly
curl -s -X POST http://localhost:3000/api/intake/<fridgeId> -F "photo=@<any-file>" | jq .
```

**Error shapes:**
- `{ "error": "Storage not found" }` — status 404
- `{ "error": "No photo provided" }` — status 400 (file field missing but form parsed OK)
- `{ "error": "Invalid form data" }` — status 400 (empty/malformed multipart body)

## Deviations

- **Missing photo → 400 error message**: Plan said to check `!file || !(file instanceof File)` for "No photo provided". In practice, Next.js throws when `request.formData()` is called on a request with no body / Content-Type mismatch. Added a try/catch around `formData()` that returns `{ error: "Invalid form data" }` with 400. The `!(file instanceof File)` check is still present after a successful parse. Behavior is functionally equivalent — all missing-photo cases return 400 JSON error.

## Known Issues

None.

## Files Created/Modified

- `lib/db/client.ts` — added `intake_drafts` CREATE TABLE migration after existing `fridges` migration
- `lib/intake/types.ts` — new file: `DraftItem` interface
- `lib/intake/extract.ts` — new file: `extractDraftFromImage` with OpenAI + stub fallback
- `lib/intake/store.ts` — new file: `saveDraftItems` synchronous persistence function
- `app/api/intake/[fridgeId]/route.ts` — new file: POST route handler
- `package.json` — added `openai` dependency (auto-updated by npm install)
