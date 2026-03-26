#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -f .env ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|\#*) continue ;; esac
    [[ "$line" == *=* ]] || continue
    key="${line%%=*}"
    value="${line#*=}"
    export "$key=$value"
  done < .env
fi

docker compose -f docker-compose.prod.yml up -d db

retries="${MC_DB_WAIT_RETRIES:-30}"
delay="${MC_DB_WAIT_DELAY:-2}"
attempt=1
while [ "$attempt" -le "$retries" ]; do
  if docker compose -f docker-compose.prod.yml exec -T db pg_isready -U "${POSTGRES_USER:-mission_control}" -d "${POSTGRES_DB:-mission_control}" >/dev/null 2>&1; then
    exit 0
  fi

  sleep "$delay"
  attempt=$((attempt + 1))
done

if [ "$attempt" -gt "$retries" ]; then
  echo "Database did not become ready after ${retries} attempts." >&2
  exit 1
fi

cd "$ROOT_DIR/app"
node scripts/with-root-env.mjs prisma migrate deploy
node scripts/with-root-env.mjs node scripts/bootstrap-db.mjs
