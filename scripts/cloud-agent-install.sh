#!/usr/bin/env bash
set -euo pipefail

# Cloud Agent install: lockfile-pinned deps plus yt-dlp for Clone TikTok imports.
# Idempotent. Safe to rerun on cached or partially prepared VMs.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

pnpm install --frozen-lockfile

sudo curl -fsSL -o /usr/local/bin/yt-dlp \
  https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
yt-dlp --version
