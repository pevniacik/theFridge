---
estimated_steps: 4
estimated_files: 2
skills_used: []
---

# T02: Create host-mode compose file and mDNS verification script

**Slice:** S04 — mDNS Hostname
**Milestone:** M002

## Description

Create `docker-compose.host.yml` as a variant compose file that uses `network_mode: host` (required for mDNS multicast to reach the LAN), and `scripts/verify-s04-mdns.sh` to automate verification. The existing `docker-compose.yml` (bridge networking) is NOT modified — it remains the default for S01–S03 operators. The verification script must handle macOS gracefully (skip hostname resolution checks with a warning) since `network_mode: host` on Docker Desktop routes through a VM, not the real LAN.

## Steps

1. Create `docker-compose.host.yml` by cloning the structure of `docker-compose.yml` with these changes:
   - **Remove** the entire `ports:` section (incompatible with `network_mode: host`)
   - **Add** `network_mode: host` to the service
   - **Keep** everything else identical: environment, healthcheck, volumes, restart, logging
   - **Add** a comment block at the top explaining:
     - This file enables mDNS advertisement (`thefridge.local`)
     - Requires Linux host — macOS Docker Desktop runs in a VM so mDNS multicast won't reach the real LAN
     - Usage: `docker compose -f docker-compose.host.yml up -d`
     - Port 3000 is implicit (container binds directly to host network)

2. Create `scripts/verify-s04-mdns.sh` (executable, `#!/usr/bin/env bash`, `set -euo pipefail`):
   - **Pre-cleanup**: `docker compose -f docker-compose.host.yml down 2>/dev/null || true`
   - **Check 1**: `docker compose -f docker-compose.host.yml build` succeeds
   - **Check 2**: Start container, wait for `http://127.0.0.1:3000/api/health` → `{"status":"ok"}` (retry loop, 60s timeout)
   - **Check 3**: `docker inspect thefridge-local --format '{{.HostConfig.NetworkMode}}'` equals `host`
   - **Check 4**: `docker logs thefridge-local 2>&1 | grep -q '\[mdns\] Advertising thefridge.local'`
   - **Check 5** (Linux only): `ping -c 1 -W 3 thefridge.local` succeeds
   - **Check 6** (Linux only): `curl -sf http://thefridge.local:3000/api/health` returns ok
   - **OS detection**: Use `uname -s` — if `Darwin`, skip checks 5–6 with a yellow warning: "mDNS hostname resolution requires a Linux host (Docker Desktop on macOS runs in a VM)"
   - **Teardown**: `docker compose -f docker-compose.host.yml down`
   - **Summary**: Print pass/total count

3. Make the script executable: `chmod +x scripts/verify-s04-mdns.sh`

4. Dry-run the script on the dev machine to confirm it runs without syntax errors and passes checks 1–4 (checks 5–6 skipped on macOS).

## Must-Haves

- [ ] `docker-compose.host.yml` uses `network_mode: host` with no `ports:` section
- [ ] `docker-compose.host.yml` has comments documenting macOS limitation and usage
- [ ] `docker-compose.yml` is NOT modified
- [ ] `scripts/verify-s04-mdns.sh` is executable and has OS-aware check skipping
- [ ] Verification script tears down containers after running

## Verification

- `grep -q 'network_mode: host' docker-compose.host.yml` exits 0
- `! grep -q 'ports:' docker-compose.host.yml` exits 0
- `bash scripts/verify-s04-mdns.sh` runs without errors (checks 1–4 pass on any host)

## Inputs

- `docker-compose.yml` — existing bridge-mode compose file to use as structural template
- `lib/mdns/advertise.ts` — T01 output; must exist for the `[mdns]` log line check to pass
- `instrumentation.ts` — T01 output; must exist for the instrumentation hook to fire
- `package.json` — T01 output; must have `bonjour-service` installed

## Expected Output

- `docker-compose.host.yml` — new file: host-mode Docker Compose variant for mDNS
- `scripts/verify-s04-mdns.sh` — new file: automated S04 verification script
