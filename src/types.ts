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
