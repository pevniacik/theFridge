# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### R012 — A later milestone extends the app into a public, domain-hosted version for broader access.
- Class: launchability
- Status: active
- Description: A later milestone extends the app into a public, domain-hosted version for broader access.
- Why it matters: The full vision includes a non-local deployment path.
- Source: user
- Primary owning slice: M002
- Supporting slices: none
- Validation: unmapped
- Notes: This is not part of M001 implementation.

## Validated

### R001 — A person can scan a printable QR code attached to a fridge or freezer and enter that exact storage context in the local web app.
- Class: primary-user-loop
- Status: validated
- Description: A person can scan a printable QR code attached to a fridge or freezer and enter that exact storage context in the local web app.
- Why it matters: It ties the digital inventory to the physical place someone is standing at and reduces context confusion.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: M001/S06
- Validation: S01 verified: valid fridge IDs resolve the correct storage-context page at /fridges/[fridgeId]; the QR URL encodes the exact same route; opening the QR URL loads the correct context. All 7 slice checks pass.
- Notes: QR scanning on localhost confirmed. Real home-network LAN scanning is deferred to S06 per roadmap proof strategy.

### R002 — The app can create QR codes that are printable and uniquely identify a fridge/freezer context.
- Class: core-capability
- Status: validated
- Description: The app can create QR codes that are printable and uniquely identify a fridge/freezer context.
- Why it matters: The QR entry flow depends on the app being able to create the physical identity token itself.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: M001/S06
- Validation: S01 verified: the app generates SVG QR codes server-side (lib/qr/generate.ts) encoding each fridge/freezer's full context URL. QR is rendered on the storage-context page and is print-ready. QR URL was confirmed to match the route contract via curl inspection.
- Notes: SVG output is printable without external image requests. LAN IP routing in QR URLs is handled via x-forwarded-proto + host headers; full home-network print verification deferred to S06.

### R003 — A grocery photo can be uploaded from the web app and converted into a draft set of candidate items.
- Class: core-capability
- Status: validated
- Description: A grocery photo can be uploaded from the web app and converted into a draft set of candidate items.
- Why it matters: Photo-assisted capture reduces household effort during intake.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S06
- Validation: S02 verified: POST /api/intake/[fridgeId] accepts a photo upload and returns a structured JSON draft with named items, quantities, units, and confidence fields. Stub returns 3 items when OPENAI_API_KEY is absent; OpenAI gpt-4o-mini call is wired for when the key is present. curl test confirmed: 3 items returned for valid fridge + photo input.
- Notes: The draft may be uncertain and must not silently become truth.

### R004 — Drafted items can be reviewed and edited before being committed into live inventory.
- Class: failure-visibility
- Status: validated
- Description: Drafted items can be reviewed and edited before being committed into live inventory.
- Why it matters: Trust depends on human confirmation when AI detection is incomplete or wrong.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S03, M001/S06
- Validation: S02 verified: IntakeSection renders an editable review grid (name, quantity, unit inputs + delete button per row) before any item reaches intake_drafts. Confirm step is explicit and gated - no item is written to the DB without user action. Browser test: edited a name, deleted a row, confirmed - only the modified items were persisted.
- Notes: This is especially important for names, storage placement, and expiry details.

### R005 — The system stores item-level inventory for each fridge/freezer rather than only broad categories.
- Class: primary-user-loop
- Status: validated
- Description: The system stores item-level inventory for each fridge/freezer rather than only broad categories.
- Why it matters: The user wants actual status on demand, not a vague summary.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S04, M001/S05, M001/S06
- Validation: S03 verified: inventory_items table persists item-level records scoped to each fridge via FK. After uploading a grocery photo, confirming the draft, and promoting via InventorySection, sqlite3 confirms individual named rows (Greek Yogurt, Butter) with correct fridge_id. listInventoryItems returns the active set per fridge. Browser renders the inventory list with name/quantity/unit per item.
- Notes: Version 1 can be presence-first rather than exact-unit heavy.

