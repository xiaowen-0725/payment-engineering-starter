import { describe, it, expect } from 'vitest';
import { canTransition, transition, isTerminal } from '../src/payments/state.js';

describe('payment state machine', () => {
  it('permits the documented transitions', () => {
    expect(canTransition('created', 'processing')).toBe(true);
    expect(canTransition('processing', 'succeeded')).toBe(true);
    expect(canTransition('processing', 'failed')).toBe(true);
  });

  it('rejects an illegal transition rather than ignoring it', () => {
    expect(() => transition('succeeded', 'failed')).toThrowError(/cannot move/);
    expect(() => transition('created', 'succeeded')).toThrowError(/cannot move/);
  });

  it('knows terminal states', () => {
    expect(isTerminal('succeeded')).toBe(true);
    expect(isTerminal('processing')).toBe(false);
  });
});
