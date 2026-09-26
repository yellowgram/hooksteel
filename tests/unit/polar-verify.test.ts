import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { getPool } from '../../src/db/pool.js';
import {
  DEFAULT_POLAR_ADAPTER_MAP,
  configurePolarAdapterMap,
  mapPolarAdapters,
} from '../../src/webhooks/polar/mapAdapters.js';
import { handlePolar, type PolarHandleInput } from '../../src/webhooks/polar/handler.js';
import { buildPolarOutboxPayload } from '../../src/webhooks/polar/payload.js';
import { strictBase64 } from '../../src/webhooks/polar/verify.js';
import { orderPaidBody, signPolar, type PolarSignScheme } from '../fixtures/polar/sign.js';
import { POLAR_TEST_WEBHOOK_SECRET } from '../fixtures/polar/secrets.js';
import { count, drainUntilIdle, installDbHooks } from '../setup/harness.js';

installDbHooks();

const OTHER_SECRET = 'whsec_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

function delivery(
  rawBody: string,
  options: {
    scheme?: PolarSignScheme;
    webhookId?: string;
    webhookTimestamp?: string;
    secret?: string;
  } = {},
): PolarHandleInput {
  const signed = signPolar({ rawBody, ...options });
  return {
    rawBody,
    webhookId: signed.webhookId,
    webhookTimestamp: signed.webhookTimestamp,
    webhookSignature: signed.webhookSignature,
  };
}

async function post(input: PolarHandleInput) {
  const response = await handlePolar(input);
  const body = (await response.json()) as { ok: boolean; error?: string; outcome?: string };
  return { response, body };
}

test('verify uses node:crypto dual-key HMAC and does not import a webhook SDK', () => {
  const src = readFileSync(new URL('../../src/webhooks/polar/verify.ts', import.meta.url), 'utf8');
  assert.match(src, /createHmac/);
  assert.match(src, /timingSafeEqual/);
  assert.doesNotMatch(src, /@polar-sh\/sdk/);
  assert.doesNotMatch(src, /standardwebhooks/);
  assert.doesNotMatch(src, /svix/);
  assert.equal(strictBase64('@@@'), null);
  assert.equal(Buffer.from(strictBase64('YQ==') ?? new Uint8Array()).toString('utf8'), 'a');
  assert.equal(strictBase64('aG9v aQ=='), null);
});

test('default map grants only order.paid; invite_github stays opt-in', () => {
  assert.deepEqual(mapPolarAdapters('order.paid'), ['grant_credit', 'send_email']);
  for (const type of [
    'order.created',
    'order.updated',
    'order.refunded',
    'checkout.created',
    'checkout.updated',
    'checkout.expired',
    'subscription.canceled',
    'subscription.revoked',
    'benefit.granted',
  ]) {
    assert.deepEqual(mapPolarAdapters(type), [], type);
  }
  for (const names of Object.values(DEFAULT_POLAR_ADAPTER_MAP)) {
    assert.equal(names.includes('invite_github'), false);
  }
});

test('both HMAC eras accept the same body and secret', async () => {
  const rawBody = orderPaidBody({ orderId: 'ord_both_eras' });
  const fixedTimestamp = String(Math.floor(Date.now() / 1000));
  const polarHmac = signPolar({
    rawBody,
    scheme: 'polar_hmac',
    webhookId: 'msg_era_compare',
    webhookTimestamp: fixedTimestamp,
  });
  const standard = signPolar({
    rawBody,
    scheme: 'standard_webhooks',
    webhookId: 'msg_era_compare',
    webhookTimestamp: fixedTimestamp,
  });
  assert.notEqual(polarHmac.webhookSignature, standard.webhookSignature);

  for (const scheme of ['polar_hmac', 'standard_webhooks'] as const) {
    const { response, body } = await post(
      delivery(rawBody, { scheme, webhookId: `msg_era_${scheme}` }),
    );
    assert.equal(response.status, 200, `${scheme} ${JSON.stringify(body)}`);
    assert.equal(body.outcome, 'outboxed', scheme);
  }
  assert.equal(await count(`SELECT count(*)::int AS n FROM billing_events WHERE provider = 'polar'`), 2);
});

