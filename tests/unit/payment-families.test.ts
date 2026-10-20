import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getPool } from '../../src/db/pool.js';
import { handle } from '../../src/webhooks/stripe/handler.js';
import { configureAdapterMap, mapAdapters, validateAdapterMap } from '../../src/webhooks/stripe/mapAdapters.js';
import { signBody } from '../fixtures/stripe/sign.js';
import { count, drainUntilIdle, installDbHooks } from '../setup/harness.js';

installDbHooks();

// One subscription payment sends invoice.paid (invoice id) and payment_intent.succeeded
// (PaymentIntent id). An adapter mapped to both would run twice, so the map is refused; and a
// Checkout Session is keyed to whichever of the two the adapter is mapped to.
function stripeEvent(id: string, type: string, object: Record<string, unknown>): string {
  return JSON.stringify({ id, object: 'event', api_version: '2024-11-20.acacia', created: 1700000000, type, livemode: false, pending_webhooks: 1, data: { object } });
}
async function sendStripe(raw: string): Promise<void> {
  const r = await handle({ rawBody: raw, signature: signBody(raw) });
  assert.equal(r.status, 200, await r.text());
}
async function grantKeys(): Promise<string[]> {
  const r = await getPool().query<{ idempotency_key: string }>(`SELECT idempotency_key FROM outbox WHERE adapter = 'grant_credit' ORDER BY created_at`);
  return r.rows.map((x) => x.idempotency_key);
}
const grants = () => count(`SELECT count(*)::int AS n FROM adapter_invocations WHERE adapter = 'grant_credit'`);
const subSession = (extra: Record<string, unknown>) => ({ id: 'cs_sub', object: 'checkout.session', customer: 'cus_1', customer_email: 'b@example.com', amount_total: 8900, currency: 'usd', mode: 'subscription', payment_status: 'paid', payment_intent: null, invoice: 'in_sub', subscription: 'sub_1', ...extra });

test('a map with one adapter on both invoice.paid and payment_intent.succeeded is refused', () => {
  const before = mapAdapters('checkout.session.completed');
  assert.throws(
    () => configureAdapterMap({ 'invoice.paid': ['grant_credit'], 'payment_intent.succeeded': ['grant_credit', 'send_email'] }),
    /adapter "grant_credit" is mapped to both invoice\.paid and payment_intent\.succeeded.*would run twice/,
  );
  assert.throws(() => validateAdapterMap({ 'invoice.payment_succeeded': ['grant_credit'], 'charge.succeeded': ['grant_credit'] }), /both invoice\.payment_succeeded and charge\.succeeded/);
  assert.deepEqual(mapAdapters('checkout.session.completed'), before, 'a refused map leaves the previous one in place');
  assert.throws(() => validateAdapterMap({ 'invoice.paid': 'grant_credit' } as never), /must be a list of adapter names/);
});

test('different adapters on invoice.paid and payment_intent.succeeded are allowed', () => {
  assert.doesNotThrow(() => configureAdapterMap({ 'invoice.paid': ['grant_credit'], 'payment_intent.succeeded': ['send_email'] }));
});

test('PaymentIntent mapping: a paid subscription Checkout plus its payment_intent.succeeded grants once', async () => {
  configureAdapterMap({ 'checkout.session.completed': ['grant_credit', 'send_email'], 'payment_intent.succeeded': ['grant_credit'] });
  await sendStripe(stripeEvent('evt_f1_a', 'checkout.session.completed', subSession({})));
  await sendStripe(stripeEvent('evt_f1_b', 'payment_intent.succeeded', { id: 'pi_sub', object: 'payment_intent', customer: 'cus_1', amount: 8900, amount_received: 8900, currency: 'usd' }));
  assert.deepEqual(await grantKeys(), ['stripe|pay:pi_sub|grant_credit'], 'the session leaves the grant to its PaymentIntent');
  const email = await getPool().query<{ idempotency_key: string }>(`SELECT idempotency_key FROM outbox WHERE adapter = 'send_email'`);
  assert.deepEqual(email.rows.map((x) => x.idempotency_key), ['stripe|pay:in_sub|send_email'], 'adapters without a payment mapping still run on the session');
});

test('PaymentIntent mapping: a free subscription Checkout (no_payment_required) still grants', async () => {
  configureAdapterMap({ 'checkout.session.completed': ['grant_credit'], 'payment_intent.succeeded': ['grant_credit'] });
  await sendStripe(stripeEvent('evt_f2', 'checkout.session.completed', subSession({ id: 'cs_free', invoice: 'in_free', payment_status: 'no_payment_required', amount_total: 0 })));
  await drainUntilIdle();
  assert.equal(await grants(), 1);
});

test('invoice mapping: a one-time Checkout that created an invoice plus that invoice.paid grants once', async () => {
  configureAdapterMap({ 'checkout.session.completed': ['grant_credit'], 'invoice.paid': ['grant_credit'] });
  await sendStripe(stripeEvent('evt_f3_a', 'checkout.session.completed', subSession({ id: 'cs_inv', mode: 'payment', payment_intent: 'pi_inv', invoice: 'in_inv', subscription: null })));
  await sendStripe(stripeEvent('evt_f3_b', 'invoice.paid', { id: 'in_inv', object: 'invoice', customer: 'cus_1', amount_paid: 8900, currency: 'usd' }));
  assert.deepEqual(await grantKeys(), ['stripe|pay:in_inv|grant_credit']);
  await drainUntilIdle();
  assert.equal(await grants(), 1);
});

test('default map: a Checkout with both ids is still keyed by its PaymentIntent', async () => {
  await sendStripe(stripeEvent('evt_f4', 'checkout.session.completed', subSession({ id: 'cs_def', mode: 'payment', payment_intent: 'pi_def', invoice: 'in_def' })));
  assert.deepEqual(await grantKeys(), ['stripe|pay:pi_def|grant_credit']);
});

test('a repeating non-payment event (customer.subscription.updated) runs the adapter for every change', async () => {
  configureAdapterMap({ 'customer.subscription.updated': ['grant_credit'] });
  const sub = { id: 'sub_up', object: 'subscription', customer: 'cus_1', status: 'active' };
  await sendStripe(stripeEvent('evt_up_1', 'customer.subscription.updated', { ...sub, items: { data: [{ price: 'price_basic' }] } }));
  await sendStripe(stripeEvent('evt_up_2', 'customer.subscription.updated', { ...sub, items: { data: [{ price: 'price_pro' }] } }));
  await sendStripe(stripeEvent('evt_up_2', 'customer.subscription.updated', { ...sub, items: { data: [{ price: 'price_pro' }] } }));
  assert.deepEqual(await grantKeys(), [
    'stripe|customer.subscription.updated|sub_up|evt:evt_up_1|grant_credit',
    'stripe|customer.subscription.updated|sub_up|evt:evt_up_2|grant_credit',
  ], 'one row per event; the redelivered evt_up_2 queues nothing');
});
