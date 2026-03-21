# S05: Status, alerts, and cooking suggestions

**Goal:** The fridge context page shows a current-state summary, surfaces aging or expiring items as alerts, and suggests what to cook from on-hand ingredients with preference toward urgent items.
**Demo:** Open a fridge with mixed inventory (some near-expiry, some old, some fresh). The page shows a status overview card with counts, an alerts section highlighting items that are expired/expiring-soon/forgotten, and a cooking suggestions section that references actual on-hand items with priority toward aging food. An empty fridge shows a sane empty state with no errors.

## Must-Haves

- Deterministic urgency classification of inventory items into buckets: expired, expiring soon, estimated-expiry-soon, forgotten (not touched recently), and OK
- Status summary with item counts per urgency category
- Alert list showing items that need attention (expired, expiring soon, forgotten) with appropriate visual treatment — softer for estimated dates per D005
- Cooking suggestions grounded in actual on-hand item names, prioritizing urgent/aging ingredients first
- All analysis derived from `listInventoryItems()` output — no new DB queries, no client-side fetch loops
- Empty-state rendering when no active items exist (no blank sections, no errors)
- Null expiry_date handled gracefully (items with no date can still be "forgotten" based on updated_at)

## Proof Level

- This slice proves: integration (server-side analysis wired to read-only UI on an existing page)
- Real runtime required: yes (browser verification on live fridge page)
- Human/UAT required: no (heuristic thresholds are product decisions but the wiring and rendering are mechanically verifiable)

## Verification

- `npx tsc --noEmit` — no type errors across the project
- `npm run build` — production build succeeds with the new server-side analysis path
- Browser: open a fridge with mixed inventory → status overview card visible with counts
- Browser: alert section shows items near expiry or not-recently-touched
- Browser: cooking suggestions section references on-hand item names
- Browser: open a fridge with zero active items → empty state renders cleanly, no blank/broken sections
- `sqlite3 data/fridges.db "SELECT id, name, expiry_date, expiry_estimated, updated_at FROM inventory_items WHERE status='active';"` — verify UI alerts correspond to actual DB rows

## Observability / Diagnostics

- Runtime signals: none new (S05 is read-only; no mutations, no new log lines needed)
- Inspection surfaces: `sqlite3 data/fridges.db "SELECT id, name, expiry_date, expiry_estimated, status, updated_at FROM inventory_items ORDER BY updated_at DESC;"` — ground truth for all urgency classification
- Failure visibility: TypeScript type errors if analysis types diverge from InventoryItem; empty-state rendering if listInventoryItems returns []
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: `lib/inventory/store.ts` (`listInventoryItems`), `lib/inventory/types.ts` (`InventoryItem`), `app/fridges/[fridgeId]/page.tsx` (server-side data assembly), `app/globals.css` (design tokens)
- New wiring introduced in this slice: `lib/inventory/analysis.ts` (new pure analysis module), new UI components rendered on the fridge context page between the identity card and the intake/inventory sections
- What remains before the milestone is truly usable end-to-end: S06 (local-first runtime and end-to-end proof)

## Tasks

- [ ] **T01: Build inventory analysis module and wire into fridge page** `est:45m`
  - Why: R009 and R010 both depend on a server-side analysis layer that classifies inventory items into urgency buckets and generates cooking suggestions. This must exist before any UI can render it. Wiring the analysis call into `page.tsx` proves the data flows correctly at the server level.
  - Files: `lib/inventory/analysis.ts`, `lib/inventory/types.ts`, `app/fridges/[fridgeId]/page.tsx`
  - Do: Define analysis result types (StatusSummary, UrgencyBucket, SuggestionCard). Implement pure synchronous functions: `analyzeInventory(items: InventoryItem[], now?: Date)` returning urgency-classified items and summary counts, `generateSuggestions(items: InventoryItem[], now?: Date)` returning cooking suggestion cards grounded in item names. Urgency rules: expired = expiry_date < today; expiring-soon = expiry_date within 3 days; estimated-expiry-soon = same but with expiry_estimated=true (softer treatment); forgotten = no expiry but updated_at > 14 days ago; ok = everything else. Wire `analyzeInventory` and `generateSuggestions` calls into `page.tsx` after `listInventoryItems`, passing results as props to a placeholder or the real component in T02.
  - Verify: `npx tsc --noEmit` exits 0; `grep -q "analyzeInventory" app/fridges/\[fridgeId\]/page.tsx` confirms wiring
  - Done when: `lib/inventory/analysis.ts` exports typed analysis functions, `page.tsx` calls them server-side, and TypeScript compiles cleanly

- [ ] **T02: Render status overview, alerts, and cooking suggestions UI** `est:1h`
  - Why: The analysis data from T01 needs user-visible rendering to retire R009 (alerts) and R010 (suggestions). This task builds the read-only UI components and places them on the fridge context page.
  - Files: `app/fridges/[fridgeId]/StatusSection.tsx`, `app/fridges/[fridgeId]/page.tsx`
  - Do: Build a `StatusSection` component (can be server component or light client component — no mutations needed) that renders three sub-sections: (1) status overview card with counts by urgency, (2) alerts list showing expired/expiring/forgotten items with name, days info, and urgency-appropriate color (red for expired, amber for expiring-soon, softer amber for estimated, muted for forgotten), (3) cooking suggestions cards referencing on-hand items with priority toward urgent ingredients. Use the project's design tokens (--color-panel, --color-border, --color-cold, --color-accent, --color-muted, --font-display, --font-body, --radius-card). Handle empty inventory gracefully — show a concise empty-state message instead of blank sections. Place `StatusSection` on the fridge page between the QR section and IntakeSection. Match the existing dark industrial aesthetic.
  - Verify: `npm run build` succeeds; browser verification on a fridge with mixed inventory shows status/alerts/suggestions; empty fridge shows clean empty state
  - Done when: Status overview, alerts, and suggestions render on the fridge page from real inventory data; empty state is handled; `npm run build` passes

## Files Likely Touched

- `lib/inventory/analysis.ts` (new — analysis functions and types)
- `lib/inventory/types.ts` (may add analysis result types or keep them in analysis.ts)
- `app/fridges/[fridgeId]/page.tsx` (wire analysis calls and render new section)
- `app/fridges/[fridgeId]/StatusSection.tsx` (new — status/alerts/suggestions UI)
