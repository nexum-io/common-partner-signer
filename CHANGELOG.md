# Changelog

All notable changes to `@nexum-io/partner-signer`. Versions are git tags (`vX.Y.Z`); consume by tag.

## 0.1.0

First public release of the v1 contract.

- `createSigner({ privateKey })` over viem local accounts — `getAddress()`, `signTypedData(typedData)`, `signMessage(message)`.
- `InvalidPrivateKeyError` for malformed keys; the error never carries the value and has no `cause`.
- The SDK never reads `process.env`; the key stays in a closure and never reaches logs, errors or serialisations (covered by tests).
- Type surface: `CreateSignerOptions`, `PartnerSigner` (viem `TypedDataDefinition` / `SignableMessage` types).
- Reference consumer `examples/basic` and the `mcp/` stdio server for agents (`signer_get_address`, `signer_sign_typed_data`, `signer_sign_message`) — both outside the package's runtime dependencies.
- Node ≥ 20, TypeScript ESM, CI on Node 20 and 22.
- MIT license (`LICENSE` in the package).
