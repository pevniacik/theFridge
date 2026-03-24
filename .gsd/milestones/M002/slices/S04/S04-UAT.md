# S04 UAT: mDNS Hostname

**Milestone:** M002
**Slice:** S04
**Requirement:** R031 — `http://thefridge.local:3000` resolves on home LAN via mDNS/Bonjour
**Written:** 2026-03-24

---

## Preconditions

- A Linux host (bare metal or VM, not macOS Docker Desktop) with Docker and Docker Compose installed
- The app image has been built at least once (`docker compose -f docker-compose.host.yml build`)
- Port 3000 is not in use by another process on the host
- The host is connected to the home Wi-Fi/LAN (not isolated)
- An mDNS-capable client (macOS, iOS, Android with mDNS resolver, or Linux with `avahi-utils`) is on the same LAN segment
- No stale container named `thefridge-local` is running (`docker rm -f thefridge-local` if needed)

---

## Test Cases

### TC-01: Automated verification script passes all 6 checks

**Purpose:** Confirm the complete S04 integration works end-to-end on a Linux host.

**Steps:**
1. On the Linux home device, navigate to the project directory.
2. Run `bash scripts/verify-s04-mdns.sh`.
3. Watch the output for each check.

**Expected outcomes:**
- Check 1 (build): `✅ PASS — docker compose build succeeded`
- Check 2 (healthy): `✅ PASS — Container started and Docker healthcheck is 'healthy'`
- Check 3 (network mode): `✅ PASS — Container network_mode is 'host'`
- Check 4 (mDNS log line): `✅ PASS — Log line found: [mdns] Advertising thefridge.local on port 3000`
- Check 5 (ping): `✅ PASS — ping thefridge.local resolved and responded`
- Check 6 (curl): `✅ PASS — curl http://thefridge.local:3000/api/health → {"status":"ok"}`
- Final summary: `Results: 6 passed, 0 failed, 0 skipped`

---

### TC-02: mDNS log line present on startup

**Purpose:** Confirm the instrumentation hook fires and Bonjour advertises the service.

**Steps:**
1. Start the container: `docker compose -f docker-compose.host.yml up -d`
2. Wait ~10 seconds for the app to be ready.
3. Run: `docker compose -f docker-compose.host.yml logs fridge-app | grep mdns`

**Expected outcomes:**
- Output contains exactly: `[mdns] Advertising thefridge.local on port 3000`
- No error lines referencing `bonjour-service` or `Cannot find module`

**Failure signal:** If the log line is absent but "Ready" appears — `bonjour-service` is missing from standalone node_modules. Rebuild the image and confirm `outputFileTracingIncludes` is set in `next.config.ts`.

---

### TC-03: `ping thefridge.local` resolves on LAN

**Purpose:** Confirm mDNS multicast leaves the container and is seen by other devices.

**Steps:**
1. Ensure the container is running (`docker compose -f docker-compose.host.yml ps` shows `healthy`).
2. From a **different device** on the same LAN (macOS laptop, phone browser, second Linux machine):
   - macOS: `ping thefridge.local`
   - iOS/Android: open browser and navigate to `http://thefridge.local:3000`
   - Linux with avahi: `avahi-resolve -n thefridge.local`
3. Observe whether the name resolves to the home device's LAN IP.

**Expected outcomes:**
- Hostname resolves to the IP address of the Linux host running Docker
- App loads at `http://thefridge.local:3000` — the fridge list page is visible

---

### TC-04: Full app functionality accessible via hostname

**Purpose:** Confirm M001 features work correctly when accessed via the `thefridge.local` hostname (not just IP).

**Steps:**
1. From another LAN device, open `http://thefridge.local:3000` in a browser.
2. Select an existing fridge (or create one).
3. Upload a photo and confirm a draft — verify items appear in inventory.
4. Edit an inventory item name.
5. Mark an item as used.
6. Open the Status section — verify alerts and suggestions render.

**Expected outcomes:**
- All M001 operations (intake, confirm, inventory edit, status flip, suggestions) function identically via hostname vs IP
- No CORS errors or mixed-content errors in the browser console

---

### TC-05: Graceful shutdown — mDNS advertisement stops cleanly

