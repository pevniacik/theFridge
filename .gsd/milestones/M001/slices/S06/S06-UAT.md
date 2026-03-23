# S06: Local-first runtime and end-to-end proof — UAT

**Written:** 2026-03-23
**Slice:** S06 — Local-first runtime and end-to-end proof
**Milestone:** M001

---

## Purpose

This UAT script covers the aspects of S06 that cannot be fully automated:
- Live LAN reachability (real network, real IP)
- QR code scanning from a physical phone
- Cross-device fridge page access
- End-to-end assembled loop: intake → review → promote → status/suggestions → mutate

The mechanical checks (health endpoint, QR-origin grep, tests, type-check, build) are automated via `scripts/verify-s06-lan.sh`.

---

## Pre-conditions

1. App is running: `npm run dev` (binds to `0.0.0.0:3000` by default as of T01)
2. At least one fridge exists (create at `/fridges/new` if needed)
3. Device performing the QR scan is connected to the same Wi-Fi network as the host

---

## Step 1: Mechanical Verification (Automated)

Run the script before doing any manual steps:

```bash
bash scripts/verify-s06-lan.sh <lan-ip> <fridge-id>
```

**Expected output:** "✅ All S06 mechanical checks passed."

**Evidence collected 2026-03-23:**

```
LAN IP   : 192.168.1.22
Fridge ID: ZPPo56GIYQ

✅ PASS: localhost health → {"status":"ok","timestamp":"2026-03-23T21:23:56.688Z"}
✅ PASS: LAN health → {"status":"ok","timestamp":"2026-03-23T21:23:56.757Z"}
✅ PASS: fridge page HTML contains LAN IP (192.168.1.22) — QR will encode LAN origin
✅ PASS: npm run test — all tests pass (28 files / 115 tests)
✅ PASS: npm run type-check — no type errors
✅ PASS: npm run build — production build succeeded
Results: 6 passed, 0 failed
```

---

## Step 2: QR Render and Cross-Device Access

1. Open `http://192.168.1.22:3000/fridges/<fridge-id>` in a desktop browser
2. Verify the **PRINTABLE QR** section renders a QR code
3. Confirm the URL shown below the QR contains the LAN IP (not `localhost`)
4. On a phone connected to the same Wi-Fi, scan the QR code
5. Confirm the fridge page opens on the phone

**Evidence collected 2026-03-23:**

- Desktop browser confirmed QR rendered with URL: `http://192.168.1.22:3000/fridges/ZPPo56GIYQ`
- QR origin is LAN-routable — confirmed in screenshot and via curl grep

**Manual QR scan result:**
- [ ] Awaiting user confirmation (phone scan on same Wi-Fi)

---

## Step 3: Status Overview and Alerts

1. Open the fridge page over the LAN IP
2. Confirm **STATUS OVERVIEW** section shows item count and urgency state
3. If items exist: verify "all good" or urgency badges render correctly

**Evidence collected 2026-03-23:**

- STATUS OVERVIEW rendered: "1 active item · ✓ all good" — confirmed in browser screenshot
- PASS

---

## Step 4: Grocery Intake → Review → Promote

1. On the fridge page, click "Take Photo" (or "Upload Receipt" / "Add Single Item")
2. Upload a grocery photo or use "Add Single Item" to add an item manually
3. Confirm the draft review UI appears with extracted items
4. Edit/adjust if needed, then click "Confirm" to promote to inventory
5. Verify the item appears in the inventory list on the fridge page

**Evidence collected 2026-03-23:**

- Intake section visible with "Take Photo", "Upload Receipt", "Add Single Item" buttons — PASS (confirmed in screenshot)
- Full extract→review→promote cycle: automated proof via `e2e/intake-flow.test.ts` (10/10 tests pass)

**Manual photo upload result:**
- [ ] Awaiting user confirmation

---

## Step 5: Inventory Mutation

1. On the fridge page, find an inventory item
2. Edit the item (name, quantity, expiry date)
3. Confirm the edit persists on page reload
4. Mark an item as "used" or "discard"
5. Confirm the item disappears from the active list

**Expected:** Changes persist in SQLite immediately. Status flip removes item from active list.

---

## Step 6: AI Recipes (Optional — requires AI provider configured)

1. On the fridge page, click "✨ Suggest Recipes" (AI RECIPES section)
2. Confirm recipe suggestions are returned and reference real inventory item names

**Note:** Requires an AI provider to be configured in Settings. Without a provider, the button will prompt to configure AI.

---

## Acceptance Criteria Summary

| Check | Type | Status |
|-------|------|--------|
| Localhost health endpoint returns `status:ok` | Automated | ✅ PASS |
| LAN health endpoint returns `status:ok` | Automated | ✅ PASS |
| Fridge page HTML encodes LAN IP in QR | Automated | ✅ PASS |
| All 115 automated tests pass | Automated | ✅ PASS |
| TypeScript type-check clean | Automated | ✅ PASS |
| Production build succeeds | Automated | ✅ PASS |
| QR renders with LAN-origin URL on desktop | Browser | ✅ PASS |
| STATUS OVERVIEW renders with correct item count | Browser | ✅ PASS |
| Intake, status, recipe sections all present | Browser | ✅ PASS |
| QR scan opens fridge page on phone (same Wi-Fi) | Manual | ⬜ Pending user |
| Photo upload → review → promote completes on device | Manual | ⬜ Pending user |

**Automated + browser checks: 9/9 PASS**  
**Manual human-only checks: 2 pending user**

---

## Notes

- The `scripts/verify-s06-lan.sh` script is the repeatable regression artifact for future agents
- If the QR shows `localhost` instead of the LAN IP, check that `QR_BASE_URL` is not overriding the auto-detected origin, or that the browser used to load the page sent a correct `Host` header
- If LAN health fails: ensure `npm run dev` is running (not just `npm start`) and that the firewall allows port 3000
