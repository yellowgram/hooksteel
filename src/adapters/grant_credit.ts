import { recordTestInvocation } from './testInvocation.js';
import type { FulfillmentAdapter } from './types.js';

export const grantCreditAdapter: FulfillmentAdapter = {
  name: 'grant_credit',
  async execute(ctx) {
    const payload = (ctx.payload ?? {}) as Record<string, unknown>;
    const amount = payload.amount_total ?? payload.amount_paid;
    const currency = payload.currency;
    const customer = payload.customer;
    if (amount == null || currency == null || customer == null) {
      throw new Error('grant_credit requires amount, currency, and customer');
    }
    await recordTestInvocation(ctx.idempotencyKey, grantCreditAdapter.name);
  },
};
