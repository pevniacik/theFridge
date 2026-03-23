# S05 UAT: Status, alerts, and cooking suggestions

**Milestone:** M001
**Written:** 2026-03-23
**Tester:** human, at your convenience

## Preconditions

- App running locally (`npm run dev`)
- A fridge exists with mixed active inventory — at least one item expired, one expiring within 3 days, one not touched in 14+ days, and one fresh item

## Test Cases

### 1. Status overview renders on fridge page
1. Open any fridge context page (`/fridges/<id>`).
2. Scroll to the status section (below the QR panel).
3. **Expected:** A card labelled "STATUS OVERVIEW" shows total active item count prominently.

### 2. Urgency pills appear for problem items
1. Use a fridge that has expired, expiring-soon, and forgotten items.
2. **Expected:** Urgency pills visible: red "N EXPIRED", amber "N EXPIRING SOON", softer amber "N EST. SOON", muted "N FORGOTTEN".
3. **Expected:** If all items are fine, shows "ALL GOOD" pill in cyan instead.

### 3. Alert rows show item names and days info
1. Scroll to "NEEDS ATTENTION" section.
2. **Expected:** Each alert row shows: item name, urgency badge (EXPIRED / EXPIRING SOON / EXPIRING SOON (EST.) / FORGOTTEN), and days-info copy (e.g. "expired 3 days ago", "expires in 1 day", "not touched in 22 days").
3. **Expected:** Estimated-expiry items have a softer amber badge than hard-deadline items.
4. **Expected:** Section is absent for fridges with no alert-level items.

### 4. Cooking suggestions reference actual item names
1. Scroll to "COOKING IDEAS" section.
2. **Expected:** Each suggestion card shows a title ("Use soon", "Cook tonight", or "Rediscover") and ingredient pills containing real names from the fridge inventory.
3. **Expected:** "Use soon" and "Cook tonight" have warm amber styling when urgent items exist.
4. **Expected:** Section is absent if no items meet the suggestion threshold.

### 5. Empty fridge shows clean empty state
1. Open a fridge with zero active inventory items.
2. **Expected:** Status overview shows "0 active items" and a "NO ITEMS IN INVENTORY" pill.
3. **Expected:** No "NEEDS ATTENTION" section and no "COOKING IDEAS" section are rendered (no blank cards, no errors).

## Failure Signals

- Blank card sections with no content (empty render instead of empty state)
- Item names in suggestions don't match items in the inventory list on the same page
- Estimated-expiry items styled identically to hard-deadline items (no distinction)
- JavaScript errors in browser console
