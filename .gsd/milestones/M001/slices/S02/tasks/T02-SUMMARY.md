---
id: T02
parent: S02
milestone: M001
provides:
  - IntakeSection React client component with 6-phase state machine (idle/uploading/review/confirming/done/error)
  - confirmDraftAction Server Action persisting validated DraftItems to intake_drafts
  - Fridge context page wired to IntakeSection (placeholder div removed)
key_files:
  - app/fridges/[fridgeId]/IntakeSection.tsx
  - app/fridges/[fridgeId]/actions.ts
  - app/fridges/[fridgeId]/page.tsx
key_decisions:
  - Server Action called imperatively (not via form/useActionState) — confirm payload is programmatic JSON, not form data
  - Items receive nanoid(10) IDs client-side before review, so the same IDs flow into the DB — avoids a round-trip ID assignment
  - CSS keyframe (@keyframes intake-spin) injected inline via <style> tag inside the uploading phase render — avoids a separate CSS file for a single animation
patterns_established:
  - Phase enum pattern for multi-step client flows: type Phase = "idle"|"uploading"|"review"|"confirming"|"done"|"error" with one branch per phase
  - Inline style={{}} with var(--color-*) CSS custom property tokens matches S01 component pattern (no Tailwind utility classes)
  - Server Actions imported directly into "use client" components — works with Next.js 15/React 19 without any special setup
observability_surfaces:
  - confirmDraftAction logs "[intake] Confirmed N draft items for fridge <id>" on success
  - confirmDraftAction logs "[intake] confirmDraftAction failed for fridge <id>: <message>" on failure
  - sqlite3 data/fridges.db "SELECT id, fridge_id, name, status FROM intake_drafts;" — ground truth for all confirmed drafts
  - Done phase UI renders "✓ N items saved" (visible in browser)
  - Error phase UI renders the error message from confirmDraftAction or the fetch failure
duration: ~45m
verification_result: passed
completed_at: 2026-03-21
blocker_discovered: false
---

# T02: Build review UI and wire intake flow into fridge context page

**Added IntakeSection client component with full photo→extract→review→confirm flow, confirmDraftAction Server Action writing to intake_drafts, and replaced the inventory placeholder in the fridge context page — all verified via browser flow and DB inspection.**

## What Happened

Implemented three files in sequence:

1. **`app/fridges/[fridgeId]/actions.ts`** — Server Action `confirmDraftAction(fridgeId, items)`:
   - `"use server"` directive, calls `saveDraftItems` in a try/catch
   - Validates `items.length > 0` and filters items with empty names
   - Returns `{ success, count }` or `{ success: false, error }` — never throws across the RSC boundary
   - Logs confirmation outcome to stdout for operator visibility

2. **`app/fridges/[fridgeId]/IntakeSection.tsx`** — Client component with full state machine:
   - Phase enum: `"idle" | "uploading" | "review" | "confirming" | "done" | "error"`
   - Idle: file picker card with hidden `<input type="file">` triggered by visible button via ref
   - Upload: fetches `/api/intake/[fridgeId]` with FormData, parses JSON, assigns `nanoid(10)` IDs to each item
   - Review: grid of editable rows (name/quantity/unit inputs + amber "?" badge for low-confidence + × delete button)
   - Confirm: calls `confirmDraftAction` imperatively, transitions to done or error
   - Done: shows "✓ N items saved", "Upload more" resets to idle
   - Error: red alert card with error message and "Try again" reset button
   - All styling uses `var(--color-*)` CSS custom properties + inline `style={{}}` — matches S01 pattern

3. **`app/fridges/[fridgeId]/page.tsx`** — Added `import IntakeSection from "./IntakeSection"` and replaced the entire dashed-border inventory placeholder `<div>` with `<IntakeSection fridgeId={fridge.id} />`.

Browser testing confirmed the complete flow: upload photo → stub returns 3 items → Butter shows amber "?" badge (low confidence) → delete a row → count updates in header → click confirm → done phase shows "✓ 1 item saved" → DB shows 1 row with status "pending".

