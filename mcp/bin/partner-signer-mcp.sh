#!/usr/bin/env bash
# Launch the partner-signer MCP server over stdio.
#
# Key source precedence:
#   1. PARTNER_SIGNER_PRIVATE_KEY already present in the environment of whatever starts this script
#      (e.g. the shell that launched Cursor) — always wins;
#   2. otherwise the dotenv file: mcp/.env (git-ignored) or the path in PARTNER_SIGNER_DOTENV_FILE.
# The dotenv file is parsed line by line (KEY=value, optional quotes, CRLF tolerated) — it is never
# executed as shell. Never put the key into mcp.json.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOTENV="${PARTNER_SIGNER_DOTENV_FILE:-$ROOT/.env}"

if [[ -z "${PARTNER_SIGNER_PRIVATE_KEY:-}" && -f "$DOTENV" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then continue; fi
    if [[ "$line" =~ ^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      name="${BASH_REMATCH[2]}"
      value="${BASH_REMATCH[3]}"
      value="${value%\"}"; value="${value#\"}"
      value="${value%\'}"; value="${value#\'}"
      if [[ -z "${!name:-}" ]]; then export "$name=$value"; fi
    fi
  done < "$DOTENV"
fi

if [[ ! -f "$ROOT/dist/main.js" ]]; then
  echo "partner-signer-mcp: dist/main.js missing — run 'npm ci && npm run build' in $ROOT" >&2
  exit 1
fi

exec node "$ROOT/dist/main.js"
