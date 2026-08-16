#!/usr/bin/env bash
set -euo pipefail

export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@16/bin:$PATH"

REPO_ROOT="${POSTFORGE_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$REPO_ROOT"

corepack enable 2>/dev/null || true

pnpm test:api-client
pnpm test:workspace-shell
pnpm test:responsive-layout
pnpm test:character-attributes
pnpm test:character-builder-workbench
pnpm test:automations
pnpm test:automation-builder-parity
pnpm test:retry-collection-references
pnpm test:workspace-features
pnpm test:clone-handoff
pnpm test:generation-editor-redesign
pnpm test:performance-csv
pnpm test:social-integrations-ui
pnpm test:settings-developer-navigation
pnpm test:workspace-header
pnpm test:integrations
pnpm test:workspace-state
pnpm test:media-preview-frame
pnpm test:generate-tool
pnpm test:generate-output-actions
pnpm test:avatar-picker
pnpm test:avatar-import-candidates
pnpm test:avatar-import-acceptance
pnpm test:avatar-provenance
pnpm test:reference-image-prompt
pnpm test:video-trimmer
pnpm test:clone-production-state
pnpm test:clone-output-review-detail
pnpm test:output-review-status
pnpm test:gallery-output-review
pnpm test:source-selection
pnpm test:spend-page
pnpm test:home-active-jobs
pnpm test:home-review-jobs
pnpm test:slideshow-story
pnpm test:slideshow-creator
pnpm test:prompt-presentation
pnpm test:story-models
pnpm test:slideshow-model
pnpm test:slideshow-image
pnpm test:slideshow-image-recovery
pnpm test:slideshow-pinterest
pnpm test:slideshow-renderer
pnpm test:slideshow-automation
pnpm test:slideshow-management
pnpm test:slideshow-view
pnpm test:home-cockpit
pnpm test:home-loading
pnpm test:generate-empty-state
pnpm test:model-availability
pnpm test:model-registry
pnpm test:character-video
pnpm test:prompt-improvement
pnpm test:storage-s3
pnpm test:settings-credentials
pnpm typecheck
pnpm lint
pnpm build
