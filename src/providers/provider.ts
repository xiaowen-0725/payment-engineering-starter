import type { Amount } from '../lib/money.js';

// The contract every payment provider is adapted to. The rest of the service
// knows only this interface, never a named vendor, which is what keeps the
// orchestration reusable and testable against a stub.
export interface ChargeRequest {
  amount: Amount;
  reference: string;
  // A short lived token that stands for an instrument. No PAN, no CVV, nothing in
  // PCI scope ever reaches this service.
  instrumentToken: string;
}

export interface ChargeResult {
  providerRef: string;
  status: 'processing' | 'succeeded' | 'failed';
  failureReason?: string;
}

export interface ProviderStatus {
  providerRef: string;
  status: 'processing' | 'succeeded' | 'failed' | 'expired';
  failureReason?: string;
}

export interface PaymentProvider {
  charge(req: ChargeRequest): Promise<ChargeResult>;
  fetchStatus(providerRef: string): Promise<ProviderStatus>;
}
