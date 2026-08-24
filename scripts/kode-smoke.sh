#!/usr/bin/env bash
# Boot-only smoke: start the production server and require GET /api/health → 200.
# This is not a product-usage test. /api/health is a Postgres readiness ping
# (`SELECT 1`); this script does not start Postgres. kode:check already requires
# a reachable database, and standalone runs fail clearly on 503.
set -euo pipefail

export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@16/bin:$PATH"

REPO_ROOT="${POSTFORGE_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$REPO_ROOT"

corepack enable 2>/dev/null || true

HOST="127.0.0.1"
TIMEOUT_SECS="${KODE_SMOKE_TIMEOUT:-45}"
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
  echo "kode:smoke: curl is required" >&2
  exit 1
fi

if [[ ! -f .next/BUILD_ID ]]; then
  echo "kode:smoke: no production build at .next/BUILD_ID; running pnpm build"
  pnpm build
fi

if [[ ! -f .next/BUILD_ID ]]; then
  echo "kode:smoke: pnpm build did not produce .next/BUILD_ID" >&2
  exit 1
fi

if [[ -z "${PORT:-}" ]]; then
  PORT="$(node -e 'const net = require("net"); const server = net.createServer(); server.listen(0, "127.0.0.1", () => { process.stdout.write(String(server.address().port)); server.close(); });')"
fi
export PORT

url="http://${HOST}:${PORT}/api/health"
echo "kode:smoke: starting next start on ${HOST}:${PORT}"

pnpm exec next start --hostname "$HOST" --port "$PORT" &
server_pid=$!

body_file="$(mktemp)"
http_code=""
deadline=$((SECONDS + TIMEOUT_SECS))

while (( SECONDS < deadline )); do
  if ! kill -0 "$server_pid" 2>/dev/null; then
    wait "$server_pid" 2>/dev/null || true
    echo "kode:smoke: next start exited before GET ${url} returned 200" >&2
    exit 1
  fi

  if http_code="$(curl -sS -o "$body_file" -w '%{http_code}' --max-time 2 "$url" 2>/dev/null)"; then
    echo "kode:smoke: GET ${url} -> ${http_code}"
    if [[ -s "$body_file" ]]; then
      cat "$body_file"
      echo
    fi
    if [[ "$http_code" == "200" ]]; then
      exit 0
    fi
    echo "kode:smoke: expected HTTP 200 from ${url}, got ${http_code}" >&2
    if [[ "$http_code" == 5* ]]; then
      echo "kode:smoke: /api/health pings Postgres (SELECT 1). Set DATABASE_URL and start Postgres (same requirement as kode:check)." >&2
    fi
    exit 1
  fi

  sleep 0.25
done

echo "kode:smoke: timed out after ${TIMEOUT_SECS}s waiting for GET ${url} -> 200 (last status: ${http_code:-connection failed})" >&2
if [[ -n "${body_file}" && -s "$body_file" ]]; then
  echo "kode:smoke: last body:" >&2
  cat "$body_file" >&2
  echo >&2
fi
exit 1
