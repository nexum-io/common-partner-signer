import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createSigner } from '@nexum-io/partner-signer';
import { recoverMessageAddress, recoverTypedDataAddress } from 'viem';
import { afterEach, describe, expect, it } from 'vitest';

import { createPartnerSignerMcpServer } from '../src/server.js';
import { TEST_ADDRESS, TEST_PRIVATE_KEY, TYPED_DATA_JSON, TYPED_DATA_VIEM } from './fixtures.js';

type ToolResult = {
  isError?: boolean;
  content: Array<{ type: string; text?: string }>;
  structuredContent?: Record<string, unknown>;
};

const cleanups: Array<() => Promise<void>> = [];

async function connect(getSigner: () => ReturnType<typeof createSigner>) {
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

function text(result: ToolResult): string {
  return result.content.map((item) => item.text ?? '').join('\n');
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

    const result = (await client.callTool({ name: 'signer_get_address', arguments: {} })) as ToolResult;

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({ address: TEST_ADDRESS });
    expect(text(result)).toContain(TEST_ADDRESS);
  });

  it('signer_sign_typed_data signs JSON typed data (integers as strings) so recover matches the address', async () => {
    const client = await connect(withKey);

    const result = (await client.callTool({
      name: 'signer_sign_typed_data',
      arguments: TYPED_DATA_JSON,
    })) as ToolResult;

    expect(result.isError, text(result)).toBeFalsy();
    const { address, signature } = result.structuredContent as { address: string; signature: `0x${string}` };
    expect(address).toBe(TEST_ADDRESS);
    const recovered = await recoverTypedDataAddress({ ...TYPED_DATA_VIEM, signature });
    expect(recovered).toBe(TEST_ADDRESS);
  });

  it('signer_sign_message signs a UTF-8 string so recover matches the address', async () => {
    const client = await connect(withKey);

    const result = (await client.callTool({
      name: 'signer_sign_message',
      arguments: { message: 'hello from an agent' },
    })) as ToolResult;

    expect(result.isError, text(result)).toBeFalsy();
    const { signature } = result.structuredContent as { signature: `0x${string}` };
    expect(await recoverMessageAddress({ message: 'hello from an agent', signature })).toBe(TEST_ADDRESS);
  });

  it('signer_sign_message signs raw bytes when given { raw }', async () => {
    const client = await connect(withKey);

    const result = (await client.callTool({
      name: 'signer_sign_message',
      arguments: { raw: '0x68656c6c6f' },
    })) as ToolResult;

    expect(result.isError, text(result)).toBeFalsy();
    const { signature } = result.structuredContent as { signature: `0x${string}` };
    expect(await recoverMessageAddress({ message: { raw: '0x68656c6c6f' }, signature })).toBe(TEST_ADDRESS);
  });

  it('signer_sign_message rejects a call with neither message nor raw as a tool error', async () => {
    const client = await connect(withKey);

    const result = (await client.callTool({ name: 'signer_sign_message', arguments: {} })) as ToolResult;

    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/message|raw/);
  });

  it('reports a malformed typed data payload as a tool error, not a crash', async () => {
    const client = await connect(withKey);

    const result = (await client.callTool({
      name: 'signer_sign_typed_data',
      arguments: { ...TYPED_DATA_JSON, primaryType: 'Missing' },
    })) as ToolResult;

    expect(result.isError).toBe(true);
    expect(text(result).length).toBeGreaterThan(0);
  });

  it('never returns key material in any tool result', async () => {
    const client = await connect(withKey);
    const needle = TEST_PRIVATE_KEY.slice(2).toLowerCase();

    const results = await Promise.all([
      client.callTool({ name: 'signer_get_address', arguments: {} }),
      client.callTool({ name: 'signer_sign_typed_data', arguments: TYPED_DATA_JSON }),
      client.callTool({ name: 'signer_sign_message', arguments: { message: 'x' } }),
      client.callTool({ name: 'signer_sign_message', arguments: {} }),
      client.callTool({ name: 'signer_sign_typed_data', arguments: { ...TYPED_DATA_JSON, primaryType: 'Missing' } }),
    ]);

    for (const result of results) {
      expect(JSON.stringify(result).toLowerCase()).not.toContain(needle);
    }
  });

  it('turns a missing or invalid host key into a tool error with a hint and no key material', async () => {
    const client = await connect(() => {
      throw new Error('PARTNER_SIGNER_PRIVATE_KEY is not set in the MCP host process environment');
    });

    const result = (await client.callTool({ name: 'signer_get_address', arguments: {} })) as ToolResult;

    expect(result.isError).toBe(true);
    expect(text(result)).toContain('PARTNER_SIGNER_PRIVATE_KEY');
  });
});
