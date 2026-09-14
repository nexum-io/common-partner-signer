import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { recoverMessageAddress, recoverTypedDataAddress } from 'viem';
import { afterEach, describe, expect, it } from 'vitest';

import { TEST_ADDRESS, TEST_PRIVATE_KEY } from './fixtures.js';

const launcher = fileURLToPath(new URL('../bin/partner-signer-mcp.sh', import.meta.url));
const dist = fileURLToPath(new URL('../dist/main.js', import.meta.url));

/** Second public, well-known key (Hardhat / Anvil account #1). Never a real secret. */
const OTHER_PRIVATE_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const OTHER_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

const clients: Client[] = [];
const tempDirs: string[] = [];

/** Spawns the real launcher. Hermetic by default: no dotenv file unless the test provides one. */
async function connectOverStdio(env: Record<string, string>): Promise<Client> {
  const transport = new StdioClientTransport({
    command: launcher,
    args: [],
    env: { PATH: process.env['PATH'] ?? '', PARTNER_SIGNER_DOTENV_FILE: '/nonexistent/partner-signer.env', ...env },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'partner-signer-stdio-test', version: '0.0.0' });
  await client.connect(transport);
  clients.push(client);
  return client;
}

function dotenvFile(contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'partner-signer-mcp-'));
  tempDirs.push(dir);
  const file = join(dir, '.env');
  writeFileSync(file, contents);
  return file;
}

async function getAddress(client: Client): Promise<CallToolResult> {
  return (await client.callTool({ name: 'signer_get_address', arguments: {} })) as CallToolResult;
}

function text(result: CallToolResult): string {
  return result.content.map((item) => (item.type === 'text' ? item.text : '')).join('\n');
}

describe('bin/partner-signer-mcp.sh — real stdio round trip (requires `npm run build`)', () => {
  afterEach(async () => {
    for (const client of clients.splice(0)) await client.close();
    for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('is built before the stdio tests run', () => {
    expect(existsSync(dist), `missing ${dist}`).toBe(true);
  });

  it('serves signer_get_address and signer_sign_message with the key taken from the process env', async () => {
    const client = await connectOverStdio({ PARTNER_SIGNER_PRIVATE_KEY: TEST_PRIVATE_KEY });

    const address = await getAddress(client);
    expect(address.structuredContent).toEqual({ address: TEST_ADDRESS });

    const signed = (await client.callTool({ name: 'signer_sign_message', arguments: { message: 'stdio' } })) as CallToolResult;
    const { address: returned, signature } = signed.structuredContent as { address: string; signature: `0x${string}` };
    expect(returned).toBe(TEST_ADDRESS);
    expect(await recoverMessageAddress({ message: 'stdio', signature })).toBe(returned);
    expect(JSON.stringify([address, signed]).toLowerCase()).not.toContain(TEST_PRIVATE_KEY.slice(2));
  });

  it('starts without the key and reports the missing variable as a tool error', async () => {
    const client = await connectOverStdio({});

    const result = await getAddress(client);

    expect(result.isError).toBe(true);
    expect(text(result)).toContain('PARTNER_SIGNER_PRIVATE_KEY');
  });

  it('reports an invalid host key as InvalidPrivateKeyError without echoing it', async () => {
    const client = await connectOverStdio({ PARTNER_SIGNER_PRIVATE_KEY: '0xdeadbeef' });

    const result = await getAddress(client);

    expect(result.isError).toBe(true);
    expect(text(result)).toContain('InvalidPrivateKeyError');
    expect(JSON.stringify(result).toLowerCase()).not.toContain('deadbeef');
  });

  it('falls back to the dotenv file (quoted value, CRLF, comments) when the env has no key', async () => {
    const file = dotenvFile(`# local key\r\nexport PARTNER_SIGNER_PRIVATE_KEY="${TEST_PRIVATE_KEY}"\r\n`);
    const client = await connectOverStdio({ PARTNER_SIGNER_DOTENV_FILE: file });

    const result = await getAddress(client);

    expect(result.isError, text(result)).toBeFalsy();
    expect(result.structuredContent).toEqual({ address: TEST_ADDRESS });
  });

  it('lets the process environment win over the dotenv file', async () => {
    const file = dotenvFile(`PARTNER_SIGNER_PRIVATE_KEY=${OTHER_PRIVATE_KEY}\n`);
    const client = await connectOverStdio({
      PARTNER_SIGNER_PRIVATE_KEY: TEST_PRIVATE_KEY,
      PARTNER_SIGNER_DOTENV_FILE: file,
    });

    const result = await getAddress(client);

    expect(result.structuredContent).toEqual({ address: TEST_ADDRESS });
    expect(result.structuredContent).not.toEqual({ address: OTHER_ADDRESS });
  });

  it('signs typed data with a chainId beyond 2^53 exactly over stdio and rejects an invalid chainId without dying', async () => {
    const client = await connectOverStdio({ PARTNER_SIGNER_PRIVATE_KEY: TEST_PRIVATE_KEY });
    const BIG = 9007199254740993n; // 2^53 + 1, independent reference
    const types = { Ping: [{ name: 'nonce', type: 'uint256' }] } as const;

    const signed = (await client.callTool({
      name: 'signer_sign_typed_data',
      arguments: { domain: { name: 'Stdio', version: '1', chainId: '9007199254740993' }, types, primaryType: 'Ping', message: { nonce: '9007199254740993' } },
    })) as CallToolResult;
    expect(signed.isError, text(signed)).toBeFalsy();
    const { address, signature } = signed.structuredContent as { address: string; signature: `0x${string}` };
    const exact = await recoverTypedDataAddress({
      domain: { name: 'Stdio', version: '1', chainId: BIG },
      types,
      primaryType: 'Ping',
      message: { nonce: BIG },
      signature,
    });
    const rounded = await recoverTypedDataAddress({
      domain: { name: 'Stdio', version: '1', chainId: 9007199254740992n },
      types,
      primaryType: 'Ping',
      message: { nonce: 9007199254740992n },
      signature,
    });
    expect(exact).toBe(address);
    expect(rounded).not.toBe(address);

    const rejected = (await client.callTool({
      name: 'signer_sign_typed_data',
      arguments: { domain: { name: 'Stdio', version: '1', chainId: true }, types, primaryType: 'Ping', message: { nonce: 1 } },
    })) as CallToolResult;
    expect(rejected.isError).toBe(true);
    expect(rejected.structuredContent).toBeUndefined();
    expect(text(rejected)).toMatch(/domain\.chainId/);

    const again = await getAddress(client);
    expect(again.structuredContent).toEqual({ address: TEST_ADDRESS });
  });

  it('does not execute the dotenv file as shell', async () => {
    const marker = join(tempDirs[0] ?? mkdtempSync(join(tmpdir(), 'partner-signer-mcp-')), 'executed');
    const file = dotenvFile(`PARTNER_SIGNER_PRIVATE_KEY=$(touch ${marker})${TEST_PRIVATE_KEY}\n`);
    const client = await connectOverStdio({ PARTNER_SIGNER_DOTENV_FILE: file });

    const result = await getAddress(client);

    expect(existsSync(marker)).toBe(false);
    expect(result.isError).toBe(true); // the literal "$(touch …)…" is not a valid key
    expect(text(result)).toContain('InvalidPrivateKeyError');
  });
});
