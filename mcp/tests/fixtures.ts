/** Public, well-known test key (Hardhat / Anvil account #0). Never a real secret. */
export const TEST_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;

export const TEST_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as const;

/** What an agent would send over JSON: integers as decimal strings, nested struct, array field. */
export const TYPED_DATA_JSON = {
  domain: {
    name: 'Partner Signer MCP Fixture',
    version: '1',
    chainId: 137,
    verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
  },
  types: {
    Person: [
      { name: 'name', type: 'string' },
      { name: 'wallet', type: 'address' },
    ],
    Order: [
      { name: 'buyer', type: 'Person' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint64' },
      { name: 'lineItems', type: 'uint256[]' },
    ],
  },
  primaryType: 'Order',
  message: {
    buyer: { name: 'Alice', wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826' },
    amount: '1000000000000000000000',
    nonce: 7,
    lineItems: ['1', '2', '340282366920938463463374607431768211456'],
  },
} as const;

/** The same payload as viem expects it (bigint for integer types, chainId included). */
export const TYPED_DATA_VIEM = {
  domain: { ...TYPED_DATA_JSON.domain, chainId: 137n },
  types: TYPED_DATA_JSON.types,
  primaryType: 'Order',
  message: {
    buyer: TYPED_DATA_JSON.message.buyer,
    amount: 1000000000000000000000n,
    nonce: 7n,
    lineItems: [1n, 2n, 340282366920938463463374607431768211456n],
  },
} as const;
