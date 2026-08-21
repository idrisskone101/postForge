#!/usr/bin/env bash
set -euo pipefail

# Copy the workspace pstack model mapping to the home path pstack skills read.
# Cloud agents inject `.cursor/rules/*.mdc` but do not load `~/.cursor/rules`.

REPO_ROOT="${POSTFORGE_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
SOURCE="$REPO_ROOT/.cursor/rules/pstack-models.mdc"

if [ ! -f "$SOURCE" ]; then
  echo "==> pstack models: missing $SOURCE"
  exit 0
fi

install_copy() {
  local dest_dir="$1"
  [ -n "$dest_dir" ] || return 0
  mkdir -p "$dest_dir"
  local dest="$dest_dir/pstack-models.mdc"
  if [ -f "$dest" ] && cmp -s "$SOURCE" "$dest"; then
    return 0
  fi
  cp "$SOURCE" "$dest"
  echo "==> pstack models: installed $dest"
}

install_copy "${HOME:-}/.cursor/rules"

if [ -n "${HOME:-}" ] && [ "${HOME}" != /home/ubuntu ] && [ -d /home/ubuntu ]; then
  install_copy /home/ubuntu/.cursor/rules
fi

if [ -d /home/cursor ]; then
  install_copy /home/cursor/.cursor/rules
fi

if [ -d /.cursor ] && [ -w /.cursor ]; then
  install_copy /.cursor/rules
fi