### R006 — The system stores explicit expiry dates when known and allows estimated expiry when the food has no printed producer date.
- Class: core-capability
- Status: validated
- Description: The system stores explicit expiry dates when known and allows estimated expiry when the food has no printed producer date.
- Why it matters: Produce and similar items still need aging awareness even without package dates.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S05, M001/S06
- Validation: S03 verified: inventory_items schema includes expiry_date (TEXT nullable) and expiry_estimated (INTEGER 0/1). Quick-pick day buttons (3d/7d/14d/30d) set expiry_estimated=1; explicit date input sets expiry_estimated=0; blank expiry is valid (null). DB confirmed: promoted row via 7d quick-pick shows expiry_date='2026-03-28', expiry_estimated=1; row with no date shows expiry_date=null, expiry_estimated=0. Amber 'est.' badge renders in the inventory list for estimated entries.
- Notes: User-provided estimation is part of the intended experience.

### R007 — After cooking, eating, moving, or throwing food away, household members can update the inventory so it stays truthful.
- Class: continuity
- Status: validated
- Description: After cooking, eating, moving, or throwing food away, household members can update the inventory so it stays truthful.
- Why it matters: Intake alone is not enough; stale inventory breaks trust.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: M001/S06
- Validation: S04 verified: updateInventoryItem store function UPDATEs name/quantity/unit/expiry_date/expiry_estimated scoped by id AND fridge_id, setting updated_at=datetime('now'). setInventoryItemStatus flips status to 'used' or 'discarded' with the same dual-key scoping. Browser test on Kitchen Fridge (ZPPo56GIYQ): edited "Greek Yogurt" → name persisted in DB with fresh updated_at; marked "Butter" used → status='used' in DB; marked item discarded → status='discarded' in DB. No rows are DELETEd - full audit trail preserved. Server Action error path returns { success: false, error: '...' } rendered as a per-row red banner. [inventory] log lines confirmed in server console for all mutation types.
- Notes: Version 1 favors explicit actions over inference.

### R008 — The app can show the current item-level state of a selected fridge/freezer on demand.
- Class: primary-user-loop
- Status: validated
- Description: The app can show the current item-level state of a selected fridge/freezer on demand.
- Why it matters: This is the core payoff of maintaining the system.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: M001/S05, M001/S06
- Validation: S04 verified: After each mutation (edit save, mark used, mark discarded), router.refresh() wrapped in startTransition() re-reads server truth from SQLite. The active inventory list reflects only status='active' rows - used/discarded items disappear immediately after the status flip. DB and UI are consistent: sqlite3 query confirms status change, browser confirms count decrease. listInventoryItems WHERE status='active' remains the authoritative read model.
- Notes: Trustworthiness matters more than decorative presentation.

### R009 — The app highlights items that are aging, nearing expiry, or effectively forgotten in storage.
- Class: launchability
- Status: validated
- Description: The app highlights items that are aging, nearing expiry, or effectively forgotten in storage.
- Why it matters: Waste prevention is a central reason the product exists.
- Source: inferred
- Primary owning slice: M001/S05
- Supporting slices: M001/S03, M001/S04, M001/S06
- Validation: S05 verified: analyzeInventory() in lib/inventory/analysis.ts classifies active inventory items into 5 urgency buckets (expired, expiring-soon, estimated-expiry-soon, forgotten, ok) using a priority-ordered if-else chain. StatusSection.tsx renders a "needs attention" section with urgency-sorted alert rows showing item name, badge, and timing copy (e.g. "expired 2 days ago", "not touched in 18 days"). Browser verification on mixed-status-fridge confirmed alert rows match actual DB rows via sqlite3 query. Empty fridge shows clean empty state with no alert section rendered.
- Notes: Freezer-forgotten items are explicitly important.

### R010 — The app generates cooking suggestions from the current inventory, with preference toward using available or aging ingredients.
- Class: differentiator
- Status: validated
- Description: The app generates cooking suggestions from the current inventory, with preference toward using available or aging ingredients.
- Why it matters: It turns inventory awareness into action and reinforces waste reduction.
- Source: user
- Primary owning slice: M001/S05
- Supporting slices: M001/S06
- Validation: S05 verified: generateSuggestions() in lib/inventory/analysis.ts produces 0-3 SuggestionCard objects grounded in actual item names from inventory, with urgency-driven cards prioritizing expired/expiring items first. StatusSection.tsx renders a "cooking ideas" section with cards showing title, description referencing real item names, and ingredient chips. Urgency-driven cards get a warm amber gradient treatment. Browser verification on mixed-status-fridge confirmed ingredient names in suggestion cards match actual DB row names. Cook tonight card only appears when 3+ active items exist; Rediscover card only appears when forgotten items exist.
- Notes: Suggestions should stay grounded in current inventory, not generic inspiration.