## Verification

- `npx tsc --noEmit` exits 0, no type errors.
- `sqlite3 data/fridges.db ".schema intake_drafts"` — table exists with correct columns and FK.
- `curl -s POST /api/intake/<id> -F photo=@test-photo.jpg | python3 assert len(items)>0` — stub returns 3 items.
- `curl -s POST /api/intake/bad-id -F photo=@file | python3 assert 'error' in d` — 404 Storage not found.
- `curl -s POST /api/intake/<id> (no body) | python3 assert 'error' in d` — 400 Invalid form data.
- Browser full flow: upload → review draft with 3 rows → amber badge on Butter → delete row → count updated → confirm → success message.
- `sqlite3 data/fridges.db "SELECT COUNT(*) FROM intake_drafts WHERE fridge_id = '2O1snSYsoa' AND status = 'pending';"` returns `1`.
- Page source confirms "Items will appear here" text is completely absent from `page.tsx`.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | ~23s |
| 2 | `sqlite3 data/fridges.db ".schema intake_drafts"` | 0 | ✅ pass | <1s |
| 3 | `curl POST /api/intake/<id> -F photo=@test-photo.jpg \| python3 assert items>0` | 0 | ✅ pass | ~150ms |
| 4 | `curl POST /api/intake/bad-id -F photo=@file \| python3 assert 'error' in d` | 0 | ✅ pass | ~100ms |
| 5 | `curl POST /api/intake/<id> (no body) \| python3 assert 'error' in d` | 0 | ✅ pass | ~80ms |
| 6 | Browser: upload → review → low-confidence badge → delete → confirm → done | — | ✅ pass | ~15s |
| 7 | `sqlite3 ... COUNT(*) FROM intake_drafts WHERE status='pending'` returns >0 | 0 | ✅ pass | <1s |
| 8 | `grep "Items will appear here" page.tsx` exits 1 (not found) | 1 | ✅ pass | <1s |
| 9 | Browser assertions: GROCERY INTAKE visible, item saved visible | — | ✅ pass | <1s |

## Diagnostics

**Runtime signals (server console):**
- `[intake] Confirmed N draft items for fridge <id>` — successful confirmDraftAction
- `[intake] confirmDraftAction failed for fridge <id>: <message>` — failure path
- `[intake] Using stub extraction (no OPENAI_API_KEY)` — still emitted by T01 route handler

**Inspection commands:**
```bash
# All confirmed draft rows
sqlite3 data/fridges.db "SELECT id, fridge_id, name, status FROM intake_drafts;"

# Count pending rows for a specific fridge
sqlite3 data/fridges.db "SELECT COUNT(*) FROM intake_drafts WHERE fridge_id = '<id>' AND status = 'pending';"

# Test extract endpoint directly
curl -s -X POST http://localhost:3000/api/intake/<fridgeId> -F "photo=@test-photo.jpg" | jq .

# Test confirm action directly via the API (no browser needed)
# → just upload a photo, then navigate to the fridge page and use the UI
```

**Error shapes (UI):**
- Extraction error (bad fridge/no photo) → "intake error" red card with error message text
- Confirm failure → "intake error" red card with message from confirmDraftAction
- Empty result from extraction → "No items were detected in the photo. Try a different image."

## Deviations

None. Implementation followed the plan exactly. The `nanoid(10)` IDs are assigned in `handleFileChange` after the API response, matching the spec. The Server Action is called imperatively from `handleConfirm`, not via form submission.

## Known Issues

None.

## Files Created/Modified

- `app/fridges/[fridgeId]/IntakeSection.tsx` — new: client component with 6-phase intake state machine
- `app/fridges/[fridgeId]/actions.ts` — new: `confirmDraftAction` Server Action
- `app/fridges/[fridgeId]/page.tsx` — modified: added IntakeSection import, replaced inventory placeholder div with `<IntakeSection fridgeId={fridge.id} />`
- `test-photo.jpg` — minimal JPEG used for verification (can be deleted)
