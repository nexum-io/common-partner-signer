import { inspect } from 'node:util';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSigner, InvalidPrivateKeyError } from '../src/index.js';
import { TEST_PRIVATE_KEY, TYPED_DATA_FIXTURE } from './fixtures.js';

/** Every textual view of a value an operator or a log sink could see. */
function serialisations(value: unknown): string[] {
  const views = [String(value), JSON.stringify(value) ?? '', inspect(value, { depth: 10 })];
  if (value instanceof Error) {
    views.push(value.message, value.stack ?? '', inspect(value.cause, { depth: 10 }));
  }
  return views;
}

function expectNoTrace(value: unknown, secret: string): void {
  const needle = secret.replace(/^0x/, '').toLowerCase();
  for (const view of serialisations(value)) {
    expect(view.toLowerCase()).not.toContain(needle);
  }
}

describe('createSigner — private key never leaks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['empty string', ''],
    ['missing 0x prefix', 'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'],
    ['too short', '0xabab'],
    ['too long', `0x${'ab'.repeat(33)}`],
    ['non-hex characters', `0x${'zz'.repeat(32)}`],
    ['outside the curve order', `0x${'ff'.repeat(32)}`],
  ])('rejects %s with InvalidPrivateKeyError that carries no key material', (_label, privateKey) => {
    let caught: unknown;
    try {
      createSigner({ privateKey: privateKey as `0x${string}` });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(InvalidPrivateKeyError);
    expect((caught as Error).name).toBe('InvalidPrivateKeyError');
    if (privateKey.length > 6) expectNoTrace(caught, privateKey);
  });

  it.each([
    ['undefined', undefined],
    ['a number', 123],
    ['an object', { key: 'x' }],
  ])('rejects %s (non-string) with InvalidPrivateKeyError', (_label, privateKey) => {
    expect(() => createSigner({ privateKey: privateKey as unknown as `0x${string}` })).toThrow(
      InvalidPrivateKeyError,
    );
  });

  it('uses one stable, value-free message', () => {
    expect(() => createSigner({ privateKey: '0xabab' })).toThrow(
      'privateKey must be a 0x-prefixed 32-byte hex string (0x + 64 hex characters)',
    );
  });

  it('keeps the key out of every serialisation of the signer object', () => {
    const signer = createSigner({ privateKey: TEST_PRIVATE_KEY });

    expectNoTrace(signer, TEST_PRIVATE_KEY);
    expect(Object.values(signer).every((member) => typeof member === 'function')).toBe(true);
    expect((signer as unknown as Record<string, unknown>)['privateKey']).toBeUndefined();
  });

  it('writes nothing to the console while creating and signing', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug', 'trace'] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => {}),
    );

    const signer = createSigner({ privateKey: TEST_PRIVATE_KEY });
    await signer.signTypedData(TYPED_DATA_FIXTURE);
    await signer.signMessage('hello');

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it('keeps the key out of errors raised while signing malformed typed data', async () => {
    const signer = createSigner({ privateKey: TEST_PRIVATE_KEY });
    const malformed = {
      domain: {},
      types: { Ping: [{ name: 'nonce', type: 'uint256' }] },
      primaryType: 'Ping',
      message: { nonce: 'not-a-number' },
    };

    let caught: unknown;
    try {
      await signer.signTypedData(malformed as never);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expectNoTrace(caught, TEST_PRIVATE_KEY);
  });
});
