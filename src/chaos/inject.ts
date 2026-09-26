import type pg from 'pg';
import { setAfterInvocationHook } from '../adapters/hooks.js';
import { setBeforeCommitHook, type BeforeCommitHook } from '../webhooks/stripe/hooks.js';

function assertChaosAllowed(): void {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_CHAOS_INJECT !== 'true') {
    throw new Error('chaos inject is disabled');
  }
}

export function disarmChaos(): void {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_CHAOS_INJECT !== 'true') return;
  setBeforeCommitHook(null);
  setAfterInvocationHook(null);
}

/** After verify + in-txn writes, throw once before COMMIT. The handler must roll the transaction back. */
export function armAbortBeforeCommitOnce(probe?: BeforeCommitHook): void {
  assertChaosAllowed();
  setBeforeCommitHook(async (client: pg.PoolClient) => {
    setBeforeCommitHook(null);
    if (probe) await probe(client);
    throw new Error('chaos_abort_before_commit');
  });
}

/** After the test invocation row commits on its own connection, throw once before completed_at. */
export function armCrashAfterInvocationOnce(idempotencyKey: string): void {
  assertChaosAllowed();
  setAfterInvocationHook(async (key) => {
    if (key !== idempotencyKey) return;
    setAfterInvocationHook(null);
    throw new Error('chaos_crash_before_completed_at');
  });
}

export function armCrashAfterInvocationAlways(idempotencyKey: string): void {
  assertChaosAllowed();
  setAfterInvocationHook(async (key) => {
    if (key !== idempotencyKey) return;
    throw new Error('chaos_always_crash');
  });
}
