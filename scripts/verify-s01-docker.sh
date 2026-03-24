#!/usr/bin/env bash
# verify-s01-docker.sh — S01 slice verification for M002
# Validates: R027 (docker compose up), R028 (data persistence), R029 (restart policy), R030 (LAN binding)
# Usage: bash scripts/verify-s01-docker.sh
# Idempotent: always tears down at the end (or on error).

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
COMPOSE_FILE="$(cd "$(dirname "$0")/.." && pwd)/docker-compose.yml"
CONTAINER_NAME="thefridge-local"
BASE_URL="http://localhost:3000"
HEALTH_TIMEOUT=90   # seconds to wait for /api/health
POLL_INTERVAL=3

# ── Counters ──────────────────────────────────────────────────────────────────
PASS=0
FAIL=0

pass() { echo "  ✅ PASS — $*"; (( ++PASS )) || true; }
fail() { echo "  ❌ FAIL — $*"; (( ++FAIL )) || true; }

require_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo "ERROR: '$1' not found — cannot run Docker checks." >&2
    exit 1
  fi
}

# ── Cleanup ───────────────────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo "── Cleanup ──────────────────────────────────────────────────────────────"
  docker compose -f "$COMPOSE_FILE" down --volumes 2>&1 | sed 's/^/  /' || true
}
trap cleanup EXIT

# ── Helpers ───────────────────────────────────────────────────────────────────
wait_healthy() {
  local label="$1"
  local elapsed=0
  echo "  ⏳ Waiting for $BASE_URL/api/health (up to ${HEALTH_TIMEOUT}s)…"
  while [[ $elapsed -lt $HEALTH_TIMEOUT ]]; do
    local status
    status=$(curl -sf --max-time 5 "$BASE_URL/api/health" 2>/dev/null || true)
    if echo "$status" | grep -q '"status":"ok"'; then
      echo "  ℹ️  $label healthy after ${elapsed}s"
      return 0
    fi
    sleep "$POLL_INTERVAL"
    ((elapsed += POLL_INTERVAL))
  done
  echo "  ⚠️  Timed out waiting for $label after ${HEALTH_TIMEOUT}s" >&2
  echo "  ── Container logs ──────────────────────────────────────────────────" >&2
  docker compose -f "$COMPOSE_FILE" logs --tail=40 2>&1 >&2 || true
  return 1
}

# ── Pre-flight ────────────────────────────────────────────────────────────────
require_cmd docker
require_cmd curl

echo "════════════════════════════════════════════════════════════════════════"
echo "  theFridge S01 Docker Verification"
echo "  Compose file: $COMPOSE_FILE"
echo "════════════════════════════════════════════════════════════════════════"

# ── Pre-cleanup: remove stale containers/volumes from a prior interrupted run ─
echo ""
echo "── [0/7] Pre-cleanup (stale state) ──────────────────────────────────────"
docker compose -f "$COMPOSE_FILE" down --volumes 2>&1 | sed 's/^/  /' || true
docker rm -f "$CONTAINER_NAME" 2>/dev/null | sed 's/^/  /' || true
echo "  Pre-cleanup done"

# ── Step 1: Build ─────────────────────────────────────────────────────────────
echo ""
echo "── [1/7] docker compose build ───────────────────────────────────────────"
if docker compose -f "$COMPOSE_FILE" build 2>&1 | sed 's/^/  /'; then
  pass "docker compose build succeeded"
else
  fail "docker compose build failed"
  exit 1
fi

# ── Step 2: Start ─────────────────────────────────────────────────────────────
echo ""
echo "── [2/7] docker compose up -d ───────────────────────────────────────────"
docker compose -f "$COMPOSE_FILE" up -d 2>&1 | sed 's/^/  /'

# ── Step 3: Health check (R027) ───────────────────────────────────────────────
echo ""
echo "── [3/7] Health endpoint — R027 ─────────────────────────────────────────"
if wait_healthy "first boot"; then
  health_body=$(curl -sf --max-time 5 "$BASE_URL/api/health")
  if echo "$health_body" | grep -q '"status":"ok"'; then
    pass "GET /api/health → {\"status\":\"ok\"}"
  else
    fail "GET /api/health response does not contain status:ok — got: $health_body"
  fi
else
  fail "Container never became healthy"
  exit 1
fi

# ── Step 4: Create fridge for persistence test (R028 setup) ──────────────────
echo ""
echo "── [4/7] Create test fridge ─────────────────────────────────────────────"
create_resp=$(curl -sf --max-time 10 -X POST "$BASE_URL/api/fridges" \
  -H "Content-Type: application/json" \
  -d '{"name":"Persistence Test","type":"fridge"}' 2>&1)
echo "  Response: $create_resp"

fridge_id=$(echo "$create_resp" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
if [[ -z "$fridge_id" ]]; then
  fail "Could not capture fridge ID from create response"
  exit 1
else
  pass "Created fridge with id=$fridge_id"
fi

# ── Step 5: Restart and verify persistence (R028) ─────────────────────────────
echo ""
echo "── [5/7] Data persistence across restart — R028 ─────────────────────────"
echo "  ⏳ Stopping containers…"
docker compose -f "$COMPOSE_FILE" down 2>&1 | sed 's/^/  /'
echo "  ⏳ Restarting containers…"
docker compose -f "$COMPOSE_FILE" up -d 2>&1 | sed 's/^/  /'
if wait_healthy "restart"; then
  list_resp=$(curl -sf --max-time 10 "$BASE_URL/api/fridges")
  if echo "$list_resp" | grep -q "\"id\":\"$fridge_id\""; then
    pass "Fridge id=$fridge_id survived docker compose down+up (data persisted)"
  else
    fail "Fridge id=$fridge_id NOT found after restart — persistence broken. Response: $list_resp"
  fi
else
  fail "Container did not become healthy after restart"
  exit 1
fi

# ── Step 6: Restart policy (R029) ─────────────────────────────────────────────
echo ""
echo "── [6/7] Restart policy — R029 ──────────────────────────────────────────"
restart_policy=$(docker inspect "$CONTAINER_NAME" \
  --format '{{.HostConfig.RestartPolicy.Name}}' 2>/dev/null || true)
echo "  Restart policy: $restart_policy"
if [[ "$restart_policy" == "unless-stopped" ]]; then
  pass "Container restart policy is 'unless-stopped'"
else
  fail "Expected restart policy 'unless-stopped', got '$restart_policy'"
fi

# ── Step 7: LAN binding (R030) ────────────────────────────────────────────────
echo ""
echo "── [7/7] LAN binding 0.0.0.0:3000 — R030 ────────────────────────────────"
port_bindings=$(docker inspect "$CONTAINER_NAME" \
  --format '{{json .NetworkSettings.Ports}}' 2>/dev/null || true)
echo "  Port bindings: $port_bindings"
if echo "$port_bindings" | grep -q '"HostIp":"0.0.0.0"'; then
  pass "Container binds 0.0.0.0:3000 (LAN accessible)"
else
  fail "Container does NOT bind 0.0.0.0 — LAN access may be broken. Bindings: $port_bindings"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════════════════"
TOTAL=$((PASS + FAIL))
echo "  Results: $PASS/$TOTAL checks passed"
if [[ $FAIL -gt 0 ]]; then
  echo "  ❌ $FAIL check(s) FAILED"
  echo "════════════════════════════════════════════════════════════════════════"
  exit 1
else
  echo "  ✅ All checks passed"
  echo "════════════════════════════════════════════════════════════════════════"
  exit 0
fi
