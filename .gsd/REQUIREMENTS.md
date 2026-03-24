# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### R031 — The app advertises itself on the LAN as `thefridge.local` via mDNS/Bonjour so household members can use a stable hostname instead of memorising the IP address.
- Class: quality-attribute
- Status: active
- Description: The app advertises itself on the LAN as `thefridge.local` via mDNS/Bonjour so household members can use a stable hostname instead of memorising the IP address.
- Why it matters: DHCP can reassign IP addresses. A stable hostname makes sharing and QR-independent access more reliable long-term.
- Source: user
- Primary owning slice: M002/S04
- Supporting slices: none
- Validation: unmapped
- Notes: Uses `bonjour-service` (pure TypeScript, no native compilation). Requires `network_mode: host` in docker-compose.yml for mDNS multicast to reach the LAN. Nice-to-have — R030 covers LAN access regardless.

## Validated

### R001 — A person can scan a printable QR code attached to a fridge or freezer and enter that exact storage context in the local web app.
- Class: primary-user-loop
- Status: validated
- Description: A person can scan a printable QR code attached to a fridge or freezer and enter that exact storage context in the local web app.
- Why it matters: It ties the digital inventory to the physical place someone is standing at and reduces context confusion.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: M001/S06
- Validation: S01 verified: valid fridge IDs resolve the correct storage-context page at /fridges/[fridgeId]; the QR URL encodes the exact same route; opening the QR URL loads the correct context. All 7 slice checks pass.
- Notes: QR scanning on localhost confirmed. Real home-network LAN scanning is deferred to S06 per roadmap proof strategy.

### R002 — The app can create QR codes that are printable and uniquely identify a fridge/freezer context.
- Class: core-capability
- Status: validated
- Description: The app can create QR codes that are printable and uniquely identify a fridge/freezer context.
- Why it matters: The QR entry flow depends on the app being able to create the physical identity token itself.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: M001/S06
- Validation: S01 verified: the app generates SVG QR codes server-side (lib/qr/generate.ts) encoding each fridge/freezer's full context URL. QR is rendered on the storage-context page and is print-ready. QR URL was confirmed to match the route contract via curl inspection.
- Notes: SVG output is printable without external image requests. LAN IP routing in QR URLs is handled via x-forwarded-proto + host headers; full home-network print verification deferred to S06.

### R003 — A grocery photo can be uploaded from the web app and converted into a draft set of candidate items.
- Class: core-capability
- Status: validated
- Description: A grocery photo can be uploaded from the web app and converted into a draft set of candidate items.
- Why it matters: Photo-assisted capture reduces household effort during intake.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S06
- Validation: S02 verified: POST /api/intake/[fridgeId] accepts a photo upload and returns a structured JSON draft with named items, quantities, units, and confidence fields. Stub returns 3 items when OPENAI_API_KEY is absent; OpenAI gpt-4o-mini call is wired for when the key is present. curl test confirmed: 3 items returned for valid fridge + photo input.
- Notes: The draft may be uncertain and must not silently become truth.

### R004 — Drafted items can be reviewed and edited before being committed into live inventory.
- Class: failure-visibility
- Status: validated
- Description: Drafted items can be reviewed and edited before being committed into live inventory.
- Why it matters: Trust depends on human confirmation when AI detection is incomplete or wrong.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S03, M001/S06
- Validation: S02 verified: IntakeSection renders an editable review grid (name, quantity, unit inputs + delete button per row) before any item reaches intake_drafts. Confirm step is explicit and gated - no item is written to the DB without user action. Browser test: edited a name, deleted a row, confirmed - only the modified items were persisted.
- Notes: This is especially important for names, storage placement, and expiry details.

### R005 — The system stores item-level inventory for each fridge/freezer rather than only broad categories.
- Class: primary-user-loop
- Status: validated
- Description: The system stores item-level inventory for each fridge/freezer rather than only broad categories.
- Why it matters: The user wants actual status on demand, not a vague summary.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S04, M001/S05, M001/S06
- Validation: S03 verified: inventory_items table persists item-level records scoped to each fridge via FK. After uploading a grocery photo, confirming the draft, and promoting via InventorySection, sqlite3 confirms individual named rows (Greek Yogurt, Butter) with correct fridge_id. listInventoryItems returns the active set per fridge. Browser renders the inventory list with name/quantity/unit per item.
- Notes: Version 1 can be presence-first rather than exact-unit heavy.

