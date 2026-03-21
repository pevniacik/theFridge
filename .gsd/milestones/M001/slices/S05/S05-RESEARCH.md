# S05 — Research

**Date:** 2026-03-21

## Summary

S05 is a targeted extension of the existing fridge context page, not a new subsystem. The app already has the authoritative active-inventory read model (`listInventoryItems(fridgeId)`) plus the two signals S05 needs most: `expiry_date`/`expiry_estimated` from S03 and mutation-maintained `updated_at` from S04. The cleanest approach is to add a small server-side analysis layer that derives status buckets and suggestion inputs from the existing `InventoryItem[]`, then render those results on `app/fridges/[fridgeId]/page.tsx` in new presentational sections above or alongside the current inventory list.

R009 maps naturally to deterministic inventory analysis: items can be classified into urgency groups such as overdue, expiring soon, estimated-expiry-soon, and forgotten/stale. R010 does not require a full recipe engine for M001; the milestone language only requires cooking suggestions grounded in current inventory with preference toward aging ingredients. A lightweight suggestion generator can therefore be rule-based and local for S05, using current item names plus urgency weighting to output practical meal ideas like “use yogurt + berries soon” or “cook a pasta tonight with spinach, tomatoes, and butter.” This keeps the slice shippable without introducing a second AI dependency or blocking on prompt design.

## Recommendation

Implement S05 in two layers:

1. **Server-side status/suggestion derivation in `lib/inventory/`**
   - Add pure synchronous functions that accept `InventoryItem[]` and return:
     - summary counts
     - urgency buckets / alert rows
     - suggestion cards grounded in the same active inventory input
   - Keep this logic on the server and call it from `app/fridges/[fridgeId]/page.tsx` after `listInventoryItems(fridge.id)`.

2. **Read-only UI sections on the fridge context page**
   - Add one or more new components near `InventorySection` for:
     - current status overview
     - aging / expiring / forgotten alerts
     - cooking suggestions
   - Do **not** fork the inventory source of truth or duplicate DB queries in client components.

This follows established project patterns: server reads happen in the RSC page, client components are used only for interactive mutation flows, and `router.refresh()` already rehydrates the fridge page after edits/use/discard. Because S05 is downstream of S04, deriving everything from `listInventoryItems()` ensures the new status surfaces always reflect the same truthful active set the user already maintains.

## Implementation Landscape

### Key Files

- `app/fridges/[fridgeId]/page.tsx` — current fridge context page. It already resolves `fridge`, computes `pendingDrafts` and `inventoryItems`, and renders `IntakeSection` + `InventorySection`. This is the natural place to compute S05 server-side view data and pass it into new read-only status/suggestion components.
- `lib/inventory/store.ts` — current authoritative active-inventory read model. `listInventoryItems(fridgeId)` already filters `WHERE status = 'active'` and returns the exact data S05 should consume. S05 should not invent a new status query unless requirements change.
- `lib/inventory/types.ts` — shared inventory types. If S05 introduces derived types (alert bucket, suggestion card, status summary), add them here or in a sibling analysis/types file for reuse across server helpers and components.
- `app/fridges/[fridgeId]/InventorySection.tsx` — existing inventory UI. It already displays expiry badges and maintains items. S05 can either leave this component untouched or add small visual cues here, but the main status/alert/suggestion surfaces should probably be separate sections to avoid overloading this large client component.
- `lib/db/client.ts` — schema source. Confirms the only persisted fields available for S05 heuristics are `name`, `quantity`, `unit`, `confidence`, `expiry_date`, `expiry_estimated`, `status`, `added_at`, and `updated_at`. There is no recipe table, category table, or last-viewed metadata.
- `app/fridges/[fridgeId]/actions.ts` — existing mutation actions. Likely unchanged for the first S05 pass because the roadmap only asks for status, alerts, and suggestions, not new mutations.
- `app/globals.css` and `app/layout.tsx` — global tokens / shell. New UI should keep using the existing dark industrial token set (`--color-panel`, `--color-border`, `--color-cold`, `--color-accent`) and the mono/body typography pairing.

### Build Order

1. **Define the inventory-analysis contract first**
   - Add deterministic helpers for urgency classification and suggestion generation based on `InventoryItem[]`.
   - This is the riskiest product decision in the slice because “aging / forgotten” is conceptually ambiguous. Lock the bucket rules before building UI.

