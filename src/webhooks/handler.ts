import type { PaymentService } from '../payments/service.js';
import type { PaymentStore } from '../payments/store.js';
import type { ProviderStatus } from '../providers/provider.js';

interface WebhookEvent {
  id: string;
  providerRef: string;
  status: ProviderStatus['status'];
  failureReason?: string;
}

// Providers deliver more than once, so the handler is idempotent on the event id.
// A second delivery of an id we have processed is acknowledged and dropped.
export class WebhookHandler {
  private processed = new Set<string>();
  constructor(private readonly service: PaymentService, private readonly store: PaymentStore) {}

  async handle(event: WebhookEvent): Promise<{ applied: boolean }> {
    if (this.processed.has(event.id)) return { applied: false };
    const payment = await this.store.byProviderRef(event.providerRef);
    if (!payment) { this.processed.add(event.id); return { applied: false }; }
    await this.service.applyProviderStatus(payment, {
      providerRef: event.providerRef, status: event.status, failureReason: event.failureReason,
    });
    this.processed.add(event.id);
    return { applied: true };
  }
}
