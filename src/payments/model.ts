import type { Amount } from '../lib/money.js';

// The states a payment can occupy. succeeded, failed, and expired are terminal.
export type PaymentStatus = 'created' | 'processing' | 'succeeded' | 'failed' | 'expired';

export interface Payment {
  id: string;
  reference: string;
  amount: Amount;
  status: PaymentStatus;
  providerRef: string | null; // the provider's own id, learned when a charge is accepted
  idempotencyKey: string;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}
