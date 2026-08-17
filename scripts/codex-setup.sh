#!/usr/bin/env bash
set -euo pipefail

export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@16/bin:$PATH"

REPO_ROOT="${POSTFORGE_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
SOURCE_ROOT="${POSTFORGE_ENV_SOURCE_DIR:-/Users/idrisskone/Developer/postForge}"

cd "$REPO_ROOT"

copy_env_file() {
  local name="$1"
  local source_file="${SOURCE_ROOT}/${name}"

  if [ -f "$name" ]; then
    echo "==> Keeping existing ${name}"
  elif [ -f "$source_file" ] && [ "$source_file" != "${REPO_ROOT}/${name}" ]; then
    cp "$source_file" "$name"
    echo "==> Copied ${name} from ${SOURCE_ROOT}"
  elif [ "$name" = ".env" ] && [ -f ".env.example" ]; then
    cp ".env.example" ".env"
    echo "==> Created .env from .env.example"
  fi
}

set_env_default() {
  local file="$1"
  local key="$2"
  local value="$3"

  [ -f "$file" ] || return 0

  if ! grep -qE "^${key}=" "$file"; then
    printf '%s="%s"\n' "$key" "$value" >> "$file"
    return 0
  fi

  if grep -qE "^${key}=([[:space:]]*|\"\"|'')$" "$file"; then
    local tmp
    tmp="$(mktemp)"
    awk -v key="$key" -v value="$value" 'BEGIN { q = sprintf("%c", 34) } $0 ~ "^" key "=" { $0 = key "=" q value q } { print }' "$file" > "$tmp"
    mv "$tmp" "$file"
  fi
}

copy_env_file ".env"
copy_env_file ".env.local"

set_env_default ".env" "DATABASE_URL" "postgresql://postforge:postforge@localhost:5432/postforge"
set_env_default ".env" "PORT" "3000"
set_env_default ".env" "NEXT_PUBLIC_BASE_URL" "http://localhost:3000"
set_env_default ".env" "STORAGE_DRIVER" "database"

corepack enable 2>/dev/null || true
corepack prepare pnpm@10.30.3 --activate 2>/dev/null || true

if command -v docker >/dev/null 2>&1; then
  echo "==> Starting Postgres with Docker Compose"
  docker compose up -d postgres
else
  echo "==> Docker is not available; expecting Postgres at DATABASE_URL"
fi

pnpm install --frozen-lockfile
pnpm db:generate

if command -v pg_isready >/dev/null 2>&1 && [ -f ".env" ]; then
  DATABASE_URL_VALUE="$(awk -F= '/^DATABASE_URL=/{ value=$0; sub(/^[^=]+=/, "", value); gsub(/^"|"$/, "", value); print value; exit }' .env)"
  if [ -n "${DATABASE_URL_VALUE:-}" ] && pg_isready -d "$DATABASE_URL_VALUE" >/dev/null 2>&1; then
    echo "==> Applying existing Prisma migrations"
    if ! pnpm exec prisma migrate deploy; then
      echo "==> Prisma migrations did not apply cleanly; continuing setup so the worktree remains usable"
      echo "==> Run 'pnpm exec prisma migrate status' for details"
    fi
  else
    echo "==> Postgres is not reachable; skipping Prisma migrations"
  fi
else
  echo "==> pg_isready is not available; skipping Prisma migrations"
fi

echo "==> Pruning Playwright CLI/MCP session artifacts"
bash "$REPO_ROOT/scripts/prune-playwright-artifacts.sh"
