import type { Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { InvalidPrivateKeyError } from './errors.js';
import type { CreateSignerOptions, PartnerSigner } from './types.js';

const PRIVATE_KEY_PATTERN = /^0x[0-9a-fA-F]{64}$/;

function isPrivateKeyHex(value: unknown): value is Hex {
  return typeof value === 'string' && PRIVATE_KEY_PATTERN.test(value);
}

/**
 * Create a signer over one local EOA. The key lives in this closure only:
 * the returned object exposes the three contract methods and nothing else.
 *
 * Throws `InvalidPrivateKeyError` (value-free) for anything that is not a valid key.
 */
export function createSigner(options: CreateSignerOptions): PartnerSigner {
  const { privateKey } = options;
  if (!isPrivateKeyHex(privateKey)) {
    throw new InvalidPrivateKeyError();
  }

  const account = (() => {
    try {
      return privateKeyToAccount(privateKey);
    } catch {
      // viem / noble errors may echo the input — never let them escape.
      throw new InvalidPrivateKeyError();
    }
  })();

  return {
    getAddress: () => account.address,
    signTypedData: (typedData) => account.signTypedData(typedData),
    signMessage: (message) => account.signMessage({ message }),
  };
}
