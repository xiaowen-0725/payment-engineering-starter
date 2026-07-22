import type { Request, Response, NextFunction } from 'express';
import { PayError } from '../payments/errors.js';

export function requireIdempotencyKey(req: Request, _res: Response, next: NextFunction) {
  const key = req.header('Idempotency-Key');
  if (!key || key.trim() === '') {
    return next(new PayError('PAY_IDEMPOTENCY_KEY_REQUIRED', 400, 'An Idempotency-Key header is required.'));
  }
  (req as any).idempotencyKey = key.trim();
  next();
}