test('utf8-only secret still accepts the polar_hmac key', async () => {
  process.env.POLAR_WEBHOOK_SECRET = 'whsec_not-valid-base64';
  const rawBody = orderPaidBody({ orderId: 'ord_utf8_only' });
  const { response, body } = await post(
    delivery(rawBody, {
      scheme: 'polar_hmac',
      secret: 'whsec_not-valid-base64',
      webhookId: 'msg_utf8_only',
    }),
  );
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.outcome, 'outboxed');
});

test('bad signature, bad timestamp, and dotted webhook-id are 400 and store nothing', async () => {
  const rawBody = orderPaidBody({ orderId: 'ord_bad_sig' });
  const cases: Array<{ label: string; input: PolarHandleInput }> = [];

  const wrong = delivery(rawBody, {
    scheme: 'standard_webhooks',
    secret: OTHER_SECRET,
    webhookId: 'msg_wrong_key',
  });
  cases.push({ label: 'wrong key', input: wrong });

  const polarWrong = delivery(rawBody, {
    scheme: 'polar_hmac',
    secret: OTHER_SECRET,
    webhookId: 'msg_wrong_polar_hmac',
  });
  cases.push({ label: 'wrong polar_hmac key', input: polarWrong });

  const intact = delivery(rawBody, { scheme: 'polar_hmac', webhookId: 'msg_tamper_unit' });
  const index = 24;
  const flipped = rawBody[index] === 'a' ? 'b' : 'a';
  cases.push({
    label: 'tamper',
    input: {
      ...intact,
      rawBody: rawBody.slice(0, index) + flipped + rawBody.slice(index + 1),
    },
  });

  const missingBase = delivery(rawBody, { webhookId: 'msg_missing_header' });
  cases.push({ label: 'missing id', input: { ...missingBase, webhookId: null } });
  cases.push({ label: 'missing timestamp', input: { ...missingBase, webhookTimestamp: null } });
  cases.push({ label: 'missing signature', input: { ...missingBase, webhookSignature: '' } });

  const nonInteger = signPolar({
    rawBody,
    webhookId: 'msg_float_ts',
    webhookTimestamp: '1700000000.0',
    scheme: 'standard_webhooks',
  });
  cases.push({
    label: 'non-integer timestamp',
    input: {
      rawBody,
      webhookId: nonInteger.webhookId,
      webhookTimestamp: nonInteger.webhookTimestamp,
      webhookSignature: nonInteger.webhookSignature,
    },
  });

  const now = Math.floor(Date.now() / 1000);
  for (const [label, webhookTimestamp, webhookId] of [
    ['timestamp older than 300s', String(now - 301), 'msg_too_old'],
    ['timestamp more than 300s ahead', String(now + 301), 'msg_too_new'],
  ] as const) {
    const signed = signPolar({
      rawBody,
      webhookId,
      webhookTimestamp,
      scheme: 'standard_webhooks',
    });
    cases.push({
      label,
      input: {
        rawBody,
        webhookId: signed.webhookId,
        webhookTimestamp: signed.webhookTimestamp,
        webhookSignature: signed.webhookSignature,
      },
    });
  }

  const dotted = signPolar({
    rawBody,
    webhookId: 'msg.dotted',
    scheme: 'polar_hmac',
  });
  cases.push({
    label: 'webhook-id contains dot',
    input: {
      rawBody,
      webhookId: dotted.webhookId,
      webhookTimestamp: dotted.webhookTimestamp,
      webhookSignature: dotted.webhookSignature,
    },
  });

  const v1a = delivery(rawBody, { scheme: 'standard_webhooks', webhookId: 'msg_v1a_only' });
  cases.push({
    label: 'v1a token',
    input: { ...v1a, webhookSignature: v1a.webhookSignature!.replace(/^v1,/, 'v1a,') },
  });

  for (const entry of cases) {
    const { response, body } = await post(entry.input);
    assert.equal(response.status, 400, `${entry.label} ${JSON.stringify(body)}`);
    assert.equal(body.error, 'invalid_signature', entry.label);
  }
  assert.equal(await count('SELECT count(*)::int AS n FROM billing_events'), 0);
  assert.equal(await count('SELECT count(*)::int AS n FROM outbox'), 0);
});

test('a valid v1 token still accepts when another version is present', async () => {
  const rawBody = orderPaidBody({ orderId: 'ord_rotation' });
  const input = delivery(rawBody, { scheme: 'standard_webhooks', webhookId: 'msg_rotation' });
  const { response, body } = await post({
    ...input,
    webhookSignature: `v1a,not-a-signature ${input.webhookSignature}`,
  });
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.outcome, 'outboxed');
});

