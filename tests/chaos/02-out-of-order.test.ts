import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getPool } from '../../src/db/pool.js';
import { handlePolar } from '../../src/webhooks/polar/handler.js';
import { handle } from '../../src/webhooks/stripe/handler.js';
import { orderPaidBody, polarHandleInput } from '../fixtures/polar/sign.js';
import { checkoutBody, signBody } from '../fixtures/stripe/sign.js';
import { count, deadlocks, drainUntilIdle, installDbHooks } from '../setup/harness.js';

installDbHooks();

// Honesty (H5): this proves uniqueness and no deadlocks when deliveries are reordered
// and concurrent. It does not promise a global total order across events.
test('out-of-order + concurrent deliveries keep uniqueness and do not deadlock', async () => {
  const rawB = checkoutBody({ id: 'evt_order_b' });
  const rawA = checkoutBody({ id: 'evt_order_a' });
  const signatureB = signBody(rawB);
  const signatureA = signBody(rawA);

  const firstB = await handle({ rawBody: rawB, signature: signatureB });
  const firstA = await handle({ rawBody: rawA, signature: signatureA });
  assert.equal(firstB.status, 200);
  assert.equal(firstA.status, 200);

  const before = await deadlocks();
  const concurrent = await Promise.all([
    handle({ rawBody: rawA, signature: signatureA }),
    handle({ rawBody: rawB, signature: signatureB }),
    handle({ rawBody: rawA, signature: signatureA }),
  ]);
  for (const response of concurrent) {
    const body = await response.text();
    assert.equal(response.status, 200, body);
  }
  assert.equal(await deadlocks(), before, 'zero deadlocks');

  const ids = await getPool().query<{ provider_event_id: string }>(
    `SELECT provider_event_id FROM billing_events ORDER BY provider_event_id`,
  );
  assert.deepEqual(
    ids.rows.map((row) => row.provider_event_id),
    ['evt_order_a', 'evt_order_b'],
  );
  assert.equal(await count('SELECT count(*)::int AS n FROM outbox'), 4);

  await drainUntilIdle();

  for (const eventId of ['evt_order_a', 'evt_order_b']) {
    for (const adapter of ['grant_credit', 'send_email']) {
      assert.equal(
        await count('SELECT count(*)::int AS n FROM adapter_invocations WHERE idempotency_key = $1', [
          `stripe|${eventId}|${adapter}`,
        ]),
        1,
      );
    }
  }
});

// Two Polar webhook-ids for two order.paid deliveries. This does not claim
// order.created is ordered before order.paid, and it is not a global total order (H5).
test('polar out-of-order + concurrent deliveries keep uniqueness and do not deadlock', async () => {
  const rawB = orderPaidBody({ orderId: 'ord_polar_b' });
  const rawA = orderPaidBody({ orderId: 'ord_polar_a' });
  const inputB = polarHandleInput(rawB, 'msg_polar_order_b');
  const inputA = polarHandleInput(rawA, 'msg_polar_order_a');

  const firstB = await handlePolar(inputB);
  const firstA = await handlePolar(inputA);
  assert.equal(firstB.status, 200);
  assert.equal(firstA.status, 200);

  const before = await deadlocks();
  const concurrent = await Promise.all([handlePolar(inputA), handlePolar(inputB), handlePolar(inputA)]);
  for (const response of concurrent) {
    const body = await response.text();
    assert.equal(response.status, 200, body);
  }
  assert.equal(await deadlocks(), before, 'zero deadlocks');

  const ids = await getPool().query<{ provider_event_id: string }>(
    `SELECT provider_event_id FROM billing_events WHERE provider = 'polar' ORDER BY provider_event_id`,
  );
  assert.deepEqual(
    ids.rows.map((row) => row.provider_event_id),
    ['msg_polar_order_a', 'msg_polar_order_b'],
  );
  assert.equal(await count(`SELECT count(*)::int AS n FROM outbox`), 4);

  await drainUntilIdle();

  for (const eventId of ['msg_polar_order_a', 'msg_polar_order_b']) {
    for (const adapter of ['grant_credit', 'send_email']) {
      assert.equal(
        await count('SELECT count(*)::int AS n FROM adapter_invocations WHERE idempotency_key = $1', [
          `polar|${eventId}|${adapter}`,
        ]),
        1,
      );
    }
  }
});
