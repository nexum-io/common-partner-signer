import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { TEST_ADDRESS, TEST_PRIVATE_KEY } from './fixtures.js';

const exampleDir = fileURLToPath(new URL('../examples/basic/', import.meta.url));

function runExample(env: Record<string, string>) {
  return spawnSync(process.execPath, ['main.mjs'], {
    cwd: exampleDir,
    env: { PATH: process.env['PATH'] ?? '', ...env },
    encoding: 'utf8',
  });
}

describe('examples/basic — env outside, createSigner inside', () => {
  it('prints the address and a successful recover check when the key comes from env', () => {
    const result = runExample({ PARTNER_SIGNER_PRIVATE_KEY: TEST_PRIVATE_KEY });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(`address: ${TEST_ADDRESS}`);
    expect(result.stdout).toContain('typed data recover: OK');
    expect(result.stdout).toContain('message recover: OK');
    expect(result.stdout.toLowerCase()).not.toContain(TEST_PRIVATE_KEY.slice(2));
    expect(result.stderr).toBe('');
  });

  it('fails fast with a clear hint and no key material when the env variable is missing', () => {
    const result = runExample({});

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('PARTNER_SIGNER_PRIVATE_KEY');
    expect(result.stdout).toBe('');
  });

  it('rejects a malformed key without echoing it', () => {
    const result = runExample({ PARTNER_SIGNER_PRIVATE_KEY: '0xdeadbeef' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('InvalidPrivateKeyError');
    expect(result.stderr).not.toContain('deadbeef');
  });
});