test('placeholder, empty, and non-whsec secrets are 400 and store nothing', async () => {
  const rawBody = orderPaidBody({ orderId: 'ord_secret' });
  const secrets = ['', 'whsec_replace_me', 'replace_me', 'changeme', 'test', 'polar_whs_example_secret', 'sk_test_not_a_webhook'];
  for (const secret of secrets) {
    process.env.POLAR_WEBHOOK_SECRET = secret;
    const signed = signPolar({
      rawBody,
      secret: secret.startsWith('whsec_') && secret !== 'whsec_replace_me' ? secret : POLAR_TEST_WEBHOOK_SECRET,
      scheme: 'polar_hmac',
      webhookId: `msg_secret_${secrets.indexOf(secret)}`,
    });
    const { response, body } = await post({
      rawBody,
      webhookId: signed.webhookId,
      webhookTimestamp: signed.webhookTimestamp,
      webhookSignature: signed.webhookSignature,
    });
    assert.equal(response.status, 400, `${secret || '(empty)'} ${JSON.stringify(body)}`);
    assert.equal(body.error, 'invalid_webhook_secret', secret || '(empty)');
  }
  delete process.env.POLAR_WEBHOOK_SECRET;
  const missing = await post(delivery(rawBody, { webhookId: 'msg_secret_unset' }));
  assert.equal(missing.response.status, 400);
  assert.equal(missing.body.error, 'invalid_webhook_secret');
  assert.equal(await count('SELECT count(*)::int AS n FROM billing_events'), 0);
});

test('valid signature over a non-object body is invalid_payload and stores nothing', async () => {
  const bodies = ['not-json', '[]', 'null', '{"type":1}', '{"nope":true}', '"order.paid"'];
  for (const [index, rawBody] of bodies.entries()) {
    const { response, body } = await post(
      delivery(rawBody, { scheme: 'standard_webhooks', webhookId: `msg_payload_${index}` }),
    );
    assert.equal(response.status, 400, `${rawBody} ${JSON.stringify(body)}`);
    assert.equal(body.error, 'invalid_payload', rawBody);
  }
  assert.equal(await count('SELECT count(*)::int AS n FROM billing_events'), 0);
});

test('same order id with two webhook ids stores two rows; a repeated webhook id is a duplicate', async () => {
  const created = orderPaidBody({ type: 'order.created', orderId: 'ord_shared' });
  const paid = orderPaidBody({ type: 'order.paid', orderId: 'ord_shared' });
  const first = await post(delivery(created, { scheme: 'polar_hmac', webhookId: 'msg_shared_created' }));
  const second = await post(delivery(paid, { scheme: 'standard_webhooks', webhookId: 'msg_shared_paid' }));
  assert.equal(first.body.outcome, 'ignored');
  assert.equal(second.body.outcome, 'outboxed');

  const ids = await getPool().query<{ provider_event_id: string }>(
    `SELECT provider_event_id FROM billing_events WHERE provider = 'polar' ORDER BY provider_event_id`,
  );
  assert.deepEqual(
    ids.rows.map((row) => row.provider_event_id),
    ['msg_shared_created', 'msg_shared_paid'],
  );

  const replay = await post(delivery(paid, { scheme: 'standard_webhooks', webhookId: 'msg_shared_paid' }));
  assert.equal(replay.response.status, 200);
  assert.equal(replay.body.outcome, 'duplicate');
  assert.equal(await count(`SELECT count(*)::int AS n FROM billing_events WHERE provider = 'polar'`), 2);
  assert.equal(await count('SELECT count(*)::int AS n FROM outbox'), 2);
});

