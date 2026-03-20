# Requirements

This file is the explicit capability and coverage contract for the project.

Use it to track what is actively in scope, what has been validated by completed work, what is intentionally deferred, and what is explicitly out of scope.

Guidelines:
- Keep requirements capability-oriented, not a giant feature wishlist.
- Requirements should be atomic, testable, and stated in plain language.
- Every **Active** requirement should be mapped to a slice, deferred, blocked with reason, or moved out of scope.
- Each requirement should have one accountable primary owner and may have supporting slices.
- Research may suggest requirements, but research does not silently make them binding.
- Validation means the requirement was actually proven by completed work and verification, not just discussed.

## Active

### R001 — Household can enter a specific fridge/freezer context via printable QR code
- Class: primary-user-loop
- Status: active
- Description: A person can scan a printable QR code attached to a fridge or freezer and enter that exact storage context in the local web app.
- Why it matters: It ties the digital inventory to the physical place someone is standing at and reduces context confusion.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: M001/S06
- Validation: mapped
- Notes: Version 1 assumes home-network access over Wi‑Fi.

### R002 — Household can generate printable QR codes for each fridge/freezer
- Class: core-capability
- Status: active
- Description: The app can create QR codes that are printable and uniquely identify a fridge/freezer context.
- Why it matters: The QR entry flow depends on the app being able to create the physical identity token itself.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: M001/S06
- Validation: mapped
- Notes: Printable output matters, not just on-screen display.

### R003 — Household can capture groceries with a photo and get a draft inventory
- Class: core-capability
- Status: active
- Description: A grocery photo can be uploaded from the web app and converted into a draft set of candidate items.
- Why it matters: Photo-assisted capture reduces household effort during intake.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S06
- Validation: mapped
- Notes: The draft may be uncertain and must not silently become truth.

### R004 — Household can confirm or correct drafted items before they become inventory truth
- Class: failure-visibility
- Status: active
- Description: Drafted items can be reviewed and edited before being committed into live inventory.
- Why it matters: Trust depends on human confirmation when AI detection is incomplete or wrong.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S03, M001/S06
- Validation: mapped
- Notes: This is especially important for names, storage placement, and expiry details.

### R005 — Inventory tracks item-level presence within a fridge/freezer context
- Class: primary-user-loop
- Status: active
- Description: The system stores item-level inventory for each fridge/freezer rather than only broad categories.
- Why it matters: The user wants actual status on demand, not a vague summary.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S04, M001/S05, M001/S06
- Validation: mapped
- Notes: Version 1 can be presence-first rather than exact-unit heavy.

### R006 — Inventory supports expiry dates and estimated expiry when no producer date exists
- Class: core-capability
- Status: active
- Description: The system stores explicit expiry dates when known and allows estimated expiry when the food has no printed producer date.
- Why it matters: Produce and similar items still need aging awareness even without package dates.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S05, M001/S06
- Validation: mapped
- Notes: User-provided estimation is part of the intended experience.

### R007 — Household can explicitly update, reduce, remove, or discard items after use
- Class: continuity
n- Status: active
- Description: After cooking, eating, moving, or throwing food away, household members can update the inventory so it stays truthful.
- Why it matters: Intake alone is not enough; stale inventory breaks trust.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: M001/S06
- Validation: mapped
- Notes: Version 1 favors explicit actions over inference.

### R008 — User can request the current status of a fridge/freezer and trust the answer
- Class: primary-user-loop
- Status: active
- Description: The app can show the current item-level state of a selected fridge/freezer on demand.
- Why it matters: This is the core payoff of maintaining the system.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: M001/S05, M001/S06
- Validation: mapped
- Notes: Trustworthiness matters more than decorative presentation.

### R009 — App surfaces aging, expiring, or long-forgotten food that needs attention
- Class: launchability
- Status: active
- Description: The app highlights items that are aging, nearing expiry, or effectively forgotten in storage.
- Why it matters: Waste prevention is a central reason the product exists.
- Source: inferred
- Primary owning slice: M001/S05
- Supporting slices: M001/S03, M001/S04, M001/S06
- Validation: mapped
- Notes: Freezer-forgotten items are explicitly important.

### R010 — App suggests what to cook from current inventory, biased toward using what is on hand
- Class: differentiator
- Status: active
- Description: The app generates cooking suggestions from the current inventory, with preference toward using available or aging ingredients.
- Why it matters: It turns inventory awareness into action and reinforces waste reduction.
- Source: user
- Primary owning slice: M001/S05
- Supporting slices: M001/S06
- Validation: mapped
- Notes: Suggestions should stay grounded in current inventory, not generic inspiration.

### R011 — Version 1 runs locally on the home network over Wi‑Fi
- Class: constraint
- Status: active
- Description: The first version is usable as a local web app reachable within the home network.
- Why it matters: This is the user’s chosen deployment shape for version 1.
- Source: user
- Primary owning slice: M001/S06
- Supporting slices: M001/S01
- Validation: mapped
- Notes: Public domain hosting belongs to a later milestone.

### R012 — Public web deployment with its own domain is supported as a later phase
- Class: launchability
- Status: active
- Description: A later milestone extends the app into a public, domain-hosted version for broader access.
- Why it matters: The full vision includes a non-local deployment path.
- Source: user
- Primary owning slice: M002
- Supporting slices: none
- Validation: unmapped
- Notes: This is not part of M001 implementation.

