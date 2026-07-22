import type { Payment } from './model.js';

// The persistence seam. The reference implementation keeps payments in memory so
// the repo runs with nothing installed; a real deployment swaps in a store backed
// by a database that enforces the unique constraints below in its schema.
export interface PaymentStore {
  create(payment: Payment): Promise<Payment>;
  update(payment: Payment): Promise<Payment>;
  byId(id: string): Promise<Payment | null>;
  byIdempotencyKey(key: string): Promise<Payment | null>;
  byProviderRef(ref: string): Promise<Payment | null>;
}

export class InMemoryPaymentStore implements PaymentStore {
  private byIdMap = new Map<string, Payment>();
  private byKeyMap = new Map<string, string>();
  private byProviderMap = new Map<string, string>();

  async create(p: Payment): Promise<Payment> {
    // These two guards stand in for unique constraints a database would own.
    if (this.byKeyMap.has(p.idempotencyKey)) throw new Error('duplicate idempotency key');
    this.byIdMap.set(p.id, { ...p });
    this.byKeyMap.set(p.idempotencyKey, p.id);
    if (p.providerRef) this.byProviderMap.set(p.providerRef, p.id);
    return { ...p };
  }
  async update(p: Payment): Promise<Payment> {
    this.byIdMap.set(p.id, { ...p });
    if (p.providerRef) this.byProviderMap.set(p.providerRef, p.id);
    return { ...p };
  }
  async byId(id: string) { const p = this.byIdMap.get(id); return p ? { ...p } : null; }
  async byIdempotencyKey(key: string) {
    const id = this.byKeyMap.get(key); return id ? this.byId(id) : null;
  }
  async byProviderRef(ref: string) {
    const id = this.byProviderMap.get(ref); return id ? this.byId(id) : null;
  }
}