test('order.paid outboxes normalized amount_total including subscription_cycle and zero', async () => {
  const paid = orderPaidBody({ orderId: 'ord_paid_norm' });
  const accepted = await post(delivery(paid, { scheme: 'standard_webhooks', webhookId: 'msg_paid_norm' }));
  assert.equal(accepted.body.outcome, 'outboxed');
  const payload = await getPool().query<{
    payload: { amount_total: number; customer: string; order_id: string; billing_reason: string };
  }>(`SELECT payload FROM outbox WHERE idempotency_key = 'polar|msg_paid_norm|grant_credit'`);
  assert.equal(payload.rows[0]?.payload.amount_total, 8900);
  assert.equal(payload.rows[0]?.payload.order_id, 'ord_paid_norm');
  assert.equal(payload.rows[0]?.payload.customer, '8f1c2a10-0000-4000-8000-000000000001');
  assert.equal(payload.rows[0]?.payload.billing_reason, 'purchase');
  assert.equal(
    await count('SELECT count(*)::int AS n FROM outbox WHERE idempotency_key = $1', [
      'polar|msg_paid_norm|send_email',
    ]),
    1,
  );
  const stored = await getPool().query<{ provider_event_id: string; payload: { data: { id: string } } }>(
    `SELECT provider_event_id, payload FROM billing_events WHERE provider_event_id = 'msg_paid_norm'`,
  );
  assert.equal(stored.rows[0]?.provider_event_id, 'msg_paid_norm');
  assert.equal(stored.rows[0]?.payload.data.id, 'ord_paid_norm');

  const renewal = orderPaidBody({
    orderId: 'ord_cycle',
    billingReason: 'subscription_cycle',
  });
  const renewalResult = await post(
    delivery(renewal, { scheme: 'polar_hmac', webhookId: 'msg_cycle' }),
  );
  assert.equal(renewalResult.body.outcome, 'outboxed');
  const cycle = await getPool().query<{ payload: { billing_reason: string; amount_total: number } }>(
    `SELECT payload FROM outbox WHERE idempotency_key = 'polar|msg_cycle|grant_credit'`,
  );
  assert.equal(cycle.rows[0]?.payload.billing_reason, 'subscription_cycle');
  assert.equal(cycle.rows[0]?.payload.amount_total, 8900);

  const free = orderPaidBody({ orderId: 'ord_free', totalAmount: 0 });
  const freeResult = await post(delivery(free, { scheme: 'standard_webhooks', webhookId: 'msg_free' }));
  assert.equal(freeResult.body.outcome, 'outboxed');
  await drainUntilIdle();
  assert.equal(
    await count('SELECT count(*)::int AS n FROM adapter_invocations WHERE idempotency_key = $1', [
      'polar|msg_free|grant_credit',
    ]),
    1,
  );
});

test('order.updated is ignored with processed_at and zero outbox', async () => {
  const rawBody = orderPaidBody({ type: 'order.updated', orderId: 'ord_updated' });
  const { response, body } = await post(
    delivery(rawBody, { scheme: 'standard_webhooks', webhookId: 'msg_updated' }),
  );
  assert.equal(response.status, 200);
  assert.equal(body.outcome, 'ignored');
  const row = await getPool().query<{ status: string; processed_at: Date | null }>(
    `SELECT status, processed_at FROM billing_events WHERE provider_event_id = 'msg_updated'`,
  );
  assert.equal(row.rows[0]?.status, 'ignored');
  assert.ok(row.rows[0]?.processed_at);
  assert.equal(await count('SELECT count(*)::int AS n FROM outbox'), 0);
});

test('null customer email skips send_email and still grants credit once', async () => {
  const rawBody = orderPaidBody({ orderId: 'ord_no_email', customerEmail: null });
  const { response } = await post(delivery(rawBody, { scheme: 'polar_hmac', webhookId: 'msg_no_email' }));
  assert.equal(response.status, 200);
  await drainUntilIdle();

  const email = await getPool().query<{ last_error: string | null; completed_at: Date | null }>(
    `SELECT last_error, completed_at FROM outbox WHERE idempotency_key = 'polar|msg_no_email|send_email'`,
  );
  assert.equal(email.rows[0]?.last_error, 'skipped_no_email');
  assert.ok(email.rows[0]?.completed_at);
  assert.equal(
    await count('SELECT count(*)::int AS n FROM adapter_invocations WHERE idempotency_key = $1', [
      'polar|msg_no_email|grant_credit',
    ]),
    1,
  );
  assert.equal(
    await count('SELECT count(*)::int AS n FROM adapter_invocations WHERE adapter = $1', ['send_email']),
    0,
  );
  assert.equal(await count('SELECT count(*)::int AS n FROM dead_letters'), 0);
});

