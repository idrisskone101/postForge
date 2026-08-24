#!/usr/bin/env bash
set -euo pipefail

# Smoke-check Chrome DevTools MCP prerequisites on Cloud Agent VMs.

REQUIRED_NODE_MAJOR=20
REQUIRED_NODE_MINOR=19

node_major="$(node -p "process.versions.node.split('.')[0]")"
node_minor="$(node -p "process.versions.node.split('.')[1]")"

if (( node_major < REQUIRED_NODE_MAJOR || (node_major == REQUIRED_NODE_MAJOR && node_minor < REQUIRED_NODE_MINOR) )); then
  echo "Node.js >= ${REQUIRED_NODE_MAJOR}.${REQUIRED_NODE_MINOR} is required for chrome-devtools-mcp" >&2
  exit 1
fi

if ! command -v google-chrome >/dev/null 2>&1; then
  echo "google-chrome is not installed" >&2
  exit 1
fi

echo "Node: $(node --version)"
echo "Chrome: $(google-chrome --version)"

mcp_version="$(npx -y chrome-devtools-mcp@latest --version)"
echo "chrome-devtools-mcp: ${mcp_version}"

echo "Chrome DevTools MCP prerequisites verified"