### R006 — The system stores explicit expiry dates when known and allows estimated expiry when the food has no printed producer date.
- Class: core-capability
- Status: validated
- Description: The system stores explicit expiry dates when known and allows estimated expiry when the food has no printed producer date.
- Why it matters: Produce and similar items still need aging awareness even without package dates.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S05, M001/S06
- Validation: S03 verified: inventory_items schema includes expiry_date (TEXT nullable) and expiry_estimated (INTEGER 0/1). Quick-pick day buttons (3d/7d/14d/30d) set expiry_estimated=1; explicit date input sets expiry_estimated=0; blank expiry is valid (null). DB confirmed: promoted row via 7d quick-pick shows expiry_date='2026-03-28', expiry_estimated=1; row with no date shows expiry_date=null, expiry_estimated=0. Amber 'est.' badge renders in the inventory list for estimated entries.
- Notes: User-provided estimation is part of the intended experience.

### R007 — After cooking, eating, moving, or throwing food away, household members can update the inventory so it stays truthful.
- Class: continuity
- Status: validated
- Description: After cooking, eating, moving, or throwing food away, household members can update the inventory so it stays truthful.
- Why it matters: Intake alone is not enough; stale inventory breaks trust.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: M001/S06
- Validation: S04 verified: updateInventoryItem store function UPDATEs name/quantity/unit/expiry_date/expiry_estimated scoped by id AND fridge_id, setting updated_at=datetime('now'). setInventoryItemStatus flips status to 'used' or 'discarded' with the same dual-key scoping. Browser test on Kitchen Fridge (ZPPo56GIYQ): edited "Greek Yogurt" → name persisted in DB with fresh updated_at; marked "Butter" used → status='used' in DB; marked item discarded → status='discarded' in DB. No rows are DELETEd - full audit trail preserved. Server Action error path returns { success: false, error: '...' } rendered as a per-row red banner. [inventory] log lines confirmed in server console for all mutation types.
- Notes: Version 1 favors explicit actions over inference.

### R008 — The app can show the current item-level state of a selected fridge/freezer on demand.
- Class: primary-user-loop
- Status: validated
- Description: The app can show the current item-level state of a selected fridge/freezer on demand.
- Why it matters: This is the core payoff of maintaining the system.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: M001/S05, M001/S06
- Validation: S04 verified: After each mutation (edit save, mark used, mark discarded), router.refresh() wrapped in startTransition() re-reads server truth from SQLite. The active inventory list reflects only status='active' rows - used/discarded items disappear immediately after the status flip. DB and UI are consistent: sqlite3 query confirms status change, browser confirms count decrease. listInventoryItems WHERE status='active' remains the authoritative read model.
- Notes: Trustworthiness matters more than decorative presentation.

### R009 — The app highlights items that are aging, nearing expiry, or effectively forgotten in storage.
- Class: launchability
- Status: validated
- Description: The app highlights items that are aging, nearing expiry, or effectively forgotten in storage.
- Why it matters: Waste prevention is a central reason the product exists.
- Source: inferred
- Primary owning slice: M001/S05
- Supporting slices: M001/S03, M001/S04, M001/S06
- Validation: S05 verified: analyzeInventory() in lib/inventory/analysis.ts classifies active inventory items into 5 urgency buckets (expired, expiring-soon, estimated-expiry-soon, forgotten, ok) using a priority-ordered if-else chain. StatusSection.tsx renders a "needs attention" section with urgency-sorted alert rows showing item name, badge, and timing copy (e.g. "expired 2 days ago", "not touched in 18 days"). Browser verification on mixed-status-fridge confirmed alert rows match actual DB rows via sqlite3 query. Empty fridge shows clean empty state with no alert section rendered.
- Notes: Freezer-forgotten items are explicitly important.

