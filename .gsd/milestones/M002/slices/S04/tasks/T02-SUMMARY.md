---
id: T02
parent: S04
milestone: M002
provides:
  - docker-compose.host.yml: host-network Docker Compose variant enabling mDNS multicast
  - scripts/verify-s04-mdns.sh: automated S04 verification script (OS-aware, 6 checks)
key_files:
  - docker-compose.host.yml
  - scripts/verify-s04-mdns.sh
key_decisions:
  - Verification script polls Docker healthcheck status (docker inspect .State.Health.Status) rather than curling from host — required because network_mode:host on macOS Docker Desktop binds to VM loopback, not macOS 127.0.0.1
patterns_established:
  - For network_mode:host containers on Docker Desktop, always use docker inspect healthcheck status in verification scripts rather than curl from the macOS shell
observability_surfaces:
  - "[mdns] Advertising thefridge.local on port 3000" confirmed present in container logs during dry-run
  - docker compose -f docker-compose.host.yml logs fridge-app | grep mdns — primary inspection surface documented in host compose header comment
duration: ~15m
verification_result: passed
completed_at: 2026-03-24
blocker_discovered: false
---

# T02: Create host-mode compose file and mDNS verification script

**Created `docker-compose.host.yml` with `network_mode: host` and `scripts/verify-s04-mdns.sh`; all 4 cross-platform checks pass (mDNS log line confirmed), 2 Linux-only checks correctly skipped on macOS.**

## What Happened

`docker-compose.host.yml` was created as a structural clone of `docker-compose.yml` with `network_mode: host` added and the `ports:` section removed (incompatible with host networking). A header comment block documents the macOS limitation, the usage command, and how port 3000 is accessed implicitly.

`scripts/verify-s04-mdns.sh` was written following the existing verify script style (`verify-s01-docker.sh`). It runs 6 checks: build, container healthy, network mode = host, `[mdns]` log line, ping hostname (Linux only), curl via hostname (Linux only). OS detection via `uname -s` skips checks 5–6 on Darwin with a yellow warning.

One unplanned deviation occurred: the task plan's check 2 specified polling `curl http://127.0.0.1:3000/api/health` from the host. On macOS Docker Desktop, `network_mode: host` binds to the Linux VM's loopback, not the macOS host's, so this curl always times out. The fix was to poll `docker inspect <container> --format '{{.State.Health.Status}}'` instead — the container's own healthcheck runs inside the VM where 127.0.0.1 works. This is documented in KNOWLEDGE.md.

The first dry-run confirmed the mDNS log line `[mdns] Advertising thefridge.local on port 3000` appears in the container logs (visible even before the health timeout), validating that T01's instrumentation hook fires correctly.

## Verification

Static checks ran first:
- `grep -q 'network_mode: host' docker-compose.host.yml` → exit 0
- `! grep -q '^    ports:' docker-compose.host.yml` → exit 0
- `bash -n scripts/verify-s04-mdns.sh` → exit 0 (syntax OK)
- `grep -q 'ports:' docker-compose.yml` → exit 0 (original unchanged)

Full dry-run `bash scripts/verify-s04-mdns.sh`:
- Check 1 (build): ✅ PASS
- Check 2 (Docker healthcheck healthy): ✅ PASS (healthy after 6s)
- Check 3 (network_mode=host): ✅ PASS
- Check 4 (mDNS log line): ✅ PASS — `[mdns] Advertising thefridge.local on port 3000`
- Check 5 (ping): ⚠️ SKIP (macOS)
- Check 6 (curl via hostname): ⚠️ SKIP (macOS)
- Result: 4 passed, 0 failed, 2 skipped — ✅

Slice-level: `npm run type-check` → exit 0.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `grep -q 'network_mode: host' docker-compose.host.yml` | 0 | ✅ pass | <1s |
| 2 | `! grep -q '^    ports:' docker-compose.host.yml` | 0 | ✅ pass | <1s |
| 3 | `bash -n scripts/verify-s04-mdns.sh` | 0 | ✅ pass | <1s |
| 4 | `npm run type-check` | 0 | ✅ pass | ~3s |
| 5 | `bash scripts/verify-s04-mdns.sh` (checks 1–4) | 0 | ✅ pass | ~72s |

## Observability Impact

- **Container log inspection:** `docker compose -f docker-compose.host.yml logs fridge-app | grep mdns` — shows `[mdns] Advertising thefridge.local on port 3000` on startup and `[mdns] Stopping advertisement` on SIGTERM.
- **Network mode inspection:** `docker inspect thefridge-local --format '{{.HostConfig.NetworkMode}}'` — must return `host`.
- **Healthcheck status:** `docker inspect thefridge-local --format '{{.State.Health.Status}}'` — polls container health without curl from host.
- **Failure state:** Missing mDNS log line after startup indicates the instrumentation hook didn't fire. Check `docker compose -f docker-compose.host.yml logs fridge-app | grep -E 'Ready|mdns'` — if "Ready" appears but no "[mdns]", the instrumentation.ts wasn't compiled or the runtime guard blocked it.

## Diagnostics

- Confirm mDNS fired: `docker compose -f docker-compose.host.yml logs fridge-app | grep '\[mdns\]'`
- Check network mode: `docker inspect thefridge-local --format '{{.HostConfig.NetworkMode}}'`
- Run full automated verification: `bash scripts/verify-s04-mdns.sh`

## Deviations

**Check 2 changed from host-curl to Docker healthcheck polling (unplanned):** The task plan specified `curl http://127.0.0.1:3000/api/health` from the host shell. On macOS Docker Desktop, `network_mode: host` binds the container to the Linux VM's loopback, making host-side curl fail despite the container being healthy. Changed to `docker inspect --format '{{.State.Health.Status}}'` which works on all OSes. Documented in KNOWLEDGE.md.

## Known Issues

Checks 5–6 (ping + curl via hostname) cannot be verified on macOS Docker Desktop. They are architecturally correct for Linux hosts — the slice demo target. No fix needed; the OS detection guard is the correct solution.

## Files Created/Modified

- `docker-compose.host.yml` — new: host-network Docker Compose variant for mDNS advertisement
- `scripts/verify-s04-mdns.sh` — new: automated S04 mDNS verification script (executable, OS-aware)
- `.gsd/KNOWLEDGE.md` — appended: Docker Desktop host-networking loopback isolation gotcha
