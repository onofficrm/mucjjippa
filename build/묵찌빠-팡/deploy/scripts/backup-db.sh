#!/usr/bin/env bash
# PostgreSQL 논리 백업 — Docker Compose 기준
# 사용: ./deploy/scripts/backup-db.sh [output-dir]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_DIR="${1:-$ROOT/deploy/backup}"
STAMP="$(date +%Y%m%d_%H%M%S)"
FILE="$OUT_DIR/mucjjippa_${STAMP}.sql.gz"

mkdir -p "$OUT_DIR"
echo "Backing up to $FILE"

docker compose -f "$ROOT/docker-compose.yml" exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-mucjjippa}" -d "${POSTGRES_DB:-mucjjippa}" --clean --if-exists \
  | gzip > "$FILE"

# 보관 14일 (환경에 맞게 조정)
find "$OUT_DIR" -name 'mucjjippa_*.sql.gz' -mtime +14 -delete 2>/dev/null || true
echo "Done: $FILE"
ls -lh "$FILE"
