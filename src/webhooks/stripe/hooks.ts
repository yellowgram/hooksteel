import type pg from 'pg';

export type BeforeCommitHook = (client: pg.PoolClient) => Promise<void> | void;

let beforeCommitHook: BeforeCommitHook | null = null;

function chaosHooksAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.ALLOW_CHAOS_INJECT === 'true';
}

export function setBeforeCommitHook(hook: BeforeCommitHook | null): void {
  if (!chaosHooksAllowed()) {
    throw new Error('before-commit hook is disabled (production forces off; ALLOW_CHAOS_INJECT must be true)');
  }
  beforeCommitHook = hook;
}

export async function runBeforeCommitHook(client: pg.PoolClient): Promise<void> {
  if (!chaosHooksAllowed() || !beforeCommitHook) return;
  await beforeCommitHook(client);
}
