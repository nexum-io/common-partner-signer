#!/usr/bin/env bash
# Launch the partner-signer MCP server over stdio.
# Loads mcp/.env (git-ignored) into the process environment if it exists; otherwise the key must
# already be in the environment of whatever starts this script (the shell that launched Cursor, etc.).
# Never put PARTNER_SIGNER_PRIVATE_KEY into mcp.json.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

if [[ ! -f "$ROOT/dist/main.js" ]]; then
  echo "partner-signer-mcp: dist/main.js missing — run 'npm ci && npm run build' in $ROOT" >&2
  exit 1
fi

exec node "$ROOT/dist/main.js"
