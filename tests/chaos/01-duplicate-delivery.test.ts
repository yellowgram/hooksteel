import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getPool } from '../../src/db/pool.js';
import { handlePolar } from '../../src/webhooks/polar/handler.js';
import { configurePolarAdapterMap } from '../../src/webhooks/polar/mapAdapters.js';
import { handle } from '../../src/webhooks/stripe/handler.js';
import { configureAdapterMap } from '../../src/webhooks/stripe/mapAdapters.js';
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

// HS-1 (LaunchGate re-review R1-R5): one payment can arrive as events of different types.
// Fulfilment is keyed on the payment (PaymentIntent, invoice or session id), and an unpaid
// Checkout queues nothing.
function stripeEvent(id: string, type: string, object: Record<string, unknown>): string {
  return JSON.stringify({ id, object: 'event', api_version: '2024-11-20.acacia', created: 1700000000, type, livemode: false, pending_webhooks: 1, data: { object } });
}
async function sendStripe(raw: string): Promise<string> {
  const r = await handle({ rawBody: raw, signature: signBody(raw) });
  const body = await r.text();
  assert.equal(r.status, 200, body);
  return (JSON.parse(body) as { outcome: string }).outcome;
}
async function grantKeys(): Promise<string[]> {
  const r = await getPool().query<{ idempotency_key: string }>(`SELECT idempotency_key FROM outbox WHERE adapter = 'grant_credit' ORDER BY created_at`);
  return r.rows.map((x) => x.idempotency_key);
}
const session = (extra: Record<string, unknown>) => ({ id: 'cs_async_1', object: 'checkout.session', customer: 'cus_1', customer_email: 'b@example.com', amount_total: 8900, currency: 'usd', mode: 'payment', payment_intent: 'pi_1', ...extra });

test('R1: a delayed payment (completed while unpaid, then async_payment_succeeded) grants once, after payment', async () => {
  assert.equal(await sendStripe(stripeEvent('evt_r1_a', 'checkout.session.completed', session({ payment_status: 'unpaid' }))), 'awaiting_payment');
  assert.deepEqual(await grantKeys(), [], 'nothing is queued while the session is unpaid');
  assert.equal(await sendStripe(stripeEvent('evt_r1_b', 'checkout.session.async_payment_succeeded', session({ payment_status: 'paid' }))), 'outboxed');
  assert.deepEqual(await grantKeys(), ['stripe|pay:pi_1|grant_credit']);
  await drainUntilIdle();
  assert.equal(await count(`SELECT count(*)::int AS n FROM adapter_invocations WHERE adapter = 'grant_credit'`), 1);
});

test('an unpaid Checkout never grants, even with no async event to follow', async () => {
  assert.equal(await sendStripe(stripeEvent('evt_unpaid_only', 'checkout.session.completed', session({ id: 'cs_unpaid', payment_intent: 'pi_unpaid', payment_status: 'unpaid' }))), 'awaiting_payment');
  await drainUntilIdle();
  assert.equal(await count(`SELECT count(*)::int AS n FROM outbox`), 0);
  assert.equal(await count(`SELECT count(*)::int AS n FROM adapter_invocations`), 0);
});

test('R2: checkout.session.completed plus payment_intent.succeeded for one payment grants once', async () => {
  configureAdapterMap({ 'checkout.session.completed': ['grant_credit'], 'payment_intent.succeeded': ['grant_credit'] });
  await sendStripe(stripeEvent('evt_r2_a', 'checkout.session.completed', session({ id: 'cs_r2', payment_status: 'paid', payment_intent: 'pi_r2' })));
  await sendStripe(stripeEvent('evt_r2_b', 'payment_intent.succeeded', { id: 'pi_r2', object: 'payment_intent', customer: 'cus_1', amount: 8900, amount_received: 8900, currency: 'usd' }));
  assert.deepEqual(await grantKeys(), ['stripe|pay:pi_r2|grant_credit']);
  await drainUntilIdle();
  assert.equal(await count(`SELECT count(*)::int AS n FROM adapter_invocations WHERE adapter = 'grant_credit'`), 1);
});

