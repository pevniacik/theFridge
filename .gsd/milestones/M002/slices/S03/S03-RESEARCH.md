# S03 Research: Last-Used Fridge Memory

**Milestone:** M002 — Zero-Friction Access & Deployment
**Slice:** S03 — Last-Used Fridge Memory
**Complexity:** Light — well-understood browser API, clear pattern, small surface area
**Requirements:** R025 (last-used fridge redirect), R026 (fridge list navigation preserved)

---

## Summary

S03 is two small changes to two existing files, plus a new tiny client component. The approach is fully prescribed by D031. No new libraries needed. No risky integration. The entire slice can be decomposed into a single task.

---

## Recommendation

Two-component approach:
1. **`LastFridgeRedirect` client component** — added to `app/page.tsx` as a child. Runs `useEffect` on mount, reads `localStorage['lastFridgeId']`, calls `router.replace('/fridges/<id>')` if present.
2. **`LastFridgeWriter` client component** — added inside `app/fridges/[fridgeId]/page.tsx`. Runs `useEffect` on mount, writes `localStorage['lastFridgeId'] = fridgeId`.

Both pages remain Server Components. Only the small client islands handle localStorage.

---

## Implementation Landscape

### `app/page.tsx` (currently pure Server Component)

The landing page is a static marketing/info page with no `"use client"` anywhere. To access `localStorage`, inject a small `LastFridgeRedirect` client component that runs on mount:

```tsx
// app/components/LastFridgeRedirect.tsx  (new file)
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LastFridgeRedirect() {
  const router = useRouter();
  useEffect(() => {
    const lastId = localStorage.getItem("lastFridgeId");
    if (lastId) router.replace(`/fridges/${lastId}`);
  }, [router]);
  return null;
}
```

This component renders `null` — no visual change. It's placed at the top of the `HomePage` return (before the hero content) so the redirect fires immediately on mount. Using `router.replace` (not `push`) avoids adding the root to the back-stack, which matches PWA launch semantics.

**Edge case:** if `lastFridgeId` exists in localStorage but points to a deleted fridge, the fridge context page already handles this gracefully (shows "not found" UI with a link back to the list — no crash, no loop).

### `app/fridges/[fridgeId]/page.tsx` (currently pure Server Component)

Add a `LastFridgeWriter` client component near the top of the found-fridge render path:

```tsx
// app/fridges/[fridgeId]/LastFridgeWriter.tsx  (new file, co-located)
"use client";
import { useEffect } from "react";

export default function LastFridgeWriter({ fridgeId }: { fridgeId: string }) {
  useEffect(() => {
    localStorage.setItem("lastFridgeId", fridgeId);
  }, [fridgeId]);
  return null;
}
```

Place it right after the breadcrumb `<nav>` in the JSX. `fridgeId` is a stable string prop from the server — the effect is idempotent.

### R026: Fridge list navigation already satisfied

`app/fridges/[fridgeId]/page.tsx` already has `← Back to overview` linking to `/fridges` (the full list). This link bypasses the root redirect — it goes directly to `/fridges`, not `/`. R026 is satisfied without any new work.

**One nuance to flag for the planner:** The global header in `app/layout.tsx` has "theFridge" as a `<Link href="/">`. With S03 in place, tapping that header link from within a fridge context will redirect back to the same fridge (since lastFridgeId is set). This is acceptable — the explicit `/fridges` links are the "switch context" escape hatch. However, the planner may optionally consider pointing the header logo to `/fridges` instead of `/` for clarity. This is a UX decision, not a requirement — flag but don't block on it.

### File summary

| File | Change | Notes |
|------|--------|-------|
| `app/components/LastFridgeRedirect.tsx` | **New** | Client component; reads localStorage; redirects on mount |
| `app/fridges/[fridgeId]/LastFridgeWriter.tsx` | **New** | Client component; writes localStorage on mount |
| `app/page.tsx` | **Edit** | Import and render `<LastFridgeRedirect />` at top of JSX |
| `app/fridges/[fridgeId]/page.tsx` | **Edit** | Import and render `<LastFridgeWriter fridgeId={fridgeId} />` in found-fridge path |

### Patterns to follow (from existing codebase)

- `useState` initializer function (not `useEffect`) for prop-derived state is the M001 pattern — but `useEffect` is correct here because we're interacting with browser storage, not deriving component state.
- `useTransition` wraps `router.refresh()` in M001 mutations — not needed here since we're using `router.replace()` for navigation, not a data refresh.
- Components co-located with their page: `LastFridgeWriter` can live in `app/fridges/[fridgeId]/` alongside `IntakeSection.tsx` etc.
- `LastFridgeRedirect` is more general and belongs in `app/components/` (which already contains `QrCode.tsx`).

---

## Verification

Manual + automated:

1. **Type-check:** `npm run type-check` — exits 0.
2. **Build:** `npm run build` — exits 0.
3. **Functional (manual):**
   - Open root `/` → fridge list shown (no lastFridgeId set yet).
   - Visit `/fridges/<id>` → localStorage `lastFridgeId` = `<id>`.
   - Navigate to `/` → immediately redirected to `/fridges/<id>`.
   - Click "← Back to overview" from fridge context → `/fridges` list loads (no redirect).
   - Visit a different fridge `/fridges/<id2>` → localStorage updates.
   - Reload root → redirected to `/fridges/<id2>`.
4. **PWA launch (R025 proof):** With standalone PWA installed, tap home screen icon → app opens to last-used fridge (requires S02 UAT phone install to be complete).
5. **Deleted-fridge graceful degradation:** Set `localStorage['lastFridgeId']` to a non-existent ID manually → root redirects to that fridge URL → "not found" page shows → "← Back to overview" or "View all →" recovers the user.

---

## What the Planner Needs to Decide

- Whether to point the header logo (`app/layout.tsx`) to `/fridges` instead of `/` — improves UX when lastFridgeId is set but is optional for R026 compliance.
- Whether to add a `scripts/verify-s03-memory.sh` integration test script (following the S02 verification script pattern), or keep verification manual-only given the simplicity.
