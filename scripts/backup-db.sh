#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

mkdir -p backups

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE_PATH="backups/fridge-data-${TIMESTAMP}.tar.gz"

RESTART_NEEDED=0
cleanup() {
  if [[ "$RESTART_NEEDED" -eq 1 ]]; then
    docker compose start fridge-app >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

docker compose stop fridge-app
RESTART_NEEDED=1
docker run --rm \
  -v thefridge_data:/volume \
  -v "$ROOT_DIR/backups:/backup" \
  busybox \
  sh -c "tar czf /backup/fridge-data-${TIMESTAMP}.tar.gz -C /volume ."
docker compose start fridge-app
RESTART_NEEDED=0

echo "Backup created: ${ARCHIVE_PATH}"
