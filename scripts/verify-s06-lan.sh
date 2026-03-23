#!/usr/bin/env bash
# scripts/verify-s06-lan.sh
# S06 mechanical LAN verification script.
#
# Usage:
#   bash scripts/verify-s06-lan.sh <lan-ip> <fridge-id>
#
# Prerequisites:
#   npm run dev must be running BEFORE calling this script (started separately).
#   The script runs npm run build last — this wipes .next. If you need
#   to keep the dev server alive after running this script, restart it with
#   `npm run dev` after the script completes.
#
# Exit code:
#   0 — all checks passed
#   1 — one or more checks failed

set -euo pipefail

LAN_IP="${1:-}"
FRIDGE_ID="${2:-}"

if [[ -z "$LAN_IP" || -z "$FRIDGE_ID" ]]; then
  echo "Usage: bash scripts/verify-s06-lan.sh <lan-ip> <fridge-id>"
  echo "  <lan-ip>    — LAN IP address of the host running npm run dev (e.g. 192.168.1.22)"
  echo "  <fridge-id> — ID of any existing fridge in the local DB (e.g. ZPPo56GIYQ)"
  exit 1
fi

PASS=0
FAIL=0
RESULTS=()

ok() {
  echo "  ✅ PASS: $1"
  RESULTS+=("✅ $1")
  PASS=$((PASS + 1))
}

fail() {
  echo "  ❌ FAIL: $1"
  RESULTS+=("❌ $1")
  FAIL=$((FAIL + 1))
}

echo ""
echo "══════════════════════════════════════════════"
echo "  S06 LAN Verification  —  $(date '+%Y-%m-%d %H:%M:%S')"
echo "  LAN IP   : $LAN_IP"
echo "  Fridge ID: $FRIDGE_ID"
echo "══════════════════════════════════════════════"
echo ""

# ── 1. Localhost health ───────────────────────────────────────────────────────
echo "→ 1. Localhost health endpoint"
HEALTH_LOCAL=$(curl -sf "http://localhost:3000/api/health" 2>&1) || HEALTH_LOCAL="FAILED"
if echo "$HEALTH_LOCAL" | grep -q '"status":"ok"'; then
  ok "localhost health → $HEALTH_LOCAL"
else
  fail "localhost health → got: $HEALTH_LOCAL"
fi

# ── 2. LAN health ────────────────────────────────────────────────────────────
echo "→ 2. LAN health endpoint (http://$LAN_IP:3000/api/health)"
HEALTH_LAN=$(curl -sf "http://$LAN_IP:3000/api/health" 2>&1) || HEALTH_LAN="FAILED"
if echo "$HEALTH_LAN" | grep -q '"status":"ok"'; then
  ok "LAN health → $HEALTH_LAN"
else
  fail "LAN health → got: $HEALTH_LAN"
fi

# ── 3. QR origin grep — fridge page HTML must contain the LAN IP ─────────────
echo "→ 3. QR origin in fridge page HTML (must contain $LAN_IP)"
FRIDGE_HTML=$(curl -sf "http://$LAN_IP:3000/fridges/$FRIDGE_ID" 2>&1) || FRIDGE_HTML=""
if echo "$FRIDGE_HTML" | grep -q "$LAN_IP"; then
  ok "fridge page HTML contains LAN IP ($LAN_IP) — QR will encode LAN origin"
else
  fail "fridge page HTML does NOT contain $LAN_IP — QR may encode localhost instead"
fi

# ── 4. Automated regression suite ────────────────────────────────────────────
echo "→ 4. Automated tests (npm run test)"
if npm run test 2>&1; then
  ok "npm run test — all tests pass"
else
  fail "npm run test — one or more tests failed"
fi

# ── 5. TypeScript type-check ─────────────────────────────────────────────────
echo "→ 5. TypeScript type-check (npm run type-check)"
if npm run type-check 2>&1; then
  ok "npm run type-check — no type errors"
else
  fail "npm run type-check — type errors found"
fi

# ── 6. Production build ───────────────────────────────────────────────────────
# NOTE: runs last because `next build` wipes .next, which crashes an already-running
# dev server. After this step completes, restart `npm run dev` to restore live serving.
echo "→ 6. Production build (npm run build)"
if npm run build 2>&1; then
  ok "npm run build — production build succeeded"
else
  fail "npm run build — build failed"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "══════════════════════════════════════════════"
for r in "${RESULTS[@]}"; do
  echo "  $r"
done
echo ""

if [[ "$FAIL" -gt 0 ]]; then
  echo "🛑 S06 verification FAILED ($FAIL check(s)). Fix failing checks before marking S06 done."
  echo "   Note: if only health checks failed after a prior build run, restart npm run dev first."
  exit 1
else
  echo "✅ All S06 mechanical checks passed. Proceed to human UAT (S06-UAT.md)."
  exit 0
fi
