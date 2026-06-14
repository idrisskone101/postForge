#!/usr/bin/env bash
set -euo pipefail

export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@16/bin:$PATH"

REPO_ROOT="${POSTFORGE_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$REPO_ROOT"

corepack enable 2>/dev/null || true

pnpm test:workspace-shell
pnpm test:media-preview-frame
pnpm test:avatar-picker
pnpm test:video-trimmer
pnpm test:clone-production-state
pnpm test:clone-output-review-detail
pnpm test:output-review-status
pnpm test:gallery-output-review
pnpm test:source-selection
pnpm test:home-cockpit
pnpm test:home-loading
pnpm lint
pnpm build
