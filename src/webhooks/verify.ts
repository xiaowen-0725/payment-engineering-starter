import crypto from 'node:crypto';
import { PayError } from '../payments/errors.js';

// Verifies a provider webhook. Three checks, all required: the signature must
// match under a constant time compare, the timestamp must be recent, and the
// caller tracks event ids to reject a replay. Signature is HMAC-SHA256 over
// `${timestamp}.${rawBody}`, so re-signing an old body with a new timestamp still
// fails because the body's timestamp is inside the signed string.
export function verifyWebhook(
  rawBody: Buffer,
  headers: { signature?: string; timestamp?: string },
  secret: string,
  toleranceSeconds: number,
): void {
  const { signature, timestamp } = headers;
  if (!signature || !timestamp) {
    throw new PayError('PAY_WEBHOOK_UNVERIFIED', 400, 'Missing webhook signature or timestamp.');
  }
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > toleranceSeconds) {
    throw new PayError('PAY_WEBHOOK_UNVERIFIED', 400, 'Webhook timestamp is outside the allowed window.');
  }
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody.toString('utf8')}`).digest();
  const provided = Buffer.from(signature, 'hex');
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    throw new PayError('PAY_WEBHOOK_UNVERIFIED', 400, 'Webhook signature does not match.');
  }
}

// Helper for producing a signature, used by tests and by whoever configures the
// provider's signing in a real deployment.
export function signWebhook(rawBody: string, timestamp: number, secret: string): string {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}
