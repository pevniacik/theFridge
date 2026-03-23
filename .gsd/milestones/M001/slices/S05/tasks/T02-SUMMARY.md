---
id: T02
parent: S05
milestone: M001
provides:
  - app/fridges/[fridgeId]/StatusSection.tsx — server component with status overview, needs-attention alerts, and cooking ideas sections
  - StatusSection wired into fridge context page above IntakeSection
  - Urgency-color-coded alert rows for expired / expiring-soon / estimated-expiry-soon / forgotten items
  - Three cooking suggestion cards (Use soon, Cook tonight, Rediscover) referencing actual inventory item names
  - Clean empty state when no active items exist
key_files:
  - app/fridges/[fridgeId]/StatusSection.tsx
  - app/fridges/[fridgeId]/page.tsx
key_decisions:
  - StatusSection is a server component (no "use client") — read-only analysis data needs no client state
  - Estimated-expiry-soon items labelled "EXPIRING SOON (EST.)" with softer amber (#b45309 border) per D005
  - Cooking suggestions section uses a horizontal grid layout on the page (3 cards side-by-side) to distinguish from the vertical alert list
  - section[aria-label="Status and suggestions"] wraps all three sub-sections for accessible landmark and CSS scoping
patterns_established:
  - Sub-component split within a single file: StatusSection → StatusOverview + AlertsSection + SuggestionsSection + UrgencyPill + SuggestionCard — keeps each render unit small without a separate file for each
  - urgencyColor / urgencyBorderColor / urgencyLabel / daysInfo helpers co-located with the component that consumes them
observability_surfaces:
  - Browser: section[aria-label="Status and suggestions"] renders on /fridges/[fridgeId] — visible immediately below the QR section
  - "sqlite3 data/fridges.db \"SELECT id, name, expiry_date, expiry_estimated, updated_at FROM inventory_items WHERE status='active';\" — ground truth for urgency classification matches"
duration: 30m
verification_result: passed
completed_at: 2026-03-23
blocker_discovered: false
---

# T02: Render status overview, alerts, and cooking suggestions UI

**Wired `StatusSection` into the fridge context page, delivering urgency-classified status cards, alert rows for expired/expiring/forgotten items, and inventory-grounded cooking suggestion cards.**

## What Happened

`StatusSection.tsx` was already present in the slice directory with a complete implementation covering all three sub-sections. The only missing step was the wiring in `page.tsx`: added the `import StatusSection from "./StatusSection"` import and replaced the `// TODO T02` comment with `<StatusSection analysisResult={analysisResult} suggestions={suggestions} />` placed between `<SetupBanner>` and `<IntakeSection>`.

The component structure:
- **StatusOverview** — shows total active count prominently; when no issues: "all good" pill in cold/cyan; when problems: urgency pills (red for expired, bright amber for expiring-soon, darker amber for estimated, muted for forgotten) plus ok count as plain text suffix
- **AlertsSection** — left-border-accented rows per alert item showing name, days-info copy ("expired 3 days ago", "expires in 1 day", "estimated expiry in 2 days", "not touched in 22 days"), and an urgency badge; sorted by urgency severity (expired → expiring → estimated → forgotten)
- **SuggestionsSection** — horizontal grid of 0–3 cards (Use soon / Cook tonight / Rediscover) with actual item-name pills; urgency-driven cards styled with warm amber gradient, non-urgent cards with cold accent

Empty state renders a "NO ITEMS IN INVENTORY" pill and guidance copy instead of blank/broken sections.

## Verification

- `npx tsc --noEmit` → exit 0
- `npm run build` → exit 0, 10 routes compiled
- `test -f app/fridges/[fridgeId]/StatusSection.tsx` → exists
- `grep -q "StatusSection" app/fridges/[fridgeId]/page.tsx` → wired
- Browser (mixed-inventory fridge ZPPo56GIYQ): status overview shows 6 items with 4 urgency pills; needs-attention section shows all 4 urgency tiers (Old Yogurt expired, Cheese expiring soon, Leftover Soup estimated-expiring, Old Butter forgotten); cooking ideas shows 3 cards with real item names
- Browser (empty fridge empty-status-fridge): status overview shows 0 active items, "NO ITEMS IN INVENTORY" pill; no alerts or suggestions sections rendered
- `browser_assert` 10/10 checks pass

## Verification Evidence

| # | Command / Check | Exit Code | Verdict | Duration |
|---|----------------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | ~4s |
| 2 | `npm run build` | 0 | ✅ pass | ~27s |
| 3 | `test -f app/fridges/[fridgeId]/StatusSection.tsx` | 0 | ✅ pass | <1s |
| 4 | `grep -q "StatusSection" app/fridges/[fridgeId]/page.tsx` | 0 | ✅ pass | <1s |
| 5 | Browser — mixed-fridge: status overview urgency pills visible | — | ✅ pass | browser |
| 6 | Browser — mixed-fridge: needs-attention alerts 4 rows, correct urgency labels | — | ✅ pass | browser |
| 7 | Browser — mixed-fridge: cooking ideas 3 cards with actual item names | — | ✅ pass | browser |
| 8 | Browser — empty-fridge: clean empty state, no alerts/suggestions | — | ✅ pass | browser |
| 9 | browser_assert 10/10 checks | — | ✅ pass | browser |

## Diagnostics

- `section[aria-label="Status and suggestions"]` — CSS selector to scope inspection to the StatusSection in DevTools or browser_screenshot
- `sqlite3 data/fridges.db "SELECT id, name, expiry_date, expiry_estimated, updated_at FROM inventory_items WHERE status='active';"` — compare DB rows against rendered urgency classification
- `npx tsc --noEmit` — catches any prop/type divergence between analysis output and StatusSection props immediately

## Deviations

`StatusSection.tsx` already existed with a full implementation from a prior session; the task was reduced to the wiring step in `page.tsx` only (import + render call + removing the TODO comment). The component itself matched the plan spec without modification.

## Known Issues

None.

## Files Created/Modified

- `app/fridges/[fridgeId]/StatusSection.tsx` — already implemented; no changes made in this task
- `app/fridges/[fridgeId]/page.tsx` — added `import StatusSection from "./StatusSection"`, replaced TODO comment with `<StatusSection analysisResult={analysisResult} suggestions={suggestions} />`
