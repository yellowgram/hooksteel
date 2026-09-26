import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handlePolar } from '../../src/webhooks/polar/handler.js';
import { handle } from '../../src/webhooks/stripe/handler.js';
import { orderPaidBody, polarHandleInput } from '../fixtures/polar/sign.js';
import { checkoutBody, signBody } from '../fixtures/stripe/sign.js';
import { count, drainUntilIdle, installDbHooks } from '../setup/harness.js';

installDbHooks();

test('duplicate delivery: same signed event 4× concurrent yields one row and one invocation per adapter', async () => {
  const rawBody = checkoutBody({ id: 'evt_dup_1' });
  const signature = signBody(rawBody);

  const responses = await Promise.all(
    Array.from({ length: 4 }, () => handle({ rawBody, signature })),
  );
  for (const response of responses) {
    const body = await response.text();
    assert.equal(response.status, 200, body);
  }

  assert.equal(await count('SELECT count(*)::int AS n FROM billing_events'), 1);
  assert.equal(await count('SELECT count(*)::int AS n FROM outbox'), 2);
  assert.equal(
    await count('SELECT count(*)::int AS n FROM adapter_invocations'),
    0,
    'adapters must not run inside the request',
  );

  await drainUntilIdle();

  assert.equal(await count('SELECT count(*)::int AS n FROM billing_events'), 1);
  for (const adapter of ['grant_credit', 'send_email']) {
    assert.equal(
      await count('SELECT count(*)::int AS n FROM adapter_invocations WHERE idempotency_key = $1', [
        `stripe|evt_dup_1|${adapter}`,
      ]),
      1,
      adapter,
    );
  }
});

test('polar duplicate delivery: same signed order.paid 4× concurrent yields one row and one invocation per adapter', async () => {
  const rawBody = orderPaidBody({ orderId: 'ord_polar_dup' });
  const input = polarHandleInput(rawBody, 'msg_polar_dup_1');

  const responses = await Promise.all(Array.from({ length: 4 }, () => handlePolar(input)));
  for (const response of responses) {
    const body = await response.text();
    assert.equal(response.status, 200, body);
  }

  assert.equal(
    await count(`SELECT count(*)::int AS n FROM billing_events WHERE provider = 'polar'`),
    1,
  );
  assert.equal(
    await count(
      `SELECT count(*)::int AS n FROM billing_events WHERE provider = 'polar' AND provider_event_id = 'msg_polar_dup_1'`,
    ),
    1,
  );
  assert.equal(await count('SELECT count(*)::int AS n FROM outbox'), 2);

  await drainUntilIdle();

  for (const adapter of ['grant_credit', 'send_email']) {
    assert.equal(
      await count('SELECT count(*)::int AS n FROM adapter_invocations WHERE idempotency_key = $1', [
        `polar|msg_polar_dup_1|${adapter}`,
      ]),
      1,
      adapter,
    );
  }
});
