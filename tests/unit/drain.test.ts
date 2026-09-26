import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crashAfterInvocationAlways } from '../../src/chaos/inject.js';
import { getPool } from '../../src/db/pool.js';
import { drainOnce, drainOne } from '../../src/outbox/drain.js';
import { replayDryRun, replayExecute, ReplayRefusedError } from '../../src/outbox/replay.js';
import { handle } from '../../src/webhooks/stripe/handler.js';
import { checkoutBody, signBody } from '../fixtures/stripe/sign.js';
import { count, drainUntilIdle, installDbHooks } from '../setup/harness.js';

installDbHooks();

async function accept(id: string): Promise<void> {
  const rawBody = checkoutBody({ id });
  const response = await handle({ rawBody, signature: signBody(rawBody) });
  assert.equal(response.status, 200);
}

test('fresh locks are held and a shorter lease reclaims them', async () => {
  await accept('evt_lease');
  await getPool().query(
    `UPDATE outbox
     SET locked_at = now() - interval '10 seconds',
         locked_by = 'other-worker'`,
  );

  process.env.OUTBOX_LEASE_MS = '30000';
  assert.equal(await drainOnce(), 0);
  assert.equal(
    await count(`SELECT count(*)::int AS n FROM outbox WHERE locked_by = 'other-worker'`),
    2,
  );

  process.env.OUTBOX_LEASE_MS = '5000';
  await drainUntilIdle();
  assert.equal(await count('SELECT count(*)::int AS n FROM adapter_invocations'), 2);
  assert.equal(await count('SELECT count(*)::int AS n FROM outbox WHERE completed_at IS NULL'), 0);
});

test('adapter failure backs off by 2^attempts capped at 60s, then dead-letters at max attempts', async () => {
  process.env.OUTBOX_MAX_ATTEMPTS = '1';
  await accept('evt_backoff');
  const key = 'stripe|evt_backoff|grant_credit';
  await drainOnce(crashAfterInvocationAlways(key));

  const failed = await getPool().query<{ delta: number; attempts: number; last_error: string }>(
    `SELECT EXTRACT(EPOCH FROM (available_at - now())) AS delta,
            attempts,
            last_error
     FROM outbox
     WHERE idempotency_key = $1`,
    [key],
  );
  const delta = Number(failed.rows[0]?.delta);
  assert.ok(delta > 1 && delta <= 3, `expected ~2s backoff, got ${delta}`);
  assert.equal(Number(failed.rows[0]?.attempts), 1);
  assert.match(failed.rows[0]?.last_error ?? '', /chaos_always_crash/);
  assert.equal(await count('SELECT count(*)::int AS n FROM adapter_invocations WHERE idempotency_key = $1', [key]), 1);
  assert.equal(await count('SELECT count(*)::int AS n FROM dead_letters'), 0);

  await getPool().query(`UPDATE outbox SET available_at = now() WHERE idempotency_key = $1`, [key]);
  await drainOnce();

  const dead = await getPool().query<{ reason: string }>(
    `SELECT reason FROM dead_letters WHERE outbox_id = (
       SELECT id FROM outbox WHERE idempotency_key = $1
     )`,
    [key],
  );
  assert.equal(dead.rows[0]?.reason, 'max_attempts');
  const row = await getPool().query<{ last_error: string; status: string; processed_at: Date | null }>(
    `SELECT o.last_error, b.status, b.processed_at
     FROM outbox o
     JOIN billing_events b ON b.id = o.billing_event_id
     WHERE o.idempotency_key = $1`,
    [key],
  );
  assert.equal(row.rows[0]?.last_error, 'dead_lettered');
  assert.equal(row.rows[0]?.status, 'outboxed');
  assert.ok(row.rows[0]?.processed_at);
  assert.equal(await count('SELECT count(*)::int AS n FROM adapter_invocations WHERE idempotency_key = $1', [key]), 1);

  const listed = await getPool().query<{ id: string }>(
    `SELECT id FROM dead_letters WHERE reason = 'max_attempts'`,
  );
  const deadId = listed.rows[0]?.id;
  assert.ok(deadId);

  const before = await getPool().query<{ replayed_at: Date | null; attempts: number }>(
    `SELECT d.replayed_at, o.attempts
     FROM dead_letters d
     JOIN outbox o ON o.id = d.outbox_id
     WHERE d.id = $1`,
    [deadId],
  );
  const dry = await replayDryRun(deadId);
  assert.equal(dry.adapter, 'grant_credit');
  assert.match(dry.statements[0] ?? '', /attempts = 0/);
  assert.match(dry.statements[0] ?? '', /\$1/);
  assert.equal(dry.statements.some((sql) => sql.includes(deadId)), false);
  assert.equal(dry.statements.some((sql) => sql.includes(dry.outboxId)), false);
  const afterDry = await getPool().query<{ replayed_at: Date | null }>(
    `SELECT replayed_at FROM dead_letters WHERE id = $1`,
    [deadId],
  );
  assert.equal(afterDry.rows[0]?.replayed_at, null);
  assert.equal(Number(before.rows[0]?.attempts), 2);

  const executed = await replayExecute(deadId);
  assert.equal(executed.adapter, 'grant_credit');
  await assert.rejects(() => replayExecute(deadId), ReplayRefusedError);

  const reopened = await getPool().query<{ attempts: number; completed_at: Date | null; replayed_at: Date | null }>(
    `SELECT o.attempts, o.completed_at, d.replayed_at
     FROM outbox o
     JOIN dead_letters d ON d.outbox_id = o.id
     WHERE d.id = $1`,
    [deadId],
  );
  assert.equal(Number(reopened.rows[0]?.attempts), 0);
  assert.equal(reopened.rows[0]?.completed_at, null);
  assert.ok(reopened.rows[0]?.replayed_at);

  await drainUntilIdle();
  assert.equal(await count('SELECT count(*)::int AS n FROM adapter_invocations WHERE idempotency_key = $1', [key]), 1);
  assert.equal(
    await count(`SELECT count(*)::int AS n FROM outbox WHERE idempotency_key = $1 AND completed_at IS NOT NULL`, [key]),
    1,
  );
});