### R010 — The app generates cooking suggestions from the current inventory, with preference toward using available or aging ingredients.
- Class: differentiator
- Status: validated
- Description: The app generates cooking suggestions from the current inventory, with preference toward using available or aging ingredients.
- Why it matters: It turns inventory awareness into action and reinforces waste reduction.
- Source: user
- Primary owning slice: M001/S05
- Supporting slices: M001/S06
- Validation: S05 verified: generateSuggestions() in lib/inventory/analysis.ts produces 0-3 SuggestionCard objects grounded in actual item names from inventory, with urgency-driven cards prioritizing expired/expiring items first. StatusSection.tsx renders a "cooking ideas" section with cards showing title, description referencing real item names, and ingredient chips. Urgency-driven cards get a warm amber gradient treatment. Browser verification on mixed-status-fridge confirmed ingredient names in suggestion cards match actual DB row names. Cook tonight card only appears when 3+ active items exist; Rediscover card only appears when forgotten items exist.
- Notes: Suggestions should stay grounded in current inventory, not generic inspiration.

### R011 — The first version is usable as a local web app reachable within the home network.
- Class: constraint
- Status: validated
- Description: The first version is usable as a local web app reachable within the home network.
- Why it matters: This is the user's chosen deployment shape for version 1.
- Source: user
- Primary owning slice: M001/S06
- Supporting slices: M001/S01
- Validation: S06/T03 final proof 2026-03-23: `bash scripts/verify-s06-lan.sh 192.168.1.22 ZPPo56GIYQ` → 6/6 checks passed.
- Notes: Public domain hosting belongs to a later milestone.

### R013 — More than one person in a household can use the system against the same fridge/freezer inventory.
- Class: primary-user-loop
- Status: validated
- Description: More than one person in a household can use the system against the same fridge/freezer inventory.
- Why it matters: The inventory must reflect shared real-world use.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: M001/S06
- Validation: S04 verified: All mutations are scoped exclusively by item.id AND fridge_id - cross-fridge writes are structurally impossible.
- Notes: M001 can keep household access simple as long as the shared flow works.

### R014 — The app surfaces uncertainty, bad scans, and review requirements rather than silently mutating inventory with wrong data.
- Class: failure-visibility
- Status: validated
- Description: The app surfaces uncertainty, bad scans, and review requirements rather than silently mutating inventory with wrong data.
- Why it matters: Inventory trust depends on visible uncertainty and controllable correction.
- Source: inferred
- Primary owning slice: M001/S02
- Supporting slices: M001/S04, M001/S06
- Validation: S02 verified: low-confidence draft items show an amber "?" badge in the review UI; API returns 404 for invalid fridge IDs and 400 for missing photos.
- Notes: The app should behave like a trusted assistant, not an invisible automation layer.