### R011 — The first version is usable as a local web app reachable within the home network.
- Class: constraint
- Status: validated
- Description: The first version is usable as a local web app reachable within the home network.
- Why it matters: This is the user's chosen deployment shape for version 1.
- Source: user
- Primary owning slice: M001/S06
- Supporting slices: M001/S01
- Validation: S06/T03 final proof 2026-03-23: `bash scripts/verify-s06-lan.sh 192.168.1.22 ZPPo56GIYQ` → 6/6 checks passed: localhost health `{"status":"ok"}`, LAN health `{"status":"ok"}` at `http://192.168.1.22:3000/api/health`, fridge page HTML contains LAN IP confirming QR encodes LAN origin, 28 test files / 115 tests pass, type-check clean, production build succeeds. Browser confirmed QR rendered with `http://192.168.1.22:3000/fridges/ZPPo56GIYQ`, STATUS OVERVIEW and all sections render over LAN IP. Reusable verification script committed at `scripts/verify-s06-lan.sh`.
- Notes: Public domain hosting belongs to a later milestone.

### R013 — More than one person in a household can use the system against the same fridge/freezer inventory.
- Class: primary-user-loop
- Status: validated
- Description: More than one person in a household can use the system against the same fridge/freezer inventory.
- Why it matters: The inventory must reflect shared real-world use.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: M001/S06
- Validation: S04 verified: All mutations are scoped exclusively by item.id AND fridge_id - cross-fridge writes are structurally impossible (WHERE id=? AND fridge_id=?). setInventoryItemStatus guards on status='active' so double-acting on an item is a no-op that surfaces as an error, not silent corruption. The stateless server/SQLite model means any household member hitting the same local URL sees and mutates the same shared ground truth without session conflicts.
- Notes: M001 can keep household access simple as long as the shared flow works.

### R014 — The app surfaces uncertainty, bad scans, and review requirements rather than silently mutating inventory with wrong data.
- Class: failure-visibility
- Status: validated
- Description: The app surfaces uncertainty, bad scans, and review requirements rather than silently mutating inventory with wrong data.
- Why it matters: Inventory trust depends on visible uncertainty and controllable correction.
- Source: inferred
- Primary owning slice: M001/S02
- Supporting slices: M001/S04, M001/S06
- Validation: S02 verified: low-confidence draft items show an amber "?" badge in the review UI; API returns 404 for invalid fridge IDs and 400 for missing photos with descriptive JSON error messages; UI shows an error phase with the server error message on failure; extraction failures surface in server logs. No item reaches intake_drafts without passing through the review-and-confirm step.
- Notes: The app should behave like a trusted assistant, not an invisible automation layer.

## Deferred

### R015 — Track detailed units and amounts beyond simple presence-first inventory.
- Class: quality-attribute
- Status: deferred
- Description: Track detailed units and amounts beyond simple presence-first inventory.
- Why it matters: It could improve precision for cooking and stock management later.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred because version 1 can still be useful without precise unit math.

### R016 — Provide richer historical analytics, usage trends, or waste statistics.
- Class: differentiator
- Status: deferred
- Description: Provide richer historical analytics, usage trends, or waste statistics.
- Why it matters: It may become useful once the base inventory loop is proven.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Not required for first launch usefulness.

### R017 — Support many distinct households with hosted onboarding and broader account flows.
- Class: admin/support
- Status: deferred
- Description: Support many distinct households with hosted onboarding and broader account flows.
- Why it matters: It becomes relevant once the product moves beyond a single local environment.
- Source: inferred
- Primary owning slice: M002
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred to the public version.

### R018 — Expand cooking guidance into deeper recipe workflows that include missing ingredients and broader exploration.
- Class: differentiator
- Status: deferred
- Description: Expand cooking guidance into deeper recipe workflows that include missing ingredients and broader exploration.
- Why it matters: It may improve engagement later but is not required to prove the core utility.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: M001 stays focused on grounded "use what I have" suggestions.

## Out of Scope

