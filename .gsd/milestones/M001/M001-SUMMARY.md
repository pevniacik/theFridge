---
id: M001
title: Local-first household fridge inventory
status: complete
completed_at: 2026-03-23
slices_complete: 6/6
requirements_validated: 13
---

# M001: Local-first household fridge inventory — Summary

**A shared household local web app for fridge and freezer inventory. QR codes route household members to the correct storage context. Photo intake extracts grocery drafts that humans review before items become inventory truth. Inventory surfaces urgency-aware status, alerts, and grounded cooking suggestions. The full loop is proven on a real home network.**

---

## What Was Built

### S01: QR identity and local fridge entry
- Fridge/freezer creation at `/fridges/new` with stable nanoid-based IDs
- `lib/qr/origin.ts` — LAN-origin-aware QR URL resolution (env override → forwarded-host → host header → localhost fallback)
- Printable QR section on the fridge context page encoding the LAN-routable URL
- Route at `/fridges/[fridgeId]` as the QR-entry landing page

### S02: Photo intake with review-first draft
- `app/api/intake/[fridgeId]/route.ts` — multipart photo upload → AI extraction → `intake_drafts` rows
- `lib/intake/extract.ts` — provider-dispatching extraction with stub fallback (D013)
- `lib/intake/providers/` — Google, OpenAI, Anthropic, and Stub providers
- `IntakeSection.tsx` — client component with phase-enum state machine (idle → uploading → review → confirming)
- Draft review UI: editable item fields, confidence badge, reject/confirm per item, confirm-all action

### S03: Inventory truth and expiry model
- `lib/inventory/store.ts` — `promoteToInventory()` (atomic transaction: insert items + confirm drafts), `listInventoryItems()`
- `inventory_items` table with `expiry_date`, `expiry_estimated`, `purchase_date`, `status` fields
- `InventorySection.tsx` — inline editing, expiry date display, item mutation actions

### S04: Shared household inventory maintenance
- `updateInventoryItem()` and `setInventoryItemStatus()` scoped by `id AND fridge_id` (cross-fridge write impossible)
- Status flip `active → used/discarded` with guard against double-acting
- Settings: AI provider configuration (Google AI Studio default, OpenAI/Anthropic advanced)
- Navigation: `/fridges` list page, back-to-overview links

### S05: Status, alerts, and cooking suggestions
- `lib/inventory/analysis.ts` — pure synchronous `analyzeInventory()` and `generateSuggestions()`
- 5 urgency levels: expired / expiring-soon / estimated-expiry-soon / forgotten / ok (priority-ordered, first match wins)
- `StatusSection.tsx` — server component: status overview, color-coded alert rows, inventory-grounded suggestion cards
- Analysis wired server-side in fridge context page before render

### S06: Local-first runtime and end-to-end proof
- `package.json` dev script: `next dev --hostname 0.0.0.0` (LAN-safe binding)
- `app/api/health/route.ts` — operational liveness endpoint (`{ status, timestamp }` / 503 on DB failure)
- `app/api/health/route.test.ts` — 3 tests for success, DB failure, non-Error throw modes
- `lib/qr/origin.test.ts` — 5 tests locking env-override, forwarded-host, proxy-list, bare host, and localhost-fallback behavior
- `e2e/intake-flow.test.ts` — 10-test integrated proof: extract → save drafts → promote → analyze → generate suggestions (analysis/suggestion assertions use real persisted inventory rows)
- `test-fixtures/sample-food.jpg` — committed fixture for deterministic tests
- `scripts/verify-s06-lan.sh` — reusable 6-check LAN verification script
- `S06-UAT.md` — human acceptance script with live evidence from 2026-03-23 run

---

## Verification Evidence

### Automated
- `npm run test` → 28 test files / 115 tests — all pass
- `npm run type-check` → exit 0 (no type errors)
- `npm run build` → exit 0 (11 routes, Next.js 15.5.14)

