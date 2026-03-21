---
id: T01
parent: S05
milestone: M001
provides:
  - lib/inventory/analysis.ts — pure synchronous inventory analysis functions and result types
  - analyzeInventory() and generateSuggestions() wired server-side in fridge page
key_files:
  - lib/inventory/analysis.ts
  - app/fridges/[fridgeId]/page.tsx
key_decisions:
  - Analysis module is pure TypeScript with no framework imports — safe to import in any RSC without bundle bleed
  - UrgencyLevel is a discriminated union string literal so TypeScript exhaustively checks switch statements
  - generateSuggestions() calls analyzeInventory() internally so callers never need to pre-classify
  - Oxford-comma formatItemList helper used for human-readable ingredient lists in suggestion descriptions
patterns_established:
  - "Priority-ordered classification: if-else chain evaluated top-to-bottom so first match wins — no ambiguous overlap"
  - "Optional now: Date parameter on both functions enables deterministic testing without mocking Date"
  - "daysSinceUpdate computed from updated_at (not added_at) per S04 forward intelligence"
observability_surfaces:
  - "sqlite3 data/fridges.db \"SELECT id, name, expiry_date, expiry_estimated, status, updated_at FROM inventory_items ORDER BY updated_at DESC;\" — ground truth for urgency classification"
  - "TypeScript compiler (npx tsc --noEmit) — surfaces type divergence between InventoryItem and analysis functions immediately"
  - "analysisResult and suggestions are computed in page.tsx; console.log() either in dev server or add a debug <pre> block if data flow needs inspection"
duration: 20m
verification_result: passed
completed_at: 2026-03-21
blocker_discovered: false
---

# T01: Build inventory analysis module and wire into fridge page

**Created `lib/inventory/analysis.ts` with deterministic urgency classification and cooking suggestions, wired server-side into the fridge context page.**

## What Happened

Created `lib/inventory/analysis.ts` as a pure synchronous analysis module with four exported types (`UrgencyLevel`, `ClassifiedItem`, `InventoryStatus`, `SuggestionCard`) and two exported functions:

**`analyzeInventory(items, now?)`** — classifies each item into exactly one of 5 urgency buckets via a priority-ordered if-else chain (first match wins):
1. `expired` — `expiry_date` non-null AND `daysUntilExpiry < 0`
2. `expiring-soon` — `expiry_date` non-null AND `expiry_estimated === false` AND days 0–3
3. `estimated-expiry-soon` — `expiry_date` non-null AND `expiry_estimated === true` AND days 0–3 (softer treatment per D005)
4. `forgotten` — `daysSinceUpdate >= 14` (uses `updated_at` per S04 forward intelligence)
5. `ok` — everything else

Items with no `expiry_date` can only land in `forgotten` or `ok`, never in `expired`/`expiring-soon`. The classified array is sorted by urgency severity (expired first, ok last) and counts are aggregated into `InventoryStatus`.

**`generateSuggestions(items, now?)`** — produces 0–3 `SuggestionCard` objects that reference actual item names:
- "Use soon" card when any expired/expiring items exist
- "Cook tonight" card when 3+ items total are on hand (draws from the full classified set, prioritizes urgent items first)
- "Rediscover" card when forgotten items exist

Both functions accept an optional `now: Date` for testability and default to `new Date()`.

`app/fridges/[fridgeId]/page.tsx` was updated to import both functions and call them server-side after `listInventoryItems()`, storing results in `analysisResult` and `suggestions` constants. A `TODO T02` comment marks the render point where `<StatusSection>` will be placed.

## Verification

- `npx tsc --noEmit` → exit 0, no errors
- `grep -q "analyzeInventory" app/fridges/[fridgeId]/page.tsx` → found
- `grep -q "generateSuggestions" app/fridges/[fridgeId]/page.tsx` → found
- `grep -c "UrgencyLevel|ClassifiedItem|InventoryStatus|SuggestionCard" lib/inventory/analysis.ts` → 12 (≥4 required)

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | ~8s |
| 2 | `grep -q "analyzeInventory" app/fridges/[fridgeId]/page.tsx` | 0 | ✅ pass | <1s |
| 3 | `grep -q "generateSuggestions" app/fridges/[fridgeId]/page.tsx` | 0 | ✅ pass | <1s |
| 4 | `grep -c "UrgencyLevel\|ClassifiedItem\|InventoryStatus\|SuggestionCard" lib/inventory/analysis.ts` | 0 (count=12) | ✅ pass | <1s |

## Diagnostics

- **Type check:** `npx tsc --noEmit` — any divergence between `InventoryItem` fields and analysis function logic surfaces immediately as a compile error
- **Ground-truth DB query:** `sqlite3 data/fridges.db "SELECT id, name, expiry_date, expiry_estimated, status, updated_at FROM inventory_items ORDER BY updated_at DESC;"` — compare rows against UI urgency classifications
- **Data flow inspection:** Add `console.log(JSON.stringify(analysisResult))` in `page.tsx` temporarily, or render `<pre>{JSON.stringify(analysisResult, null, 2)}</pre>` below the identity card to verify data flowing from server into the component tree
- **Failure state:** If `listInventoryItems()` returns `[]`, `analyzeInventory` returns `{ status: { total: 0, ... }, classified: [] }` and `generateSuggestions` returns `[]` — T02 empty-state handling covers this

## Deviations

None. Implemented exactly as planned.

## Known Issues

None. The `analysisResult` and `suggestions` variables are computed but not yet rendered — T02 builds `StatusSection` and renders them.

## Files Created/Modified

- `lib/inventory/analysis.ts` — new file; exports `UrgencyLevel`, `ClassifiedItem`, `InventoryStatus`, `SuggestionCard` types plus `analyzeInventory()` and `generateSuggestions()` pure functions
- `app/fridges/[fridgeId]/page.tsx` — added import of analysis functions; added `analyzeInventory`/`generateSuggestions` calls server-side after `listInventoryItems`; TODO comment marks T02 render point
