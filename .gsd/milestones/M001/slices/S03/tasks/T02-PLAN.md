---
estimated_steps: 4
estimated_files: 2
---

# T02: Build InventorySection UI with expiry inputs and wire into fridge page

**Slice:** S03 — Inventory truth and expiry model
**Milestone:** M001

## Description

Build the `InventorySection` client component that shows pending drafts with per-item expiry inputs, promotes them to inventory, and displays the current inventory list. Wire it into the fridge context page as a server-component-rendered section below `IntakeSection`. This task delivers the user-facing promotion flow and closes R005 (item-level inventory visible) and R006 (expiry input UX with explicit dates and estimated days).

**Relevant skills:** `frontend-design` and `make-interfaces-feel-better` — the component uses inline styles with CSS custom properties matching the dark industrial aesthetic.

## Steps

1. **Create `app/fridges/[fridgeId]/InventorySection.tsx`.**
   This is a `"use client"` component that receives props from the RSC page:

   ```ts
   interface Props {
     fridgeId: string;
     pendingDrafts: DraftItem[];      // from lib/intake/types
     inventoryItems: InventoryItem[]; // from lib/inventory/types
   }
   ```

   **Phase state machine:** `type Phase = "idle" | "promoting" | "done" | "error";`

   **Local state for expiry data:** Since `pendingDrafts` are read-only (name/qty/unit come from the draft), the component needs local state to track per-item expiry inputs. Use:
   ```ts
   const [expiryData, setExpiryData] = useState<Record<string, { date: string; estimated: boolean }>>({});
   ```
   Initialize from `pendingDrafts` on mount (all blank/false).

   **Pending drafts section (when `pendingDrafts.length > 0`):**
   - Section header: `"pending items · N item(s)"`
   - For each pending draft, render a row with:
     - Read-only name, quantity, unit (displayed, not editable — editing was done in IntakeSection)
     - A `<input type="date">` for explicit expiry date — when the user types/picks a date, store it with `estimated: false`
     - Quick-pick day buttons: **3d**, **7d**, **14d**, **30d** — small inline buttons. On click, compute `new Date(); d.setDate(d.getDate() + N); d.toISOString().split('T')[0]` and store with `estimated: true`. Highlight the active quick-pick button if its computed date matches the current expiry value.
     - A small "×" clear button to remove the expiry (set back to blank)
   - "Promote N items to inventory →" button calls `promoteToInventoryAction` with the assembled `InventoryItemInput[]` (mapping draft fields + expiry data)
   - After successful promotion, call `router.refresh()` (from `useRouter`) to get fresh props from the server
   - On success, set phase to "done" briefly, then the refreshed props will show `pendingDrafts` empty and `inventoryItems` populated

   **Inventory list section (when `inventoryItems.length > 0`):**
   - Section header: `"inventory · N item(s)"`
   - For each item, render: name, quantity + unit, expiry info (date with "est." badge if estimated, or "no expiry" if null)
   - Items sorted by `added_at` descending (server already returns this order)

   **Empty states:**
   - No pending drafts AND no inventory: show a muted "No items yet — upload a grocery photo above to get started"
   - No pending drafts but has inventory: just show the inventory list (no pending section)
   - Has pending drafts but no inventory: just show the pending section

   **Styling:**
   - All inline `style={{}}` with `var(--color-*)` tokens — match IntakeSection's exact card/label/button patterns
   - Same `card` and `label` style objects as IntakeSection
   - Quick-pick buttons: small pill-style, `var(--color-cold)` border when active, `var(--color-border)` when inactive
   - Date input: styled to match the text inputs in IntakeSection (same background, border, font)
   - "est." badge next to expiry dates: small amber badge similar to the confidence "?" badge in IntakeSection

2. **Modify `app/fridges/[fridgeId]/page.tsx`.**
   Import `listPendingDrafts` and `listInventoryItems` from `@/lib/inventory/store`. Import `InventorySection` from `./InventorySection`. In the RSC body (the "Found" branch), call both functions synchronously:
   ```tsx
   const pendingDrafts = listPendingDrafts(fridge.id);
   const inventoryItems = listInventoryItems(fridge.id);
   ```
   Render `<InventorySection>` between `<IntakeSection>` and the actions div:
   ```tsx
   <IntakeSection fridgeId={fridge.id} />
   <InventorySection
     fridgeId={fridge.id}
     pendingDrafts={pendingDrafts}
     inventoryItems={inventoryItems}
   />
   ```
   Add a `style={{ marginTop: "1.5rem" }}` wrapper or margin on the component if needed for spacing.

