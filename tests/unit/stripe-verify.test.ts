import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { recordTestInvocation } from '../../src/adapters/testInvocation.js';
import { getPool } from '../../src/db/pool.js';
import { drainOnce } from '../../src/outbox/drain.js';
import {
  DEFAULT_ADAPTER_MAP,
  configureAdapterMap,
  mapAdapters,
} from '../../src/webhooks/stripe/mapAdapters.js';
import { handle } from '../../src/webhooks/stripe/handler.js';
import { buildOutboxPayload } from '../../src/webhooks/stripe/payload.js';
import { checkoutBody, signBody } from '../fixtures/stripe/sign.js';
import { count, drainUntilIdle, installDbHooks, TEST_WEBHOOK_SECRET } from '../setup/harness.js';

installDbHooks();

test('verify uses constructEvent and does not hand-roll HMAC', () => {
  const src = readFileSync(new URL('../../src/webhooks/stripe/verify.ts', import.meta.url), 'utf8');
  assert.match(src, /constructEvent/);
  assert.doesNotMatch(src, /createHmac/);
  assert.doesNotMatch(src, /timingSafeEqual/);
  assert.doesNotMatch(src, /startsWith\('sk_/);
  assert.doesNotMatch(src, /sk_test_/);
  assert.doesNotMatch(src, /sk_live_/);
});

test('default map keeps invoice.paid and subscription.deleted empty; invite_github is opt-in', () => {
  assert.deepEqual(mapAdapters('checkout.session.completed'), ['grant_credit', 'send_email']);
  assert.deepEqual(mapAdapters('checkout.session.async_payment_succeeded'), ['grant_credit', 'send_email']);
  assert.deepEqual(mapAdapters('invoice.paid'), []);
  assert.deepEqual(mapAdapters('customer.subscription.deleted'), []);
  assert.deepEqual(mapAdapters('invite_github'), []);
  assert.equal(DEFAULT_ADAPTER_MAP['invoice.paid']?.length, 0);
});

test('placeholder, missing, and non-whsec secrets are 400 and store nothing', async () => {
  const rawBody = checkoutBody({ id: 'evt_secret' });
  const signature = signBody(rawBody);
  for (const secret of ['', 'whsec_replace_me', 'replace_me', 'changeme', 'test', 'sk_test_not_a_webhook']) {
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    const response = await handle({ rawBody, signature: secret === '' ? signature : signBody(rawBody, secret || 'x') });
    assert.equal(response.status, 400, secret || '(empty)');
    const body = await response.json();
    assert.equal(body.error, 'invalid_webhook_secret');
  }
  process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
  const missing = await handle({ rawBody, signature: null });
  assert.equal(missing.status, 400);
  assert.equal((await missing.json()).error, 'invalid_signature');
  assert.equal(await count('SELECT count(*)::int AS n FROM billing_events'), 0);
});

test('livemode mismatch is 400 and a matching expect flag accepts the event', async () => {
  const liveBody = checkoutBody({ id: 'evt_live', livemode: true });
  const liveSig = signBody(liveBody);
  const mismatch = await handle({ rawBody: liveBody, signature: liveSig });
  assert.equal(mismatch.status, 400);
  assert.equal((await mismatch.json()).error, 'livemode_mismatch');
  assert.equal(await count('SELECT count(*)::int AS n FROM billing_events'), 0);

  process.env.STRIPE_EXPECT_LIVEMODE = 'true';
  const accepted = await handle({ rawBody: liveBody, signature: liveSig });
  assert.equal(accepted.status, 200);
  assert.equal((await accepted.json()).outcome, 'outboxed');
});

test('empty adapter map persists ignored with zero outbox rows', async () => {
  const rawBody = checkoutBody({ id: 'evt_invoice', type: 'invoice.paid' });
  const response = await handle({ rawBody, signature: signBody(rawBody) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).outcome, 'ignored');
  const row = await getPool().query<{ status: string }>(
    `SELECT status FROM billing_events WHERE provider_event_id = 'evt_invoice'`,
  );
  assert.equal(row.rows[0]?.status, 'ignored');
  const processed = await getPool().query<{ processed_at: Date | null }>(
    `SELECT processed_at FROM billing_events WHERE provider_event_id = 'evt_invoice'`,
  );
  assert.ok(processed.rows[0]?.processed_at);
  assert.equal(await count('SELECT count(*)::int AS n FROM outbox'), 0);

  const deleted = checkoutBody({ id: 'evt_deleted', type: 'customer.subscription.deleted' });
  const deletedResponse = await handle({ rawBody: deleted, signature: signBody(deleted) });
  assert.equal(deletedResponse.status, 200);
  assert.equal((await deletedResponse.json()).outcome, 'ignored');
});

test('invoice.paid can be opted in to grant_credit', async () => {
  configureAdapterMap({
    ...DEFAULT_ADAPTER_MAP,
    'invoice.paid': ['grant_credit'],
  });
  const rawBody = JSON.stringify({
    id: 'evt_invoice_optin',
    object: 'event',
    type: 'invoice.paid',
    livemode: false,
    data: {
      object: {
        id: 'in_optin',
        object: 'invoice',
        customer: 'cus_optin',
        customer_email: 'optin@example.com',
        amount_paid: 1200,
        currency: 'usd',
      },
    },
  });
  const response = await handle({ rawBody, signature: signBody(rawBody) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).outcome, 'outboxed');
  const payload = await getPool().query<{ payload: { invoice_id: string; amount_paid: number } }>(
    `SELECT payload FROM outbox WHERE idempotency_key = 'stripe|evt_invoice_optin|grant_credit'`,
  );
  assert.equal(payload.rows[0]?.payload.invoice_id, 'in_optin');
  assert.equal(payload.rows[0]?.payload.amount_paid, 1200);
});

test('send_email missing customer_email completes as skipped_no_email', async () => {
  const rawBody = checkoutBody({ id: 'evt_no_email', customer_email: null });
  const response = await handle({ rawBody, signature: signBody(rawBody) });
  assert.equal(response.status, 200);
  await drainUntilIdle();

  const email = await getPool().query<{ last_error: string | null; completed_at: Date | null }>(
    `SELECT last_error, completed_at FROM outbox WHERE idempotency_key = 'stripe|evt_no_email|send_email'`,
  );
  assert.equal(email.rows[0]?.last_error, 'skipped_no_email');
  assert.ok(email.rows[0]?.completed_at);
  assert.equal(
    await count('SELECT count(*)::int AS n FROM adapter_invocations WHERE adapter = $1', ['send_email']),
    0,
  );
  assert.equal(
    await count('SELECT count(*)::int AS n FROM adapter_invocations WHERE idempotency_key = $1', [
      'stripe|evt_no_email|grant_credit',
    ]),
    1,
  );
  assert.equal(await count('SELECT count(*)::int AS n FROM dead_letters'), 0);
  assert.equal(await drainOnce(), 0);
});

test('outbox payload copies Connect account and omits it when absent', () => {
  const withAccount = buildOutboxPayload({
    id: 'evt_acct',
    object: 'event',
    type: 'checkout.session.completed',
    livemode: false,
    account: 'acct_123',
    data: {
      object: {
        id: 'cs_acct',
        customer: 'cus_acct',
        customer_email: 'a@b.c',
        amount_total: 100,
        currency: 'usd',
        payment_status: 'paid',
        mode: 'payment',
      },
    },
  } as never);
  assert.equal(withAccount.account, 'acct_123');
  assert.equal(withAccount.session_id, 'cs_acct');

  const without = buildOutboxPayload({
    id: 'evt_no_acct',
    object: 'event',
    type: 'invoice.paid',
    livemode: false,
    data: { object: { id: 'in_1', customer: 'cus_1', amount_paid: 50, currency: 'usd' } },
  } as never);
  assert.equal(without.account, null);
});

test('invocation log stays off unless NODE_ENV=test or HOOKSTEEL_RECORD_INVOCATIONS=true', async () => {
  const previousNode = process.env.NODE_ENV;
  const previousFlag = process.env.HOOKSTEEL_RECORD_INVOCATIONS;
  try {
    process.env.NODE_ENV = 'development';
    delete process.env.HOOKSTEEL_RECORD_INVOCATIONS;
    await recordTestInvocation('stripe|evt_gate|grant_credit', 'grant_credit');
    assert.equal(await count('SELECT count(*)::int AS n FROM adapter_invocations'), 0);

    process.env.NODE_ENV = 'production';
    await recordTestInvocation('stripe|evt_gate|grant_credit', 'grant_credit');
    assert.equal(await count('SELECT count(*)::int AS n FROM adapter_invocations'), 0);

    process.env.HOOKSTEEL_RECORD_INVOCATIONS = 'true';
    await recordTestInvocation('stripe|evt_gate|grant_credit', 'grant_credit');
    assert.equal(
      await count('SELECT count(*)::int AS n FROM adapter_invocations WHERE idempotency_key = $1', [
        'stripe|evt_gate|grant_credit',
      ]),
      1,
    );
  } finally {
    if (previousNode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNode;
    if (previousFlag === undefined) delete process.env.HOOKSTEEL_RECORD_INVOCATIONS;
    else process.env.HOOKSTEEL_RECORD_INVOCATIONS = previousFlag;
  }
});
