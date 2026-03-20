# T02: Implement fridge/freezer identity records and QR generation

**Slice:** S01
**Milestone:** M001

## Goal
Create stable fridge/freezer identity records and let the app generate printable QR codes that point to those storage contexts.

## Must-Haves

### Truths
Observable behaviors that must be true when this task is done:
- "A user can create a named fridge/freezer record"
- "The app generates a printable QR code for that specific fridge/freezer"
- "The QR payload resolves to the route shape promised in the boundary map"

### Artifacts
Files that must exist with real implementation (not stubs):
- `lib/fridges/store.ts` — fridge/freezer identity creation and lookup logic
- `app/fridges/new/page.tsx` — create-fridge/freezer UI
- `app/api/fridges/route.ts` or equivalent server action surface — creation endpoint/action
- `lib/qr/*` or equivalent QR helper — QR payload and rendering logic

### Key Links
Critical wiring between artifacts:
- `app/fridges/new/page.tsx` → `lib/fridges/store.ts` via create-fridge/freezer action
- `lib/qr/*` → fridge/freezer identity record via stable ID encoded in QR target
- `app/fridges/new/page.tsx` → generated fridge/freezer route via rendered QR target preview

## Steps
1. Define the fridge/freezer identity shape and stable ID strategy.
2. Implement local persistence or provisional persistence for identity records.
3. Build the create-fridge/freezer flow.
4. Generate printable QR output that encodes the target storage-context URL.
5. Verify the generated QR target matches the promised route contract.

## Context
- The app itself must generate the QR code; external QR tooling is not enough.
- Printable output matters because the QR will be attached to a real fridge/freezer.
- This task establishes the identity contract consumed by S02 and S06.
