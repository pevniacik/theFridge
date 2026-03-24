# S03: Last-Used Fridge Memory

**Goal:** Tapping the home screen icon (or navigating to `/`) opens directly to the last fridge context the user visited, with navigation back to the fridge list always reachable.
**Demo:** Visit fridge A → close app → reopen at `/` → lands on fridge A. Click "← Back to overview" → fridge list loads. Visit fridge B → reopen → lands on fridge B.

## Must-Haves

- Client-side `localStorage['lastFridgeId']` written on every fridge context visit
- Root page (`/`) redirects to `/fridges/<lastFridgeId>` on mount when value exists
- First visit (no localStorage value) shows the normal landing page — no redirect
- Navigation to `/fridges` (fridge list) remains accessible from the fridge context page
- Deleted-fridge graceful degradation: redirect to a non-existent fridge shows the existing not-found UI with recovery links

## Verification

- `npm run type-check` exits 0
- `npm run build` exits 0
- `test -f app/components/LastFridgeRedirect.tsx` — redirect component exists
- `test -f app/fridges/\[fridgeId\]/LastFridgeWriter.tsx` — writer component exists
- `grep -q "LastFridgeRedirect" app/page.tsx` — redirect wired into landing page
- `grep -q "LastFridgeWriter" app/fridges/\[fridgeId\]/page.tsx` — writer wired into fridge page

## Tasks

- [ ] **T01: Implement last-used fridge memory with localStorage** `est:30m`
  - Why: This is the entire slice — two small client components (redirect reader + fridge ID writer) wired into existing server component pages.
  - Files: `app/components/LastFridgeRedirect.tsx`, `app/fridges/[fridgeId]/LastFridgeWriter.tsx`, `app/page.tsx`, `app/fridges/[fridgeId]/page.tsx`
  - Do: Create `LastFridgeRedirect` client component that reads `localStorage['lastFridgeId']` on mount and calls `router.replace('/fridges/<id>')` if present, renders null. Create `LastFridgeWriter` client component that writes `localStorage['lastFridgeId'] = fridgeId` on mount, renders null. Import and render `<LastFridgeRedirect />` at top of `HomePage` return in `app/page.tsx`. Import and render `<LastFridgeWriter fridgeId={fridgeId} />` in the found-fridge path of `app/fridges/[fridgeId]/page.tsx`. Both parent pages remain Server Components.
  - Verify: `npm run type-check && npm run build` both exit 0; `grep -q "LastFridgeRedirect" app/page.tsx && grep -q "LastFridgeWriter" app/fridges/\[fridgeId\]/page.tsx`
  - Done when: Both components exist, are wired in, type-check and build pass.

## Files Likely Touched

- `app/components/LastFridgeRedirect.tsx`
- `app/fridges/[fridgeId]/LastFridgeWriter.tsx`
- `app/page.tsx`
- `app/fridges/[fridgeId]/page.tsx`
