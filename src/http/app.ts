import express, { type Request, type Response, type NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { PayError } from '../payments/errors.js';
import { requireIdempotencyKey } from './idempotency.js';
import { verifyWebhook } from '../webhooks/verify.js';
import { amount } from '../lib/money.js';
import type { PaymentService } from '../payments/service.js';
import type { WebhookHandler } from '../webhooks/handler.js';
import type { DeadLetterQueue } from '../dead-letter/queue.js';

const createSchema = z.object({
  reference: z.string().min(1).max(100),
  amountMinor: z.number().int().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  instrumentToken: z.string().min(1),
});

interface Deps {
  service: PaymentService;
  webhooks: WebhookHandler;
  deadLetters: DeadLetterQueue;
  webhookSecret: string;
  webhookToleranceSeconds: number;
}

export function createApp(deps: Deps) {
  const app = express();
  const base = '/api/v1/payments';

  // The webhook is mounted first with a raw body parser so the signature is
  // checked against the exact bytes the provider signed, before any JSON parsing.
  app.post(`${base}/webhook`, express.raw({ type: '*/*' }), async (req, res, next) => {
    try {
      verifyWebhook(req.body as Buffer, {
        signature: req.header('X-Signature') ?? undefined,
        timestamp: req.header('X-Timestamp') ?? undefined,
      }, deps.webhookSecret, deps.webhookToleranceSeconds);
      const event = JSON.parse((req.body as Buffer).toString('utf8'));
      const result = await deps.webhooks.handle(event);
      res.status(200).json(result);
    } catch (err) { next(err); }
  });

  app.use(express.json());

  app.post(base, requireIdempotencyKey, async (req, res, next) => {
    try {
      const input = createSchema.parse(req.body);
      const payment = await deps.service.createPayment((req as any).idempotencyKey, {
        amount: amount(input.amountMinor, input.currency),
        reference: input.reference,
        instrumentToken: input.instrumentToken,
      });
      res.status(201).json(payment);
    } catch (err) { next(err); }
  });

  app.get(`${base}/dead-letters`, (_req, res) => res.json({ size: deps.deadLetters.size(), items: deps.deadLetters.list() }));
  app.get(`${base}/:id`, async (req, res, next) => {
    try { res.json(await deps.service.getPayment(req.params.id)); } catch (err) { next(err); }
  });
  app.post(`${base}/:id/reconcile`, async (req, res, next) => {
    try { res.json(await deps.service.reconcile(req.params.id)); } catch (err) { next(err); }
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof PayError) return res.status(err.status).json({ error: { code: err.code, message: err.message } });
    if (err instanceof ZodError) return res.status(400).json({ error: { code: 'PAY_VALIDATION', message: 'Invalid request.', details: err.issues } });
    console.error(JSON.stringify({ event: 'request.error', message: (err as Error)?.message }));
    return res.status(500).json({ error: { code: 'PAY_INTERNAL', message: 'Unexpected error.' } });
  });

  return app;
}
