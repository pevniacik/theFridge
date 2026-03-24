#!/usr/bin/env bash
# verify-s04-mdns.sh — S04 slice verification for M002
# Validates: mDNS advertisement via bonjour-service in host-network Docker container
# Checks 1-4 run on any OS; checks 5-6 (hostname resolution) run on Linux only.
# Usage: bash scripts/verify-s04-mdns.sh
# Idempotent: always tears down at the end (or on error).

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.host.yml"
CONTAINER_NAME="thefridge-local"
BASE_URL="http://127.0.0.1:3000"
HEALTH_TIMEOUT=120   # seconds to wait for Docker healthcheck (start_period=40s + retries)
POLL_INTERVAL=3

# ── Colour helpers ────────────────────────────────────────────────────────────
YELLOW='\033[1;33m'
NC='\033[0m'  # No Colour

# ── Counters ──────────────────────────────────────────────────────────────────
PASS=0
FAIL=0
SKIP=0

pass() { echo "  ✅ PASS — $*"; (( ++PASS )) || true; }
fail() { echo "  ❌ FAIL — $*"; (( ++FAIL )) || true; }
skip() { echo -e "  ${YELLOW}⚠️  SKIP — $*${NC}"; (( ++SKIP )) || true; }

require_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo "ERROR: '$1' not found — cannot run checks." >&2
    exit 1
  fi
}

# ── OS detection ──────────────────────────────────────────────────────────────
OS="$(uname -s)"
IS_LINUX=false
[[ "$OS" == "Linux" ]] && IS_LINUX=true

# ── Cleanup ───────────────────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo "── Cleanup ──────────────────────────────────────────────────────────────"
  docker compose -f "$COMPOSE_FILE" down 2>&1 | sed 's/^/  /' || true
  echo "  Cleanup done"
}
trap cleanup EXIT

# ── Helpers ───────────────────────────────────────────────────────────────────
wait_healthy() {
  # Use Docker's own healthcheck status rather than curl from the host.
  # This works on macOS Docker Desktop where network_mode:host binds to the
  # Linux VM's loopback, not the macOS host's 127.0.0.1.
  local elapsed=0
  echo "  ⏳ Waiting for Docker healthcheck to become 'healthy' (up to ${HEALTH_TIMEOUT}s)…"
  while [[ $elapsed -lt $HEALTH_TIMEOUT ]]; do
    local health
    health=$(docker inspect "$CONTAINER_NAME" --format '{{.State.Health.Status}}' 2>/dev/null || true)
    if [[ "$health" == "healthy" ]]; then
      echo "  ℹ️  Container reported healthy after ${elapsed}s"
      return 0
    fi
    sleep "$POLL_INTERVAL"
    (( elapsed += POLL_INTERVAL ))
  done
  local final_health
  final_health=$(docker inspect "$CONTAINER_NAME" --format '{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
  echo "  ⚠️  Timed out after ${HEALTH_TIMEOUT}s — health status: $final_health" >&2
  echo "  ── Container logs ──────────────────────────────────────────────────" >&2
  docker compose -f "$COMPOSE_FILE" logs --tail=40 2>&1 >&2 || true
  return 1
}

# ── Pre-flight ────────────────────────────────────────────────────────────────
require_cmd docker
require_cmd curl

echo "════════════════════════════════════════════════════════════════════════"
echo "  theFridge S04 mDNS Verification"
echo "  Compose file: $COMPOSE_FILE"
echo "  OS: $OS (hostname checks: $(${IS_LINUX} && echo 'enabled' || echo 'skipped — not Linux'))"
echo "════════════════════════════════════════════════════════════════════════"

# ── Pre-cleanup: remove stale containers from a prior interrupted run ─────────
echo ""
echo "── [0/6] Pre-cleanup (stale state) ──────────────────────────────────────"
docker compose -f "$COMPOSE_FILE" down 2>/dev/null || true
docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
echo "  Pre-cleanup done"

# ── Check 1: Build ────────────────────────────────────────────────────────────
echo ""
echo "── [1/6] docker compose build ───────────────────────────────────────────"
if docker compose -f "$COMPOSE_FILE" build 2>&1 | sed 's/^/  /'; then
  pass "docker compose build succeeded"
else
  fail "docker compose build failed"
  exit 1
fi

# ── Check 2: Container starts and Docker healthcheck turns healthy ─────────────
echo ""
echo "── [2/6] Container start + Docker healthcheck ────────────────────────────"
docker compose -f "$COMPOSE_FILE" up -d 2>&1 | sed 's/^/  /'
if wait_healthy; then
  pass "Container started and Docker healthcheck is 'healthy'"
else
  fail "Container never became healthy"
  exit 1
fi

# ── Check 3: network_mode is host ─────────────────────────────────────────────
echo ""
echo "── [3/6] Network mode is 'host' ──────────────────────────────────────────"
network_mode=$(docker inspect "$CONTAINER_NAME" \
  --format '{{.HostConfig.NetworkMode}}' 2>/dev/null || true)
echo "  NetworkMode: $network_mode"
if [[ "$network_mode" == "host" ]]; then
  pass "Container network_mode is 'host'"
else
  fail "Expected network_mode 'host', got '$network_mode'"
fi

# ── Check 4: mDNS advertisement log line ──────────────────────────────────────
echo ""
echo "── [4/6] mDNS advertisement log line ────────────────────────────────────"
# Give the app a moment to emit the instrumentation log
sleep 3
if docker logs "$CONTAINER_NAME" 2>&1 | grep -q '\[mdns\] Advertising thefridge.local'; then
  log_line=$(docker logs "$CONTAINER_NAME" 2>&1 | grep '\[mdns\] Advertising thefridge.local' | head -1)
  pass "Log line found: $log_line"
else
  fail "Log line '[mdns] Advertising thefridge.local' NOT found in container logs"
  echo "  ── Recent logs ────────────────────────────────────────────────────" >&2
  docker logs "$CONTAINER_NAME" --tail=30 2>&1 | sed 's/^/  /' >&2 || true
fi

# ── Check 5 (Linux only): ping thefridge.local resolves ───────────────────────
echo ""
echo "── [5/6] mDNS hostname resolution — ping thefridge.local ────────────────"
if $IS_LINUX; then
  if ping -c 1 -W 3 thefridge.local &>/dev/null; then
    pass "ping thefridge.local resolved and responded"
  else
    fail "ping thefridge.local did not resolve or did not respond"
  fi
else
  skip "mDNS hostname resolution requires a Linux host (Docker Desktop on macOS runs in a VM)"
fi

# ── Check 6 (Linux only): curl via hostname returns ok ────────────────────────
echo ""
echo "── [6/6] curl http://thefridge.local:3000/api/health ────────────────────"
if $IS_LINUX; then
  if curl -sf http://thefridge.local:3000/api/health | grep -q '"status":"ok"'; then
    pass "curl http://thefridge.local:3000/api/health → {\"status\":\"ok\"}"
  else
    fail "curl http://thefridge.local:3000/api/health did not return status:ok"
  fi
else
  skip "mDNS hostname resolution requires a Linux host (Docker Desktop on macOS runs in a VM)"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════════════════"
TOTAL=$(( PASS + FAIL + SKIP ))
echo "  Results: $PASS passed, $FAIL failed, $SKIP skipped (of $TOTAL checks)"
if [[ $FAIL -gt 0 ]]; then
  echo "  ❌ $FAIL check(s) FAILED"
  echo "════════════════════════════════════════════════════════════════════════"
  exit 1
else
  echo "  ✅ All applicable checks passed"
  echo "════════════════════════════════════════════════════════════════════════"
  exit 0
fi
