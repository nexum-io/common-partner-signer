# DEV-443 Scaffold `@nexum-io/partner-signer` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the empty `common/common-partner-signer` git root into a buildable TypeScript ESM package `@nexum-io/partner-signer` whose `npm run ci:check` (typecheck + stub test + build) is green on Node 20 and 22, with the v1 contract fixed as types only.

**Architecture:** One module, one interface. `src/index.ts` is the only public entry and in M0 exports the contract *types* (`CreateSignerOptions`, `PartnerSigner`) with zero runtime code; `tests/` proves the entry resolves and the types match the locks. Tooling is deliberately thin: `tsc` emits `dist/`, `vitest` runs tests, no bundler, no linter, no git hooks.

**Tech Stack:** TypeScript ^5.9 (NodeNext ESM, strict), vitest ^3.2, viem ^2.56 (types only in M0), Node 20/22, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-14-partner-signer-scaffold-design.md`

## Global Constraints

- Package name `@nexum-io/partner-signer`; `"type": "module"`; `engines.node` `>=20`.
- Public surface is exactly `getAddress`, `signTypedData`, `signMessage` behind `createSigner({ privateKey })` — nothing else, ever.
- The package never reads `process.env`; the private key never appears in logs or in any `Error`.
- No product HTTP, no ForwardRequest helper, no mnemonic, no KMS, no WalletConnect, no product names (Escrow / HandyMan / SSO) in code.
- M0 has **no signing logic**: `src/index.ts` exports types only; `tests/index.test.ts` asserts zero runtime exports.
- Commit as `Konstantin Tishchenko <kostya.tisch@gmail.com>`; no AI attribution lines in commits or PR text.
- Branch `feature_DEV-443_scaffold_partner_signer` → PR into `develop`, title `DEV-443: …`, body contains `Fixes DEV-443`.

---

### Task 1: Tooling skeleton + stub test (ci:check green)

**Files:**
- Create: `package.json`, `package-lock.json` (generated), `.gitignore`, `.nvmrc`, `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`
- Create: `src/index.ts`
- Test: `tests/index.test.ts`

**Interfaces:**
- Consumes: nothing (empty repo, only `README.md` from the initial commit).
- Produces: npm scripts `build`, `typecheck`, `test`, `ci:check`, `prepare`; public entry `src/index.ts` (empty module) that Task 2 fills with types.

- [ ] **Step 1: Write the failing test**

`tests/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('@nexum-io/partner-signer entry (M0 scaffold)', () => {
  it('resolves the public entry module', async () => {
    const mod = await import('../src/index.js');
    expect(mod).toBeDefined();
  });

  it('has no runtime exports yet — M0 is contract-only', async () => {
    const mod = await import('../src/index.js');
    expect(Object.keys(mod)).toEqual([]);
  });
});
```

- [ ] **Step 2: Create tooling files**

`package.json`:

```json
{
  "name": "@nexum-io/partner-signer",
  "version": "0.0.0",
  "description": "Node.js SDK for partner backends: sign EIP-712 typed data and messages with your own wallet — createSigner({ privateKey })",
  "license": "MIT",
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/nexum-io/common-partner-signer.git"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": [
    "dist",
    "README.md"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "ci:check": "npm run typecheck && npm run test && npm run build",
    "prepare": "npm run build"
  }
}
```

`.gitignore`:

```gitignore
node_modules/
dist/
*.tsbuildinfo
.env
.env.*
!.env.example
*.log
.DS_Store

# Agent scratch — never commit
.ai-task/
.superpowers/
.ai-sdd/
.claude/
```

`.nvmrc`:

```
22
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "types": ["node"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true
  },
  "include": ["src", "tests", "vitest.config.ts"]
}
```

`tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"]
}
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 3: Install dependencies (generates package-lock.json)**

Run from the worktree root:

```bash
npm install --save viem@^2.56.5
npm install --save-dev typescript@^5.9 vitest@^3.2 @types/node@^20
```

Expected: `package-lock.json` created; `node_modules/` present; `prepare` runs `tsc -p tsconfig.build.json` and FAILS with `error TS18003: No inputs were found` because `src/` does not exist yet — that is the red state for this task (npm prints the error but the install itself completes).

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run`
Expected: FAIL — `Failed to resolve import "../src/index.js"` (module does not exist).

- [ ] **Step 5: Create the minimal public entry**

`src/index.ts`:

```ts
/**
 * @nexum-io/partner-signer — public entry.
 *
 * M0 (DEV-443): contract surface only, no runtime code.
 * `createSigner` and the signing implementation land in M1 (DEV-445).
 */
