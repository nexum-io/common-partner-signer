import type { TypedData, TypedDataDefinition, TypedDataDomain } from 'viem';

/** EIP-712 payload as it arrives over JSON (tool arguments): integers may be decimal strings or numbers. */
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

/**
 * Convert a JSON typed-data payload into what viem's `signTypedData` expects:
 * every integer-typed field (recursively, through structs and arrays) becomes a `bigint`.
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

/** viem drops a `chainId` that is not number | bigint silently — normalise decimal and 0x strings. */
function normaliseDomain(domain: Readonly<Record<string, unknown>>): TypedDataDomain {
  const chainId = domain['chainId'];
  if (typeof chainId === 'string') {
    const trimmed = chainId.trim();
    if (DECIMAL.test(trimmed) || HEX.test(trimmed)) {
      return { ...domain, chainId: Number(BigInt(trimmed)) } as TypedDataDomain;
    }
    throw new TypeError('domain.chainId: expected an integer (decimal string, 0x hex string or number)');
  }
  return domain as TypedDataDomain;
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

function toBigInt(value: unknown, path: string): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isInteger(value)) return BigInt(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (DECIMAL.test(trimmed) || HEX.test(trimmed)) return BigInt(trimmed);
  }
  throw new TypeError(`${path}: expected an integer (decimal string, 0x hex string or number) for an integer-typed field`);
}
