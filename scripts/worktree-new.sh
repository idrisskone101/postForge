#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/worktree-new.sh <branch-name> [base-branch]
# Example: ./scripts/worktree-new.sh feature/cool-thing main

BRANCH="${1:?Usage: worktree-new.sh <branch-name> [base-branch]}"
BASE="${2:-main}"

# Resolve the repo root (where this script lives)
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKTREE_DIR="${REPO_ROOT}/../postForge-${BRANCH##*/}"

echo "==> Creating worktree at ${WORKTREE_DIR} (branch: ${BRANCH}, base: ${BASE})"
git worktree add -b "$BRANCH" "$WORKTREE_DIR" "$BASE" 2>/dev/null \
  || git worktree add "$WORKTREE_DIR" "$BRANCH"

cd "$WORKTREE_DIR"

# Copy .env from main repo
if [ -f "${REPO_ROOT}/.env" ]; then
  cp "${REPO_ROOT}/.env" .env
  echo "==> Copied .env"
elif [ -f "${REPO_ROOT}/.env.example" ]; then
  cp "${REPO_ROOT}/.env.example" .env
  echo "==> Copied .env.example -> .env (fill in your keys!)"
fi

if [ -f "${REPO_ROOT}/.env.local" ]; then
  cp "${REPO_ROOT}/.env.local" .env.local
  echo "==> Copied .env.local"
fi

echo "==> Running Kode setup..."
POSTFORGE_ENV_SOURCE_DIR="$REPO_ROOT" bash scripts/kode-setup.sh

echo ""
echo "Done! Worktree ready at: ${WORKTREE_DIR}"
echo "  cd ${WORKTREE_DIR}"
echo "  pnpm dev"
