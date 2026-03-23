# M001: Local-first household fridge inventory

**Vision:** Build a shared household local web app that creates a digital representation of real fridges and freezers, entered through printable QR codes, maintained through review-first photo intake and explicit updates, and used to surface trustworthy current status, expiry awareness, and grounded cooking suggestions.

## Success Criteria

- A household member can print a QR code for a fridge/freezer, scan it on the home network, and land in the correct local storage context.
- A household member can upload a grocery photo, review and correct drafted items, and save them into that storage context.
- The app can show the current item-level status of a fridge/freezer, including aging or expiring items.
- Household members can explicitly update, remove, or discard food so the status remains trustworthy over time.
- The app can suggest what to cook from the current inventory with preference toward what is already on hand.
- The full QR → intake → inventory → status → suggestion loop works in a real local home-network environment.

## Key Risks / Unknowns

- Photo-derived grocery drafts may be incomplete or wrong — if review is weak, downstream inventory trust collapses.
- Inventory truth may decay after intake if maintenance actions are too awkward or unclear.
- Estimated expiry for produce and similar foods may become tedious if the interaction is not lightweight.
- Local home-network routing may make QR entry brittle if the entrypoint is not designed carefully.

## Proof Strategy

- Photo-derived draft quality risk → retire in S02 by proving a real grocery photo can become a reviewable, editable draft rather than silently mutating inventory.
- Inventory truth decay risk → retire in S04 by proving household members can explicitly update/remove/discard items and see truthful current state afterward.
- Estimated expiry usability risk → retire in S03 by proving confirmed items can include explicit or estimated expiry in a way that persists and informs later status.
- Local routing / QR brittleness risk → retire in S06 by proving the full flow works through real printed/scanned QR entry on a home-network setup.

## Verification Classes

- Contract verification: route checks, artifact checks, schema checks, automated tests for core inventory and routing logic
- Integration verification: real QR entry, real local app routing, real photo upload/review/save flow, real persisted inventory reads and updates
- Operational verification: local-home-network runtime reachable over Wi‑Fi, stable enough to exercise the main loop end-to-end
- UAT / human verification: whether the review flow, expiry estimation flow, and status presentation feel trustworthy and not tedious

## Milestone Definition of Done

This milestone is complete only when all are true:

- all slice deliverables are complete
- printable QR generation and QR-based context entry are actually wired together
- photo intake drafts are reviewed before becoming inventory truth
- item-level inventory, expiry logic, and maintenance flows are actually connected to the status view
- the real local entrypoint exists and is exercised on the home network
- success criteria are re-checked against live behavior, not just artifacts
- final integrated acceptance scenarios pass

## Requirement Coverage

- Covers: R001, R002, R003, R004, R005, R006, R007, R008, R009, R010, R011, R013, R014
- Partially covers: R012
- Leaves for later: R015, R016, R017, R018
- Orphan risks: none

## Slices

- [x] **S01: QR identity and local fridge entry** `risk:medium` `depends:[]`
  > After this: You can create a printable QR code for a fridge/freezer, scan it, and enter the correct storage context in the local web app.

- [x] **S02: Photo intake with review-first draft** `risk:high` `depends:[S01]`
  > After this: From a storage context, you can upload a grocery photo and get a draft list to review and correct before saving.

- [x] **S03: Inventory truth and expiry model** `risk:high` `depends:[S02]`
  > After this: Confirmed items become item-level inventory in the selected fridge/freezer with expiry or estimated expiry recorded.

- [x] **S04: Shared household inventory maintenance** `risk:high` `depends:[S03]`
  > After this: Household members can update, remove, or discard items and the current fridge/freezer status stays trustworthy.

- [x] **S05: Status, alerts, and cooking suggestions** `risk:medium` `depends:[S04]`
  > After this: The app shows current state, surfaces aging or forgotten food, and suggests what to cook from what is on hand.

- [ ] **S06: Local-first runtime and end-to-end proof** `risk:medium` `depends:[S01,S02,S03,S04,S05]`
  > After this: The full QR → intake → status → update → suggestion loop works end-to-end in the real local home-network environment.

## Boundary Map

### S01 → S02

Produces:
- fridge/freezer identity records with stable IDs
- printable QR payload contract that resolves to a specific storage context
- local route or entrypoint that loads a storage context from scanned QR data

Consumes:
- nothing (first slice)

### S02 → S03

Produces:
- photo upload intake endpoint or action
- draft item schema for AI-extracted grocery candidates
- review-and-correct UI/state model that yields confirmed intake items
- visible uncertainty/error states for bad or incomplete drafts

Consumes:
- storage context resolution from S01

### S03 → S04

Produces:
- persistent item-level inventory model scoped to fridge/freezer context
- expiry date field and estimated-expiry field/flag model
- confirmed-intake-to-inventory persistence flow
- current inventory query contract per storage context

Consumes:
- confirmed draft item payloads from S02
- storage context identity from S01

### S04 → S05

Produces:
- update/remove/discard actions for inventory items
- shared current-state mutation rules for household use
- trustworthy current-status read model after explicit maintenance actions

Consumes:
- persistent inventory model from S03

### S05 → S06

Produces:
- status view grouped around current inventory and urgency signals
- aging/expiring/forgotten item highlighting rules
- cooking suggestion flow grounded in current inventory data

Consumes:
- current-status model and maintenance actions from S04
- expiry-aware inventory data from S03

### S01 → S06

Produces:
- real QR-based local entrypoint used by the integrated flow

Consumes:
- nothing (upstream identity contract)

### S02 → S06

Produces:
- real review-first photo intake flow used by the integrated loop

Consumes:
- S01 context routing

### S03 → S06

Produces:
- persisted inventory truth used by downstream status and suggestion features

Consumes:
- S02 confirmed intake payloads

### S04 → S06

Produces:
- explicit maintenance actions that keep the integrated system truthful over time

Consumes:
- S03 persisted inventory

### S05 → S06

Produces:
- final user-visible payoff surfaces for status, alerts, and cooking guidance

Consumes:
- S03 inventory truth and S04 maintenance/state updates
