/**
 * Thrown by `createSigner` when `privateKey` is not a 0x-prefixed 32-byte hex string
 * or is not a valid secp256k1 scalar. Deliberately carries no `cause` and never the value:
 * key material must not reach logs or error reports.
 */
export class InvalidPrivateKeyError extends Error {
  override readonly name = 'InvalidPrivateKeyError';

  constructor() {
    super('privateKey must be a 0x-prefixed 32-byte hex string (0x + 64 hex characters)');
  }
}
