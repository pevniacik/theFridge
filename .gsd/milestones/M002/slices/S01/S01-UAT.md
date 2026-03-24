# S01: Docker Production Container — UAT Script

**Milestone:** M002
**Slice:** S01
**Written:** 2026-03-24

## Purpose

This UAT script verifies that the Docker container built in S01 satisfies all four operational requirements: single-command startup (R027), data persistence across restarts (R028), automatic restart on host reboot (R029), and LAN accessibility (R030).

The automated verification script (`scripts/verify-s01-docker.sh`) covers all checks below and is the primary proof vehicle. The manual steps below serve as a backup for environments where the script cannot run, and as a guide for a human tester performing final acceptance on the target home device.

---

## Preconditions

- [ ] Docker Engine is installed and running (`docker info` succeeds)
- [ ] You are in the project root (`/path/to/theFridge`) — the directory that contains `Dockerfile`, `docker-compose.yml`, and `scripts/`
- [ ] No container named `thefridge-local` is already running (or run `docker compose down` first)
- [ ] Ports 3000 is free on the host (`lsof -i :3000` returns nothing)
- [ ] `curl` is available on the host
- [ ] Optional: set `GOOGLE_AI_API_KEY` in the shell environment if you want AI extraction to work

---

## Automated Verification (Primary)

```bash
bash scripts/verify-s01-docker.sh
```

**Expected output:**
```
════════════════════════════════════════════════════════════════════════
  theFridge S01 Docker Verification
════════════════════════════════════════════════════════════════════════
  ✅ PASS — docker compose build succeeded
  ✅ PASS — GET /api/health → {"status":"ok"}
  ✅ PASS — Created fridge with id=<some-id>
  ✅ PASS — Fridge id=<some-id> survived docker compose down+up (data persisted)
  ✅ PASS — Container restart policy is 'unless-stopped'
  ✅ PASS — Container binds 0.0.0.0:3000 (LAN accessible)
  Results: 6/6 checks passed
  ✅ All checks passed
════════════════════════════════════════════════════════════════════════
```

Exit code must be `0`. Any non-zero exit means a check failed — the script prints which one.

---

## Manual Test Cases (Human / Target Device Acceptance)

### TC-01: Single-command startup (R027)

**Proves:** A device with Docker but no Node/npm can run the app.

**Steps:**
1. From the project directory, run:
   ```bash
   docker compose up -d
   ```
2. Watch the logs:
   ```bash
   docker compose logs -f fridge-app
   ```
3. Wait up to 90 seconds, then run:
   ```bash
   curl http://localhost:3000/api/health
   ```

**Expected:**
- `docker compose up -d` completes without error
- Logs show Next.js server startup messages (e.g. `- ready started server on ...`)
- `curl` returns `{"status":"ok","timestamp":"..."}` (HTTP 200)

**Failure signals:**
- `Error: Could not locate the bindings file` → `better-sqlite3` native modules not copied correctly into runner
- `EADDRINUSE` → Port 3000 is already in use on host
- Container exits immediately → check `docker compose logs` for startup crash

---

### TC-02: Health endpoint from browser

**Steps:**
1. While container is running, open a browser on the same machine.
2. Navigate to `http://localhost:3000/api/health`

**Expected:** Browser shows `{"status":"ok","timestamp":"..."}` (raw JSON)

---

### TC-03: Full app navigation works in container (M001 feature regression)

**Steps:**
1. Navigate to `http://localhost:3000` in a browser.
2. Create a new fridge via "New Fridge" button.
3. Navigate to the fridge context page.
4. Attempt a photo upload (or skip if no AI key set).
5. Add an item manually via inventory section if drafts aren't available.
6. Verify status/alerts section loads.

**Expected:** All M001 UI works identically to dev mode. No 500 errors, no missing assets, no broken routes.

---

### TC-04: Data persistence across `docker compose down && up` (R028)

