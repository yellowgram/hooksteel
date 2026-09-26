import type pg from 'pg';
import type { DrainOptions } from '../outbox/drain.js';
import type { HandleOptions } from '../webhooks/stripe/handler.js';

function assertChaosAllowed(): void {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_CHAOS_INJECT !== 'true') {
    throw new Error('chaos inject is disabled');
  }
}

/**
 * Pass the result as the second argument to handle(). Nothing is armed globally.
 * The first call throws inside the webhook transaction, before COMMIT.
 */
export function abortBeforeCommitOnce(
  probe?: (client: pg.PoolClient) => Promise<void>,
): HandleOptions {
  assertChaosAllowed();
  return {
    beforeCommit: async (client) => {
      if (probe) await probe(client);
      throw new Error('chaos_abort_before_commit');
    },
  };
}

/** Throw once, after the adapter returns and before completed_at, for one idempotency key. */
export function crashAfterInvocationOnce(idempotencyKey: string): DrainOptions {
  assertChaosAllowed();
  let armed = true;
  return {
    afterInvocation: async (key) => {
      if (!armed || key !== idempotencyKey) return;
      armed = false;
      throw new Error('chaos_crash_before_completed_at');
    },
  };
}

export function crashAfterInvocationAlways(idempotencyKey: string): DrainOptions {
  assertChaosAllowed();
  return {
    afterInvocation: async (key) => {
      if (key !== idempotencyKey) return;
      throw new Error('chaos_always_crash');
    },
  };
}