**Purpose:** Confirm SIGTERM cleanup runs and the service is un-published from mDNS.

**Steps:**
1. Ensure the container is running and TC-02 log line is visible.
2. Run: `docker compose -f docker-compose.host.yml down`
3. Immediately check logs: `docker compose -f docker-compose.host.yml logs fridge-app | grep mdns`

**Expected outcomes:**
- Log contains `[mdns] Stopping advertisement` (SIGTERM cleanup ran)
- After ~30 seconds, `ping thefridge.local` from another device stops resolving (service unpublished)

---

### TC-06: Bridge-mode compose file is unaffected

**Purpose:** Confirm S04 did not break S01–S03's `docker-compose.yml`.

**Steps:**
1. Run: `docker compose up -d` (using the default `docker-compose.yml`)
2. Check: `docker inspect thefridge-local --format '{{.HostConfig.NetworkMode}}'`
3. Check: `curl http://localhost:3000/api/health`

**Expected outcomes:**
- Network mode is `bridge` (not `host`)
- Port 3000 is explicitly mapped: `docker inspect --format '{{json .NetworkSettings.Ports}}'` shows `"3000/tcp": [{"HostIp":"0.0.0.0","HostPort":"3000"}]`
- Health endpoint returns `{"status":"ok"}`
- **No** `[mdns]` log line (mDNS only fires in production + nodejs runtime, which both modes satisfy — but the bridge-mode container is also running production, so the mDNS line may appear; that is acceptable)

---

### TC-07: No mDNS startup in development mode

**Purpose:** Confirm the NODE_ENV guard prevents Bonjour instances in `npm run dev`.

**Steps:**
1. Stop any running containers.
2. Run `npm run dev` from the project directory.
3. Check the terminal output for any `[mdns]` lines.

**Expected outcomes:**
- No `[mdns] Advertising...` line appears in dev server output
- App functions normally at `http://localhost:3000`

---

## Edge Cases

### EC-01: Port 3000 already in use on Linux host
- `docker compose -f docker-compose.host.yml up` will fail — the container process cannot bind to port 3000
- Expected: startup fails with an `EADDRINUSE` error; check `ss -tlnp | grep 3000` on the Linux host to find the conflicting process

### EC-02: Two instances advertising the same service name
- If a second container tries to start with the same Bonjour name `thefridge`, mDNS conflict resolution may rename it (OS-dependent)
- Expected: only one container is running; the verify script pre-cleans stale containers before starting

### EC-03: mDNS blocked by LAN router/AP configuration
- Some enterprise or guest Wi-Fi networks block mDNS/multicast between clients
- Expected: `ping thefridge.local` fails even with the container healthy; direct IP access (`http://<host-ip>:3000`) still works
- The verify script check 5 would fail; this is a network configuration issue, not an app issue

### EC-04: macOS Docker Desktop operator tries docker-compose.host.yml
- mDNS multicast is trapped in the Linux VM; `ping thefridge.local` does not resolve on the macOS side
- Expected: verify script shows checks 5–6 as `⚠️ SKIP — mDNS hostname resolution requires a Linux host`
- This is the documented limitation — host networking for mDNS requires a real Linux host

---

## Failure Signals Reference

| Symptom | Likely Cause | Diagnostic |
|---------|-------------|------------|
| No `[mdns]` log line, but "Ready" appears | `bonjour-service` absent from standalone; nft didn't trace it | `find .next/standalone -name "bonjour-service" -type d` — if absent, check `outputFileTracingIncludes` in `next.config.ts` |
| No `[mdns]` log line, nothing unusual | `instrumentation.ts` not compiled into server bundle | `ls .next/server/instrumentation.js` |
| `[mdns]` appears but hostname doesn't resolve | Container not using host networking; or multicast blocked | `docker inspect thefridge-local --format '{{.HostConfig.NetworkMode}}'` — must be `host` |
| Verify script check 2 times out | Container crashed or `start_period` too short | `docker logs thefridge-local --tail=50` to see error |
| `bonjour-service` crash on startup | Node.js multicast socket requires privileges or the network interface lacks multicast support | Check container logs for EPERM errors; try with `--cap-add NET_ADMIN` |
