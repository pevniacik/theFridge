---
estimated_steps: 5
estimated_files: 3
---

# T01: Build inventory analysis module and wire into fridge page

**Slice:** S05 — Status, alerts, and cooking suggestions
**Milestone:** M001

## Description

Create `lib/inventory/analysis.ts` with pure synchronous functions that classify inventory items by urgency and generate cooking suggestions from on-hand items. Wire the analysis calls into `app/fridges/[fridgeId]/page.tsx` so the derived data is available for UI rendering in T02.

This task establishes the analysis contract that R009 (aging/expiry alerts) and R010 (cooking suggestions) depend on. The functions must be deterministic, handle null expiry dates, distinguish estimated from explicit expiry (per D005), and use `updated_at` as the staleness signal for forgotten items (per S04 forward intelligence).

**Relevant skills:** `react-best-practices` (server-side data derivation, minimize client serialization).

## Steps

1. **Define analysis result types** in `lib/inventory/analysis.ts`:
   - `UrgencyLevel`: `"expired" | "expiring-soon" | "estimated-expiry-soon" | "forgotten" | "ok"`
   - `ClassifiedItem`: `{ item: InventoryItem; urgency: UrgencyLevel; daysUntilExpiry: number | null; daysSinceUpdate: number }`
   - `InventoryStatus`: `{ total: number; expired: number; expiringSoon: number; estimatedExpiringSoon: number; forgotten: number; ok: number }`
   - `SuggestionCard`: `{ title: string; description: string; ingredients: string[]; urgencyDriven: boolean }`

2. **Implement `analyzeInventory(items: InventoryItem[], now?: Date)`** returning `{ status: InventoryStatus; classified: ClassifiedItem[] }`:
   - For each item, compute `daysUntilExpiry` from `expiry_date` (null if no date) and `daysSinceUpdate` from `updated_at`
   - Classification rules (evaluated in priority order — first match wins):
     - `expired`: `expiry_date` is non-null AND `daysUntilExpiry < 0`
     - `expiring-soon`: `expiry_date` is non-null AND `expiry_estimated === false` AND `daysUntilExpiry` is 0–3
     - `estimated-expiry-soon`: `expiry_date` is non-null AND `expiry_estimated === true` AND `daysUntilExpiry` is 0–3
     - `forgotten`: `daysSinceUpdate >= 14` (no recent interaction regardless of expiry)
     - `ok`: everything else
   - Aggregate counts into `InventoryStatus`
   - Sort classified items: expired first, then expiring-soon, then estimated-expiry-soon, then forgotten, then ok

3. **Implement `generateSuggestions(items: InventoryItem[], now?: Date)`** returning `SuggestionCard[]`:
   - Group items by urgency (from `analyzeInventory` internally or accept pre-classified)
   - Generate 1–3 practical suggestion cards:
     - If expired or expiring-soon items exist: "Use soon" card listing those ingredient names
     - If there are 3+ items on hand: "Cook tonight" card combining 2–4 available ingredients into a meal idea
     - If forgotten items exist: "Rediscover" card listing forgotten items
   - Each card must reference real item names from the inventory — never generic templates without specific food
   - Suggestions are deterministic (no randomness) so they are stable across server renders

4. **Wire analysis into `app/fridges/[fridgeId]/page.tsx`**:
   - Import `analyzeInventory` and `generateSuggestions` from `lib/inventory/analysis`
   - Call both after `listInventoryItems(fridge.id)`, passing `inventoryItems` as input
   - Store results in local constants (`analysisResult`, `suggestions`)
   - Pass these as props where the StatusSection component will be rendered in T02 (for now, can be a TODO comment marking the render point, or a simple `<pre>` debug render to verify data flow)

5. **Verify types compile cleanly**: `npx tsc --noEmit`

## Must-Haves

- [ ] `analyzeInventory` classifies items into exactly 5 urgency levels with deterministic priority-ordered rules
- [ ] Null `expiry_date` items are handled — they can only be "forgotten" (via `updated_at`) or "ok", never "expired" or "expiring"
- [ ] `expiry_estimated === true` items get `estimated-expiry-soon` (not `expiring-soon`) for softer treatment per D005
- [ ] `generateSuggestions` references actual item names from the input, not generic templates
- [ ] `updated_at` is used (not `added_at`) for forgotten-item detection per S04 forward intelligence
- [ ] Both functions accept an optional `now` parameter for testability (defaults to `new Date()`)
- [ ] Analysis is called server-side in `page.tsx` — no client-side fetch or useEffect
- [ ] TypeScript compiles with no errors: `npx tsc --noEmit`

## Verification

- `npx tsc --noEmit` exits 0
- `grep -q "analyzeInventory" app/fridges/\[fridgeId\]/page.tsx` confirms the function is called in the page
- `grep -q "generateSuggestions" app/fridges/\[fridgeId\]/page.tsx` confirms suggestions are computed
- `grep -c "UrgencyLevel\|ClassifiedItem\|InventoryStatus\|SuggestionCard" lib/inventory/analysis.ts` returns >= 4 (all types defined)

## Inputs

- `lib/inventory/types.ts` — `InventoryItem` interface (the input type for analysis functions)
- `lib/inventory/store.ts` — `listInventoryItems` function (already called in page.tsx; analysis consumes its output)
- `app/fridges/[fridgeId]/page.tsx` — current fridge context page where analysis must be wired in

## Expected Output

- `lib/inventory/analysis.ts` — new file with analysis types and pure functions
- `app/fridges/[fridgeId]/page.tsx` — modified to import and call analysis functions server-side
