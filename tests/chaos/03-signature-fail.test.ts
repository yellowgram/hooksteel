import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handlePolar } from '../../src/webhooks/polar/handler.js';
import { handle } from '../../src/webhooks/stripe/handler.js';
import { orderPaidBody, polarHandleInput, signPolar } from '../fixtures/polar/sign.js';
import { checkoutBody, signBody } from '../fixtures/stripe/sign.js';
import { count, installDbHooks } from '../setup/harness.js';

installDbHooks();

test('tampered body is 400 and stores nothing', async () => {
  const rawBody = checkoutBody({ id: 'evt_tamper_1' });
  const signature = signBody(rawBody);
  const index = 24;
  const flipped = rawBody[index] === 'a' ? 'b' : 'a';
  const tampered = rawBody.slice(0, index) + flipped + rawBody.slice(index + 1);
  assert.notEqual(tampered, rawBody);

  const response = await handle({ rawBody: tampered, signature });
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.error, 'invalid_signature');
  assert.equal(await count('SELECT count(*)::int AS n FROM billing_events'), 0);
  assert.equal(await count('SELECT count(*)::int AS n FROM outbox'), 0);
});

test('polar tampered body and stale timestamp are 400 and store nothing', async () => {
  const rawBody = orderPaidBody({ orderId: 'ord_polar_tamper' });
  const input = polarHandleInput(rawBody, 'msg_polar_tamper_1');
  const index = 24;
  const flipped = rawBody[index] === 'a' ? 'b' : 'a';
  const tampered = rawBody.slice(0, index) + flipped + rawBody.slice(index + 1);
  assert.notEqual(tampered, rawBody);

  const tamperResponse = await handlePolar({ ...input, rawBody: tampered });
  const tamperBody = await tamperResponse.json();
  assert.equal(tamperResponse.status, 400);
  assert.equal(tamperBody.error, 'invalid_signature');

  const stale = signPolar({
    rawBody,
    webhookId: 'msg_polar_stale_1',
    webhookTimestamp: String(Math.floor(Date.now() / 1000) - 301),
    scheme: 'standard_webhooks',
  });
  const staleResponse = await handlePolar({
    rawBody,
    webhookId: stale.webhookId,
    webhookTimestamp: stale.webhookTimestamp,
    webhookSignature: stale.webhookSignature,
  });
  const staleBody = await staleResponse.json();
  assert.equal(staleResponse.status, 400);
  assert.equal(staleBody.error, 'invalid_signature');

  assert.equal(await count('SELECT count(*)::int AS n FROM billing_events'), 0);
  assert.equal(await count('SELECT count(*)::int AS n FROM outbox'), 0);
});
