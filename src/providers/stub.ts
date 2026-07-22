import crypto from 'node:crypto';
import type { PaymentProvider, ChargeRequest, ChargeResult, ProviderStatus } from './provider.js';

// A deterministic stand in for a real provider. It accepts a charge as
// processing and lets a test drive the outcome through fetchStatus, which mirrors
// how real providers settle asynchronously and report later.
export class StubProvider implements PaymentProvider {
  private outcomes = new Map<string, ProviderStatus>();

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    const providerRef = `stub_${crypto.randomBytes(8).toString('hex')}`;
    this.outcomes.set(providerRef, { providerRef, status: 'processing' });
    return { providerRef, status: 'processing' };
  }
  async fetchStatus(providerRef: string): Promise<ProviderStatus> {
    return this.outcomes.get(providerRef) ?? { providerRef, status: 'processing' };
  }
  // Test and reconciliation seam: set what the provider will report next.
  settle(providerRef: string, status: ProviderStatus['status'], failureReason?: string) {
    this.outcomes.set(providerRef, { providerRef, status, failureReason });
  }
}
