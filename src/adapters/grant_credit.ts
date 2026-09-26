import { runAfterInvocationHook } from './hooks.js';
import { recordTestInvocation } from './testInvocation.js';
import type { FulfillmentAdapter } from './types.js';

export const grantCreditAdapter: FulfillmentAdapter = {
  name: 'grant_credit',
  async execute(ctx) {
    const payload = (ctx.payload ?? {}) as Record<string, unknown>;
    const amount = payload.amount_total ?? payload.amount_paid ?? null;
    const currency = payload.currency ?? null;
    const customer = payload.customer ?? null;
    if (amount == null || currency == null || customer == null) {
      // Stub still records one idempotent invocation. Replace this adapter to grant credit.
    }
    await recordTestInvocation(ctx.idempotencyKey, grantCreditAdapter.name);
    await runAfterInvocationHook(ctx.idempotencyKey);
  },
};