### R019 — A native mobile app is explicitly not part of the first version.
- Class: constraint
- Status: out-of-scope
- Description: A native mobile app is explicitly not part of the first version.
- Why it matters: It prevents accidental expansion away from the chosen web-app path.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Version 1 is a local web app.

### R020 — The app should not silently maintain inventory as if the AI can always infer reality correctly.
- Class: anti-feature
- Status: out-of-scope
- Description: The app should not silently maintain inventory as if the AI can always infer reality correctly.
- Why it matters: This would undermine trust and create hidden errors.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Review-first and explicit updates are deliberate design choices.

### R021 — Nutrition analytics and diet coaching are excluded from the first version.
- Class: anti-feature
- Status: out-of-scope
- Description: Nutrition analytics and diet coaching are excluded from the first version.
- Why it matters: It prevents scope drift into a different product category.
- Source: research
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: The current product is about inventory truth, waste prevention, and grounded cooking suggestions.

### R022 — Version 1 should not be shaped primarily around barcode scanning and packaged-product cataloging.
- Class: anti-feature
- Status: out-of-scope
- Description: Version 1 should not be shaped primarily around barcode scanning and packaged-product cataloging.
- Why it matters: The user's actual emphasis is mixed groceries and expiry judgment, including produce.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Barcode support could be revisited later if it helps, but it is not the core intake model.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | primary-user-loop | validated | M001/S01 | M001/S06 | S01 verified: valid fridge IDs resolve the correct storage-context page at /fridges/[fridgeId]; the QR URL encodes the exact same route; opening the QR URL loads the correct context. All 7 slice checks pass. |
| R002 | core-capability | validated | M001/S01 | M001/S06 | S01 verified: the app generates SVG QR codes server-side (lib/qr/generate.ts) encoding each fridge/freezer's full context URL. QR is rendered on the storage-context page and is print-ready. QR URL was confirmed to match the route contract via curl inspection. |
| R003 | core-capability | validated | M001/S02 | M001/S06 | S02 verified: POST /api/intake/[fridgeId] accepts a photo upload and returns a structured JSON draft with named items, quantities, units, and confidence fields. Stub returns 3 items when OPENAI_API_KEY is absent; OpenAI gpt-4o-mini call is wired for when the key is present. curl test confirmed: 3 items returned for valid fridge + photo input. |
| R004 | failure-visibility | validated | M001/S02 | M001/S03, M001/S06 | S02 verified: IntakeSection renders an editable review grid (name, quantity, unit inputs + delete button per row) before any item reaches intake_drafts. Confirm step is explicit and gated - no item is written to the DB without user action. Browser test: edited a name, deleted a row, confirmed - only the modified items were persisted. |
| R005 | primary-user-loop | validated | M001/S03 | M001/S04, M001/S05, M001/S06 | S03 verified: inventory_items table persists item-level records scoped to each fridge via FK. After uploading a grocery photo, confirming the draft, and promoting via InventorySection, sqlite3 confirms individual named rows (Greek Yogurt, Butter) with correct fridge_id. listInventoryItems returns the active set per fridge. Browser renders the inventory list with name/quantity/unit per item. |
| R006 | core-capability | validated | M001/S03 | M001/S05, M001/S06 | S03 verified: inventory_items schema includes expiry_date (TEXT nullable) and expiry_estimated (INTEGER 0/1). Quick-pick day buttons (3d/7d/14d/30d) set expiry_estimated=1; explicit date input sets expiry_estimated=0; blank expiry is valid (null). DB confirmed: promoted row via 7d quick-pick shows expiry_date='2026-03-28', expiry_estimated=1; row with no date shows expiry_date=null, expiry_estimated=0. Amber 'est.' badge renders in the inventory list for estimated entries. |
| R007 | continuity | validated | M001/S04 | M001/S06 | S04 verified: updateInventoryItem store function UPDATEs name/quantity/unit/expiry_date/expiry_estimated scoped by id AND fridge_id, setting updated_at=datetime('now'). setInventoryItemStatus flips status to 'used' or 'discarded' with the same dual-key scoping. Browser test on Kitchen Fridge (ZPPo56GIYQ): edited "Greek Yogurt" → name persisted in DB with fresh updated_at; marked "Butter" used → status='used' in DB; marked item discarded → status='discarded' in DB. No rows are DELETEd - full audit trail preserved. Server Action error path returns { success: false, error: '...' } rendered as a per-row red banner. [inventory] log lines confirmed in server console for all mutation types. |
| R008 | primary-user-loop | validated | M001/S04 | M001/S05, M001/S06 | S04 verified: After each mutation (edit save, mark used, mark discarded), router.refresh() wrapped in startTransition() re-reads server truth from SQLite. The active inventory list reflects only status='active' rows - used/discarded items disappear immediately after the status flip. DB and UI are consistent: sqlite3 query confirms status change, browser confirms count decrease. listInventoryItems WHERE status='active' remains the authoritative read model. |
| R009 | launchability | validated | M001/S05 | M001/S03, M001/S04, M001/S06 | S05 verified: analyzeInventory() in lib/inventory/analysis.ts classifies active inventory items into 5 urgency buckets (expired, expiring-soon, estimated-expiry-soon, forgotten, ok) using a priority-ordered if-else chain. StatusSection.tsx renders a "needs attention" section with urgency-sorted alert rows showing item name, badge, and timing copy (e.g. "expired 2 days ago", "not touched in 18 days"). Browser verification on mixed-status-fridge confirmed alert rows match actual DB rows via sqlite3 query. Empty fridge shows clean empty state with no alert section rendered. |
| R010 | differentiator | validated | M001/S05 | M001/S06 | S05 verified: generateSuggestions() in lib/inventory/analysis.ts produces 0-3 SuggestionCard objects grounded in actual item names from inventory, with urgency-driven cards prioritizing expired/expiring items first. StatusSection.tsx renders a "cooking ideas" section with cards showing title, description referencing real item names, and ingredient chips. Urgency-driven cards get a warm amber gradient treatment. Browser verification on mixed-status-fridge confirmed ingredient names in suggestion cards match actual DB row names. Cook tonight card only appears when 3+ active items exist; Rediscover card only appears when forgotten items exist. |
| R011 | constraint | validated | M001/S06 | M001/S01 | Milestone close re-verified on 2026-03-23: `npm run dev` bound Next.js to `0.0.0.0:3000`; `curl -sf http://localhost:3000/api/health` and `curl -sf http://192.168.1.22:3000/api/health` both returned `{\"status\":\"ok\"...}`; `curl -s http://192.168.1.22:3000/fridges/ZPPo56GIYQ | grep 192.168.1.22` confirmed LAN-routable QR URLs; `npm run test`, `npm run type-check`, and `npm run build` all passed during milestone closure. |
| R012 | launchability | active | M002 | none | unmapped |
| R013 | primary-user-loop | validated | M001/S04 | M001/S06 | S04 verified: All mutations are scoped exclusively by item.id AND fridge_id - cross-fridge writes are structurally impossible (WHERE id=? AND fridge_id=?). setInventoryItemStatus guards on status='active' so double-acting on an item is a no-op that surfaces as an error, not silent corruption. The stateless server/SQLite model means any household member hitting the same local URL sees and mutates the same shared ground truth without session conflicts. |
| R014 | failure-visibility | validated | M001/S02 | M001/S04, M001/S06 | S02 verified: low-confidence draft items show an amber "?" badge in the review UI; API returns 404 for invalid fridge IDs and 400 for missing photos with descriptive JSON error messages; UI shows an error phase with the server error message on failure; extraction failures surface in server logs. No item reaches intake_drafts without passing through the review-and-confirm step. |
| R015 | quality-attribute | deferred | none | none | unmapped |
| R016 | differentiator | deferred | none | none | unmapped |
| R017 | admin/support | deferred | M002 | none | unmapped |
| R018 | differentiator | deferred | none | none | unmapped |
| R019 | constraint | out-of-scope | none | none | n/a |
| R020 | anti-feature | out-of-scope | none | none | n/a |
| R021 | anti-feature | out-of-scope | none | none | n/a |
| R022 | anti-feature | out-of-scope | none | none | n/a |

## Coverage Summary

- Active requirements: 1
- Mapped to slices: 1
- Validated: 13 (R001, R002, R003, R004, R005, R006, R007, R008, R009, R010, R011, R013, R014)
- Unmapped active requirements: 0
