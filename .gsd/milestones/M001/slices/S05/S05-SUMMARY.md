---
id: S05
parent: M001
milestone: M001
provides:
  - lib/inventory/analysis.ts — pure synchronous analyzeInventory() and generateSuggestions() with UrgencyLevel/ClassifiedItem/InventoryStatus/SuggestionCard types
  - app/fridges/[fridgeId]/StatusSection.tsx — server component with status overview, needs-attention alerts, and cooking ideas sections
  - StatusSection wired into fridge context page between SetupBanner and IntakeSection
  - Urgency classification: expired / expiring-soon / estimated-expiry-soon / forgotten / ok (priority-ordered, first match wins)
  - Cooking suggestions grounded in actual inventory item names with urgency-driven card prioritisation
requires:
  - slice: S04
    provides: inventory_items table with updated_at staleness clock; listInventoryItems(); fridge context page wiring point
  - slice: S03
    provides: expiry_date and expiry_estimated fields on inventory_items; InventoryItem type
affects:
  - S06
key_files:
  - lib/inventory/analysis.ts
  - app/fridges/[fridgeId]/StatusSection.tsx
  - app/fridges/[fridgeId]/page.tsx
key_decisions:
  - Analysis module is pure TypeScript with no framework imports — safe to import in any RSC without bundle bleed (T01)
  - UrgencyLevel is a string literal union so TypeScript exhaustively checks switch statements (T01)
  - generateSuggestions() calls analyzeInventory() internally — callers never need to pre-classify (T01)
  - estimated-expiry-soon items get softer amber treatment than hard-deadline expiring-soon items throughout (D005)
  - StatusSection is a server component — read-only analysis data needs no client state (T02)
  - section[aria-label="Status and suggestions"] wraps all three sub-sections for accessible landmark and CSS scoping (T02)
patterns_established:
  - Priority-ordered classification: if-else chain evaluated top-to-bottom so first match wins — no ambiguous overlap
  - Optional now:Date parameter on both analysis functions enables deterministic testing without mocking Date
  - daysSinceUpdate computed from updated_at (not added_at) — staleness clock resets when item is touched
  - Sub-component split within single file: StatusSection → StatusOverview + AlertsSection + SuggestionsSection + helpers — keeps each render unit small without a separate file for each
observability_surfaces:
  - "sqlite3 data/fridges.db \"SELECT id, name, expiry_date, expiry_estimated, status, updated_at FROM inventory_items ORDER BY updated_at DESC;\" — ground truth for urgency classification"
  - "Browser: section[aria-label='Status and suggestions'] renders on /fridges/[fridgeId] between QR section and IntakeSection"
  - "npx tsc --noEmit — catches type divergence between InventoryItem fields and analysis function inputs immediately"
drill_down_paths:
  - .gsd/milestones/M001/slices/S05/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S05/tasks/T02-SUMMARY.md
duration: ~50m across 2 tasks
verification_result: passed
completed_at: 2026-03-23
---

# S05: Status, alerts, and cooking suggestions

**Built a pure server-side analysis pipeline from inventory data and wired a read-only status UI onto the fridge context page — urgency-classified alerts and inventory-grounded cooking suggestions now render from real SQLite data.**

## What Happened

**T01 — Analysis module:** Created `lib/inventory/analysis.ts` as a pure synchronous module. `analyzeInventory(items, now?)` classifies every active inventory item into one of 5 urgency buckets via a priority-ordered if-else chain (expired → expiring-soon → estimated-expiry-soon → forgotten → ok, first match wins). Items with null expiry_date can only land in forgotten or ok. `generateSuggestions(items, now?)` produces 0–3 `SuggestionCard` objects: "Use soon" when urgent items exist, "Cook tonight" when 3+ items are on hand, "Rediscover" when forgotten items exist. Both functions accept an optional `now: Date` for deterministic testing. The module was wired server-side into `app/fridges/[fridgeId]/page.tsx` after `listInventoryItems()`.

**T02 — Status UI:** `StatusSection.tsx` (already present as a complete implementation) was wired into the page with a one-import + one-render-call change. The component renders three sub-sections: (1) status overview with a prominent item count and urgency pills (red for expired, bright amber for expiring-soon, darker amber for estimated, muted for forgotten, cold for all-good); (2) needs-attention alert rows sorted by urgency severity with left-border color coding and days-info copy; (3) cooking ideas grid with urgency-driven cards in warm amber and standard cards in cold accent. Empty inventory shows a clean "NO ITEMS IN INVENTORY" state with no blank sections.

## Verification

- `npx tsc --noEmit` → exit 0 (both tasks)
- `npm run build` → exit 0, 10 routes compiled (T02)
- Browser (mixed-inventory fridge): status overview shows 6 items, 4 urgency pills, 4 alert rows (Old Yogurt expired / Cheese expiring-soon / Leftover Soup estimated / Old Butter forgotten), 3 cooking suggestion cards with real item names
- Browser (empty fridge): clean empty state, no alerts section, no suggestions section rendered
- `browser_assert` 10/10 checks pass against live page

## New Requirements Surfaced

None.

## Deviations

- `StatusSection.tsx` existed with a complete implementation before T02 began; T02 was reduced to the wiring step only (import + render call in page.tsx, remove TODO comment).

## Known Limitations

- Urgency thresholds (3-day expiry window, 14-day forgotten window) are hardcoded constants — no admin UI to adjust them. This is acceptable for v1.
- Cooking suggestions are deterministic heuristics, not LLM-generated. Grounded in real item names but not personalised. LLM suggestions are handled by RecipeSection (separate feature).

## Follow-ups for S06

- S06 should verify StatusSection renders correctly on a real home-network LAN request (not just localhost) to confirm no server-only import bleeds into the client bundle.
- DB inspection query for S06 acceptance: `sqlite3 data/fridges.db "SELECT id, name, expiry_date, expiry_estimated, status, updated_at FROM inventory_items WHERE status='active';"` — cross-check against rendered alert rows.

## Files Created/Modified

- `lib/inventory/analysis.ts` — new; pure analysis functions and types (T01)
- `app/fridges/[fridgeId]/page.tsx` — added analysis calls server-side (T01); added StatusSection import and render (T02)
- `app/fridges/[fridgeId]/StatusSection.tsx` — pre-existing full implementation; no changes made in T02

## Forward Intelligence

### What the next slice should know
- `StatusSection` is a server component — it re-renders on every page load from fresh SQLite data, no stale cache risk.
- The `section[aria-label="Status and suggestions"]` selector reliably scopes browser assertions to the status area.
- Analysis functions are pure and accept `now: Date` — write deterministic tests by passing a fixed date rather than mocking `new Date()`.

### What's fragile
- The 14-day forgotten threshold and 3-day expiry window are magic constants in `analysis.ts`. If product decisions change these, update `URGENCY_FORGOTTEN_DAYS` and `URGENCY_EXPIRY_SOON_DAYS` at the top of the file.
- `generateSuggestions` calls `analyzeInventory` internally — if analysis is expensive in future (it isn't now), consider caching the classified result and passing it in.

### Authoritative diagnostics
- `sqlite3 data/fridges.db "SELECT id, name, expiry_date, expiry_estimated, updated_at FROM inventory_items WHERE status='active';"` — ground truth for what should appear in alerts
- `npx tsc --noEmit` — primary health check; any InventoryItem field rename will surface immediately
