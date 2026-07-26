#!/bin/sh
set -e

echo "[server] APP_ENV=${APP_ENV:-unknown} NODE_ENV=${NODE_ENV:-unknown}"

if [ "${SKIP_MIGRATE:-false}" != "true" ]; then
  echo "[server] Running prisma migrate deploy..."
  npx prisma migrate deploy
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "[server] Running seed (SEED_MODE=${SEED_MODE:-catalog})..."
  npx tsx prisma/seed.ts || npm run db:seed
fi

echo "[server] Starting..."
exec node dist/index.js
