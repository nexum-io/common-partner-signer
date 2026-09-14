# DEV-443 — каркас `common/common-partner-signer` (M0)

Дата: 2026-09-14. Тикет: [DEV-443](https://linear.app/nexum-io/issue/DEV-443) (эпик [DEV-451](https://linear.app/nexum-io/issue/DEV-451), проект [JS SDK Signer](https://linear.app/nexum-io/project/js-sdk-signer-88cf22f651e0)).

## Цель

Пустой git root превратить в собираемый TypeScript ESM пакет `@nexum-io/partner-signer`
с зелёным `npm run ci:check` (typecheck + stub-тест + build). Логики подписи нет —
она приходит в M1 ([DEV-445](https://linear.app/nexum-io/issue/DEV-445)).

## Контракт v1 (locks, не размывать)

- `createSigner({ privateKey })` — SDK не читает `process.env`; env остаётся снаружи.
- Поверхность: `getAddress`, `signTypedData`, `signMessage`. Ничего больше.
- Стек: viem, TypeScript ESM, Node ≥ 20.
- Ключ не логируется и не попадает в `Error` (message/cause/serialisation).
- Нет: HTTP продукта, ForwardRequest helper, mnemonic, KMS, WalletConnect, имён продуктов.

## Что входит в M0

Один модуль с одним интерфейсом. В M0 фиксируем **только типы** этого интерфейса —
это и есть «контракт в коде». Реализация `createSigner` — M1.

```ts
// src/index.ts (M0: только типы, без runtime-кода подписи)
import type { Address, Hex, SignableMessage, TypedData, TypedDataDefinition } from 'viem';

/** Вход createSigner. privateKey — 0x + 64 hex, приходит из env приложения, не из SDK. */
export interface CreateSignerOptions {
  readonly privateKey: Hex;
}

/** Поверхность v1. Один локальный EOA партнёра. */
export interface PartnerSigner {
  /** Адрес известен с момента createSigner, поэтому синхронно. */
  getAddress(): Address;
  /** EIP-712. Сигнатура зеркалит viem LocalAccount.signTypedData. */
  signTypedData<
    const typedData extends TypedData | Record<string, unknown>,
    primaryType extends keyof typedData | 'EIP712Domain' = keyof typedData,
  >(typedData: TypedDataDefinition<typedData, primaryType>): Promise<Hex>;
  /** personal_sign (EIP-191). Строка или { raw }. */
  signMessage(message: SignableMessage): Promise<Hex>;
}
```

Решения, которые стоит подтвердить у лида (вынесены в PR):

1. `getAddress()` синхронный — адрес выводится при создании сайнера. Асинхронная
   версия оставила бы дверь для удалённых сайнеров, но это вне v1 (thin SDK).
2. `signTypedData` / `signMessage` — `Promise<Hex>`, как у viem, чтобы M1 не менял контракт.
3. Имена типов `CreateSignerOptions` / `PartnerSigner` — не зафиксированы в тикетах, выбраны здесь.

## Раскладка репозитория

```
common-partner-signer/
├── .github/workflows/ci.yml   # push develop/main + PR: Node 20 и 22, npm ci, npm run ci:check
├── .gitignore                 # node_modules, dist, .env*, логи, агентские scratch-папки
├── .nvmrc                     # 22 — версия для разработки; engines.node >= 20
├── AGENTS.md                  # ownership Engineering; не SSO / не Escrow / не HandyMan
├── README.md                  # M0: назначение + dev-команды; полный контракт — DEV-444
├── package.json               # @nexum-io/partner-signer, "type": "module", exports → dist
├── package-lock.json
├── tsconfig.json              # strict, NodeNext, noEmit — typecheck src + tests
├── tsconfig.build.json        # emit dist/ (d.ts + sourcemap), только src
├── vitest.config.ts           # tests/**/*.test.ts, environment node
├── src/index.ts               # публичный вход (типы контракта, см. выше)
├── tests/index.test.ts        # stub: модуль загружается, runtime-экспортов нет
└── docs/superpowers/{specs,plans}/
```

### package.json — ключевые поля

| Поле | Значение | Зачем |
|------|----------|-------|
| `name` | `@nexum-io/partner-signer` | lock контракта |
| `version` | `0.0.0` | первый semver-тег — M3 ([DEV-450](https://linear.app/nexum-io/issue/DEV-450)) |
| `type` | `module` | ESM |
| `engines.node` | `>=20` | lock контракта |
| `exports["."]` | `{ types: ./dist/index.d.ts, import: ./dist/index.js }` | единственный вход |
| `files` | `["dist", "README.md"]` | в пакет уходит только собранное |
| `scripts.build` | `tsc -p tsconfig.build.json` | без бандлера — thin SDK |
| `scripts.typecheck` | `tsc --noEmit` | src + tests + конфиги |
| `scripts.test` | `vitest run` | |
| `scripts.ci:check` | `typecheck && test && build` | «репо собирается» — часть готовности |
| `scripts.prepare` | `npm run build` | `npm i github:…#vX` собирает dist на установке (M3) |
| `dependencies.viem` | `^2.56` | lock контракта; в M0 используется только как типы |
| `devDependencies` | `typescript ^5.9`, `vitest ^3.2`, `@types/node ^20` | `@types/node@20` = нижняя граница engines, чтобы не утекли API Node 22 |

Линтер и git-хуки в M0 не заводим: тикет фиксирует ci:check как typecheck + test.
ESLint можно добавить в M1 вместе с первым runtime-кодом.

## AGENTS.md (для агентов)

Секции как у остальных репо воркспейса: Purpose, Ownership, Tech stack, Important
directories, Common commands, Implementation rules, Testing rules, Safety notes, Read next.
Правила реализации дублируют locks контракта (без `process.env`, без ключа в логах и
ошибках, без HTTP/ForwardRequest/mnemonic, без имён продуктов).

## Тестирование M0

- `tests/index.test.ts`: динамический `import('../src/index.js')` резолвится; у модуля
  нет runtime-экспортов (в M0 только типы) — это защищает от случайной утечки кода в M0.
- Типовой контракт проверяется самим `tsc --noEmit` (tests включены в `tsconfig.json`).
- CI: матрица Node 20 и 22, `npm ci` → `npm run ci:check`.

## Вне scope M0

README с полным описанием locks (DEV-444), реализация (DEV-445), тесты recover (DEV-446),
example (DEV-447), MCP stdio (DEV-442), тег и pointer в воркспейсе (DEV-450, DEV-448).
