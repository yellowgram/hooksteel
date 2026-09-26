import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { getPool } from '../../src/db/pool.js';
import { migrate } from '../../src/db/migrate.js';
import { handle } from '../../src/webhooks/stripe/handler.js';
import { checkoutBody, signBody } from '../fixtures/stripe/sign.js';
import { count, installDbHooks } from '../setup/harness.js';

installDbHooks();

test('buyer migrations are plain CREATE files without IF NOT EXISTS', () => {
  const files = readdirSync('migrations').filter((name) => name.endsWith('.sql')).sort();
  assert.deepEqual(files, [
    '000_schema_migrations.sql',
    '001_billing_events.sql',
    '002_outbox.sql',
    '003_dead_letters.sql',
  ]);
  for (const file of files) {
    const sql = readFileSync(`migrations/${file}`, 'utf8');
    assert.doesNotMatch(sql, /IF NOT EXISTS/i, file);
    assert.doesNotMatch(sql, /adapter_invocations/, file);
    assert.doesNotMatch(sql, /lease_expires_at/, file);
  }
});

test('second migrate is a no-op and schema reserves polar without lease_expires_at', async () => {
  assert.deepEqual(await migrate(), []);

  const columns = await getPool().query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'outbox'`,
  );
  assert.equal(
    columns.rows.some((row) => row.column_name === 'lease_expires_at'),
    false,
  );

  await getPool().query(
    `INSERT INTO billing_events (provider, provider_event_id, livemode, event_type, payload)
     VALUES ('polar', 'polar_evt_reserved', false, 'order.paid', '{}'::jsonb)`,
  );
  assert.equal(
    await count(`SELECT count(*)::int AS n FROM billing_events WHERE provider = 'polar'`),
    1,
  );

  await assert.rejects(
    getPool().query(
      `INSERT INTO billing_events (provider, provider_event_id, livemode, event_type, payload, status)
       VALUES ('stripe', 'evt_bad_status', false, 'checkout.session.completed', '{}'::jsonb, 'failed')`,
    ),
  );
});

test('a second delivery of the same provider event id does not insert another row', async () => {
  const rawBody = checkoutBody({ id: 'evt_unique_1' });
  const signature = signBody(rawBody);
  const first = await handle({ rawBody, signature });
  const second = await handle({ rawBody, signature });
  assert.equal(first.status, 200);
  assert.equal((await first.json()).outcome, 'outboxed');
  assert.equal(second.status, 200);
  assert.equal((await second.json()).outcome, 'duplicate');
  assert.equal(await count('SELECT count(*)::int AS n FROM billing_events'), 1);
  assert.equal(await count('SELECT count(*)::int AS n FROM outbox'), 2);
});