export {};
```

- [ ] **Step 6: Run ci:check to verify it passes**

Run: `npm run ci:check`
Expected: typecheck OK (no output), vitest `2 passed`, `dist/index.js` + `dist/index.d.ts` emitted.

Then: `ls dist` → `index.d.ts index.d.ts.map index.js index.js.map`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .gitignore .nvmrc tsconfig.json tsconfig.build.json vitest.config.ts src/index.ts tests/index.test.ts
git commit -m "chore(scaffold): TypeScript ESM package skeleton with ci:check (DEV-443)"
```

---

### Task 2: v1 contract as types (`CreateSignerOptions`, `PartnerSigner`)

**Files:**
- Modify: `src/index.ts`
- Test: `tests/contract.types.test.ts`

**Interfaces:**
- Consumes: `src/index.ts` from Task 1; viem types `Address`, `Hex`, `SignableMessage`, `TypedData`, `TypedDataDefinition`.
- Produces (used by M1/DEV-445 and the MCP in DEV-442):

```ts
export interface CreateSignerOptions { readonly privateKey: Hex }
export interface PartnerSigner {
  getAddress(): Address;
  signTypedData<
    const typedData extends TypedData | Record<string, unknown>,
    primaryType extends keyof typedData | 'EIP712Domain' = keyof typedData,
  >(typedData: TypedDataDefinition<typedData, primaryType>): Promise<Hex>;
  signMessage(message: SignableMessage): Promise<Hex>;
}
```

- [ ] **Step 1: Write the failing type test**

`tests/contract.types.test.ts` — assertions live in a function that is never called, so `tsc --noEmit` checks them and vitest executes nothing risky:

```ts
import { describe, expectTypeOf, it } from 'vitest';
import type { Address, Hex, SignableMessage } from 'viem';

import type { CreateSignerOptions, PartnerSigner } from '../src/index.js';

const typedData = {
  domain: { name: 'Partner Signer', version: '1', chainId: 137 },
  types: {
    Ping: [{ name: 'nonce', type: 'uint256' }],
  },
  primaryType: 'Ping',
  message: { nonce: 1n },
} as const;

// Type-level contract (checked by `tsc --noEmit`, never executed).
function contractV1(signer: PartnerSigner, options: CreateSignerOptions): void {
  expectTypeOf(options).toEqualTypeOf<{ readonly privateKey: Hex }>();

  expectTypeOf(signer.getAddress()).toEqualTypeOf<Address>();

  expectTypeOf(signer.signMessage).parameter(0).toEqualTypeOf<SignableMessage>();
  expectTypeOf(signer.signMessage('hello')).resolves.toEqualTypeOf<Hex>();
  expectTypeOf(signer.signMessage({ raw: '0x68656c6c6f' })).resolves.toEqualTypeOf<Hex>();

  expectTypeOf(signer.signTypedData(typedData)).resolves.toEqualTypeOf<Hex>();

  // @ts-expect-error — primaryType must be one of `types`
  signer.signTypedData({ ...typedData, primaryType: 'Pong' });

  // @ts-expect-error — the v1 surface is exactly three methods
  signer.signTransaction;
}

describe('v1 contract types', () => {
  it('compiles against the locked surface', () => {
    expectTypeOf(contractV1).toBeFunction();
  });
});
```

- [ ] **Step 2: Run typecheck to verify it fails**

Run: `npm run typecheck`
Expected: FAIL — `error TS2305: Module '"../src/index.js"' has no exported member 'CreateSignerOptions'` (and the same for `PartnerSigner`).

- [ ] **Step 3: Add the contract types to the entry**

Replace `src/index.ts` with:

```ts
/**
 * @nexum-io/partner-signer — public entry.
 *
 * v1 contract (locked): `createSigner({ privateKey })` → `getAddress` / `signTypedData` / `signMessage`.
 * The SDK never reads `process.env` and never puts the private key into logs or errors.
 *
 * M0 (DEV-443): contract surface as types only, no runtime code.
 * `createSigner` and the signing implementation land in M1 (DEV-445).
 */
import type { Address, Hex, SignableMessage, TypedData, TypedDataDefinition } from 'viem';

/** Input of `createSigner`. The key comes from the host application (its env), never from the SDK. */
export interface CreateSignerOptions {
  /** Raw private key: `0x` + 64 hex characters. */
  readonly privateKey: Hex;
}

/** One local EOA of the partner. Exactly three methods — this is the whole v1 surface. */
export interface PartnerSigner {
  /** Address derived at `createSigner` time, hence synchronous. */
  getAddress(): Address;
  /** EIP-712 signature. Mirrors viem `LocalAccount.signTypedData`. */
  signTypedData<
    const typedData extends TypedData | Record<string, unknown>,
    primaryType extends keyof typedData | 'EIP712Domain' = keyof typedData,
  >(typedData: TypedDataDefinition<typedData, primaryType>): Promise<Hex>;
  /** EIP-191 `personal_sign`: a string or `{ raw }` bytes. */
  signMessage(message: SignableMessage): Promise<Hex>;
}
```

- [ ] **Step 4: Run ci:check to verify it passes**

