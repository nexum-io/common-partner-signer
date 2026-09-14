# AGENTS.md — common-partner-signer

`@nexum-io/partner-signer` — thin Node.js SDK for a **partner backend** to sign EIP-712 typed data and messages with **its own** wallet.

## Ownership

Engineering (workspace-wide shared package). Not owned by SSO, not by Escrow, not by HandyMan — HandyMan is a consumer, not the owner. Linear project: [JS SDK Signer](https://linear.app/nexum-io/project/js-sdk-signer-88cf22f651e0).

## Purpose

- `createSigner({ privateKey })` → `getAddress` / `signTypedData` / `signMessage`. That is the whole v1 surface.
- The host application owns the key: it reads its own env and passes `privateKey` in. The SDK never reads `process.env`.
- Nexum never holds partner keys. This package only signs.

## Tech stack

TypeScript (ESM, `NodeNext`, strict), viem, vitest, Node ≥ 20. No bundler, no HTTP server, no CLI in the package itself.

## Important directories

| Path | Contents |
|------|----------|
| `src/index.ts` | The only public entry (`exports["."]`) |
| `tests/` | vitest suites (`*.test.ts`) — type-level contract checks live here too |
| `dist/` | Build output (`tsc -p tsconfig.build.json`), git-ignored |
| `docs/superpowers/` | Design specs and implementation plans |
| `.github/workflows/ci.yml` | `npm ci` + `npm run ci:check` on Node 20 and 22 |

## Common commands

```bash
npm ci
npm run ci:check     # typecheck + test + build — the real verify command
npm run test         # vitest run
npm run build        # emit dist/
```

## Implementation rules

- Do not widen the surface: no extra methods on `PartnerSigner`, no options beyond `privateKey`.
- Never read `process.env` inside the package. Never log the private key. Never put it into an `Error` (message, cause, serialised fields).
- No product HTTP calls, no ForwardRequest helper, no mnemonic / HD derivation, no KMS or remote signer, no WalletConnect.
- No product names in code or types (no Escrow / HandyMan / SSO specifics) — the SDK is product-agnostic.
- Keep viem as the only runtime dependency.
- Relative imports use explicit `.js` extensions (NodeNext ESM).

## Testing rules

- Every behaviour change ships with a vitest test under `tests/`.
- Signing changes must prove `recover(address) === getAddress()` on fixtures (M1) and that the key is absent from logs and serialised errors.
- `npm run ci:check` must be green before a PR; CI runs it on Node 20 and 22.

## Safety notes

- Never commit real keys; `.env*` is git-ignored, examples must hold placeholders only.
- The repository is public — no internal infrastructure hosts/URLs, tokens, or partner identifiers in code, tests, or docs. Links to the Linear project are fine.

## Read next

| Topic | Doc |
|-------|-----|
| Contract v1 for partners | [README.md](README.md) |
| M0 design | [docs/superpowers/specs/2026-09-14-partner-signer-scaffold-design.md](docs/superpowers/specs/2026-09-14-partner-signer-scaffold-design.md) |