**Steps:**
1. Ensure container is running and healthy (TC-01 passes).
2. Create a fridge:
   ```bash
   curl -X POST http://localhost:3000/api/fridges \
     -H "Content-Type: application/json" \
     -d '{"name":"Persistence Test","type":"fridge"}'
   ```
   Note the returned `id`.
3. Stop the containers:
   ```bash
   docker compose down
   ```
4. Restart:
   ```bash
   docker compose up -d
   ```
5. Wait for healthy, then check:
   ```bash
   curl http://localhost:3000/api/fridges
   ```

**Expected:** The fridge with the noted `id` appears in the list. `"name":"Persistence Test"` is present.

**Failure signal:** Fridge list is empty after restart → named volume `thefridge_data` was not mounted or was deleted with `--volumes` flag.

---

### TC-05: Restart policy (R029)

**Steps:**
1. With the container running, inspect the restart policy:
   ```bash
   docker inspect thefridge-local --format '{{.HostConfig.RestartPolicy.Name}}'
   ```

**Expected output:** `unless-stopped`

**Note:** This check proves the *policy is configured*. To prove it survives host reboot on a real device, a human must actually reboot the hosting machine and confirm the container starts automatically.

---

### TC-06: LAN binding — phone access (R030)

**Steps:**
1. Find the host machine's LAN IP:
   ```bash
   # macOS:
   ipconfig getifaddr en0
   # Linux:
   ip route get 8.8.8.8 | awk '{print $7}' | head -1
   ```
2. On a phone connected to the same Wi-Fi network, open a browser.
3. Navigate to `http://<LAN-IP>:3000`

**Expected:** The theFridge app loads on the phone. The fridge list is visible.

**Failure signals:**
- Page cannot connect → container may be binding to `127.0.0.1` only; check `HOSTNAME: 0.0.0.0` in `docker-compose.yml`
- Firewall blocking → test with `curl http://<LAN-IP>:3000/api/health` from a second machine on the same network

---

### TC-07: Host reboot auto-restart (R029 — target device acceptance)

**Precondition:** Container is running on the target home device (Pi, Mac Mini, etc.) with `restart: unless-stopped`.

**Steps:**
1. Confirm container is healthy: `curl http://localhost:3000/api/health`
2. Reboot the host device.
3. Wait 2–3 minutes for the device to boot.
4. Without any SSH or manual intervention, navigate to `http://<LAN-IP>:3000` from a phone.

**Expected:** App is accessible without any manual restart steps.

---

## Edge Cases

### EC-01: Port 3000 already in use on host

If another process is using port 3000, `docker compose up` fails with `bind: address already in use`. Resolution: set `HOST_PORT=3001` in the shell before running compose (the compose file uses `${HOST_PORT:-3000}:3000`).

### EC-02: Interrupted previous run leaves stale container

If a prior run was interrupted, `docker compose up` may fail with "container name already in use". Run `docker compose down && docker rm -f thefridge-local` to clean up, then retry. The verification script handles this automatically via its pre-cleanup step.

### EC-03: `docker compose down --volumes` deletes data

Using the `--volumes` flag deletes the named volume and all SQLite data. The verification script uses `--volumes` intentionally during cleanup. Do NOT use `--volumes` in production teardowns if you want to preserve data.

### EC-04: Missing `GOOGLE_AI_API_KEY`

The container starts and serves all M001 features without an AI key. The intake extraction falls back to stub data (hardcoded draft items). Setting `GOOGLE_AI_API_KEY` in the shell before `docker compose up` passes it through via `${GOOGLE_AI_API_KEY:-}` in the compose environment block.

---

## Pass Criteria

This slice is accepted when:

- [ ] `bash scripts/verify-s01-docker.sh` exits 0 with 6/6 checks passing
- [ ] TC-01 through TC-06 all produce their expected outcomes
- [ ] TC-07 passes on the actual target home device (may be deferred to final milestone acceptance)