Run: `npm run ci:check`
Expected: typecheck OK, vitest `3 passed` (2 from Task 1 + 1 here), build emits `dist/`. `Object.keys(mod)` in Task 1's test is still `[]` because interfaces are erased.

Also verify the emitted declaration carries the contract: `grep -c 'PartnerSigner' dist/index.d.ts` → `1` or more.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts tests/contract.types.test.ts
git commit -m "feat(contract): fix v1 surface as types — CreateSignerOptions, PartnerSigner (DEV-443)"
```

---

### Task 3: GitHub Actions CI (Node 20 + 22)

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `npm run ci:check` from Task 1.
- Produces: required check `quality` on PRs into `develop`/`main`.

- [ ] **Step 1: Write the workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop, main]

jobs:
  quality:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: npm
      - run: npm ci
      - run: npm run ci:check
```

- [ ] **Step 2: Verify the workflow locally as far as possible**

Run: `npm ci && npm run ci:check` (a clean install mirrors the CI steps; `npm ci` triggers `prepare` → build).
Expected: install OK, ci:check green. If `npm ci` complains that the lockfile is out of sync, rerun `npm install` and commit the regenerated lockfile in this task.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: quality workflow — npm ci + ci:check on Node 20 and 22 (DEV-443)"
```

---

### Task 4: AGENTS.md + README (M0 stub)

**Files:**
- Create: `AGENTS.md`
- Modify: `README.md` (replace the one-line initial content)

**Interfaces:**
- Consumes: scripts from Task 1, contract types from Task 2.
- Produces: repo-level agent rules; README skeleton that DEV-444 expands into the partner-facing contract.

- [ ] **Step 1: Write AGENTS.md**

```markdown
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
- The repository is public — no internal URLs, tokens, or partner identifiers in code, tests, or docs.

## Read next

| Topic | Doc |
|-------|-----|
| Contract v1 for partners | [README.md](README.md) |
| M0 design | [docs/superpowers/specs/2026-09-14-partner-signer-scaffold-design.md](docs/superpowers/specs/2026-09-14-partner-signer-scaffold-design.md) |
```

- [ ] **Step 2: Write the README stub**

Replace `README.md` with:

```markdown
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
```

- [ ] **Step 3: Verify docs do not break the package**

Run: `npm run ci:check` (README/AGENTS are not compiled, but the check proves nothing else moved) and `npm pack --dry-run`.
Expected: ci:check green; pack lists `README.md`, `package.json` and `dist/*` only (no `src/`, `tests/`, `docs/`).

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md README.md
git commit -m "docs: AGENTS.md (ownership Engineering) and README stub for the M0 contract (DEV-443)"
```

---

### Task 5: Spec + plan docs, final verification, PR

**Files:**
- Add: `docs/superpowers/specs/2026-09-14-partner-signer-scaffold-design.md`, `docs/superpowers/plans/2026-09-14-partner-signer-scaffold.md` (already written during brainstorming/planning)

- [ ] **Step 1: Commit the design docs**

```bash
git add docs/superpowers/specs/2026-09-14-partner-signer-scaffold-design.md docs/superpowers/plans/2026-09-14-partner-signer-scaffold.md
git commit -m "docs(superpowers): M0 scaffold design spec and implementation plan (DEV-443)"
```

- [ ] **Step 2: Fresh-clone verification (the "repo builds" acceptance criterion)**

```bash
rm -rf /tmp/partner-signer-verify && git clone --quiet --branch feature_DEV-443_scaffold_partner_signer "$(git rev-parse --show-toplevel)" /tmp/partner-signer-verify
cd /tmp/partner-signer-verify && npm ci --no-audit --no-fund && npm run ci:check && ls dist
```

Expected: install OK (prepare builds dist), typecheck OK, `3 passed`, `dist/index.js` + `dist/index.d.ts` present. Use the session scratchpad directory instead of `/tmp` when one is configured.

- [ ] **Step 3: Freshness + push**

```bash
git fetch origin && git rebase origin/develop
git push -u origin feature_DEV-443_scaffold_partner_signer
```

- [ ] **Step 4: Open the PR (Russian body, template Refs/Closes · Что сделано · Вопрос к лиду · Проверка)**

Title: `DEV-443: scaffold @nexum-io/partner-signer — TS ESM каркас, ci:check, контракт v1 типами`

Body must contain `Fixes DEV-443`, link the ticket and the project, list what was done, the questions for the lead (sync `getAddress`, type names, LICENSE file, ESLint deferred to M1), and the verification commands with their results. No AI attribution.

- [ ] **Step 5: Confirm the PR is mergeable and CI is green**

Run: `gh pr view --json mergeable,statusCheckRollup` and wait for the `quality` matrix to finish.
Expected: `MERGEABLE`, both Node 20 and Node 22 jobs `SUCCESS`.
