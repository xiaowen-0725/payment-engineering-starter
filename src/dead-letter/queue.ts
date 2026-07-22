// A minimal dead letter queue. When an operation exhausts its retries, the job
// lands here with enough context to be inspected and replayed by an operator,
// rather than vanishing into a log line.
export interface DeadLetter {
  id: string;
  kind: string;
  payload: unknown;
  error: string;
  failedAt: string;
}

export class DeadLetterQueue {
  private items: DeadLetter[] = [];
  push(kind: string, payload: unknown, error: unknown): void {
    this.items.push({
      id: `dl_${this.items.length + 1}`,
      kind,
      payload,
      error: error instanceof Error ? error.message : String(error),
      failedAt: new Date().toISOString(),
    });
  }
  list(): ReadonlyArray<DeadLetter> { return this.items; }
  size(): number { return this.items.length; }
}
