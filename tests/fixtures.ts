/**
 * Public, well-known test key (Hardhat / Anvil account #0). Never a real secret.
 * Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
 */
export const TEST_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;

export const TEST_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as const;

/** EIP-712 fixture shaped like a partner meta-transaction envelope (no product names). */
export const TYPED_DATA_FIXTURE = {
  domain: {
    name: 'Partner Signer Fixture',
    version: '1',
    chainId: 137,
    verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
  },
  types: {
    Person: [
      { name: 'name', type: 'string' },
      { name: 'wallet', type: 'address' },
    ],
    Mail: [
      { name: 'from', type: 'Person' },
      { name: 'to', type: 'Person' },
      { name: 'contents', type: 'string' },
      { name: 'nonce', type: 'uint256' },
    ],
  },
  primaryType: 'Mail',
  message: {
    from: { name: 'Alice', wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826' },
    to: { name: 'Bob', wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' },
    contents: 'Hello, Bob!',
    nonce: 1n,
  },
} as const;
