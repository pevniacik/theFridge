---
estimated_steps: 4
estimated_files: 3
---

# T02: Render status overview, alerts, and cooking suggestions UI

**Slice:** S05 — Status, alerts, and cooking suggestions
**Milestone:** M001

## Description

Build the `StatusSection` component that renders three read-only sub-sections on the fridge context page: (1) a status overview card with urgency counts, (2) an alerts list highlighting expired/expiring/forgotten items, and (3) cooking suggestion cards grounded in on-hand ingredients. Place it on the fridge page between the QR code section and the IntakeSection. Handle empty inventory with a clean empty state.

This task delivers the user-visible payoff for R009 (aging/expiry alerts) and R010 (cooking suggestions). The component consumes the analysis output from T01's `analyzeInventory()` and `generateSuggestions()`.

**Relevant skills:** `frontend-design` (polished dark industrial aesthetic), `react-best-practices` (server component patterns, minimize client JS).

## Steps

1. **Create `app/fridges/[fridgeId]/StatusSection.tsx`** as a server component (no `"use client"` — it's read-only with no interactive state):
   - Accept props: `analysisResult` (from `analyzeInventory`), `suggestions` (from `generateSuggestions`)
   - Use the project's inline style approach matching `InventorySection.tsx` — use `var(--color-panel)`, `var(--color-border)`, `var(--color-cold)`, `var(--color-muted)`, `var(--color-text)`, `var(--color-accent)`, `var(--font-display)`, `var(--font-body)`, `var(--radius-card)` design tokens
   - The existing label style from InventorySection: `fontFamily: "var(--font-display)", fontSize: "0.6875rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--color-cold)"`

2. **Render status overview card**:
   - Section label: "status overview"
   - Show total active item count prominently
   - Show urgency breakdown as compact badges/pills: e.g. "2 expired · 1 expiring soon · 1 forgotten"
   - Color coding: red (#f87171) for expired, amber (#d97706 / #fbbf24) for expiring-soon, softer amber for estimated-expiry-soon, muted (var(--color-muted)) for forgotten, cold (var(--color-cold)) for ok
   - If all items are ok, show a positive "all good" state
   - If no items at all, show a concise empty message: "No items in inventory"

3. **Render alerts list**:
   - Section label: "needs attention"
   - Only render if there are items with urgency !== "ok"
   - List each alert item showing: item name, urgency label, days info (e.g. "expired 2 days ago", "expires in 1 day", "not touched in 18 days")
   - Visual treatment per urgency:
     - `expired`: red border-left accent, red text for urgency label
     - `expiring-soon`: amber border-left accent
     - `estimated-expiry-soon`: softer amber border-left, with "(est.)" note to match existing estimated-expiry badge treatment
     - `forgotten`: muted border-left accent, different wording ("not touched in N days")
   - Items sorted by urgency priority (expired first, then expiring, then forgotten) — this order comes from T01's `analyzeInventory`

4. **Render cooking suggestions**:
   - Section label: "cooking ideas"
   - Only render if suggestions array is non-empty
   - Each suggestion card shows: title, description text, and a list of ingredient names as small pills/tags
   - Urgency-driven cards (those containing expiring ingredients) should have a subtle warm accent to convey urgency
   - Non-urgency cards use the standard cold/muted palette
   - Keep the tone practical and grounded: "Use these soon", "Cook tonight", "Rediscover these"

5. **Wire into `app/fridges/[fridgeId]/page.tsx`**:
   - Import `StatusSection`
   - Remove any debug/placeholder rendering added in T01
   - Render `<StatusSection analysisResult={analysisResult} suggestions={suggestions} />` between the QR code section and `<IntakeSection>`
   - Ensure the empty-inventory path (no items at all) doesn't render a broken StatusSection — either pass the analysis result which will show empty state, or conditionally render

6. **Verify**:
   - `npm run build` succeeds
   - Start dev server, open a fridge with mixed inventory — confirm all three sections render
   - Open a fridge with no active items — confirm clean empty state

## Must-Haves

- [ ] StatusSection renders status overview with urgency counts when inventory has items
- [ ] Alerts list shows expired/expiring/forgotten items with appropriate urgency-colored visual treatment
- [ ] Estimated-expiry items have softer treatment than explicit-expiry items (per D005)
- [ ] Cooking suggestions reference actual on-hand item names (not generic text)
- [ ] Empty inventory renders a clean empty state (no blank sections, no errors)
- [ ] Design matches the existing dark industrial aesthetic: mono labels, --color-panel cards, --color-border borders
- [ ] `npm run build` succeeds with no errors
- [ ] StatusSection is placed on the fridge page above IntakeSection

## Verification

- `npm run build` exits 0
- `test -f app/fridges/\[fridgeId\]/StatusSection.tsx` confirms the component file exists
- `grep -q "StatusSection" app/fridges/\[fridgeId\]/page.tsx` confirms it's rendered on the page
- Browser: fridge with mixed inventory shows status overview, alerts, and suggestion sections
- Browser: fridge with zero active items shows empty state without errors

## Inputs

- `lib/inventory/analysis.ts` — analysis types and functions (created in T01)
- `app/fridges/[fridgeId]/page.tsx` — fridge context page with analysis data already computed (wired in T01)
- `app/globals.css` — design tokens for styling
- `app/fridges/[fridgeId]/InventorySection.tsx` — reference for style patterns and label formatting

## Expected Output

- `app/fridges/[fridgeId]/StatusSection.tsx` — new component rendering status overview, alerts, and cooking suggestions
- `app/fridges/[fridgeId]/page.tsx` — modified to import and render StatusSection with analysis data