3. **Handle the promote action call correctly.**
   In the promote handler:
   - Build `InventoryItemInput[]` from `pendingDrafts` + `expiryData`:
     ```ts
     const inputs: InventoryItemInput[] = pendingDrafts.map(draft => ({
       draft_id: draft.id,
       name: draft.name,
       quantity: draft.quantity,
       unit: draft.unit,
       confidence: draft.confidence,
       expiry_date: expiryData[draft.id]?.date || null,
       expiry_estimated: expiryData[draft.id]?.estimated || false,
     }));
     ```
   - Call `promoteToInventoryAction(fridgeId, inputs)`
   - On success: set phase to "done", show "✓ N items added to inventory", call `router.refresh()`
   - On failure: set phase to "error", show error message, offer "Try again" button

4. **Verify the full flow in the browser.**
   Start the dev server. Navigate to a fridge context page. Upload a photo (triggers stub extraction → 3 items). Confirm the draft (IntakeSection flow). The page should now show InventorySection with 3 pending items. Set expiry on one item using the "7d" quick-pick. Leave others blank. Click "Promote". Verify:
   - Success message appears
   - Inventory list renders with the 3 items
   - The item with the 7d expiry shows the date with an "est." badge
   - The other items show "no expiry"
   - `sqlite3 data/fridges.db "SELECT * FROM inventory_items"` shows 3 rows
   - `sqlite3 data/fridges.db "SELECT status FROM intake_drafts"` shows 'confirmed' for those rows

## Must-Haves

- [ ] `InventorySection` is a `"use client"` component receiving `pendingDrafts` and `inventoryItems` as props
- [ ] Per-item expiry input: date picker + quick-pick day buttons (3d, 7d, 14d, 30d)
- [ ] Quick-pick sets `expiry_estimated = true`; explicit date sets `expiry_estimated = false`; blank is valid (no expiry)
- [ ] Quick-pick day calculation uses `Date.setDate(getDate() + N)` not millisecond math (avoids DST issues)
- [ ] Promote button calls `promoteToInventoryAction` then `router.refresh()`
- [ ] Inventory list shows items with expiry info (date + "est." badge when estimated)
- [ ] Empty states render gracefully — no error shown when lists are empty
- [ ] All styling uses inline `style={{}}` with `var(--color-*)` tokens — no Tailwind utility classes

## Verification

- Browser: upload photo → confirm draft → pending items appear in InventorySection → set expiry on one → promote → success message → inventory list renders
- Browser: with no pending drafts and no inventory, InventorySection shows empty state text (not an error)
- `sqlite3 data/fridges.db "SELECT COUNT(*) FROM inventory_items WHERE expiry_estimated = 1"` returns >= 1 after using quick-pick
- `sqlite3 data/fridges.db "SELECT COUNT(*) FROM intake_drafts WHERE status = 'confirmed'"` returns > 0 after promotion
- `npx tsc --noEmit` exits 0

## Inputs

- `lib/inventory/types.ts` — InventoryItem and InventoryItemInput interfaces (created in T01)
- `lib/inventory/store.ts` — listPendingDrafts and listInventoryItems functions (created in T01)
- `lib/intake/types.ts` — DraftItem interface for pending draft props
- `app/fridges/[fridgeId]/actions.ts` — promoteToInventoryAction (created in T01)
- `app/fridges/[fridgeId]/page.tsx` — existing RSC page to modify
- `app/fridges/[fridgeId]/IntakeSection.tsx` — pattern reference for styling and phase machine

## Expected Output

- `app/fridges/[fridgeId]/InventorySection.tsx` — new: client component with pending draft promotion UI and inventory list
- `app/fridges/[fridgeId]/page.tsx` — modified: imports and renders InventorySection with server-fetched props
