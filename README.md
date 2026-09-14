# @nexum-io/partner-signer

Node.js SDK for a partner backend to sign EIP-712 typed data and messages with its own wallet.

**Status:** M0 scaffold (contract fixed as types, no signing logic yet). The full v1 contract description for partners lands with the next milestone task.

## Contract v1 (locked)

- `createSigner({ privateKey })` — the SDK never reads `process.env`; your application reads its env and passes the key in.
- Surface: `getAddress()`, `signTypedData(typedData)`, `signMessage(message)`.
- Stack: viem, TypeScript ESM, Node ≥ 20.
- The private key is never logged and never placed into an `Error`.
- Out of scope: mnemonic / HD derivation, product HTTP APIs, ForwardRequest helpers, key custody.

## Development

```bash
nvm use            # Node 22 for development; the package supports Node >= 20
npm ci
npm run ci:check   # typecheck + test + build
```

## Links

- Linear project: https://linear.app/nexum-io/project/js-sdk-signer-88cf22f651e0
- Agent rules: [AGENTS.md](AGENTS.md)