2. **Wire derived data into `app/fridges/[fridgeId]/page.tsx`**
   - Compute status data server-side right after `listInventoryItems(fridge.id)`.
   - This keeps the page as the single assembly point for fridge-context data and avoids pushing derived logic into the client.

3. **Render status + alert UI sections**
   - Add read-only components/cards for summary counts and urgency lists.
   - This retires R009 first because it is the more objective requirement and will expose whether the heuristics feel trustworthy.

4. **Render cooking suggestions from the same derived inventory input**
   - Suggestions should clearly reference current on-hand items and preferably prioritize urgent items first.
   - Keep copy practical (“Cook tonight”, “Use soon”, “Good freezer rescue”) rather than pretending to be a full recipe database.

5. **Only then consider small inventory-row polish**
   - If needed, add subtle urgency labels/colors inside `InventorySection`, but only after the higher-level status surfaces work.

### Verification Approach

- **Type check:** `npm run type-check`
- **Build confidence:** `npm run build` if time allows, because S05 adds server-rendered logic on the main page.
- **Ground-truth DB check:**
  - `sqlite3 data/fridges.db "SELECT id, name, expiry_date, expiry_estimated, status, added_at, updated_at FROM inventory_items ORDER BY updated_at DESC;"`
  - Verify the UI’s urgent / stale / suggestion outputs correspond to real active rows.
- **Browser verification on an existing fridge page:**
  - Open a fridge context with mixed inventory.
  - Confirm current-status summary renders when there are active items.
  - Confirm items with near expiry appear in an alert surface.
  - Confirm items without expiry do not crash analysis.
  - After using/discarding/editing an item via existing S04 controls, confirm `router.refresh()` causes status and suggestions to update truthfully.
- **Empty-state verification:**
  - A fridge with no active inventory should render a sane empty status/suggestion state instead of blank sections or errors.

## Constraints

- S05 must derive everything from the current local schema; there is no category taxonomy, recipe dataset, or quantity-normalization layer.
- `listInventoryItems(fridgeId)` is already the authoritative current-state read model and filters `status='active'`; S05 should build on that rather than duplicating status logic.
- `expiry_date` is nullable and `expiry_estimated` is boolean-coerced at the store boundary. Any urgency logic must explicitly handle `null` dates.
- `updated_at` changes on edit and on used/discarded status flips. For active rows, it is the best available “last touched / last confirmed” signal for forgotten-item heuristics.
- The project currently uses server-rendered page composition plus client mutation islands. Following the existing pattern is preferable to building a new client-side fetch loop.

## Common Pitfalls

- **Treating all expiry dates equally** — estimated expiry should likely surface with softer wording/visual treatment than explicit expiry because S03 established that estimated dates are user guesses, not hard deadlines.
- **Overloading `InventorySection.tsx`** — it is already a large client component handling promotion and per-row maintenance. Putting all S05 logic there would mix analysis, rendering, and mutation state into one difficult file.
- **Using `added_at` instead of `updated_at` for forgotten-item logic** — S04 explicitly made `updated_at` trustworthy on every mutation; that is the better stale-signal for “hasn’t been touched in a while.”
- **Inventing recipe precision the data cannot support** — version 1 is presence-first. Suggestions should be grounded and useful, but not claim exact recipes requiring unavailable quantity/category intelligence.

## Open Risks

- The threshold for “forgotten” is a product decision, not a code constraint. Without categories or storage-specific rules, any heuristic will need human judgment during verification.
- Suggestion quality may feel too generic if purely template-based. For S05 that is acceptable if the suggestions visibly reference current inventory and prioritize urgent ingredients, but S06/UAT may reveal the need for a richer approach.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| React / Next.js | installed `react-best-practices` | available |
| Browser verification | installed `agent-browser` | available |
| UI implementation | installed `frontend-design` | available |
| SQLite | `martinholovsky/claude-skills-generator@sqlite database expert` | available, not installed |

## Sources

- Existing project code and slice summaries preloaded in the unit context.
- `react-best-practices` skill — reinforces keeping data derivation on the server and minimizing client-side state for non-interactive views.
- `frontend-design` skill — reinforces using the established aesthetic system rather than introducing generic UI patterns.
