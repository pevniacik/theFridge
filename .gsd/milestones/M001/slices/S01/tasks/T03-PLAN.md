# T03: Wire QR entry into storage-context resolution

**Slice:** S01
**Milestone:** M001

## Goal
Make QR targets open the correct fridge/freezer context in the local web app and prove the app handles invalid or missing IDs safely.

## Must-Haves

### Truths
Observable behaviors that must be true when this task is done:
- "Opening a valid fridge/freezer QR target loads the correct storage context page"
- "The storage-context page clearly identifies which fridge/freezer was loaded"
- "Invalid or missing fridge/freezer IDs show a visible failure state instead of a broken page"

### Artifacts
Files that must exist with real implementation (not stubs):
- `app/fridges/[fridgeId]/page.tsx` — storage-context page that resolves and shows a fridge/freezer
- `lib/fridges/store.ts` — lookup logic used by the dynamic route
- `app/not-found.tsx` or route-local failure handling — invalid context behavior if needed
- verification artifacts or tests proving the routing contract

### Key Links
Critical wiring between artifacts:
- `app/fridges/[fridgeId]/page.tsx` → `lib/fridges/store.ts` via fridge/freezer lookup by stable ID
- generated QR target from T02 → `app/fridges/[fridgeId]/page.tsx` via matching route contract
- invalid lookup path → visible failure UI rather than silent crash

## Steps
1. Implement fridge/freezer lookup in the dynamic route.
2. Render a context page that proves the correct fridge/freezer was loaded.
3. Add invalid-ID handling and visible error or not-found behavior.
4. Verify that generated QR targets from T02 resolve correctly.
5. Record evidence that S01’s boundary outputs are real and wired.

## Context
- This task closes the first real user loop of the product.
- The result must be demoable in a browser even before photo intake exists.
- Keep the context page honest: it should prove identity resolution, not pretend the rest of the product already exists.

## Expected Output

Key files produced or modified by this task:
- `app/fridges/[fridgeId]/page.tsx` — storage-context page wired to real identity lookup
- `lib/fridges/store.ts` — `getFridgeById` lookup used by the dynamic route
- `app/fridges/new/page.tsx` — create-fridge entrypoint (linked from not-found UI)
- `components/QrCode.tsx` — server-side QR renderer used by context page

## Observability Impact

**Signals added / changed:**
- `GET /fridges/<valid-id>` → 200 with fridge name and "STORAGE CONTEXT" label in body; confirms identity resolution in server log and curl.
- `GET /fridges/<invalid-id>` → 200 with "STORAGE NOT FOUND" in body; confirms failure state is handled and visible (not a silent blank page or unhandled exception).
- QR code SVG is rendered inline on the context page; the URL encoded in the QR must match `http://<host>/fridges/<id>` — verify with `curl /fridges/<id> | grep fridges/<id>` to confirm the payload is correct.

**How to inspect this task:**
```bash
# Valid ID → context page
curl -s http://localhost:3000/fridges/<id> | grep "storage context"  # must print 1+

# Invalid ID → not-found page
curl -s http://localhost:3000/fridges/does-not-exist | grep "not found"  # must print 1+

# QR URL payload matches route
curl -s http://localhost:3000/fridges/<id> | grep "fridges/<id>"  # must print 1+
```

**Failure visibility:**
- Unknown `fridgeId` renders a "STORAGE NOT FOUND" card with the bad ID highlighted and a link to create a new unit — no silent blank screen, no unhandled exception.
- If `getFridgeById` throws (DB unavailable), Next.js surfaces the error in the terminal and returns a 500 error page.
