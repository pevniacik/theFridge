---
estimated_steps: 5
estimated_files: 6
---

# T01: Build extraction pipeline, route handler, and intake data layer

**Slice:** S02 — Photo intake with review-first draft
**Milestone:** M001

## Description

Create the complete backend for photo intake: the `intake_drafts` DB table, the `DraftItem` shared type, the AI extraction function with deterministic stub fallback, the persistence layer, and the HTTP route handler. After this task, the full extraction pipeline is testable via curl — no browser UI needed.

**Relevant skills:** Load the `review` skill if reviewing code quality at the end. No other skills needed — this is pure backend TypeScript + SQLite work.

**Key codebase context:**
- `lib/db/client.ts` has a `getDb()` singleton with inline `CREATE TABLE IF NOT EXISTS` migrations. Add the new table migration there.
- `lib/fridges/store.ts` exports `getFridgeById(id): FridgeRecord | null` — use this to validate fridge existence.
- All store functions are **synchronous** (better-sqlite3 is sync-only). Match this pattern.
- `nanoid` is already in `package.json`. Use `nanoid(10)` for draft item IDs.
- Next.js 15 App Router route handlers: `params` is `Promise<{ fridgeId: string }>` — must `await params`.
- Tailwind v4 is in use but irrelevant for this task (backend only).
- `foreign_keys = ON` is set in the DB — the `fridge_id` FK on `intake_drafts` is enforced at runtime. Always validate fridge exists before writing.
- No `.env.local` exists. The extraction function must check `process.env.OPENAI_API_KEY` and fall back to a deterministic stub when missing.

## Steps

1. **Install `openai` npm package:** `npm install openai`. This adds the official OpenAI SDK.

2. **Add `intake_drafts` table migration to `lib/db/client.ts`:** Add a second `CREATE TABLE IF NOT EXISTS` block inside the existing `getDb()` function, after the `fridges` table migration. Schema:
   ```sql
   CREATE TABLE IF NOT EXISTS intake_drafts (
     id          TEXT PRIMARY KEY,
     fridge_id   TEXT NOT NULL REFERENCES fridges(id),
     name        TEXT NOT NULL,
     quantity    TEXT NOT NULL DEFAULT '',
     unit        TEXT NOT NULL DEFAULT '',
     confidence  TEXT NOT NULL DEFAULT 'high',
     status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'confirmed', 'rejected')),
     created_at  TEXT NOT NULL DEFAULT (datetime('now'))
   );
   ```

3. **Create `lib/intake/types.ts`:** Define the shared `DraftItem` interface used by extraction, API response, review UI, and DB writes:
   ```ts
   export interface DraftItem {
     id: string;
     name: string;
     quantity: string;
     unit: string;
     confidence: "high" | "low";
   }
   ```

4. **Create `lib/intake/extract.ts`:** Implement `extractDraftFromImage(base64: string, mimeType: string): Promise<DraftItem[]>`.
   - Check `process.env.OPENAI_API_KEY`. If missing, return a deterministic stub: 3 items (Milk, Greek Yogurt, Butter) with fixed `nanoid(10)` IDs — actually, generate IDs with nanoid since they're ephemeral.
   - If API key exists: use the `openai` package to call `chat.completions.create` with model `gpt-4o-mini`, a user message containing the extraction prompt and the base64 image as `image_url`, and `response_format: { type: "json_object" }`.
   - Prompt: "Extract all visible grocery or food items from this photo. Return JSON: `{ \"items\": [ { \"name\": string, \"quantity\": string, \"unit\": string, \"confidence\": \"high\" | \"low\" } ] }`. Use confidence=\"low\" for anything unclear, partially visible, or uncertain. For quantity and unit, use empty string if not detectable."
   - Parse the response. Validate that `parsed.items` is an array. Map each item and assign a `nanoid(10)` ID. Return `DraftItem[]`.
   - On parse failure or empty items: return `[]` (caller handles the empty case).
   - Log to console whether using real API or stub: `console.log("[intake] Using stub extraction (no OPENAI_API_KEY)")` or `console.log("[intake] Calling OpenAI gpt-4o-mini for extraction")`.

