import { describe, expect, it } from 'vitest';

import { typedDataFromJson } from '../src/typed-data-json.js';
import { TYPED_DATA_JSON, TYPED_DATA_VIEM } from './fixtures.js';

describe('typedDataFromJson — JSON payload → viem typed data', () => {
  it('converts integer-typed fields (strings and numbers, nested structs, arrays) to bigint', () => {
    const converted = typedDataFromJson(TYPED_DATA_JSON);

    expect(converted).toEqual(TYPED_DATA_VIEM);
  });

  it('leaves string, address, bool and bytes fields untouched', () => {
    const input = {
      domain: { name: 'x', version: '1', chainId: 1 },
      types: {
        Ping: [
          { name: 'note', type: 'string' },
          { name: 'wallet', type: 'address' },
          { name: 'ok', type: 'bool' },
          { name: 'hash', type: 'bytes32' },
        ],
      },
      primaryType: 'Ping',
      message: {
        note: '123',
        wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
        ok: true,
        hash: `0x${'ab'.repeat(32)}`,
      },
    };

    expect(typedDataFromJson(input).message).toEqual(input.message);
  });

  it('rejects a non-integer value in an integer field, naming the field path', () => {
    const input = {
      ...TYPED_DATA_JSON,
      message: { ...TYPED_DATA_JSON.message, amount: 'lots' },
    };

    expect(() => typedDataFromJson(input)).toThrow(/message\.amount/);
  });

  it('passes unknown struct names through so viem reports them', () => {
    const input = { ...TYPED_DATA_JSON, primaryType: 'Missing' };

    expect(typedDataFromJson(input).primaryType).toBe('Missing');
  });
});