test('concurrent sibling completions still set processed_at', async () => {
  await accept('evt_siblings');
  let waiting = 0;
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const beforeMarkProcessed = async () => {
    waiting += 1;
    if (waiting === 2) release();
    await gate;
  };
  const [first, second] = await Promise.all([
    drainOne({ beforeMarkProcessed }),
    drainOne({ beforeMarkProcessed }),
  ]);
  assert.equal(first, true);
  assert.equal(second, true);
  assert.equal(waiting, 2);
  const row = await getPool().query<{ processed_at: Date | null }>(
    `SELECT processed_at FROM billing_events WHERE provider_event_id = 'evt_siblings'`,
  );
  assert.ok(row.rows[0]?.processed_at);
  assert.equal(await count('SELECT count(*)::int AS n FROM outbox WHERE completed_at IS NULL'), 0);
});

test('crash after dead_letters insert reclaims without a second open row', async () => {
  process.env.OUTBOX_MAX_ATTEMPTS = '1';
  await accept('evt_dl_crash');
  const key = 'stripe|evt_dl_crash|grant_credit';
  await getPool().query(
    `UPDATE outbox SET completed_at = now(), locked_at = NULL, locked_by = NULL
     WHERE idempotency_key = 'stripe|evt_dl_crash|send_email'`,
  );
  await getPool().query(
    `UPDATE outbox SET attempts = 1, locked_at = NULL, locked_by = NULL, available_at = now()
     WHERE idempotency_key = $1`,
    [key],
  );
  await getPool().query(
    `INSERT INTO dead_letters (outbox_id, billing_event_id, reason, payload_snapshot)
     SELECT id, billing_event_id, 'max_attempts', payload
     FROM outbox WHERE idempotency_key = $1`,
    [key],
  );

  await drainOnce();

  assert.equal(
    await count(
      `SELECT count(*)::int AS n FROM dead_letters d
       JOIN outbox o ON o.id = d.outbox_id
       WHERE o.idempotency_key = $1 AND d.replayed_at IS NULL`,
      [key],
    ),
    1,
  );
  const row = await getPool().query<{ completed_at: Date | null; last_error: string | null }>(
    `SELECT completed_at, last_error FROM outbox WHERE idempotency_key = $1`,
    [key],
  );
  assert.ok(row.rows[0]?.completed_at);
  assert.equal(row.rows[0]?.last_error, 'dead_lettered');
});

test('unknown adapter is poison, not a retry', async () => {
  await accept('evt_poison');
  await getPool().query(
    `UPDATE outbox SET adapter = 'not_registered', idempotency_key = 'stripe|evt_poison|not_registered'
     WHERE idempotency_key = 'stripe|evt_poison|grant_credit'`,
  );
  assert.equal(await drainOnce(), 2);
  const reasons = await getPool().query<{ reason: string }>(
    `SELECT reason FROM dead_letters ORDER BY reason`,
  );
  assert.deepEqual(
    reasons.rows.map((row) => row.reason),
    ['poison'],
  );
  assert.equal(await count('SELECT count(*)::int AS n FROM outbox WHERE completed_at IS NULL'), 0);
});
