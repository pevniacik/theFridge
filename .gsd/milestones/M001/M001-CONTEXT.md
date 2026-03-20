# M001: Local-first household fridge inventory — Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

## Project Description

This milestone builds a shared household web app that represents real fridges and freezers in digital form. Each physical storage unit should have its own printable QR code so a person standing in front of it can scan the code on the home Wi‑Fi and immediately enter that storage context. Inside that context, the app should help the household capture groceries from photos, review and correct drafted items, record expiry or estimated expiry, maintain trustworthy inventory over time, and ask what they might cook from what they already have.

## Why This Milestone

The main problem is not abstract meal planning. It is not knowing what is in the fridge or freezer right now, forgetting food in the freezer, and throwing food away because its age or expiry is no longer visible. This milestone matters now because it proves the real product loop in the real environment the user actually wants first: a local home-network web app, not a public SaaS deployment.

## User-Visible Outcome

### When this milestone is complete, the user can:

- print a QR code for a fridge or freezer, scan it at home, and open the correct storage context in the local web app
- take a grocery photo, review the drafted inventory, save confirmed items, and later ask for the actual status of that fridge/freezer
- see aging or expiring food and get grounded cooking suggestions based on what is actually there

### Entry point / environment

- Entry point: local web app opened by direct URL or via printed QR scan
- Environment: browser on devices connected to the home network over Wi‑Fi
- Live dependencies involved: browser camera/photo upload, local app runtime, local database, AI-assisted draft extraction and suggestion flow

## Completion Class

- Contract complete means: QR generation works, QR context routing works, review-first intake works, confirmed inventory is persisted, expiry data is represented, status can be queried, and update/remove flows exist with visible failure states
- Integration complete means: the real QR → storage context → photo intake → review → save → status → update/remove → suggestion loop works across the assembled local system
- Operational complete means: the app runs locally on the home network and can be reached by the household in that environment

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- a person can print a fridge/freezer QR code, scan it while on the home network, and land in the correct storage context
- a person can upload a grocery photo in that context, review or correct the drafted items, and save them as item-level inventory with expiry or estimated expiry data
- a household member can later view current status, remove or discard used items, and see the status change truthfully
- cooking suggestions are generated from the real current inventory, not a fake fixture-only state
- the assembled system works as a local web app in a real home-network setup rather than only in isolated tests

## Risks and Unknowns

- Grocery photo understanding may draft the wrong items or miss detail — trust depends on a strong review-and-correct loop
- Inventory truth can decay after intake if update/remove flows are awkward — this would undermine the entire product
- Expiry for produce and similar food is not always explicit — the UX for estimated expiry needs to feel natural rather than annoying
- Shared household use means more than one person can mutate the same inventory — the system must keep the current state understandable
- Local-home deployment can still fail at the real QR entrypoint if routing, host addressing, or device/network assumptions are brittle

## Existing Codebase / Prior Art

- `.gitignore` — repo currently has no product implementation; this milestone starts from a clean slate
- planned local-first web app pattern — version 1 should stay browser-based and home-network reachable rather than branching into native mobile or public hosting work
- printable QR-based fridge/freezer identity — user-specified interaction pattern that ties physical storage to digital context
- review-first AI intake — product pattern established from discussion: AI drafts, humans confirm

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R001 — scanning a printable QR code opens a specific fridge/freezer context
- R002 — the app generates printable QR codes itself
- R003 — grocery photos become draft inventory
- R004 — drafted items are reviewed before they become truth
- R005 — inventory is item-level within a storage context
- R006 — expiry and estimated expiry are both supported
- R007 — explicit updates/removals keep the inventory truthful
- R008 — current fridge/freezer status is available on demand
- R009 — aging and forgotten food is surfaced
- R010 — cooking suggestions are grounded in current inventory
- R011 — version 1 runs locally on the home network
- R013 — shared household usage works in practice
- R014 — uncertainty and bad scans are visible rather than silently corrupting state

## Scope

### In Scope

- printable QR generation for storage contexts
- QR-based context entry into a local web app
- photo upload intake that produces a draft rather than final truth
- review and correction of drafted items before saving
- item-level inventory persistence per fridge/freezer
- expiry dates and user-estimated expiry
- explicit remove/update/discard flows
- status view for a fridge/freezer
- aging/forgotten-food surfacing
- grounded cooking suggestions from current inventory
- local-home-network runtime proof

### Out of Scope / Non-Goals

- public domain-hosted deployment
- native mobile app work
- fully automatic inventory truth without confirmation
- nutrition or calorie tracking
- barcode-first product cataloging as the main product shape
- deep quantity precision as a requirement for version 1

## Technical Constraints

- version 1 must run locally over the home network
- the primary surface is a web app because it is easier to develop and keep live
- QR codes must be printable, not only renderable on screen
- the system should prefer low-cost or open-source/local AI options where practical
- presence-first quantity tracking is acceptable in version 1

## Integration Points

- browser camera / file upload — used for grocery photo intake
- QR scanning in browser — used to enter the correct storage context from a printed code
- local database/storage — persists fridge/freezer definitions, inventory items, expiry data, and update history
- AI extraction layer — drafts grocery items from photos
- AI suggestion layer — proposes what to cook from current inventory

## Open Questions

- what level of household access control is enough for M001 shared usage — likely simple, but still needs a concrete decision during planning
- how should estimated expiry be represented so it is fast to enter but still understandable later
- how much suggestion output should look like recipes versus practical “you could make this tonight” guidance
- how should local QR links encode or resolve the local app address in a way that is stable enough for home use
