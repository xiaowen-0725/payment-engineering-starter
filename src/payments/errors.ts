export type PayErrorCode =
  | 'PAY_NOT_FOUND'
  | 'PAY_ILLEGAL_TRANSITION'
  | 'PAY_IDEMPOTENCY_CONFLICT'
  | 'PAY_IDEMPOTENCY_KEY_REQUIRED'
  | 'PAY_RECONCILE_CONFLICT'
  | 'PAY_WEBHOOK_UNVERIFIED'
  | 'PAY_VALIDATION';

export class PayError extends Error {
  constructor(public readonly code: PayErrorCode, public readonly status: number, message: string) {
    super(message);
    this.name = 'PayError';
  }
}