test('R2b: the same pair in the other order (payment_intent.succeeded first) grants once', async () => {
  configureAdapterMap({ 'checkout.session.completed': ['grant_credit'], 'payment_intent.succeeded': ['grant_credit'] });
  await sendStripe(stripeEvent('evt_r2b_b', 'payment_intent.succeeded', { id: 'pi_r2b', object: 'payment_intent', customer: 'cus_1', amount: 8900, currency: 'usd' }));
  await sendStripe(stripeEvent('evt_r2b_a', 'checkout.session.completed', session({ id: 'cs_r2b', payment_status: 'paid', payment_intent: { id: 'pi_r2b', object: 'payment_intent' } })));
  assert.deepEqual(await grantKeys(), ['stripe|pay:pi_r2b|grant_credit']);
});

test('R3: a subscription Checkout plus its first invoice.paid grants once', async () => {
  configureAdapterMap({ 'checkout.session.completed': ['grant_credit'], 'invoice.paid': ['grant_credit'] });
  await sendStripe(stripeEvent('evt_r3_a', 'checkout.session.completed', session({ id: 'cs_r3', mode: 'subscription', payment_status: 'paid', invoice: 'in_r3', subscription: 'sub_r3', payment_intent: null })));
  await sendStripe(stripeEvent('evt_r3_b', 'invoice.paid', { id: 'in_r3', object: 'invoice', customer: 'cus_1', amount_paid: 8900, currency: 'usd', subscription: 'sub_r3', billing_reason: 'subscription_create' }));
  assert.deepEqual(await grantKeys(), ['stripe|pay:in_r3|grant_credit']);
  await drainUntilIdle();
  assert.equal(await count(`SELECT count(*)::int AS n FROM adapter_invocations WHERE adapter = 'grant_credit'`), 1);
});

test('R3b: a renewal invoice.paid (a different invoice) still grants', async () => {
  configureAdapterMap({ 'invoice.paid': ['grant_credit'] });
  await sendStripe(stripeEvent('evt_r3b_1', 'invoice.paid', { id: 'in_first', object: 'invoice', customer: 'cus_1', amount_paid: 8900, currency: 'usd' }));
  await sendStripe(stripeEvent('evt_r3b_2', 'invoice.paid', { id: 'in_renewal', object: 'invoice', customer: 'cus_1', amount_paid: 8900, currency: 'usd' }));
  assert.equal((await grantKeys()).length, 2);
});

test('R4: two Event objects of the same type for one session queue one grant', async () => {
  await sendStripe(stripeEvent('evt_r4_a', 'checkout.session.completed', session({ id: 'cs_r4', payment_status: 'paid' })));
  assert.equal(await sendStripe(stripeEvent('evt_r4_b', 'checkout.session.completed', session({ id: 'cs_r4', payment_status: 'paid' }))), 'outboxed');
  assert.equal((await grantKeys()).length, 1);
});

test('R5: an event without an object id falls back to the event id (no cross-event collapse)', async () => {
  configureAdapterMap({ 'x.custom': ['grant_credit'] });
  await sendStripe(stripeEvent('evt_r5_a', 'x.custom', { object: 'thing' }));
  await sendStripe(stripeEvent('evt_r5_b', 'x.custom', { object: 'thing' }));
  assert.equal((await grantKeys()).length, 2);
});

test('polar: order.created plus order.paid for one order grants once; an unpaid order grants nothing', async () => {
  configurePolarAdapterMap({ 'order.created': ['grant_credit'], 'order.paid': ['grant_credit'] });
  const pending = orderPaidBody({ type: 'order.created', orderId: 'ord_pending', paid: false, status: 'pending' });
  assert.equal((await handlePolar(polarHandleInput(pending, 'msg_pending'))).status, 200);
  assert.deepEqual(await grantKeys(), []);
  const created = orderPaidBody({ type: 'order.created', orderId: 'ord_two', paid: true, status: 'paid' });
  const paid = orderPaidBody({ type: 'order.paid', orderId: 'ord_two' });
  assert.equal((await handlePolar(polarHandleInput(created, 'msg_two_a'))).status, 200);
  assert.equal((await handlePolar(polarHandleInput(paid, 'msg_two_b'))).status, 200);
  assert.deepEqual(await grantKeys(), [polarKey('ord_two', 'grant_credit')]);
});

