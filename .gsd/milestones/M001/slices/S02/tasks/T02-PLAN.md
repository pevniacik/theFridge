---
estimated_steps: 4
estimated_files: 3
---

# T02: Build review UI and wire intake flow into fridge context page

**Slice:** S02 — Photo intake with review-first draft
**Milestone:** M001

## Description

Build the `IntakeSection` client component with the full review-first state machine, create the confirm Server Action, and wire everything into the fridge context page by replacing the inventory placeholder. After this task, a user can upload a photo, see and edit draft items, confirm them, and verified rows appear in the DB.

**Relevant skills:** Load the `frontend-design` skill for UI component quality and the `make-interfaces-feel-better` skill for polish. The component uses the existing dark industrial aesthetic with `var(--color-*)` CSS custom properties.

**Key codebase context:**
- The fridge context page is at `app/fridges/[fridgeId]/page.tsx`. It's an async Server Component. Near the bottom of the "Found" branch there's a dashed-border `<div>` with text "Items will appear here once the data layer is connected." — **replace this entire div** with `<IntakeSection fridgeId={fridge.id} />`.
- T01 created the route handler at `/api/intake/[fridgeId]` that accepts FormData with a "photo" field and returns `{ items: DraftItem[] }`. The `DraftItem` interface is in `lib/intake/types.ts`.
- T01 created `lib/intake/store.ts` with `saveDraftItems(fridgeId, items)` — synchronous, writes to `intake_drafts` table.
- The existing design uses `var(--color-surface)`, `var(--color-panel)`, `var(--color-border)`, `var(--color-muted)`, `var(--color-text)`, `var(--color-accent)`, `var(--color-cold)`, `var(--color-cold-dim)`, `var(--font-display)`, `var(--radius-card)`. Use inline `style={{}}` with these tokens (not Tailwind utility classes) — this matches the pattern in S01.
- `nanoid` is in `package.json`. Use `nanoid(10)` to assign IDs to draft items on the client before review (needed for stable React keys and for the DB write).
- For the confirm step: create a Server Action in `app/fridges/[fridgeId]/actions.ts`. The action can be a plain `async` function called imperatively (not via `useActionState` / form submission) since the confirm payload is programmatic, not form-based.
- **Next.js 15 + React 19:** `"use client"` directive is required at the top of `IntakeSection.tsx`. Import `{ useState }` from React for state management.

## Steps

1. **Create `app/fridges/[fridgeId]/actions.ts`:** Server Action for confirming draft items.
   - `"use server"` directive at top.
   - Import `saveDraftItems` from `@/lib/intake/store` and `DraftItem` from `@/lib/intake/types`.
   - Export `confirmDraftAction(fridgeId: string, items: DraftItem[]): Promise<{ success: boolean; count: number; error?: string }>`.
   - Validate `items.length > 0` (return error if empty).
   - Validate each item has a non-empty `name` (filter out invalid items).
   - Call `saveDraftItems(fridgeId, validItems)` in a try/catch.
   - Return `{ success: true, count: validItems.length }` on success, `{ success: false, count: 0, error: message }` on failure.

