import { describe, expect, it } from 'vitest';

describe('@nexum-io/partner-signer entry (M0 scaffold)', () => {
  it('resolves the public entry module', async () => {
    const mod = await import('../src/index.js');
    expect(mod).toBeDefined();
  });

  it('has no runtime exports yet — M0 is contract-only', async () => {
    const mod = await import('../src/index.js');
    expect(Object.keys(mod)).toEqual([]);
  });
});
