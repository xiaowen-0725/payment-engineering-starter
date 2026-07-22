import { config } from './config.js';
import { InMemoryPaymentStore } from './payments/store.js';
import { StubProvider } from './providers/stub.js';
import { DeadLetterQueue } from './dead-letter/queue.js';
import { PaymentService } from './payments/service.js';
import { WebhookHandler } from './webhooks/handler.js';
import { createApp } from './http/app.js';

const store = new InMemoryPaymentStore();
const provider = new StubProvider();
const deadLetters = new DeadLetterQueue();
const service = new PaymentService(store, provider, deadLetters);
const webhooks = new WebhookHandler(service, store);

createApp({
  service, webhooks, deadLetters,
  webhookSecret: config.webhookSecret,
  webhookToleranceSeconds: config.webhookToleranceSeconds,
}).listen(config.port, () => console.log(JSON.stringify({ event: 'server.listening', port: config.port })));
