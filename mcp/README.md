# partner-signer MCP (stdio)

MCP server for agents (Cursor, Claude Code, …) that exposes `@nexum-io/partner-signer` 1:1 as tools. It is a **local partner EOA from a private key** — not WalletConnect, not a human wallet, not `common-wc-sign-tester`.

| Tool | Input | Output |
|------|-------|--------|
| `signer_get_address` | — | `{ address }` |
| `signer_sign_typed_data` | `{ domain?, types, primaryType, message }` (EIP-712 as JSON; integers may be decimal strings, `0x` hex strings or numbers) | `{ address, signature }` |
| `signer_sign_message` | exactly one of `{ message }` (UTF-8) or `{ raw }` (`0x` hex bytes) | `{ address, signature }` |

Errors come back as tool errors (`isError: true`) with a text hint. Key material never appears in results or logs: the key stays inside the signer's closure, stdout is the protocol channel, nothing is printed to stderr.

## Where the key comes from

The MCP **process** reads `PARTNER_SIGNER_PRIVATE_KEY` from its own environment and passes it to `createSigner`. The SDK never touches `process.env`. Two ways to provide it — pick one:

1. **Environment of the launcher.** Export the variable in the shell that starts the MCP client (e.g. the terminal you launch Cursor from).
2. **`mcp/.env` (git-ignored).** Copy `.env.example` → `.env`; `bin/partner-signer-mcp.sh` loads it into the process environment before starting the server.

Never put the key into `mcp.json` (Cursor stores it in plain text next to the project).

## Run

```bash
cd mcp
npm ci                 # links the SDK from the repo root (file:..)
npm run build          # dist/main.js
cp .env.example .env   # option 2 above — or export the variable instead
bin/partner-signer-mcp.sh
```

`npm run ci:check` = typecheck + build + tests (in-memory transport tests plus a real stdio round trip through the launcher).

## Cursor

Copy [`mcp.json.example`](mcp.json.example) into your project's `.cursor/mcp.json` (git-ignored) and set the absolute path to `bin/partner-signer-mcp.sh`. Only `PATH` goes into `env`; the key comes from option 1 or 2 above.

```json
{
  "mcpServers": {
    "partner-signer": {
      "command": "/ABSOLUTE/PATH/TO/common-partner-signer/mcp/bin/partner-signer-mcp.sh",
      "args": [],
      "env": { "PATH": "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin" }
    }
  }
}
```

Smoke from the agent: `signer_get_address` → then `signer_sign_typed_data` with your payload → verify with viem `recoverTypedDataAddress` that the recovered address equals the one returned.

## Not `common-wc-sign-tester`

| | partner-signer MCP | wc-sign-tester MCP |
|---|---|---|
| Wallet | local EOA of the partner, key in the MCP host env | headless WalletConnect wallet paired to a SPA session |
| Tools | `signer_get_address`, `signer_sign_typed_data`, `signer_sign_message` | `wallet_*` (pairing, sessions, pending requests, transactions) |
| Sessions / pairing | none | WalletConnect relay |
| Transactions | none — signing only | `wallet_send_transaction` |
| Product HTTP | none | targets catalog of Nexum SPAs |

Tool namespaces are disjoint, so both servers can be enabled at once.
