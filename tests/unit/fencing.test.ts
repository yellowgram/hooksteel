import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getPool } from '../../src/db/pool.js';
import { drainOne } from '../../src/outbox/drain.js';
import { handle } from '../../src/webhooks/stripe/handler.js';
import { checkoutBody, signBody } from '../fixtures/stripe/sign.js';
import { count, installDbHooks } from '../setup/harness.js';

installDbHooks();

/** Drain rows until `key` has been handled (rows come out in creation order). */
async function drainUntilTried(key: string, hook: (k: string) => Promise<void>): Promise<void> {
  let tried = false;
  for (let i = 0; i < 5 && !tried; i += 1) {
    await drainOne({
      afterInvocation: async (k) => {
        if (k !== key) return;
        tried = true;
        await hook(k);
      },
    });
  }
  assert.equal(tried, true);
}

async function accept(id: string): Promise<void> {
  const rawBody = checkoutBody({ id });
  assert.equal((await handle({ rawBody, signature: signBody(rawBody) })).status, 200);
}

/** Pretend worker-B reclaimed this row after our lease expired. */
async function reclaimAsB(key: string): Promise<void> {
  await getPool().query(
    `UPDATE outbox SET locked_by = 'worker-B', locked_at = clock_timestamp(), attempts = attempts + 1 WHERE idempotency_key = $1`,
    [key],
  );
}

test('a late backoff from the old lease holder does not clear the new holder\'s lease', async () => {
  await accept('evt_fence_backoff');
  const key = 'stripe|evt_fence_backoff|grant_credit';
  await drainUntilTried(key, async () => {
    await reclaimAsB(key);
    throw new Error('A fails late');
  });
  const r = await getPool().query(`SELECT locked_by, last_error, available_at <= now() AS due FROM outbox WHERE idempotency_key = $1`, [key]);
  assert.equal(r.rows[0].locked_by, 'worker-B');
  assert.equal(r.rows[0].last_error, null);
  assert.equal(r.rows[0].due, true);
});

test('a late completion from the old lease holder does not finish the row under the new holder', async () => {
  await accept('evt_fence_complete');
  const key = 'stripe|evt_fence_complete|grant_credit';
  await drainUntilTried(key, () => reclaimAsB(key));
  const r = await getPool().query(`SELECT locked_by, completed_at FROM outbox WHERE idempotency_key = $1`, [key]);
  assert.equal(r.rows[0].locked_by, 'worker-B');
  assert.equal(r.rows[0].completed_at, null);
  assert.equal(
    await count(`SELECT count(*)::int AS n FROM billing_events WHERE provider_event_id = 'evt_fence_complete' AND processed_at IS NOT NULL`),
    0,
  );
});

test('a late dead-letter from the old lease holder writes nothing', async () => {
  process.env.OUTBOX_MAX_ATTEMPTS = '1';
  await accept('evt_fence_dead');
  const key = 'stripe|evt_fence_dead|grant_credit';
  // Use up the one allowed attempt so the next claim dead-letters.
  await getPool().query(`UPDATE outbox SET attempts = 1 WHERE idempotency_key = $1`, [key]);
  // Reclaim as B between our claim and our dead-letter write.
  const pool = getPool();
  const connect = pool.connect.bind(pool);
  let reclaimed = false;
  (pool as unknown as { connect: unknown }).connect = async (...args: unknown[]) => {
    // pool.query() calls connect(callback); leave that path alone.
    if (typeof args[0] === 'function') return (connect as (...a: unknown[]) => unknown)(...args);
    const client = await connect();
    const query = client.query.bind(client) as (...a: unknown[]) => Promise<unknown>;
    (client as unknown as { query: unknown }).query = async (...args: unknown[]) => {
      if (!reclaimed && String(args[0]).includes("last_error = 'dead_lettered'")) {
        reclaimed = true;
        await reclaimAsB(key);
      }
      return query(...args);
    };
    return client;
  };
  try {
    for (let i = 0; i < 3 && !reclaimed; i += 1) await drainOne();
  } finally {
    (pool as unknown as { connect: unknown }).connect = connect;
  }
  assert.equal(reclaimed, true);
  assert.equal(await count(`SELECT count(*)::int AS n FROM dead_letters`), 0);
  const r = await getPool().query(`SELECT locked_by, completed_at FROM outbox WHERE idempotency_key = $1`, [key]);
  assert.equal(r.rows[0].locked_by, 'worker-B');
  assert.equal(r.rows[0].completed_at, null);
});

test('a slow adapter keeps its lease alive, so no other worker can claim the row meanwhile', async () => {
  process.env.OUTBOX_LEASE_MS = '300';
  await accept('evt_heartbeat');
  const key = 'stripe|evt_heartbeat|grant_credit';
  let claimableMidway = -1;
  await drainUntilTried(key, async () => {
    await new Promise((r) => setTimeout(r, 900));
    claimableMidway = await count(
      `SELECT count(*)::int AS n FROM outbox WHERE idempotency_key = $1 AND locked_at < clock_timestamp() - interval '300 milliseconds'`,
      [key],
    );
  });
  assert.equal(claimableMidway, 0, 'the lease was renewed while the adapter ran');
  assert.equal(await count(`SELECT count(*)::int AS n FROM outbox WHERE idempotency_key = $1 AND completed_at IS NOT NULL`, [key]), 1);
});
