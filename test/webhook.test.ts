import { describe, it, expect } from 'vitest';
import { verifyWebhook, signWebhook } from '../src/webhooks/verify.js';

const secret = 'test-secret-value';

describe('webhook verification', () => {
  it('accepts a correctly signed, recent webhook', () => {
    const ts = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({ id: 'evt_1', providerRef: 'stub_x', status: 'succeeded' });
    const sig = signWebhook(body, ts, secret);
    expect(() => verifyWebhook(Buffer.from(body), { signature: sig, timestamp: String(ts) }, secret, 300)).not.toThrow();
  });

  it('rejects a bad signature', () => {
    const ts = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({ id: 'evt_1' });
    expect(() => verifyWebhook(Buffer.from(body), { signature: 'deadbeef', timestamp: String(ts) }, secret, 300))
      .toThrowError(/signature|window|Missing/);
  });

  it('rejects a stale timestamp even with an otherwise valid signature', () => {
    const ts = Math.floor(Date.now() / 1000) - 10_000;
    const body = JSON.stringify({ id: 'evt_1' });
    const sig = signWebhook(body, ts, secret);
    expect(() => verifyWebhook(Buffer.from(body), { signature: sig, timestamp: String(ts) }, secret, 300))
      .toThrowError(/window/);
  });
});
