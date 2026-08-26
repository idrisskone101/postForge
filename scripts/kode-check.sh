#!/usr/bin/env bash
set -euo pipefail

export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@16/bin:$PATH"

REPO_ROOT="${POSTFORGE_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$REPO_ROOT"

corepack enable 2>/dev/null || true

export KODE_SMOKE_ROUTES=1

pnpm exec tsx scripts/check-pr-boundaries.ts
pnpm test
pnpm check:module-size
pnpm check:kode-taste
pnpm check:workspace-prefetch
pnpm typecheck
pnpm lint
pnpm build
pnpm kode:smoke
