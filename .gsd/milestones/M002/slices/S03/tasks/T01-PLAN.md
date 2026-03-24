---
estimated_steps: 4
estimated_files: 4
skills_used:
  - react-best-practices
---

# T01: Implement last-used fridge memory with localStorage

**Slice:** S03 — Last-Used Fridge Memory
**Milestone:** M002

## Description

Create two small client components that implement last-used fridge memory via `localStorage`. `LastFridgeRedirect` reads the stored fridge ID on mount and redirects to it; `LastFridgeWriter` writes the current fridge ID on every visit. Both render `null` — they are invisible side-effect islands inside Server Component pages. This is the pattern prescribed by decision D031.

## Steps

1. Create `app/components/LastFridgeRedirect.tsx` — a `"use client"` component that:
   - Calls `useRouter()` from `next/navigation`
   - In a `useEffect`, reads `localStorage.getItem("lastFridgeId")`
   - If the value exists, calls `router.replace(\`/fridges/\${lastId}\`)` (replace, not push, to avoid polluting back-stack)
   - Returns `null` — no visual output
   - Dependency array: `[router]`

2. Create `app/fridges/[fridgeId]/LastFridgeWriter.tsx` — a `"use client"` component that:
   - Accepts `{ fridgeId: string }` as props
   - In a `useEffect`, calls `localStorage.setItem("lastFridgeId", fridgeId)`
   - Returns `null`
   - Dependency array: `[fridgeId]`

3. Edit `app/page.tsx`:
   - Add `import LastFridgeRedirect from "@/components/LastFridgeRedirect";` at the top
   - Render `<LastFridgeRedirect />` as the first child inside the outer `<div>` of `HomePage`'s return

4. Edit `app/fridges/[fridgeId]/page.tsx`:
   - Add `import LastFridgeWriter from "./LastFridgeWriter";` with the other imports
   - Render `<LastFridgeWriter fridgeId={fridgeId} />` in the found-fridge render path, right after the breadcrumb `<nav>` element (around line 155)

## Must-Haves

- [ ] `LastFridgeRedirect` uses `router.replace` (not `push`) for the redirect
- [ ] `LastFridgeRedirect` does nothing when `localStorage.getItem("lastFridgeId")` returns `null`
- [ ] `LastFridgeWriter` writes `localStorage['lastFridgeId']` with the `fridgeId` prop value
- [ ] Both components are `"use client"` and render `null`
- [ ] Parent pages (`app/page.tsx`, `app/fridges/[fridgeId]/page.tsx`) remain Server Components — no `"use client"` added to them
- [ ] `npm run type-check` exits 0
- [ ] `npm run build` exits 0

## Verification

- `npm run type-check` exits 0
- `npm run build` exits 0
- `grep -q '"use client"' app/components/LastFridgeRedirect.tsx` — confirms client directive
- `grep -q '"use client"' app/fridges/\[fridgeId\]/LastFridgeWriter.tsx` — confirms client directive
- `grep -q "router.replace" app/components/LastFridgeRedirect.tsx` — confirms replace not push
- `grep -q "LastFridgeRedirect" app/page.tsx` — confirms wiring
- `grep -q "LastFridgeWriter" app/fridges/\[fridgeId\]/page.tsx` — confirms wiring

## Inputs

- `app/page.tsx` — existing landing page (Server Component) where redirect component will be inserted
- `app/fridges/[fridgeId]/page.tsx` — existing fridge context page (Server Component) where writer component will be inserted
- `app/components/QrCode.tsx` — reference for component placement convention in `app/components/`

## Expected Output

- `app/components/LastFridgeRedirect.tsx` — new client component that reads localStorage and redirects
- `app/fridges/[fridgeId]/LastFridgeWriter.tsx` — new client component that writes localStorage
- `app/page.tsx` — modified to import and render `<LastFridgeRedirect />`
- `app/fridges/[fridgeId]/page.tsx` — modified to import and render `<LastFridgeWriter />`
