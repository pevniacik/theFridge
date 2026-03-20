# S02: Photo intake with review-first draft — Research

**Date:** 2026-03-20
**Status:** Ready for planning

## Summary

S02 takes a working storage-context page (built in S01) and adds the full grocery-photo-to-draft pipeline: upload a photo, send it to a vision AI, get back a structured draft list, show it for review and correction, then save confirmed items to an `intake_drafts` table. Nothing is committed to inventory yet — that's S03's job.

The risk this slice retires is R003/R004/R014: if photo-derived drafts are weak, invisible, or silently saved without review, downstream inventory trust collapses. The design must make uncertainty explicit and correction easy.

The implementation is straightforward given the S01 codebase: file upload via Next.js Server Actions works out of the box (no multipart middleware needed), the AI layer is one POST to OpenAI's chat completions API with a base64-encoded image, and the review UI is a client component with editable draft rows. The only new infrastructure needed is an `intake_drafts` DB table and the `openai` npm package.

## Recommendation

Use **OpenAI gpt-4o-mini** with structured JSON output for the extraction step. gpt-4o-mini accepts both text and image inputs, produces Structured Outputs, is significantly cheaper than gpt-4o, and is fast enough for interactive use. Use a route handler (`/api/intake/[fridgeId]`) for the upload+extract step (easier to handle `request.formData()` on a File than inside a Server Action), then a Server Action for the confirm-draft step.

The review UI lives inside the existing `/fridges/[fridgeId]` page as a new section replacing the current placeholder. The flow:

1. User picks a photo in the intake section (client component with `<input type="file">`)
2. Client POSTs FormData to `/api/intake/[fridgeId]`
3. Route handler reads the File, base64-encodes it, calls OpenAI, returns a `DraftItem[]` JSON payload
4. Client renders the draft list as an editable form (name, quantity, unit — each row editable)
5. User edits/deletes rows, then confirms
6. Confirm fires a Server Action that validates and writes draft items to `intake_drafts` table (status = "pending")
7. Success: page shows confirmed item count and a link into S03's confirmation flow

If `OPENAI_API_KEY` is not set, the route handler must return a deterministic stub draft (a fixed grocery list) so development and E2E testing work without a live key.

## Implementation Landscape

### Key Files

- `app/fridges/[fridgeId]/page.tsx` — **replace the inventory placeholder** with the photo intake section; the placeholder `div` is already there at the bottom of the "Found" branch; S02 removes it and renders the intake UI
- `app/fridges/[fridgeId]/IntakeSection.tsx` *(new)* — client component owning the file picker, draft display, editable rows, and confirm button
- `app/api/intake/[fridgeId]/route.ts` *(new)* — `POST` handler: reads file from `FormData`, base64-encodes, calls OpenAI, returns `DraftItem[]` JSON; falls back to stub when no API key
- `app/fridges/[fridgeId]/actions.ts` *(new)* — `confirmDraftAction(fridgeId, items)` Server Action writing to `intake_drafts`; signature must use `(_prevState, formData)` per existing pattern if called via `useActionState`, or can be a plain `async` function called imperatively from the client component
- `lib/intake/extract.ts` *(new)* — `extractDraftFromImage(base64: string, mimeType: string): Promise<DraftItem[]>` — wraps the OpenAI call and JSON parsing; isolated for easy testing and replacement
- `lib/intake/store.ts` *(new)* — `saveDraftItems(fridgeId, items)` synchronous DB writes; schema migration for `intake_drafts` table lives in `lib/db/client.ts`
- `lib/db/client.ts` — **add** `intake_drafts` table to the inline migration block (idempotent `CREATE TABLE IF NOT EXISTS`); no other changes

### Draft Item Schema

```ts
// Shared between API response, review UI, and DB write
export interface DraftItem {
  id: string;           // nanoid(10) — assigned client-side before review so rows have stable keys
  name: string;         // e.g. "Milk", "Greek Yogurt"
  quantity: string;     // free-text, e.g. "2", "1 litre" — optional, "" if not detected
  unit: string;         // free-text, e.g. "cartons", "" if not detected
  confidence: "high" | "low";  // model-assigned; low = show warning badge
}
```

