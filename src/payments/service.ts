import crypto from 'node:crypto';
import type { PaymentStore } from './store.js';
import type { Payment, PaymentStatus } from './model.js';
import type { PaymentProvider, ProviderStatus } from '../providers/provider.js';
import type { Amount } from '../lib/money.js';
import { transition, isTerminal } from './state.js';
import { PayError } from './errors.js';
import { withRetry } from '../lib/backoff.js';
import type { DeadLetterQueue } from '../dead-letter/queue.js';

export interface CreateInput { amount: Amount; reference: string; instrumentToken: string; }

const now = () => new Date().toISOString();
const mapProvider = (s: ProviderStatus['status']): PaymentStatus => s;

export class PaymentService {
  constructor(
    private readonly store: PaymentStore,
    private readonly provider: PaymentProvider,
    private readonly deadLetters: DeadLetterQueue,
  ) {}

  // Idempotent by the caller supplied key. A retry of the same create returns the
  // original payment and never charges twice.
  async createPayment(idempotencyKey: string, input: CreateInput): Promise<Payment> {
    const existing = await this.store.byIdempotencyKey(idempotencyKey);
    if (existing) return existing;

    const payment: Payment = {
      id: `pay_${crypto.randomBytes(8).toString('hex')}`,
      reference: input.reference,
      amount: input.amount,
      status: 'created',
      providerRef: null,
      idempotencyKey,
      failureReason: null,
      createdAt: now(),
      updatedAt: now(),
    };
    await this.store.create(payment);

    try {
      const result = await withRetry(() => this.provider.charge({
        amount: input.amount, reference: input.reference, instrumentToken: input.instrumentToken,
      }), { maxAttempts: 4, onGiveUp: (err) => this.deadLetters.push('charge', { paymentId: payment.id }, err) });

      payment.providerRef = result.providerRef;
      payment.status = transition(payment.status, 'processing');
      if (result.status === 'succeeded' || result.status === 'failed') {
        payment.status = transition(payment.status, result.status);
        payment.failureReason = result.failureReason ?? null;
      }
      payment.updatedAt = now();
      return this.store.update(payment);
    } catch {
      // The charge could not be confirmed. The payment stays 'created' and is on
      // the dead letter queue; reconcile will settle it once the provider is
      // reachable. We never guess success.
      return payment;
    }
  }

  async getPayment(id: string): Promise<Payment> {
    const p = await this.store.byId(id);
    if (!p) throw new PayError('PAY_NOT_FOUND', 404, `Payment ${id} does not exist.`);
    return p;
  }

  // Applies an authoritative provider status to a payment. Idempotent: a status
  // we already hold is a no op. A terminal status that disagrees with a provider
  // terminal status is a genuine conflict and is surfaced, not overwritten.
  async applyProviderStatus(payment: Payment, ps: ProviderStatus): Promise<Payment> {
    const target = mapProvider(ps.status);
    if (payment.status === target) return payment;

    if (isTerminal(payment.status)) {
      throw new PayError('PAY_RECONCILE_CONFLICT', 409,
        `Local status ${payment.status} disagrees with provider status ${target} for payment ${payment.id}.`);
    }
    // Settlement must pass through processing.
    if (payment.status === 'created' && target !== 'processing' && target !== 'expired') {
      payment.status = transition(payment.status, 'processing');
    }
    payment.status = transition(payment.status, target);
    payment.failureReason = ps.failureReason ?? payment.failureReason;
    payment.updatedAt = now();
    return this.store.update(payment);
  }

  // Pulls the provider's view and applies it. This is the safety net for missed
  // webhooks and the tie breaker when local and provider state drift.
  async reconcile(paymentId: string): Promise<Payment> {
    const payment = await this.getPayment(paymentId);
    if (!payment.providerRef) return payment;
    const ps = await this.provider.fetchStatus(payment.providerRef);
    return this.applyProviderStatus(payment, ps);
  }
}
