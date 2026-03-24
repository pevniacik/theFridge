---
estimated_steps: 3
estimated_files: 1
skills_used: []
---

# T02: Write verification script and validate Docker build

**Slice:** S01 — Docker Production Container
**Milestone:** M002

## Description

Write `scripts/verify-s01-docker.sh` — a self-contained bash script that validates R027 (docker compose up works), R028 (data persists across restart), R029 (restart policy set), and R030 (LAN binding). Then attempt to run `docker build` and the verification script to prove the slice works end-to-end.

## Steps

1. **Create `scripts/verify-s01-docker.sh`** with these checks:
   - Build the Docker image: `docker compose build`
   - Start containers: `docker compose up -d`
   - Wait for healthy (poll `/api/health` up to 60s)
   - Verify health response contains `"status":"ok"`
   - Create a fridge via `POST /api/fridges` with JSON body `{"name":"Persistence Test","type":"fridge"}`
   - Capture fridge ID from response
   - `docker compose down` then `docker compose up -d` again
   - Wait for healthy again
   - `GET /api/fridges` and verify the test fridge still exists (R028)
   - Verify `docker inspect thefridge-local` shows restart policy is `unless-stopped` (R029)
   - Verify container port binding includes `0.0.0.0:3000` (R030)
   - Clean up: `docker compose down`
   - Report pass/fail count

   Script should use `set -euo pipefail`, print each check with pass/fail, and exit non-zero on any failure. Use a `COMPOSE_PROJECT` variable so it doesn't conflict with other running containers.

2. **Run `docker build -t thefridge-test .`** to validate the multi-stage build completes (especially the `better-sqlite3` native compilation in deps stage and the standalone output in builder stage). If Docker is not available in the environment, note this and the script is still the deliverable.

3. **If Docker is available and build succeeded, run the full verification script.** If any check fails, diagnose and fix (may require going back to T01 files). If Docker is not available, validate the script is syntactically correct with `bash -n`.

## Must-Haves

- [ ] `scripts/verify-s01-docker.sh` exists and is executable
- [ ] Script tests health endpoint, data persistence, restart policy, and port binding
- [ ] Script is idempotent (cleans up after itself)
- [ ] Script exits non-zero on any failure

## Verification

- `test -f scripts/verify-s01-docker.sh` → exit 0
- `bash -n scripts/verify-s01-docker.sh` → exit 0 (syntax valid)
- `docker build -t thefridge-test .` → exit 0 (if Docker available)
- `bash scripts/verify-s01-docker.sh` → all checks pass (if Docker available)

## Inputs

- `Dockerfile` — updated by T01 with standalone runner stage
- `docker-compose.yml` — updated by T01 with env passthrough
- `next.config.ts` — updated by T01 with `output: 'standalone'`
- `app/api/health/route.ts` — existing health endpoint
- `app/api/fridges/route.ts` — existing fridge CRUD API

## Expected Output

- `scripts/verify-s01-docker.sh` — verification script covering R027–R030
