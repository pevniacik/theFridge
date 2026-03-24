# S03 UAT: Last-Used Fridge Memory

**Milestone:** M002  
**Slice:** S03  
**Written:** 2026-03-24  
**Tester:** Human (manual browser + PWA device verification)

---

## Preconditions

- App is running (`npm run dev` or `docker compose up`) and accessible at `http://localhost:3000` (or the LAN IP)
- At least **one fridge** exists in the database (create via "New fridge" if needed)
- Browser DevTools available (for localStorage inspection)
- For PWA tests: a phone on the home LAN with the app installed to Home Screen from S02 (optional but recommended)

---

## Test Cases

### TC-01: First visit — no redirect, landing page shows normally

**Goal:** Confirm the landing page renders normally when no `lastFridgeId` is stored.

**Steps:**
1. Open DevTools → Application → Local Storage. Delete the `lastFridgeId` key if present (`localStorage.removeItem('lastFridgeId')` in Console, or via the UI).
2. Navigate to `http://localhost:3000/` (or reload).
3. Observe the page.

**Expected:**
- The landing page renders (fridge list or "Create your first fridge" prompt).
- No automatic redirect occurs.
- DevTools Console: `localStorage.getItem('lastFridgeId')` returns `null`.

**Failure signal:** Page immediately redirects to a fridge context with no fridge having been visited.

---

### TC-02: Visiting a fridge writes localStorage

**Goal:** Confirm `LastFridgeWriter` records the fridge ID on every fridge context visit.

**Steps:**
1. Clear `lastFridgeId` as in TC-01.
2. Navigate to a fridge context page (e.g., click on "Fridge A" from the list, or go to `/fridges/<some-id>` directly).
3. Open DevTools Console and run: `localStorage.getItem('lastFridgeId')`

**Expected:**
- Console returns the ID string of the fridge you just visited (non-null, matches the URL `fridgeId` segment).

**Failure signal:** `null` returned — `LastFridgeWriter` did not fire.

---

### TC-03: Returning to `/` redirects to last-used fridge

**Goal:** Confirm `LastFridgeRedirect` fires and routes the user directly to the last fridge.

**Steps:**
1. Visit a fridge context page (TC-02 should have run; `lastFridgeId` is now set).
2. Navigate to `http://localhost:3000/` (not `/fridges` — must be the root).
3. Observe the resulting URL and page content.

**Expected:**
- URL changes from `/` to `/fridges/<lastFridgeId>` without a page reload (client-side replace).
- The fridge context page for the last-visited fridge renders.
- Pressing the browser **Back** button from the fridge context page does NOT return to `/` — it goes to the page before you started (back-stack is not polluted by the redirect).

**Failure signal:** Stays on landing page; or redirects with `router.push` (Back button loops back to `/` which redirects forward again).

---

### TC-04: Switching fridge updates the memory

**Goal:** Confirm that visiting a different fridge updates `lastFridgeId` to the new fridge.

**Precondition:** At least two fridges exist.

**Steps:**
1. Visit **Fridge A** — confirm `localStorage.getItem('lastFridgeId')` = Fridge A's ID.
2. Navigate to `/fridges` (fridge list).
3. Click on **Fridge B**.
4. Run `localStorage.getItem('lastFridgeId')` in Console.
5. Navigate to `/` (root).

**Expected:**
- After step 4: Console returns Fridge B's ID (not Fridge A's).
- After step 5: Redirect goes to Fridge B's context, not Fridge A's.

**Failure signal:** Memory not updated — redirect still goes to Fridge A.

---

### TC-05: Navigation back to fridge list is always accessible

**Goal:** Confirm R026 — users are never trapped in a single fridge context.

**Steps:**
1. Open any fridge context page.
2. Look for the back navigation link in the page header (should read "← Back to overview" or similar).
3. Click it.

**Expected:**
- Navigates to `/fridges` (the fridge list page).
- All fridges are listed.
- Navigating back to `/` again still redirects to the last-visited fridge.

**Failure signal:** No back link visible; or link is broken; or link navigates somewhere unexpected.

---

### TC-06: Deleted fridge — graceful degradation, no redirect loop

**Goal:** Confirm a stale `lastFridgeId` pointing to a deleted fridge does not cause a redirect loop.

**Steps:**
1. Identify a fridge ID (from DevTools or URL).
2. Manually set localStorage to a non-existent ID: `localStorage.setItem('lastFridgeId', 'nonexistent-id-abc')`.
3. Navigate to `http://localhost:3000/`.
4. Observe the result.

**Expected:**
- `LastFridgeRedirect` fires and navigates to `/fridges/nonexistent-id-abc`.
- The fridge context page renders its "storage not found" UI with recovery links (e.g., "Back to fridge list").
- No redirect loop back to `/` occurs (the not-found page does not redirect to root).
- Clicking the recovery link returns to the fridge list.

**Failure signal:** Infinite redirect loop between `/` and `/fridges/<bad-id>`; or 500 error; or blank page.

---

### TC-07 (PWA, optional): Home screen icon opens last-used fridge

**Goal:** Confirm the full S03 value prop in the installed PWA context.

**Precondition:** PWA installed on phone (Home Screen) from S02. App accessible on LAN.

**Steps:**
1. On the phone, open the app from the browser (not Home Screen icon) and visit a fridge context page.
2. Close the browser tab.
3. Tap the **Home Screen icon** to launch the standalone PWA.
4. Observe the landing screen.

**Expected:**
- The standalone PWA launches and immediately redirects to the last-visited fridge context (not the landing page).
- No browser address bar visible (standalone mode).

**Failure signal:** PWA opens to the fridge list / landing page every time; redirect does not fire in standalone mode.

**Diagnostic if failing:** Check that `start_url` in `/public/manifest.json` is `"/"` (not a fridge-specific URL). Check that `lastFridgeId` is present in localStorage on the device.

---

## Edge Cases Covered

| Scenario | Handled by |
|----------|------------|
| No fridge visited yet (null localStorage) | TC-01 — landing page renders normally |
| First fridge visit | TC-02 — localStorage written on mount |
| Back-stack pollution | TC-03 — `router.replace` prevents looping |
| Multiple fridges / context switching | TC-04 — memory updates on each visit |
| Always-accessible fridge list | TC-05 — header back link |
| Deleted fridge (stale ID) | TC-06 — not-found UI, no loop |
| Standalone PWA launch | TC-07 — `start_url: "/"` triggers redirect |

---

## Diagnostic Commands

```js
// Check stored value
localStorage.getItem('lastFridgeId')

// Reset memory (go back to first-visit state)
localStorage.removeItem('lastFridgeId')

// Simulate stale/deleted fridge
localStorage.setItem('lastFridgeId', 'fake-id-xyz')
```
