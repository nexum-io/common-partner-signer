import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { createSigner, type PartnerSigner } from '@nexum-io/partner-signer';
import { recoverMessageAddress, recoverTypedDataAddress } from 'viem';
import { afterEach, describe, expect, it } from 'vitest';

import { createPartnerSignerMcpServer } from '../src/server.js';
import { TEST_ADDRESS, TEST_PRIVATE_KEY, TYPED_DATA_JSON, TYPED_DATA_VIEM } from './fixtures.js';

type Signed = { address: string; signature: `0x${string}` };

const cleanups: Array<() => Promise<void>> = [];

async function connect(getSigner: () => PartnerSigner) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createPartnerSignerMcpServer({ getSigner });
  const client = new Client({ name: 'partner-signer-mcp-test', version: '0.0.0' });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  cleanups.push(async () => {
    await client.close();
    await server.close();
  });
  return client;
}

async function call(client: Client, name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  return (await client.callTool({ name, arguments: args })) as CallToolResult;
}

function text(result: CallToolResult): string {
  return result.content.map((item) => (item.type === 'text' ? item.text : '')).join('\n');
}

const withKey = () => createSigner({ privateKey: TEST_PRIVATE_KEY });

describe('partner-signer MCP server', () => {
  afterEach(async () => {
    for (const cleanup of cleanups.splice(0)) await cleanup();
  });

  it('exposes exactly three signer_* tools — a namespace disjoint from wc-sign-tester (wallet_*)', async () => {
    const client = await connect(withKey);

    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name).sort()).toEqual([
      'signer_get_address',
      'signer_sign_message',
      'signer_sign_typed_data',
    ]);
    expect(tools.every((tool) => !tool.name.startsWith('wallet_'))).toBe(true);
  });

  it('signer_get_address returns the address of the key from the host environment', async () => {
    const client = await connect(withKey);

    const result = await call(client, 'signer_get_address', {});

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({ address: TEST_ADDRESS });
    expect(text(result)).toContain(TEST_ADDRESS);
  });

  it('signer_sign_typed_data signs JSON typed data (integers as strings); recover equals the returned address', async () => {
    const client = await connect(withKey);

    const result = await call(client, 'signer_sign_typed_data', TYPED_DATA_JSON);

    expect(result.isError, text(result)).toBeFalsy();
    const { address, signature } = result.structuredContent as Signed;
    const recovered = await recoverTypedDataAddress({ ...TYPED_DATA_VIEM, signature });
    expect(recovered).toBe(address);
    expect(address).toBe(TEST_ADDRESS);
  });

  it('signer_sign_message signs a UTF-8 string; recover equals the returned address', async () => {
    const client = await connect(withKey);

    const result = await call(client, 'signer_sign_message', { message: 'hello from an agent' });

    expect(result.isError, text(result)).toBeFalsy();
    const { address, signature } = result.structuredContent as Signed;
    expect(await recoverMessageAddress({ message: 'hello from an agent', signature })).toBe(address);
    expect(address).toBe(TEST_ADDRESS);
  });

  it('signer_sign_message signs raw bytes when given { raw }', async () => {
    const client = await connect(withKey);

    const result = await call(client, 'signer_sign_message', { raw: '0x68656c6c6f' });

    expect(result.isError, text(result)).toBeFalsy();
    const { address, signature } = result.structuredContent as Signed;
    expect(await recoverMessageAddress({ message: { raw: '0x68656c6c6f' }, signature })).toBe(address);
  });

  it('signer_sign_message rejects a call with neither message nor raw as a tool error', async () => {
    const client = await connect(withKey);

    const result = await call(client, 'signer_sign_message', {});

    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/message|raw/);
  });

  it('reports a malformed typed data payload as a tool error, not a crash', async () => {
    const client = await connect(withKey);

    const result = await call(client, 'signer_sign_typed_data', { ...TYPED_DATA_JSON, primaryType: 'Missing' });

    expect(result.isError).toBe(true);
    expect(text(result).length).toBeGreaterThan(0);
  });

  it('never returns key material in any tool result', async () => {
    const client = await connect(withKey);
    const needle = TEST_PRIVATE_KEY.slice(2).toLowerCase();

    const results = await Promise.all([
      call(client, 'signer_get_address', {}),
      call(client, 'signer_sign_typed_data', TYPED_DATA_JSON),
      call(client, 'signer_sign_message', { message: 'x' }),
      call(client, 'signer_sign_message', {}),
      call(client, 'signer_sign_typed_data', { ...TYPED_DATA_JSON, primaryType: 'Missing' }),
    ]);

    for (const result of results) {
      expect(JSON.stringify(result).toLowerCase()).not.toContain(needle);
    }
  });

  it('turns a missing host key into a tool error with a hint', async () => {
    const client = await connect(() => {
      throw new Error('PARTNER_SIGNER_PRIVATE_KEY is not set in the MCP host process environment');
    });

    const result = await call(client, 'signer_get_address', {});

    expect(result.isError).toBe(true);
    expect(text(result)).toContain('PARTNER_SIGNER_PRIVATE_KEY');
  });

  it('turns an invalid host key into an InvalidPrivateKeyError tool error without echoing the value', async () => {
    const client = await connect(() => createSigner({ privateKey: '0xdeadbeef' }));

    const result = await call(client, 'signer_get_address', {});

    expect(result.isError).toBe(true);
    expect(text(result)).toContain('InvalidPrivateKeyError');
    expect(JSON.stringify(result).toLowerCase()).not.toContain('deadbeef');
  });
});
