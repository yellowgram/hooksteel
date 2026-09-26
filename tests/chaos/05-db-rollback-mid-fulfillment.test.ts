import assert from 'node:assert/strict';
import { test } from 'node:test';
import { armCrashAfterInvocationOnce, disarmChaos } from '../../src/chaos/inject.js';
import { getPool } from '../../src/db/pool.js';
import { drainOnce } from '../../src/outbox/drain.js';
import { handle } from '../../src/webhooks/stripe/handler.js';
import { checkoutBody, signBody } from '../fixtures/stripe/sign.js';
import { count, installDbHooks } from '../setup/harness.js';

installDbHooks();

test('crash after adapter_invocations write and before completed_at re-drains to count 1', async () => {
  const eventId = 'evt_mid_1';
  const key = `stripe|${eventId}|grant_credit`;
  const rawBody = checkoutBody({ id: eventId });
  const signature = signBody(rawBody);

  const accepted = await handle({ rawBody, signature });
  assert.equal(accepted.status, 200);
  assert.equal(await count('SELECT count(*)::int AS n FROM outbox WHERE completed_at IS NULL'), 2);

  armCrashAfterInvocationOnce(key);
  try {
    const processed = await drainOnce();
    assert.ok(processed >= 1);
  } finally {
    disarmChaos();
  }

  assert.equal(
    await count('SELECT count(*)::int AS n FROM adapter_invocations WHERE idempotency_key = $1', [key]),
    1,
  );
  const crashed = await getPool().query<{ completed_at: Date | null; last_error: string | null }>(
    `SELECT completed_at, last_error FROM outbox WHERE idempotency_key = $1`,
    [key],
  );
  assert.equal(crashed.rows[0]?.completed_at, null);
  assert.match(crashed.rows[0]?.last_error ?? '', /chaos_crash_before_completed_at/);

  await getPool().query(
    `UPDATE outbox SET available_at = now() WHERE idempotency_key = $1 AND completed_at IS NULL`,
    [key],
  );

  await drainOnce();
  assert.equal(
    await count('SELECT count(*)::int AS n FROM adapter_invocations WHERE idempotency_key = $1', [key]),
    1,
  );
  const healed = await getPool().query<{ completed_at: Date | null }>(
    `SELECT completed_at FROM outbox WHERE idempotency_key = $1`,
    [key],
  );
  assert.ok(healed.rows[0]?.completed_at);
});