### R013 — Shared household usage is supported
- Class: primary-user-loop
- Status: active
- Description: More than one person in a household can use the system against the same fridge/freezer inventory.
- Why it matters: The inventory must reflect shared real-world use.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: M001/S06
- Validation: mapped
- Notes: M001 can keep household access simple as long as the shared flow works.

### R014 — Failure states are visible enough that bad scans or uncertain AI drafts do not silently corrupt inventory
- Class: failure-visibility
- Status: active
- Description: The app surfaces uncertainty, bad scans, and review requirements rather than silently mutating inventory with wrong data.
- Why it matters: Inventory trust depends on visible uncertainty and controllable correction.
- Source: inferred
- Primary owning slice: M001/S02
- Supporting slices: M001/S04, M001/S06
- Validation: mapped
- Notes: The app should behave like a trusted assistant, not an invisible automation layer.

## Validated

None yet.

## Deferred

### R015 — Detailed quantity units beyond presence-first tracking
- Class: quality-attribute
- Status: deferred
- Description: Track detailed units and amounts beyond simple presence-first inventory.
- Why it matters: It could improve precision for cooking and stock management later.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred because version 1 can still be useful without precise unit math.

### R016 — Advanced household statistics and trend analysis
- Class: differentiator
- Status: deferred
- Description: Provide richer historical analytics, usage trends, or waste statistics.
- Why it matters: It may become useful once the base inventory loop is proven.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Not required for first launch usefulness.

### R017 — Multiple households or public multi-tenant onboarding flows
- Class: admin/support
- Status: deferred
- Description: Support many distinct households with hosted onboarding and broader account flows.
- Why it matters: It becomes relevant once the product moves beyond a single local environment.
- Source: inferred
- Primary owning slice: M002
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred to the public version.

### R018 — Rich recipe system with missing-ingredient planning and broad inspiration beyond on-hand inventory
- Class: differentiator
- Status: deferred
- Description: Expand cooking guidance into deeper recipe workflows that include missing ingredients and broader exploration.
- Why it matters: It may improve engagement later but is not required to prove the core utility.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: M001 stays focused on grounded “use what I have” suggestions.

## Out of Scope

### R019 — Native mobile app for version 1
- Class: constraint
- Status: out-of-scope
- Description: A native mobile app is explicitly not part of the first version.
- Why it matters: It prevents accidental expansion away from the chosen web-app path.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Version 1 is a local web app.

### R020 — Fully automatic inventory truth without confirmation or explicit updates
- Class: anti-feature
- Status: out-of-scope
- Description: The app should not silently maintain inventory as if the AI can always infer reality correctly.
- Why it matters: This would undermine trust and create hidden errors.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Review-first and explicit updates are deliberate design choices.

### R021 — Precision nutrition, calorie tracking, or diet coaching in version 1
- Class: anti-feature
- Status: out-of-scope
- Description: Nutrition analytics and diet coaching are excluded from the first version.
- Why it matters: It prevents scope drift into a different product category.
- Source: research
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: The current product is about inventory truth, waste prevention, and grounded cooking suggestions.

### R022 — Barcode-first product catalog as the primary intake path
- Class: anti-feature
- Status: out-of-scope
- Description: Version 1 should not be shaped primarily around barcode scanning and packaged-product cataloging.
- Why it matters: The user’s actual emphasis is mixed groceries and expiry judgment, including produce.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Barcode support could be revisited later if it helps, but it is not the core intake model.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | primary-user-loop | active | M001/S01 | M001/S06 | mapped |
| R002 | core-capability | active | M001/S01 | M001/S06 | mapped |
| R003 | core-capability | active | M001/S02 | M001/S06 | mapped |
| R004 | failure-visibility | active | M001/S02 | M001/S03, M001/S06 | mapped |
| R005 | primary-user-loop | active | M001/S03 | M001/S04, M001/S05, M001/S06 | mapped |
| R006 | core-capability | active | M001/S03 | M001/S05, M001/S06 | mapped |
| R007 | continuity | active | M001/S04 | M001/S06 | mapped |
| R008 | primary-user-loop | active | M001/S04 | M001/S05, M001/S06 | mapped |
| R009 | launchability | active | M001/S05 | M001/S03, M001/S04, M001/S06 | mapped |
| R010 | differentiator | active | M001/S05 | M001/S06 | mapped |
| R011 | constraint | active | M001/S06 | M001/S01 | mapped |
| R012 | launchability | active | M002 | none | unmapped |
| R013 | primary-user-loop | active | M001/S04 | M001/S06 | mapped |
| R014 | failure-visibility | active | M001/S02 | M001/S04, M001/S06 | mapped |
| R015 | quality-attribute | deferred | none | none | unmapped |
| R016 | differentiator | deferred | none | none | unmapped |
| R017 | admin/support | deferred | M002 | none | unmapped |
| R018 | differentiator | deferred | none | none | unmapped |
| R019 | constraint | out-of-scope | none | none | n/a |
| R020 | anti-feature | out-of-scope | none | none | n/a |
| R021 | anti-feature | out-of-scope | none | none | n/a |
| R022 | anti-feature | out-of-scope | none | none | n/a |

## Coverage Summary

- Active requirements: 14
- Mapped to slices: 13
- Validated: 0
- Unmapped active requirements: 1