### `intake_drafts` Table

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

S03 will query `intake_drafts WHERE status = 'pending'` to populate the inventory confirmation flow.

### OpenAI Extraction Approach

Route handler:
1. `const file = formData.get("photo") as File` — Next.js App Router handles multipart natively
2. `const buffer = Buffer.from(await file.arrayBuffer())`
3. `const base64 = buffer.toString("base64")` + use `file.type` for `image_url` data URL
4. Call `lib/intake/extract.ts` which builds the chat completions payload:

```ts
{
  model: "gpt-4o-mini",
  messages: [{
    role: "user",
    content: [
      { type: "text", text: EXTRACTION_PROMPT },
      { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } }
    ]
  }],
  response_format: { type: "json_object" }
}
```

Prompt instructs: "Extract all visible grocery or food items from this photo. Return JSON: `{ items: [ { name, quantity, unit, confidence } ] }`. Use confidence=low for anything unclear, partially visible, or uncertain."

5. Parse `response.choices[0].message.content` as JSON, validate shape, return `DraftItem[]`
6. On parse failure: return `{ items: [], error: "Could not parse model response" }`

Stub fallback (no API key):
```ts
return [
  { id: nanoid(10), name: "Milk", quantity: "2", unit: "litres", confidence: "high" },
  { id: nanoid(10), name: "Greek Yogurt", quantity: "3", unit: "pots", confidence: "high" },
  { id: nanoid(10), name: "Butter", quantity: "1", unit: "", confidence: "low" },
];
```

### Review UI (IntakeSection.tsx)

State machine: `idle → uploading → review → confirming → done | error`

- `idle`: shows a "Upload a grocery photo" button + file input
- `uploading`: shows spinner, disabled button
- `review`: shows editable table of draft rows. Each row: name input, quantity input, unit input, confidence badge (yellow "?" for low), delete button. "Confirm N items →" button at bottom, disabled if 0 rows
- `confirming`: shows spinner
- `done`: shows "X items saved — ready for inventory" with a faint link to future S03 flow
- `error`: shows the error message with a "Try again" reset button

The state lives entirely in `useState`/`useReducer` in `IntakeSection.tsx` — no global state. The confirm step calls the Server Action.

### Build Order

1. **DB migration first** — add `intake_drafts` table to `lib/db/client.ts`. Cheap, unblocks everything downstream. Verify: `sqlite3 data/fridges.db ".schema intake_drafts"`.

2. **`lib/intake/extract.ts`** — the extraction logic in isolation, including stub fallback. This is the highest-risk piece (external API). Building and testing it standalone means the route handler is trivial.

3. **`/api/intake/[fridgeId]` route handler** — thin wrapper: read file → call extract → return JSON. Verify with `curl -X POST .../api/intake/<fridgeId> -F "photo=@test.jpg"` (or use stub without key).

4. **`lib/intake/store.ts` + `confirmDraftAction`** — write confirmed items to DB. Verify: call action with mock data, then `sqlite3 data/fridges.db "SELECT * FROM intake_drafts;"`.

5. **`IntakeSection.tsx` + wire into page** — the review UI. Replace the placeholder `div` in `app/fridges/[fridgeId]/page.tsx`. Verify end-to-end in browser.

### Verification Approach

