#!/usr/bin/env bash
set -euo pipefail

# Cloud Agent start: Postgres, local .env, and Prisma migrations.
# Idempotent. Does not install packages or download yt-dlp.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  echo "pg_ctlcluster is missing; install postgresql-16 first" >&2
  exit 1
fi

if ! pg_lsclusters -h | awk '$1==16 && $2=="main" && $4=="online" { found=1 } END { exit found ? 0 : 1 }'; then
  sudo pg_ctlcluster 16 main start
fi

for _ in 1 2 3 4 5 6 7 8 9 10; do
  if pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
  echo "Postgres did not become ready on 127.0.0.1:5432" >&2
  exit 1
fi

sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'postforge') THEN
    CREATE ROLE postforge LOGIN PASSWORD 'postforge';
  END IF;
END
$$;
SELECT 'CREATE DATABASE postforge OWNER postforge'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'postforge')
\gexec
SQL

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
fi

if [ -f .env ]; then
  tmp="$(mktemp)"
  awk 'BEGIN { q = sprintf("%c", 34) }
    $0 ~ "^STORAGE_LOCAL_PATH=" { $0 = "STORAGE_LOCAL_PATH=" q "/workspace/data/outputs" q }
    { print }
  ' .env > "$tmp"
  mv "$tmp" .env
  mkdir -p /workspace/data/outputs
fi

if [ -f node_modules/.bin/prisma ] && [ -f .env ]; then
  pnpm exec prisma migrate deploy
fi
