#!/usr/bin/env bash
set -euo pipefail

# Prune gitignored agent session dumps:
# - .playwright-cli / .playwright-mcp (snapshots, logs, screenshots, videos)
# - untracked image/video files dropped in the repo root

REPO_ROOT="${POSTFORGE_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$REPO_ROOT"

MAX_AGE_DAYS="${PLAYWRIGHT_ARTIFACT_MAX_AGE_DAYS:-7}"
VIDEO_MAX_AGE_DAYS="${PLAYWRIGHT_ARTIFACT_VIDEO_MAX_AGE_DAYS:-1}"
MAX_TOTAL_BYTES="${PLAYWRIGHT_ARTIFACT_MAX_BYTES:-20971520}"

DIRS=(.playwright-cli .playwright-mcp)

prune_root_dumps() {
  local file
  while IFS= read -r -d '' file; do
    if git ls-files --error-unmatch -- "$file" >/dev/null 2>&1; then
      continue
    fi
    rm -f -- "$file"
  done < <(
    find . -maxdepth 1 -type f \( \
      -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o \
      -name '*.webp' -o -name '*.gif' -o -name '*.mp4' -o -name '*.webm' \
    \) -print0 2>/dev/null
  )
}

prune_dir() {
  local dir="$1"
  [ -d "$dir" ] || return 0

  find "$dir" -type f \( -name '*.mp4' -o -name '*.webm' \) \
    -mmin "+$((VIDEO_MAX_AGE_DAYS * 1440))" -delete 2>/dev/null || true
  find "$dir" -type f -mmin "+$((MAX_AGE_DAYS * 1440))" -delete 2>/dev/null || true

  if command -v python3 >/dev/null 2>&1; then
    python3 - "$dir" "$MAX_TOTAL_BYTES" <<'PY'
import os
import sys

root = sys.argv[1]
max_bytes = int(sys.argv[2])
files = []
total = 0

for dirpath, _, names in os.walk(root):
    for name in names:
        path = os.path.join(dirpath, name)
        try:
            st = os.stat(path)
        except OSError:
            continue
        files.append((st.st_mtime, st.st_size, path))
        total += st.st_size

files.sort()
for _mtime, size, path in files:
    if total <= max_bytes:
        break
    try:
        os.remove(path)
        total -= size
    except OSError:
        pass
PY
  fi

  find "$dir" -mindepth 1 -type d -empty -delete 2>/dev/null || true
  rmdir "$dir" 2>/dev/null || true
}

for dir in "${DIRS[@]}"; do
  prune_dir "$dir"
done

prune_root_dumps
