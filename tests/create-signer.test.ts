import { describe, expect, it } from 'vitest';
import { recoverMessageAddress, recoverTypedDataAddress } from 'viem';

import { createSigner } from '../src/index.js';
import { TEST_ADDRESS, TEST_PRIVATE_KEY, TYPED_DATA_FIXTURE } from './fixtures.js';

describe('createSigner — local EOA', () => {
  it('derives the checksummed address from the private key', () => {
    const signer = createSigner({ privateKey: TEST_PRIVATE_KEY });

    expect(signer.getAddress()).toBe(TEST_ADDRESS);
  });

  it('signs EIP-712 typed data so that recovery yields getAddress()', async () => {
    const signer = createSigner({ privateKey: TEST_PRIVATE_KEY });

    const signature = await signer.signTypedData(TYPED_DATA_FIXTURE);
    const recovered = await recoverTypedDataAddress({ ...TYPED_DATA_FIXTURE, signature });

    expect(signature).toMatch(/^0x[0-9a-f]{130}$/);
    expect(recovered).toBe(signer.getAddress());
  });

  it('signs a UTF-8 message (personal_sign) so that recovery yields getAddress()', async () => {
    const signer = createSigner({ privateKey: TEST_PRIVATE_KEY });

    const signature = await signer.signMessage('hello partner');
    const recovered = await recoverMessageAddress({ message: 'hello partner', signature });

    expect(signature).toMatch(/^0x[0-9a-f]{130}$/);
    expect(recovered).toBe(signer.getAddress());
  });

  it('signs raw bytes ({ raw }) so that recovery yields getAddress()', async () => {
    const signer = createSigner({ privateKey: TEST_PRIVATE_KEY });
    const raw = '0x68656c6c6f' as const; // "hello"

    const signature = await signer.signMessage({ raw });
    const recovered = await recoverMessageAddress({ message: { raw }, signature });

    expect(recovered).toBe(signer.getAddress());
  });

  it('exposes exactly the three contract methods at runtime', () => {
    const signer = createSigner({ privateKey: TEST_PRIVATE_KEY });

    expect(Object.keys(signer).sort()).toEqual(['getAddress', 'signMessage', 'signTypedData']);
  });
});