### Operational (S06 LAN proof — 2026-03-23)
```
bash scripts/verify-s06-lan.sh 192.168.1.22 ZPPo56GIYQ
✅ localhost health → {"status":"ok","timestamp":"2026-03-23T21:23:56.688Z"}
✅ LAN health → {"status":"ok","timestamp":"2026-03-23T21:23:56.757Z"}
✅ fridge page HTML contains LAN IP (192.168.1.22) — QR encodes LAN origin
✅ npm run test — 28 files / 115 tests pass
✅ npm run type-check — clean
✅ npm run build — production build succeeded
Results: 6 passed, 0 failed
```

### Browser (live fridge page at http://192.168.1.22:3000/fridges/ZPPo56GIYQ)
- QR renders with LAN-routable URL: `http://192.168.1.22:3000/fridges/ZPPo56GIYQ`
- STATUS OVERVIEW renders: "1 active item · ✓ all good"
- GROCERY INTAKE section: Take Photo / Upload Receipt / Add Single Item buttons visible
- AI RECIPES section: "✨ Suggest Recipes" button visible

---

## Requirements Validated

| Requirement | Area | Evidence |
|-------------|------|----------|
| R001 — QR context entry | primary-user-loop | S01 verified + S06 LAN proof |
| R002 — Photo intake | primary-user-loop | S02 verified |
| R003 — Human review before inventory truth | constraint | S02 verified |
| R004 — Confirmed items become inventory | primary-user-loop | S03 verified |
| R005 — Expiry date recording | primary-user-loop | S03 verified |
| R006 — Estimated expiry flag | primary-user-loop | S03 verified |
| R007 — Item-level current status | primary-user-loop | S04 verified |
| R008 — Update/discard actions | primary-user-loop | S04 verified |
| R009 — Expiry status view | primary-user-loop | S05 verified |
| R010 — Cooking suggestions from inventory | differentiator | S05 verified |
| R011 — LAN home-network reachability | constraint | S06 verified — 6/6 LAN checks pass |
| R013 — Multi-household member use | primary-user-loop | S04 verified |
| R014 — Failure visibility | failure-visibility | S02 verified |

---

## Key Architectural Decisions

| # | Decision | Choice | When |
|---|----------|--------|------|
| D001 | QR library | qrcode.react / qrcode server-side | M001/S01 |
| D010 | Minimum Next.js version | 15.5.14 (CVE-2025-66478) | M001 |
| D011 | DB synchrony | better-sqlite3 sync-only | M001/S01 |
| D013 | AI extraction stub fallback | stub returns deterministic items when no provider | M001/S02 |
| D019 | Draft promotion atomicity | db.transaction() wraps insert + confirm | M001/S03 |
| D022 | Cross-fridge write prevention | dual-key WHERE id AND fridge_id | M001/S04 |
| D024 | LAN-safe dev runtime | --hostname 0.0.0.0 | M001/S06 |
| D025 | S06 proof strategy | two-track: automated regression + live LAN acceptance | M001/S06 |

---

## What Remains

- **R012** (public domain hosting) → M002
- **R015–R018** (deferred differentiators) → M002 or later
- Manual QR scan from phone on same Wi-Fi → UAT step in `S06-UAT.md` (pending user)

---

## Future Agent Orientation

- Run `bash scripts/verify-s06-lan.sh <lan-ip> <fridge-id>` to confirm the whole system is healthy
- Run `npm run test` for automated regression
- All DB mutations are sync (better-sqlite3) — never `await` store functions
- Draft confirmation + inventory insert is one atomic `db.transaction()` — never break that apart
- `app/fridges/[fridgeId]/actions.ts` owns all Server Actions for the fridge context
- `lib/inventory/analysis.ts` is pure (no imports, no framework) — safe to import anywhere
- QR origin auto-detects from request headers; set `QR_BASE_URL` env var to force an origin
