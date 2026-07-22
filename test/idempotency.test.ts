import { describe, it, expect } from 'vitest';
import { InMemoryPaymentStore } from '../src/payments/store.js';
import { StubProvider } from '../src/providers/stub.js';
import { DeadLetterQueue } from '../src/dead-letter/queue.js';
import { PaymentService } from '../src/payments/service.js';
import { WebhookHandler } from '../src/webhooks/handler.js';
import { amount } from '../src/lib/money.js';

function build() {
  const store = new InMemoryPaymentStore();
  const provider = new StubProvider();
  const service = new PaymentService(store, provider, new DeadLetterQueue());
  const webhooks = new WebhookHandler(service, store);
  return { store, provider, service, webhooks };
}
const input = () => ({ amount: amount(5000, 'USD'), reference: 'order-1', instrumentToken: 'tok_test' });

describe('idempotency and reconciliation', () => {
  it('a replayed create returns the same payment and does not charge twice', async () => {
    const { service } = build();
    const first = await service.createPayment('key-1', input());
    const second = await service.createPayment('key-1', input());
    expect(second.id).toBe(first.id);
  });

  it('reconcile drives a processing payment to its provider outcome', async () => {
    const { service, provider } = build();
    const payment = await service.createPayment('key-2', input());
    expect(payment.status).toBe('processing');
    provider.settle(payment.providerRef!, 'succeeded');
    const settled = await service.reconcile(payment.id);
    expect(settled.status).toBe('succeeded');
  });

  it('a duplicate webhook delivery is a no op', async () => {
    const { service, provider, webhooks, store } = build();
    const payment = await service.createPayment('key-3', input());
    provider.settle(payment.providerRef!, 'succeeded');
    const event = { id: 'evt_dup', providerRef: payment.providerRef!, status: 'succeeded' as const };
    const a = await webhooks.handle(event);
    const b = await webhooks.handle(event);
    expect(a.applied).toBe(true);
    expect(b.applied).toBe(false);
    expect((await store.byId(payment.id))!.status).toBe('succeeded');
  });

  it('surfaces a reconciliation conflict instead of overwriting a terminal state', async () => {
    const { service, provider } = build();
    const payment = await service.createPayment('key-4', input());
    provider.settle(payment.providerRef!, 'failed');
    await service.reconcile(payment.id); // now failed
    provider.settle(payment.providerRef!, 'succeeded'); // provider disagrees
    await expect(service.reconcile(payment.id)).rejects.toMatchObject({ code: 'PAY_RECONCILE_CONFLICT' });
  });
});