```bash
# 1. Schema check
sqlite3 data/fridges.db ".schema intake_drafts"

# 2. Stub extraction (no API key)
curl -s -X POST http://localhost:3000/api/intake/2O1snSYsoa \
  -F "photo=@/path/to/any.jpg" | jq '.items | length'
# expect > 0

# 3. TypeScript clean
npx tsc --noEmit

# 4. Browser: navigate to /fridges/2O1snSYsoa
# - intake section visible (not the placeholder)
# - file picker present
# - upload a photo → draft list appears
# - edit a row name → confirm → success state shown
# - sqlite3: SELECT * FROM intake_drafts; — rows exist with fridge_id

# 5. Error path
curl -s -X POST http://localhost:3000/api/intake/2O1snSYsoa \
  (no file) → expect JSON error response, not 500

# 6. Invalid fridge ID
curl -s -X POST http://localhost:3000/api/intake/bad-id \
  -F "photo=@/path/to/any.jpg"
# expect JSON { error: "Storage not found" }, 404
```

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Vision + structured JSON extraction | `openai` npm package with `response_format: { type: "json_object" }` | Already the obvious choice; avoids raw fetch + JSON parsing boilerplate; same SDK used if S05 adds suggestion calls |
| File upload parsing | Next.js App Router native `request.formData()` | Works out of the box in route handlers, no multer/busboy needed |
| Short stable row IDs in the review UI | `nanoid(10)` — already in `package.json` | Consistent with S01 ID strategy |

## Constraints

- **Server Action body size limit:** Next.js defaults to 1 MB for Server Actions. For photo upload, use the **route handler** path (`/api/intake/[fridgeId]`), not a Server Action — route handlers don't have this restriction. The confirm step (sending text-only draft items) can use a Server Action safely.
- **better-sqlite3 is synchronous** — `lib/intake/store.ts` functions must be synchronous, matching the pattern in `lib/fridges/store.ts`.
- **`foreign_keys = ON` is set** — the `intake_drafts.fridge_id` FK will be enforced. Attempting to save drafts for a non-existent `fridge_id` will throw. Always validate the fridge exists via `getFridgeById` before writing drafts.
- **Tailwind v4** — no `tailwind.config.ts`; all design tokens are already in `app/globals.css`'s `@theme {}` block. Use `var(--color-*)` inline styles (matching S01 patterns) rather than Tailwind utility classes in new components, for consistency.
- **OpenAI API key is external** — no key exists in `.env.local`. The extraction layer must handle the missing-key case gracefully with the stub fallback so the rest of the slice is testable without a live key.

## Common Pitfalls

- **Parsing gpt-4o-mini JSON responses** — `response_format: { type: "json_object" }` guarantees valid JSON but not the expected shape. Always validate that `parsed.items` is an array before mapping. Return `[]` with a low-confidence flag on shape mismatch rather than throwing.
- **File object in Server Actions** — do not try to call the OpenAI upload inside a Server Action that receives a `File` from FormData. It works technically, but the 1 MB body size limit will truncate grocery photos. Use the route handler for the upload+extract step.
- **useActionState signature for confirmDraftAction** — if wired via `useActionState`, the confirm action must follow `(_prevState: S, formData: FormData) => Promise<S>` per the established codebase pattern (see KNOWLEDGE.md). If called imperatively (non-form approach), this constraint doesn't apply — either approach is fine but choose one pattern consistently.
- **`data:image/jpeg;base64,...` vs `data:image/png;base64,...`** — use `file.type` from the uploaded File object to build the correct data URL prefix. Don't hardcode `jpeg`.
- **Draft items must have IDs before review** — assign `nanoid(10)` IDs on the client (in the review state) so each row has a stable React key and the delete-row operation works without index-based mutation.

## Open Risks

- **Model extraction quality on real grocery photos** — gpt-4o-mini may miss items at the bottom of a bag, misread handwritten labels, or return inconsistently cased names ("greek yogurt" vs "Greek Yogurt"). The review step mitigates this — users can correct names before confirming. The stub fallback means S02 can be verified without a key, but real-world quality is only provable with actual grocery photos.
- **No API key in the environment** — the stub ensures the flow is completable, but S06's end-to-end proof requires a live key. This is a deployment-time concern, not a code concern.
- **Image size / token cost** — a typical smartphone grocery photo can be 3–8 MB. The route handler will base64-encode the full image and send it to OpenAI. For v1 local use, this is acceptable. If images are very large, `gpt-4o-mini` with `detail: "low"` in the image_url object reduces token cost at some accuracy trade-off.
