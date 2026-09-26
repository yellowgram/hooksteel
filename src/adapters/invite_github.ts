import { recordTestInvocation } from './testInvocation.js';
import type { FulfillmentAdapter } from './types.js';

/** Opt-in only. Not referenced by the default adapter map. */
export const inviteGithubAdapter: FulfillmentAdapter = {
  name: 'invite_github',
  async execute(ctx) {
    await recordTestInvocation(ctx.idempotencyKey, inviteGithubAdapter.name);
  },
};
