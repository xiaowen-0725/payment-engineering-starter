import type { PaymentStatus } from './model.js';
import { PayError } from './errors.js';

// The legal transitions, written out in one table so the machine is auditable at
// a glance. Anything not listed here is rejected, on purpose. Ignoring an
// impossible transition hides bugs; rejecting it surfaces them.
const ALLOWED: Record<PaymentStatus, ReadonlyArray<PaymentStatus>> = {
  created:    ['processing', 'expired'],
  processing: ['succeeded', 'failed', 'expired'],
  succeeded:  [],
  failed:     [],
  expired:    [],
};

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return ALLOWED[from].includes(to);
}

// Returns the next status if the move is legal, throws otherwise. A repeat of the
// current terminal status is treated by callers as a no op before this is called,
// so this never needs a "same state" allowance.
export function transition(from: PaymentStatus, to: PaymentStatus): PaymentStatus {
  if (!canTransition(from, to)) {
    throw new PayError('PAY_ILLEGAL_TRANSITION', 409, `A payment cannot move from ${from} to ${to}.`);
  }
  return to;
}

export function isTerminal(status: PaymentStatus): boolean {
  return ALLOWED[status].length === 0;
}
