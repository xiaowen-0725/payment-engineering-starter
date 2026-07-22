// Exponential backoff with full jitter. Full jitter (a random point in [0, cap])
// spreads retries better than equal jitter when many callers fail at once, which
// is exactly the situation a flaky provider creates.
export function backoffDelayMs(attempt: number, baseMs = 200, maxMs = 20_000): number {
  const capped = Math.min(maxMs, baseMs * 2 ** (attempt - 1));
  return Math.floor(Math.random() * capped);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts?: number; baseMs?: number; onGiveUp?: (err: unknown) => void } = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 5;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts) break;
      await new Promise((r) => setTimeout(r, backoffDelayMs(attempt, opts.baseMs)));
    }
  }
  opts.onGiveUp?.(lastErr);
  throw lastErr;
}
