#!/usr/bin/env bash
# 백업 복구 — 주의: 대상 DB를 덮어씁니다
# 사용: ./deploy/scripts/restore-db.sh deploy/backup/mucjjippa_YYYYMMDD_HHMMSS.sql.gz
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FILE="${1:?usage: restore-db.sh <backup.sql.gz>}"

if [ ! -f "$FILE" ]; then
  echo "File not found: $FILE" >&2
  exit 1
fi

echo "Restoring $FILE → postgres"
gunzip -c "$FILE" | docker compose -f "$ROOT/docker-compose.yml" exec -T postgres \
  psql -U "${POSTGRES_USER:-mucjjippa}" -d "${POSTGRES_DB:-mucjjippa}"

echo "Restore complete. Restart server if needed."
