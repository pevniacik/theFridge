#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <backup-file>"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BACKUP_FILE="$1"
if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

BACKUP_PATH="$(cd "$(dirname "$BACKUP_FILE")" && pwd)/$(basename "$BACKUP_FILE")"
BACKUP_DIR="$(dirname "$BACKUP_PATH")"
BACKUP_NAME="$(basename "$BACKUP_PATH")"

docker compose down
docker volume rm thefridge_data >/dev/null 2>&1 || true
docker volume create thefridge_data >/dev/null
docker run --rm \
  -v thefridge_data:/volume \
  -v "$BACKUP_DIR:/backup" \
  busybox \
  sh -c "tar xzf /backup/${BACKUP_NAME} -C /volume"
docker compose up -d fridge-app

echo "Restore complete from: ${BACKUP_PATH}"