5. **Create `lib/intake/store.ts`:** Implement `saveDraftItems(fridgeId: string, items: DraftItem[]): void`.
   - Synchronous function matching the `better-sqlite3` pattern in `lib/fridges/store.ts`.
   - Use `getDb()` to get the connection.
   - Use `getFridgeById(fridgeId)` to validate fridge exists — throw an error if not found.
   - Prepare an INSERT statement and run it in a transaction for all items.
   - Each item: `INSERT INTO intake_drafts (id, fridge_id, name, quantity, unit, confidence) VALUES (?, ?, ?, ?, ?, ?)`.

6. **Create `app/api/intake/[fridgeId]/route.ts`:** Implement the POST handler.
   - `export async function POST(request: Request, { params }: { params: Promise<{ fridgeId: string }> })`.
   - `const { fridgeId } = await params;`
   - Validate fridge exists via `getFridgeById(fridgeId)`. Return `{ error: "Storage not found" }` with status 404 if null.
   - Read `const formData = await request.formData(); const file = formData.get("photo");`
   - If `!file || !(file instanceof File)`: return `{ error: "No photo provided" }` with status 400.
   - `const buffer = Buffer.from(await file.arrayBuffer()); const base64 = buffer.toString("base64");`
   - Call `extractDraftFromImage(base64, file.type)`.
   - Return `NextResponse.json({ items })` with status 200.

## Must-Haves

- [ ] `intake_drafts` table exists in SQLite schema after server boot
- [ ] `DraftItem` interface is exported from `lib/intake/types.ts`
- [ ] Extraction function returns deterministic stub items when `OPENAI_API_KEY` is absent
- [ ] Route handler validates fridge existence (404) and photo presence (400) with JSON error responses
- [ ] Route handler returns `{ items: DraftItem[] }` on success
- [ ] `saveDraftItems` is synchronous, validates fridge FK, writes all items in a transaction
- [ ] `npx tsc --noEmit` exits 0

## Verification

- Run `npx tsc --noEmit` — must exit 0
- Delete `data/fridges.db` if it exists (to trigger fresh migration), start the dev server (`npm run dev`), then: `sqlite3 data/fridges.db ".schema intake_drafts"` — table definition appears
- Get a valid fridge ID: `sqlite3 data/fridges.db "SELECT id FROM fridges LIMIT 1;"` (or create one via curl to `/api/fridges`)
- Test stub extraction: `curl -s -X POST http://localhost:3000/api/intake/<fridgeId> -F "photo=@<any-image-file>" | jq '.items | length'` — returns > 0 (stub returns 3 items)
- Test invalid fridge: `curl -s -X POST http://localhost:3000/api/intake/nonexistent -F "photo=@<any-image-file>" | jq '.error'` — returns "Storage not found"
- Test missing photo: `curl -s -X POST http://localhost:3000/api/intake/<fridgeId> | jq '.error'` — returns error message about missing photo
- To get a test image file for curl: create a 1x1 JPEG: `convert -size 1x1 xc:red /tmp/test-photo.jpg` or `printf '\xff\xd8\xff\xe0' > /tmp/test-photo.jpg` (the stub doesn't read the image content)

## Inputs

- `lib/db/client.ts` — existing DB singleton where the new table migration is added
- `lib/fridges/store.ts` — `getFridgeById` used for fridge validation in route handler and store
- `package.json` — add `openai` dependency

## Expected Output

- `lib/db/client.ts` — modified with `intake_drafts` CREATE TABLE migration
- `lib/intake/types.ts` — new file with `DraftItem` interface
- `lib/intake/extract.ts` — new file with extraction function and stub fallback
- `lib/intake/store.ts` — new file with `saveDraftItems` function
- `app/api/intake/[fridgeId]/route.ts` — new route handler
- `package.json` — updated with `openai` dependency
