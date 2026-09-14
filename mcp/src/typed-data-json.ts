import type { TypedData, TypedDataDefinition, TypedDataDomain } from 'viem';

/** EIP-712 payload as it arrives over JSON (tool arguments): integers may be decimal strings, 0x hex strings or safe numbers. */
export interface TypedDataJson {
  readonly domain?: Readonly<Record<string, unknown>> | undefined;
  readonly types: Readonly<Record<string, ReadonlyArray<{ readonly name: string; readonly type: string }>>>;
  readonly primaryType: string;
  readonly message: Readonly<Record<string, unknown>>;
}

const INTEGER_TYPE = /^u?int(\d+)?$/;
const ARRAY_TYPE = /^(.*)\[\d*\]$/;
const DECIMAL = /^-?\d+$/;
const HEX = /^0x[0-9a-fA-F]+$/;
const UINT256_MAX = (1n << 256n) - 1n;

const INTEGER_HINT = 'expected an integer as a decimal string, 0x hex string or safe number (|n| <= 2^53-1)';

/**
 * Convert a JSON typed-data payload into what viem's `signTypedData` expects: every integer-typed
 * field (recursively, through structs and arrays) and `domain.chainId` become exact `bigint`s.
 * Strings are converted without an intermediate `number`; JSON numbers must be safe integers —
 * anything larger has already lost precision in JSON and is rejected with a hint to use a string.
 * Unknown struct names are passed through so viem reports them with its own error.
 */
export function typedDataFromJson(input: TypedDataJson): TypedDataDefinition {
  const message = convertStruct(input.types, input.primaryType, input.message, 'message');
  const definition: Record<string, unknown> = {
    types: input.types,
    primaryType: input.primaryType,
    message,
  };
  if (input.domain !== undefined) definition['domain'] = normaliseDomain(input.domain);
  return definition as unknown as TypedDataDefinition<TypedData, string>;
}

/**
 * `chainId` is optional, but when it is present it must be a valid uint256 — viem silently drops
 * a chainId of an unexpected type from the inferred EIP712Domain, which would sign a different domain.
 */
function normaliseDomain(domain: Readonly<Record<string, unknown>>): TypedDataDomain {
  if (!('chainId' in domain) || domain['chainId'] === undefined) {
    const { chainId: _absent, ...rest } = domain;
    return rest as TypedDataDomain;
  }
  const chainId = toBigInt(domain['chainId'], 'domain.chainId');
  if (chainId < 0n || chainId > UINT256_MAX) {
    throw new TypeError('domain.chainId: expected a non-negative integer within uint256 (0 .. 2^256-1)');
  }
  return { ...domain, chainId } as TypedDataDomain;
}

function convertStruct(
  types: TypedDataJson['types'],
  typeName: string,
  value: unknown,
  path: string,
): unknown {
  const fields = types[typeName];
  if (!fields || typeof value !== 'object' || value === null || Array.isArray(value)) return value;

  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const field = fields.find((candidate) => candidate.name === key);
    out[key] = field ? convertValue(types, field.type, raw, `${path}.${key}`) : raw;
  }
  return out;
}

function convertValue(types: TypedDataJson['types'], type: string, value: unknown, path: string): unknown {
  const array = ARRAY_TYPE.exec(type);
  if (array) {
    const itemType = array[1] ?? '';
    return Array.isArray(value)
      ? value.map((item, index) => convertValue(types, itemType, item, `${path}[${index}]`))
      : value;
  }
  if (INTEGER_TYPE.test(type)) return toBigInt(value, path);
  if (type in types) return convertStruct(types, type, value, path);
  return value;
}

/** Exact conversion; the error names the field and the value's kind (a number is echoed, arbitrary strings/objects are not). */
function toBigInt(value: unknown, path: string): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (Number.isSafeInteger(value)) return BigInt(value);
    throw new TypeError(
      `${path}: ${String(value)} is not a safe integer (|n| <= 2^53-1); pass large integers as a decimal or 0x hex string`,
    );
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (DECIMAL.test(trimmed) || HEX.test(trimmed)) return BigInt(trimmed);
    throw new TypeError(`${path}: ${INTEGER_HINT}, got a non-numeric string`);
  }
  const kind = value === null ? 'null' : Array.isArray(value) ? 'an array' : `a ${typeof value}`;
  throw new TypeError(`${path}: ${INTEGER_HINT}, got ${kind}`);
}
