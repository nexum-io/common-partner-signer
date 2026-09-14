import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { recoverMessageAddress } from 'viem';
import { afterEach, describe, expect, it } from 'vitest';

import { TEST_ADDRESS, TEST_PRIVATE_KEY } from './fixtures.js';

const launcher = fileURLToPath(new URL('../bin/partner-signer-mcp.sh', import.meta.url));
const dist = fileURLToPath(new URL('../dist/main.js', import.meta.url));

type ToolResult = { isError?: boolean; content: Array<{ type: string; text?: string }>; structuredContent?: Record<string, unknown> };

const clients: Client[] = [];

async function connectOverStdio(env: Record<string, string>): Promise<Client> {
  const transport = new StdioClientTransport({
    command: launcher,
    args: [],
    env: { PATH: process.env['PATH'] ?? '', ...env },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'partner-signer-stdio-test', version: '0.0.0' });
  await client.connect(transport);
  clients.push(client);
  return client;
}

describe('bin/partner-signer-mcp.sh — real stdio round trip (requires `npm run build`)', () => {
  afterEach(async () => {
    for (const client of clients.splice(0)) await client.close();
  });

  it('is built before the stdio tests run', () => {
    expect(existsSync(dist), `missing ${dist}`).toBe(true);
  });

  it('serves signer_get_address and signer_sign_message with the key taken from the process env', async () => {
    const client = await connectOverStdio({ PARTNER_SIGNER_PRIVATE_KEY: TEST_PRIVATE_KEY });

    const address = (await client.callTool({ name: 'signer_get_address', arguments: {} })) as ToolResult;
    expect(address.structuredContent).toEqual({ address: TEST_ADDRESS });

    const signed = (await client.callTool({ name: 'signer_sign_message', arguments: { message: 'stdio' } })) as ToolResult;
    const { signature } = signed.structuredContent as { signature: `0x${string}` };
    expect(await recoverMessageAddress({ message: 'stdio', signature })).toBe(TEST_ADDRESS);
    expect(JSON.stringify([address, signed]).toLowerCase()).not.toContain(TEST_PRIVATE_KEY.slice(2));
  });

  it('starts without the key and reports the missing variable as a tool error', async () => {
    const client = await connectOverStdio({});

    const result = (await client.callTool({ name: 'signer_get_address', arguments: {} })) as ToolResult;

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('PARTNER_SIGNER_PRIVATE_KEY');
  });
});
