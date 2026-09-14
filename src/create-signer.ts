import { privateKeyToAccount } from 'viem/accounts';

import type { CreateSignerOptions, PartnerSigner } from './types.js';

/**
 * Create a signer over one local EOA. The key lives in this closure only:
 * the returned object exposes the three contract methods and nothing else.
 */
export function createSigner(options: CreateSignerOptions): PartnerSigner {
  const account = privateKeyToAccount(options.privateKey);

  return {
    getAddress: () => account.address,
    signTypedData: (typedData) => account.signTypedData(typedData),
    signMessage: (message) => account.signMessage({ message }),
  };
}
