// Reads and validates the environment once. Fails loudly rather than limping
// along with a missing webhook secret, which is the one value that must never
// be absent in this service.
function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable ${name}`);
  return v;
}

export const config = {
  webhookSecret: need('PAY_WEBHOOK_SECRET'),
  port: Number(process.env.PAY_PORT ?? 4000),
  webhookToleranceSeconds: Number(process.env.PAY_WEBHOOK_TOLERANCE_SECONDS ?? 300),
};
