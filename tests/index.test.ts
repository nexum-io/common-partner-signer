import { describe, expect, it } from 'vitest';

describe('@nexum-io/partner-signer entry', () => {
  it('exposes exactly the v1 runtime surface: createSigner', async () => {
    const mod = await import('../src/index.js');

    expect(Object.keys(mod).sort()).toEqual(['createSigner']);
    expect(typeof mod.createSigner).toBe('function');
  });
});