2. **Create `app/fridges/[fridgeId]/IntakeSection.tsx`:** Client component with the review-first flow.
   - `"use client"` at top.
   - Props: `{ fridgeId: string }`.
   - State machine via `useState`: phase is `"idle" | "uploading" | "review" | "confirming" | "done" | "error"`.
   - Additional state: `items: DraftItem[]` (the editable draft list), `error: string | null`, `confirmedCount: number`.
   - **idle phase:** Show a styled card with "Add groceries" heading and a file picker. The file input accepts `image/*`. Use a visible button that triggers the hidden `<input type="file">` via ref click.
   - **uploading phase:** Show a loading indicator (text "Analyzing photo..." with a subtle animation or spinner). Disable the upload button.
   - **On file select:** Set phase to "uploading". Create `FormData` with the file as "photo". `fetch(`/api/intake/${fridgeId}`, { method: "POST", body: formData })`. Parse JSON response. If `items` array is non-empty, assign `nanoid(10)` IDs to each item (import nanoid at the top), set state to "review". If empty or error, set phase to "error" with message.
   - **review phase:** Show a table/list of editable draft rows. Each row has:
     - Text input for `name` (required, with placeholder)
     - Text input for `quantity` (optional)
     - Text input for `unit` (optional)
     - A yellow "?" badge if `confidence === "low"` (title tooltip: "Low confidence — please verify")
     - A delete button (×) that removes the row from the items array
   - Below the rows: a "Confirm N items →" button (disabled if 0 items remain). And a "Cancel" link that resets to idle.
   - **confirming phase:** Show loading state on the confirm button. Call `confirmDraftAction(fridgeId, items)`. On success, set phase to "done" with `confirmedCount`. On error, set phase to "error".
   - **done phase:** Show success message: "✓ N items saved — ready for inventory confirmation". Show a "Upload more" button that resets to idle.
   - **error phase:** Show error message in a styled alert with "Try again" button that resets to idle.
   - Style everything with inline `style={{}}` using CSS custom properties from `globals.css`. Match the dark industrial look: panel backgrounds, border colors, cold accent for interactive elements, muted text for labels.

3. **Update `app/fridges/[fridgeId]/page.tsx`:** Replace the inventory placeholder with the intake section.
   - Import `IntakeSection` from `./IntakeSection`.
   - Find the dashed-border div with the "inventory" label and "Items will appear here" text. **Remove it entirely.**
   - In its place, render: `<IntakeSection fridgeId={fridge.id} />`
   - The IntakeSection is a client component inside a Server Component page — this is the standard RSC pattern and works without any special handling.

4. **Verify the full flow:** Start the dev server. Navigate to a fridge context page. The intake section should appear where the placeholder was. Upload any image file. Draft rows should appear (from stub extraction). Edit a row name. Delete a row. Click confirm. Success message should appear. Check DB: `sqlite3 data/fridges.db "SELECT * FROM intake_drafts;"` — rows exist. Run `npx tsc --noEmit` — exits 0.

## Must-Haves

- [ ] `IntakeSection.tsx` implements the full state machine: idle → uploading → review → confirming → done | error
- [ ] Draft rows are editable (name, quantity, unit) with delete capability
- [ ] Low-confidence items display a visible warning badge
- [ ] Confirm writes items to `intake_drafts` DB table via Server Action
- [ ] The inventory placeholder div in `page.tsx` is replaced with `<IntakeSection>`
- [ ] Error states are visible (extraction failure, confirm failure, empty results)
- [ ] All styling uses `var(--color-*)` CSS custom properties, not Tailwind utilities
- [ ] `npx tsc --noEmit` exits 0

## Verification

- `npx tsc --noEmit` — must exit 0
- Browser: navigate to `/fridges/[fridgeId]` (use a known valid ID from `sqlite3 data/fridges.db "SELECT id FROM fridges LIMIT 1;"`)
  - Intake section is visible (no dashed "inventory" placeholder)
  - File picker button is present
  - Upload any image → draft rows appear with editable fields
  - Edit a name field → value updates
  - Click × on a row → row is removed
  - Click "Confirm" → success message appears
- `sqlite3 data/fridges.db "SELECT id, fridge_id, name, status FROM intake_drafts;"` — rows exist with correct fridge_id and status "pending"
- Page source (or grep): no "Items will appear here once the data layer is connected" text remains in `page.tsx`

## Inputs

- `app/fridges/[fridgeId]/page.tsx` — existing page where the placeholder is replaced
- `lib/intake/types.ts` — `DraftItem` interface (created by T01)
- `lib/intake/store.ts` — `saveDraftItems` function (created by T01)
- `app/api/intake/[fridgeId]/route.ts` — API endpoint for photo extraction (created by T01)
- `app/globals.css` — CSS custom properties for styling

## Expected Output

- `app/fridges/[fridgeId]/IntakeSection.tsx` — new client component with full review UI
- `app/fridges/[fridgeId]/actions.ts` — new Server Action for confirming draft items
- `app/fridges/[fridgeId]/page.tsx` — modified to render IntakeSection instead of placeholder