### R023 — The web app can be installed to a phone's home screen and launches in standalone mode with a real icon — no browser chrome visible.
- Class: primary-user-loop
- Status: validated
- Description: The web app can be installed to a phone's home screen and launches in standalone mode with a real icon — no browser chrome visible.
- Why it matters: Without standalone mode and real icons, the app feels like a website shortcut, not a household tool. The "native-lite" feel is the goal.
- Source: user
- Primary owning slice: M002/S02
- Supporting slices: none
- Validation: M002/S02 verified: Real 192×192 and 512×512 PNG icons generated (dark #0f1011 bg, 🧊 emoji accent). `file public/icons/icon-192.png` → `192 x 192`. `docker compose build` succeeds with icons in image. `/manifest.webmanifest` serves valid JSON with both icon entries. `bash scripts/verify-s02-pwa.sh` → 6/6 checks pass. Full standalone install on a real phone is documented in S02-UAT.md TC-07 (manual UAT step, not yet performed).
- Notes: Requires a valid PWA manifest (already exists as `app/manifest.ts`), a service worker registered on the page, and real icon files (currently 1×1 pixel placeholders).

### R024 — A service worker precaches the Next.js app shell so repeat visits load instantly. When the server is unreachable, a meaningful offline page is shown rather than a browser error.
- Class: launchability
- Status: validated
- Description: A service worker precaches the Next.js app shell so repeat visits load instantly. When the server is unreachable, a meaningful offline page is shown rather than a browser error.
- Why it matters: The server is on a home device that reboots. Household members should see a clean "server offline" state, not a Chrome dinosaur.
- Source: user
- Primary owning slice: M002/S02
- Supporting slices: none
- Validation: M002/S02 verified: Serwist service worker generated at `public/sw.js` (41996 bytes). `npm run build` logs `✓ (serwist) Bundling the service worker script with the URL '/sw.js' and the scope '/'`. `/~offline` static fallback page served from Docker container. Precache manifest includes `/~offline` entry. SW registration is blocked on plain HTTP LAN (browser security policy, D028) — offline caching works when accessed via localhost or HTTPS. Documented limitation accepted.
- Notes: App shell caching only — API responses (inventory data) are not cached offline. Serwist (`@serwist/next`) is the chosen library.

### R025 — When a household member taps the home screen icon, the PWA opens directly to the last-used fridge context rather than the landing page.
- Class: primary-user-loop
- Status: validated
- Description: When a household member taps the home screen icon, the PWA opens directly to the last-used fridge context rather than the landing page.
- Why it matters: Household members interact with the same fridge repeatedly. Requiring them to navigate through the list on every open adds friction.
- Source: user
- Primary owning slice: M002/S03
- Supporting slices: none
- Validation: S03 verified: LastFridgeWriter (app/fridges/[fridgeId]/LastFridgeWriter.tsx) writes localStorage['lastFridgeId'] on every fridge context visit. LastFridgeRedirect (app/components/LastFridgeRedirect.tsx) reads the value on mount at the root page and calls router.replace('/fridges/<id>') if present. PWA manifest start_url is "/" ensuring the redirect fires on every home screen launch. npm run type-check and npm run build both exit 0. All grep verification checks pass.
- Notes: Stored in `localStorage` — client-side, no server state required. Written on every fridge context visit.

### R026 — Despite the last-used fridge shortcut, navigation back to the fridge list remains accessible so users can switch storage contexts.
- Class: continuity
- Status: validated
- Description: Despite the last-used fridge shortcut, navigation back to the fridge list remains accessible so users can switch storage contexts.
- Why it matters: Households may have multiple fridges/freezers. The shortcut must not trap the user in one context.
- Source: user
- Primary owning slice: M002/S03
- Supporting slices: none
- Validation: S03 verified: The fridge context page (app/fridges/[fridgeId]/page.tsx) retains the existing "← Back to overview" header link navigating to /fridges. The link was not removed or modified during S03 implementation. Users can always return to the fridge list from any fridge context page regardless of how they arrived (direct URL, PWA redirect, or manual navigation).
- Notes: The existing global header link to `/` already handles this; the slice just needs to ensure it survives the PWA start_url redirect logic.

### R027 — A single `docker compose up` command builds and starts the app on any Linux or macOS device with Docker installed — no `npm install`, no Node version management.
- Class: launchability
- Status: validated
- Description: A single `docker compose up` command builds and starts the app on any Linux or macOS device with Docker installed — no `npm install`, no Node version management.
- Why it matters: The target hosting device (Pi, Mac Mini, old laptop) may not have Node installed. Docker makes the environment portable and reproducible.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: M002/S01 verified: `docker compose build` succeeds (52s multi-stage build with `better-sqlite3` native compilation); `GET /api/health` returns `{"status":"ok"}` from inside the running container; `bash scripts/verify-s01-docker.sh` → 6/6 checks pass.
- Notes: Multi-stage Dockerfile to minimise image size. `better-sqlite3` requires native compilation during build — handled inside the Docker build layer, not on the host. `output: 'standalone'` in next.config.ts reduces production image size.

### R028 — The `data/` directory containing `fridges.db` is volume-mounted so inventory data survives `docker compose down`, image rebuilds, and host reboots.
- Class: continuity
- Status: validated
- Description: The `data/` directory containing `fridges.db` is volume-mounted so inventory data survives `docker compose down`, image rebuilds, and host reboots.
- Why it matters: Losing inventory data on a container restart would be catastrophic for household trust.
- Source: inferred
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: M002/S01 verified: named volume `thefridge_data` → `/app/data` persists `fridges.db` across `docker compose down && docker compose up`; fridge created before restart was present in GET /api/fridges after restart; `bash scripts/verify-s01-docker.sh` check 4 passes.
- Notes: Volume mount: `./data:/app/data`. DB path must remain `data/fridges.db` relative to the app root.

### R029 — The Docker container restarts automatically if the host device reboots, with no manual intervention required.
- Class: launchability
- Status: validated
- Description: The Docker container restarts automatically if the host device reboots, with no manual intervention required.
- Why it matters: The host device (Pi, Mac Mini) may reboot due to updates or power events. Household members should not need to SSH in to restart the app.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: M002/S01 verified: `docker inspect thefridge-local --format '{{.HostConfig.RestartPolicy.Name}}'` returns `unless-stopped`; `bash scripts/verify-s01-docker.sh` check 5 passes. Full reboot test deferred to target home device acceptance (TC-07 in S01-UAT.md).
- Notes: `restart: unless-stopped` in docker-compose.yml. Works with Docker's own restart manager — no systemd unit needed.

### R030 — The container binds to `0.0.0.0:3000` so any phone or laptop on the home Wi-Fi can reach the app at `http://<LAN-IP>:3000`.
- Class: primary-user-loop
- Status: validated
- Description: The container binds to `0.0.0.0:3000` so any phone or laptop on the home Wi-Fi can reach the app at `http://<LAN-IP>:3000`.
- Why it matters: This is the core access model for a household app. A container that only binds to localhost is useless for other family members.
- Source: inferred
- Primary owning slice: M002/S01
- Supporting slices: M002/S04
- Validation: M002/S01 verified: `docker inspect thefridge-local --format '{{json .NetworkSettings.Ports}}'` shows `"HostIp":"0.0.0.0"` for port 3000; `HOSTNAME: 0.0.0.0` set in compose environment; `bash scripts/verify-s01-docker.sh` check 6 passes.
- Notes: `next start` already binds to 0.0.0.0 by default. Port mapping `3000:3000` in docker-compose.yml is sufficient.

## Deferred

### R012 — A later milestone extends the app into a public, domain-hosted version for broader access.
- Class: launchability
- Status: deferred
- Description: A later milestone extends the app into a public, domain-hosted version for broader access.
- Why it matters: The full vision includes a non-local deployment path.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred beyond M002. M002 Docker work is a stepping stone but does not constitute public deployment.

### R015 — Track detailed units and amounts beyond simple presence-first inventory.
- Class: quality-attribute
- Status: deferred
- Description: Track detailed units and amounts beyond simple presence-first inventory.
- Why it matters: It could improve precision for cooking and stock management later.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred because version 1 can still be useful without precise unit math.

### R016 — Provide richer historical analytics, usage trends, or waste statistics.
- Class: differentiator
- Status: deferred
- Description: Provide richer historical analytics, usage trends, or waste statistics.
- Why it matters: It may become useful once the base inventory loop is proven.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Not required for first launch usefulness.

### R017 — Support many distinct households with hosted onboarding and broader account flows.
- Class: admin/support
- Status: deferred
- Description: Support many distinct households with hosted onboarding and broader account flows.
- Why it matters: It becomes relevant once the product moves beyond a single local environment.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred beyond M002.

### R018 — Expand cooking guidance into deeper recipe workflows that include missing ingredients and broader exploration.
- Class: differentiator
- Status: deferred
- Description: Expand cooking guidance into deeper recipe workflows that include missing ingredients and broader exploration.
- Why it matters: It may improve engagement later but is not required to prove the core utility.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: M001 stays focused on grounded "use what I have" suggestions.

### R032 — Household members can browse their last-seen inventory state when the server is unreachable.
- Class: quality-attribute
- Status: deferred
- Description: Household members can browse their last-seen inventory state when the server is unreachable.
- Why it matters: Would improve resilience but adds significant complexity (cache invalidation, stale data risk).
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: M002 provides app-shell caching only. Full offline data caching is a future concern.

## Out of Scope

### R019 — A native mobile app is explicitly not part of the first version.
- Class: constraint
- Status: out-of-scope
- Description: A native mobile app is explicitly not part of the first version.
- Why it matters: It prevents accidental expansion away from the chosen web-app path.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: PWA is the chosen "native-lite" path.

### R020 — The app should not silently maintain inventory as if the AI can always infer reality correctly.
- Class: anti-feature
- Status: out-of-scope
- Description: The app should not silently maintain inventory as if the AI can always infer reality correctly.
- Why it matters: This would undermine trust and create hidden errors.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Review-first and explicit updates are deliberate design choices.

### R021 — Nutrition analytics and diet coaching are excluded from the first version.
- Class: anti-feature
- Status: out-of-scope
- Description: Nutrition analytics and diet coaching are excluded from the first version.
- Why it matters: It prevents scope drift into a different product category.
- Source: research
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: The current product is about inventory truth, waste prevention, and grounded cooking suggestions.

### R022 — Version 1 should not be shaped primarily around barcode scanning and packaged-product cataloging.
- Class: anti-feature
- Status: out-of-scope
- Description: Version 1 should not be shaped primarily around barcode scanning and packaged-product cataloging.
- Why it matters: The user's actual emphasis is mixed groceries and expiry judgment, including produce.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Barcode support could be revisited later if it helps, but it is not the core intake model.

### R033 — A completely terminal-free installation experience for the server operator.
- Class: constraint
- Status: out-of-scope
- Description: A completely terminal-free installation experience for the server operator.
- Why it matters: Prevents over-engineering the installation story.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: The person running the server (the user) is comfortable with a terminal. Only household members using phones need zero friction.

### R034 — A generic "find the app" QR code separate from the per-fridge QR codes.
- Class: anti-feature
- Status: out-of-scope
- Description: A generic "find the app" QR code separate from the per-fridge QR codes.
- Why it matters: Prevents unnecessary complexity when existing QR flow already handles fridge access.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Existing per-fridge QR codes encode the full LAN URL. A separate bootstrap QR adds nothing.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | primary-user-loop | validated | M001/S01 | M001/S06 | S01 verified: valid fridge IDs resolve the correct storage-context page at /fridges/[fridgeId]; the QR URL encodes the exact same route; opening the QR URL loads the correct context. All 7 slice checks pass. |
| R002 | core-capability | validated | M001/S01 | M001/S06 | S01 verified: the app generates SVG QR codes server-side (lib/qr/generate.ts) encoding each fridge/freezer's full context URL. QR is rendered on the storage-context page and is print-ready. QR URL was confirmed to match the route contract via curl inspection. |
| R003 | core-capability | validated | M001/S02 | M001/S06 | S02 verified: POST /api/intake/[fridgeId] accepts a photo upload and returns a structured JSON draft with named items, quantities, units, and confidence fields. Stub returns 3 items when OPENAI_API_KEY is absent; OpenAI gpt-4o-mini call is wired for when the key is present. curl test confirmed: 3 items returned for valid fridge + photo input. |
| R004 | failure-visibility | validated | M001/S02 | M001/S03, M001/S06 | S02 verified: IntakeSection renders an editable review grid (name, quantity, unit inputs + delete button per row) before any item reaches intake_drafts. Confirm step is explicit and gated - no item is written to the DB without user action. Browser test: edited a name, deleted a row, confirmed - only the modified items were persisted. |
| R005 | primary-user-loop | validated | M001/S03 | M001/S04, M001/S05, M001/S06 | S03 verified: inventory_items table persists item-level records scoped to each fridge via FK. After uploading a grocery photo, confirming the draft, and promoting via InventorySection, sqlite3 confirms individual named rows (Greek Yogurt, Butter) with correct fridge_id. listInventoryItems returns the active set per fridge. Browser renders the inventory list with name/quantity/unit per item. |
| R006 | core-capability | validated | M001/S03 | M001/S05, M001/S06 | S03 verified: inventory_items schema includes expiry_date (TEXT nullable) and expiry_estimated (INTEGER 0/1). Quick-pick day buttons (3d/7d/14d/30d) set expiry_estimated=1; explicit date input sets expiry_estimated=0; blank expiry is valid (null). DB confirmed: promoted row via 7d quick-pick shows expiry_date='2026-03-28', expiry_estimated=1; row with no date shows expiry_date=null, expiry_estimated=0. Amber 'est.' badge renders in the inventory list for estimated entries. |
| R007 | continuity | validated | M001/S04 | M001/S06 | S04 verified: updateInventoryItem store function UPDATEs name/quantity/unit/expiry_date/expiry_estimated scoped by id AND fridge_id, setting updated_at=datetime('now'). setInventoryItemStatus flips status to 'used' or 'discarded' with the same dual-key scoping. Browser test on Kitchen Fridge (ZPPo56GIYQ): edited "Greek Yogurt" → name persisted in DB with fresh updated_at; marked "Butter" used → status='used' in DB; marked item discarded → status='discarded' in DB. No rows are DELETEd - full audit trail preserved. Server Action error path returns { success: false, error: '...' } rendered as a per-row red banner. [inventory] log lines confirmed in server console for all mutation types. |
| R008 | primary-user-loop | validated | M001/S04 | M001/S05, M001/S06 | S04 verified: After each mutation (edit save, mark used, mark discarded), router.refresh() wrapped in startTransition() re-reads server truth from SQLite. The active inventory list reflects only status='active' rows - used/discarded items disappear immediately after the status flip. DB and UI are consistent: sqlite3 query confirms status change, browser confirms count decrease. listInventoryItems WHERE status='active' remains the authoritative read model. |
| R009 | launchability | validated | M001/S05 | M001/S03, M001/S04, M001/S06 | S05 verified: analyzeInventory() in lib/inventory/analysis.ts classifies active inventory items into 5 urgency buckets (expired, expiring-soon, estimated-expiry-soon, forgotten, ok) using a priority-ordered if-else chain. StatusSection.tsx renders a "needs attention" section with urgency-sorted alert rows showing item name, badge, and timing copy (e.g. "expired 2 days ago", "not touched in 18 days"). Browser verification on mixed-status-fridge confirmed alert rows match actual DB rows via sqlite3 query. Empty fridge shows clean empty state with no alert section rendered. |
| R010 | differentiator | validated | M001/S05 | M001/S06 | S05 verified: generateSuggestions() in lib/inventory/analysis.ts produces 0-3 SuggestionCard objects grounded in actual item names from inventory, with urgency-driven cards prioritizing expired/expiring items first. StatusSection.tsx renders a "cooking ideas" section with cards showing title, description referencing real item names, and ingredient chips. Urgency-driven cards get a warm amber gradient treatment. Browser verification on mixed-status-fridge confirmed ingredient names in suggestion cards match actual DB row names. Cook tonight card only appears when 3+ active items exist; Rediscover card only appears when forgotten items exist. |
| R011 | constraint | validated | M001/S06 | M001/S01 | S06/T03 final proof 2026-03-23: `bash scripts/verify-s06-lan.sh 192.168.1.22 ZPPo56GIYQ` → 6/6 checks passed. |
| R012 | launchability | deferred | none | none | unmapped |
| R013 | primary-user-loop | validated | M001/S04 | M001/S06 | S04 verified: All mutations are scoped exclusively by item.id AND fridge_id - cross-fridge writes are structurally impossible. |
| R014 | failure-visibility | validated | M001/S02 | M001/S04, M001/S06 | S02 verified: low-confidence draft items show an amber "?" badge in the review UI; API returns 404 for invalid fridge IDs and 400 for missing photos. |
| R015 | quality-attribute | deferred | none | none | unmapped |
| R016 | differentiator | deferred | none | none | unmapped |
| R017 | admin/support | deferred | none | none | unmapped |
| R018 | differentiator | deferred | none | none | unmapped |
| R019 | constraint | out-of-scope | none | none | n/a |
| R020 | anti-feature | out-of-scope | none | none | n/a |
| R021 | anti-feature | out-of-scope | none | none | n/a |
| R022 | anti-feature | out-of-scope | none | none | n/a |
| R023 | primary-user-loop | validated | M002/S02 | none | M002/S02 verified: Real 192×192 and 512×512 PNG icons generated (dark #0f1011 bg, 🧊 emoji accent). `file public/icons/icon-192.png` → `192 x 192`. `docker compose build` succeeds with icons in image. `/manifest.webmanifest` serves valid JSON with both icon entries. `bash scripts/verify-s02-pwa.sh` → 6/6 checks pass. Full standalone install on a real phone is documented in S02-UAT.md TC-07 (manual UAT step, not yet performed). |
| R024 | launchability | validated | M002/S02 | none | M002/S02 verified: Serwist service worker generated at `public/sw.js` (41996 bytes). `npm run build` logs `✓ (serwist) Bundling the service worker script with the URL '/sw.js' and the scope '/'`. `/~offline` static fallback page served from Docker container. Precache manifest includes `/~offline` entry. SW registration is blocked on plain HTTP LAN (browser security policy, D028) — offline caching works when accessed via localhost or HTTPS. Documented limitation accepted. |
| R025 | primary-user-loop | validated | M002/S03 | none | S03 verified: LastFridgeWriter (app/fridges/[fridgeId]/LastFridgeWriter.tsx) writes localStorage['lastFridgeId'] on every fridge context visit. LastFridgeRedirect (app/components/LastFridgeRedirect.tsx) reads the value on mount at the root page and calls router.replace('/fridges/<id>') if present. PWA manifest start_url is "/" ensuring the redirect fires on every home screen launch. npm run type-check and npm run build both exit 0. All grep verification checks pass. |
| R026 | continuity | validated | M002/S03 | none | S03 verified: The fridge context page (app/fridges/[fridgeId]/page.tsx) retains the existing "← Back to overview" header link navigating to /fridges. The link was not removed or modified during S03 implementation. Users can always return to the fridge list from any fridge context page regardless of how they arrived (direct URL, PWA redirect, or manual navigation). |
| R027 | launchability | validated | M002/S01 | none | M002/S01 verified: `docker compose build` succeeds (52s multi-stage build with `better-sqlite3` native compilation); `GET /api/health` returns `{"status":"ok"}` from inside the running container; `bash scripts/verify-s01-docker.sh` → 6/6 checks pass. |
| R028 | continuity | validated | M002/S01 | none | M002/S01 verified: named volume `thefridge_data` → `/app/data` persists `fridges.db` across `docker compose down && docker compose up`; fridge created before restart was present in GET /api/fridges after restart; `bash scripts/verify-s01-docker.sh` check 4 passes. |
| R029 | launchability | validated | M002/S01 | none | M002/S01 verified: `docker inspect thefridge-local --format '{{.HostConfig.RestartPolicy.Name}}'` returns `unless-stopped`; `bash scripts/verify-s01-docker.sh` check 5 passes. Full reboot test deferred to target home device acceptance (TC-07 in S01-UAT.md). |
| R030 | primary-user-loop | validated | M002/S01 | M002/S04 | M002/S01 verified: `docker inspect thefridge-local --format '{{json .NetworkSettings.Ports}}'` shows `"HostIp":"0.0.0.0"` for port 3000; `HOSTNAME: 0.0.0.0` set in compose environment; `bash scripts/verify-s01-docker.sh` check 6 passes. |
| R031 | quality-attribute | active | M002/S04 | none | unmapped |
| R032 | quality-attribute | deferred | none | none | unmapped |
| R033 | constraint | out-of-scope | none | none | n/a |
| R034 | anti-feature | out-of-scope | none | none | n/a |

## Coverage Summary

- Active requirements: 1
- Mapped to slices: 1
- Validated: 21 (R001, R002, R003, R004, R005, R006, R007, R008, R009, R010, R011, R013, R014, R023, R024, R025, R026, R027, R028, R029, R030)
- Unmapped active requirements: 0
