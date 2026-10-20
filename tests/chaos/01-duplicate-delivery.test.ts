import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handlePolar } from '../../src/webhooks/polar/handler.js';
import { handle } from '../../src/webhooks/stripe/handler.js';
import { orderPaidBody, polarHandleInput, polarKey } from '../fixtures/polar/sign.js';
import { checkoutBody, signBody, stripeKey } from '../fixtures/stripe/sign.js';
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
        `${stripeKey('evt_dup_1', adapter)}`,
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
        `${polarKey('ord_polar_dup', adapter)}`,
      ]),
      1,
      adapter,
    );
  }
});

test('two different events for one checkout session fulfil it once', async () => {
  // Stripe: "In some cases, two separate Event objects are generated and sent" for one change.
  for (const id of ['evt_dupobj_A', 'evt_dupobj_B']) {
    const raw = checkoutBody({ id, sessionId: 'cs_dupobj' });
    assert.equal((await handle({ rawBody: raw, signature: signBody(raw) })).status, 200);
  }
  assert.equal(await count(`SELECT count(*)::int AS n FROM billing_events`), 2, 'both events are recorded');
  assert.equal(await count(`SELECT count(*)::int AS n FROM outbox WHERE adapter = 'grant_credit'`), 1);
  await drainUntilIdle();
  assert.equal(
    await count('SELECT count(*)::int AS n FROM adapter_invocations WHERE idempotency_key = $1', [
      stripeKey('evt_dupobj_A', 'grant_credit', 'checkout.session.completed', 'cs_dupobj'),
    ]),
    1,
  );
  assert.equal(await count(`SELECT count(*)::int AS n FROM adapter_invocations`), 2, 'one grant_credit and one send_email');
  // The second event has nothing to drain, so it is closed rather than left pending.
  assert.equal(await count(`SELECT count(*)::int AS n FROM billing_events WHERE processed_at IS NULL`), 0);
});

test('polar: two webhook deliveries with different ids for one order fulfil it once', async () => {
  const rawBody = orderPaidBody({ orderId: 'ord_dupobj' });
  for (const id of ['msg_dupobj_A', 'msg_dupobj_B']) {
    assert.equal((await handlePolar(polarHandleInput(rawBody, id))).status, 200);
  }
  assert.equal(await count(`SELECT count(*)::int AS n FROM outbox WHERE adapter = 'grant_credit'`), 1);
  await drainUntilIdle();
  assert.equal(await count(`SELECT count(*)::int AS n FROM adapter_invocations`), 2);
});
