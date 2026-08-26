#!/usr/bin/env bash
# Production Lighthouse gate: start next start, score every user-visible route,
# and require performance >= 90 with healthy CLS and LCP (Core Web Vitals "good").
set -euo pipefail

export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@16/bin:$PATH"

REPO_ROOT="${POSTFORGE_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$REPO_ROOT"

corepack enable 2>/dev/null || true

HOST="127.0.0.1"
TIMEOUT_SECS="${KODE_LIGHTHOUSE_TIMEOUT:-90}"
server_pid=""
body_file=""

stop_tree() {
  local pid="${1:-}"
  local child
  [[ -n "$pid" ]] || return 0
  while IFS= read -r child; do
    [[ -n "$child" ]] || continue
    stop_tree "$child"
  done < <(pgrep -P "$pid" 2>/dev/null || true)
  kill "$pid" 2>/dev/null || true
}

cleanup() {
  if [[ -n "${server_pid}" ]]; then
    stop_tree "$server_pid"
    wait "$server_pid" 2>/dev/null || true
    server_pid=""
  fi
  if [[ -n "${body_file}" ]]; then
    rm -f "$body_file"
    body_file=""
  fi
}
trap cleanup EXIT

if ! command -v curl >/dev/null 2>&1; then
  echo "kode:lighthouse: curl is required" >&2
  exit 1
fi

if [[ ! -f .next/BUILD_ID ]]; then
  echo "kode:lighthouse: no production build at .next/BUILD_ID; running pnpm build"
  pnpm build
fi

if [[ ! -f .next/BUILD_ID ]]; then
  echo "kode:lighthouse: pnpm build did not produce .next/BUILD_ID" >&2
  exit 1
fi

if [[ -z "${PORT:-}" ]]; then
  PORT="$(node -e 'const net = require("net"); const server = net.createServer(); server.listen(0, "127.0.0.1", () => { process.stdout.write(String(server.address().port)); server.close(); });')"
fi
export PORT

health_url="http://${HOST}:${PORT}/api/health"
export LH_BASE="http://${HOST}:${PORT}"

echo "kode:lighthouse: starting next start on ${HOST}:${PORT}"

pnpm exec next start --hostname "$HOST" --port "$PORT" &
server_pid=$!

body_file="$(mktemp)"
http_code=""
deadline=$((SECONDS + TIMEOUT_SECS))

while (( SECONDS < deadline )); do
  if ! kill -0 "$server_pid" 2>/dev/null; then
    wait "$server_pid" 2>/dev/null || true
    echo "kode:lighthouse: next start exited before GET ${health_url} returned 200" >&2
    exit 1
  fi

  if http_code="$(curl -sS -o "$body_file" -w '%{http_code}' --max-time 2 "$health_url" 2>/dev/null)"; then
    if [[ "$http_code" == "200" ]]; then
      echo "kode:lighthouse: GET ${health_url} -> 200"
      break
    fi
    if [[ "$http_code" == 5* ]]; then
      echo "kode:lighthouse: /api/health returned ${http_code}; ensure Postgres is running and DATABASE_URL is set." >&2
      exit 1
    fi
  fi

  sleep 0.25
done

if [[ "$http_code" != "200" ]]; then
  echo "kode:lighthouse: timed out after ${TIMEOUT_SECS}s waiting for GET ${health_url} -> 200" >&2
  exit 1
fi

# Warm the first scored route so Lighthouse does not pay Next.js compile/SSR
# on the first audited page. CI otherwise saw `/` at ~59 / 3.6s LCP while
# every later route passed.
warm_url="http://${HOST}:${PORT}/"
warm_code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$warm_url" || true)"
echo "kode:lighthouse: warmup GET ${warm_url} -> ${warm_code:-failed}"
if [[ "$warm_code" != "200" ]]; then
  echo "kode:lighthouse: warmup of ${warm_url} did not return 200" >&2
  exit 1
fi

echo "kode:lighthouse: first-paint heading tokens"
pnpm exec tsx scripts/check-first-paint-tokens.ts

# Score Lighthouse before the Playwright sweep so Chrome is not already
# contended. CI otherwise retried `/settings` at LCP 2842ms after 36
# visual-regression tests.
echo "kode:lighthouse: running Lighthouse gate (${LH_FORM_FACTOR:-mobile})"
set +e
node scripts/lh-gate.mjs
lh_status=$?
set -e

echo "kode:lighthouse: visual regression sweep"
pnpm exec tsx scripts/visual-regression-sweep.ts

if (( lh_status != 0 )); then
  exit "$lh_status"
fi
