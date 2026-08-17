#!/usr/bin/env bash
set -euo pipefail

# Cursor session hook: drain event JSON, prune Playwright dumps, fail open.
cat >/dev/null

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if ! bash "$REPO_ROOT/scripts/prune-playwright-artifacts.sh" >/dev/null 2>&1; then
  printf '%s\n' '{}'
  exit 0
fi

printf '%s\n' '{}'
