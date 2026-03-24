#!/usr/bin/env bash
# verify-s02-pwa.sh — Integration gate for S02: PWA Shell & Home Screen
# Proves all PWA artifacts are built into the Docker image and served by the container.
# Usage: bash scripts/verify-s02-pwa.sh
# Exits 0 when all checks pass, non-zero on any failure.

set -euo pipefail

PASS=0
FAIL=0
BASE_URL="http://localhost:3000"
HEALTH_URL="${BASE_URL}/api/health"
CONTAINER_NAME="thefridge-local"

log()  { echo "[verify-s02-pwa] $*"; }
pass() { echo "  ✅ PASS: $*"; PASS=$((PASS + 1)); }
fail() { echo "  ❌ FAIL: $*"; FAIL=$((FAIL + 1)); }

# --- Cleanup helper (always runs) ---
cleanup() {
  log "Tearing down containers..."
  docker compose down --remove-orphans 2>/dev/null || true
  log "Teardown complete."
}
trap cleanup EXIT

# --- Step 0: Clean slate ---
log "Cleaning up stale containers..."
docker compose down --remove-orphans 2>/dev/null || true

# --- Step 1: Build ---
log "Running docker compose build..."
if docker compose build; then
  pass "docker compose build exited 0"
else
  fail "docker compose build failed"
  exit 1
fi

# --- Step 2: Start container ---
log "Starting container in detached mode..."
docker compose up -d

# --- Step 3: Wait for health (poll up to 60s) ---
log "Waiting for container health at ${HEALTH_URL}..."
HEALTH_OK=false
for i in $(seq 1 30); do
  if curl -sf "${HEALTH_URL}" > /dev/null 2>&1; then
    HEALTH_OK=true
    log "Container healthy after ${i}x2s polls."
    break
  fi
  sleep 2
done

if [ "$HEALTH_OK" != "true" ]; then
  fail "Container did not become healthy within 60s"
  docker compose logs --tail=50
  exit 1
fi
pass "Container health check passed"

# --- Check 1: Service worker is served and contains expected content ---
log "Check 1: /sw.js contains precache or serwist content..."
SW_BODY=$(curl -sf "${BASE_URL}/sw.js" 2>/dev/null || true)
if echo "${SW_BODY}" | grep -qiE "precache|serwist"; then
  pass "/sw.js served and contains 'precache' or 'serwist'"
else
  fail "/sw.js not served or missing expected precache content (got ${#SW_BODY} bytes)"
  echo "--- First 200 chars of /sw.js response ---"
  echo "${SW_BODY}" | head -c 200
fi

# --- Check 2: Offline page returns HTML ---
log "Check 2: /~offline returns HTML content..."
OFFLINE_BODY=$(curl -sf "${BASE_URL}/~offline" 2>/dev/null || true)
if echo "${OFFLINE_BODY}" | grep -qi "html"; then
  pass "/~offline returned HTML"
else
  fail "/~offline did not return HTML (got ${#OFFLINE_BODY} bytes)"
  echo "--- First 200 chars of /~offline response ---"
  echo "${OFFLINE_BODY}" | head -c 200
fi

# --- Check 3: Icon is served as image/png ---
log "Check 3: /icons/icon-192.png content-type is image/png..."
ICON_CT=$(curl -sf "${BASE_URL}/icons/icon-192.png" -o /dev/null -w '%{content_type}' 2>/dev/null || true)
if echo "${ICON_CT}" | grep -q "image/png"; then
  pass "/icons/icon-192.png served with content-type: ${ICON_CT}"
else
  fail "/icons/icon-192.png not served as image/png (got: '${ICON_CT}')"
fi

# --- Check 4: Manifest is valid JSON and references icon-192.png ---
log "Check 4: /manifest.webmanifest is valid JSON with icon-192.png..."
MANIFEST_BODY=$(curl -sf "${BASE_URL}/manifest.webmanifest" 2>/dev/null || true)
if echo "${MANIFEST_BODY}" | node -e "
  const d = require('fs').readFileSync('/dev/stdin','utf8');
  const m = JSON.parse(d);
  const hasIcon = JSON.stringify(m).includes('icon-192.png');
  if (!hasIcon) { console.error('icon-192.png not found in manifest'); process.exit(1); }
  console.log('valid JSON with icon-192.png');
" 2>/dev/null; then
  pass "/manifest.webmanifest is valid JSON and references icon-192.png"
else
  fail "/manifest.webmanifest missing, invalid JSON, or missing icon-192.png entry"
  echo "--- Manifest body (first 300 chars) ---"
  echo "${MANIFEST_BODY}" | head -c 300
fi

# --- Summary ---
echo ""
echo "================================================"
echo " S02 PWA verification: ${PASS} passed, ${FAIL} failed"
echo "================================================"

if [ "${FAIL}" -gt 0 ]; then
  echo "❌ Verification FAILED — see above for details."
  exit 1
else
  echo "✅ All checks passed."
  exit 0
fi