test('livemode is the operator flag and never a mismatch 400', async () => {
  const rawBody = orderPaidBody({ orderId: 'ord_live_flag' });
  delete process.env.POLAR_EXPECT_LIVEMODE;
  const unset = await post(delivery(rawBody, { webhookId: 'msg_live_unset' }));
  assert.equal(unset.response.status, 200, JSON.stringify(unset.body));

  process.env.POLAR_EXPECT_LIVEMODE = 'true';
  const enabled = await post(delivery(rawBody, { webhookId: 'msg_live_true', scheme: 'polar_hmac' }));
  assert.equal(enabled.response.status, 200);

  process.env.POLAR_EXPECT_LIVEMODE = '1';
  const one = await post(delivery(rawBody, { webhookId: 'msg_live_one' }));
  assert.equal(one.response.status, 200);

  process.env.POLAR_EXPECT_LIVEMODE = 'yes';
  const other = await post(delivery(rawBody, { webhookId: 'msg_live_yes', scheme: 'polar_hmac' }));
  assert.equal(other.response.status, 200);

  process.env.POLAR_EXPECT_LIVEMODE = '';
  const empty = await post(delivery(rawBody, { webhookId: 'msg_live_empty' }));
  assert.equal(empty.response.status, 200);

  const rows = await getPool().query<{ provider_event_id: string; livemode: boolean }>(
    `SELECT provider_event_id, livemode FROM billing_events WHERE provider = 'polar' ORDER BY provider_event_id`,
  );
  const byId = new Map(rows.rows.map((row) => [row.provider_event_id, row.livemode]));
  assert.equal(byId.get('msg_live_unset'), false);
  assert.equal(byId.get('msg_live_true'), true);
  assert.equal(byId.get('msg_live_one'), true);
  assert.equal(byId.get('msg_live_yes'), false);
  assert.equal(byId.get('msg_live_empty'), false);
});

test('checkout opt-in payload and other types expose object_id only', async () => {
  assert.deepEqual(
    buildPolarOutboxPayload({
      type: 'checkout.updated',
      data: {
        id: 'chk_1',
        customer_id: 'cus_chk',
        customer: { email: 'a@b.c' },
        total_amount: 10,
        currency: 'usd',
        status: 'succeeded',
      },
    }),
    {
      checkout_id: 'chk_1',
      customer: 'cus_chk',
      customer_email: 'a@b.c',
      amount_total: 10,
      currency: 'usd',
      status: 'succeeded',
    },
  );
  assert.deepEqual(buildPolarOutboxPayload({ type: 'subscription.canceled', data: { id: 'sub_1' } }), {
    object_id: 'sub_1',
  });
  assert.equal(
    buildPolarOutboxPayload({
      type: 'order.paid',
      data: { id: 'ord_zero', customer_id: 'cus_z', total_amount: 0, currency: 'usd', paid: false },
    }).amount_total,
    0,
  );

  configurePolarAdapterMap({
    ...DEFAULT_POLAR_ADAPTER_MAP,
    'checkout.updated': ['grant_credit'],
  });
  const rawBody = orderPaidBody({ type: 'checkout.updated', orderId: 'chk_opt', totalAmount: 500 });
  const { body } = await post(delivery(rawBody, { webhookId: 'msg_chk_opt', scheme: 'standard_webhooks' }));
  assert.equal(body.outcome, 'outboxed');
  const stored = await getPool().query<{ payload: { checkout_id: string; amount_total: number } }>(
    `SELECT payload FROM outbox WHERE idempotency_key = 'polar|msg_chk_opt|grant_credit'`,
  );
  assert.equal(stored.rows[0]?.payload.checkout_id, 'chk_opt');
  assert.equal(stored.rows[0]?.payload.amount_total, 500);
});

test('production ignores beforeCommit even when ALLOW_CHAOS_INJECT is set', async () => {
  const previousNode = process.env.NODE_ENV;
  const previousAllow = process.env.ALLOW_CHAOS_INJECT;
  try {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_CHAOS_INJECT = 'true';
    let called = false;
    const rawBody = orderPaidBody({ orderId: 'ord_prod_gate' });
    const input = delivery(rawBody, { scheme: 'standard_webhooks', webhookId: 'msg_prod_gate' });
    const response = await handlePolar(input, {
      beforeCommit: () => {
        called = true;
        throw new Error('chaos_should_not_run');
      },
    });
    const body = (await response.json()) as { outcome?: string; error?: string };
    assert.equal(called, false);
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.outcome, 'outboxed');
  } finally {
    if (previousNode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNode;
    if (previousAllow === undefined) delete process.env.ALLOW_CHAOS_INJECT;
    else process.env.ALLOW_CHAOS_INJECT = previousAllow;
  }
});
