import assert from 'node:assert/strict';
import { test } from 'node:test';
import { abortBeforeCommitOnce } from '../../src/chaos/inject.js';
import { handle } from '../../src/webhooks/stripe/handler.js';
import { checkoutBody, signBody } from '../fixtures/stripe/sign.js';
import { count, drainUntilIdle, idleInTransaction, installDbHooks, withTimeout } from '../setup/harness.js';

installDbHooks();

test('abort before commit rolls back, leaves no idle transaction, and retry inserts once', async () => {
  const rawBody = checkoutBody({ id: 'evt_abort_1' });
  const signature = signBody(rawBody);
  let sawUncommittedInsert = false;

  const first = await handle(
    { rawBody, signature },
    abortBeforeCommitOnce(async (client) => {
      const seen = await client.query<{ n: number }>('SELECT count(*)::int AS n FROM billing_events');
      sawUncommittedInsert = Number(seen.rows[0]?.n) === 1;
    }),
  );
  const firstBody = await first.json();
  assert.equal(first.status, 500, JSON.stringify(firstBody));

  assert.equal(sawUncommittedInsert, true);
  assert.equal(await count('SELECT count(*)::int AS n FROM billing_events'), 0);
  assert.equal(await count('SELECT count(*)::int AS n FROM outbox'), 0);
  assert.equal(await idleInTransaction(), 0);

  const retry = await withTimeout(handle({ rawBody, signature }), 1000);
  const retryBody = await retry.json();
  assert.equal(retry.status, 200, JSON.stringify(retryBody));
  assert.equal(retryBody.outcome, 'outboxed');
  assert.equal(await count('SELECT count(*)::int AS n FROM billing_events'), 1);
  assert.equal(await idleInTransaction(), 0);

  await drainUntilIdle();
  assert.equal(
    await count('SELECT count(*)::int AS n FROM adapter_invocations WHERE idempotency_key = $1', [
      'stripe|evt_abort_1|grant_credit',
    ]),
    1,
  );
  assert.equal(
    await count('SELECT count(*)::int AS n FROM adapter_invocations WHERE idempotency_key = $1', [
      'stripe|evt_abort_1|send_email',
    ]),
    1,
  );
});
