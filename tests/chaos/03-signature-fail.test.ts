import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handle } from '../../src/webhooks/stripe/handler.js';
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
