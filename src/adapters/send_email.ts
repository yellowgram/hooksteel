import { recordTestInvocation } from './testInvocation.js';
import type { FulfillmentAdapter } from './types.js';

export const sendEmailAdapter: FulfillmentAdapter = {
  name: 'send_email',
  async execute(ctx) {
    const payload = (ctx.payload ?? {}) as Record<string, unknown>;
    const email = payload.customer_email;
    if (typeof email !== 'string' || email.trim() === '') {
      return { lastError: 'skipped_no_email' };
    }
    await recordTestInvocation(ctx.idempotencyKey, sendEmailAdapter.name);
  },
};
