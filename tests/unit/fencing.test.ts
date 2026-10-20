import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getPool } from '../../src/db/pool.js';
import { registerAdapter, resetAdapters } from '../../src/adapters/registry.js';
import { drainOne } from '../../src/outbox/drain.js';
import { handle } from '../../src/webhooks/stripe/handler.js';
import { checkoutBody, signBody, stripeKey } from '../fixtures/stripe/sign.js';
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
  const key = stripeKey('evt_fence_backoff', 'grant_credit');
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
  const key = stripeKey('evt_fence_complete', 'grant_credit');
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
  const key = stripeKey('evt_fence_dead', 'grant_credit');
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
  process.env.OUTBOX_LEASE_MS = '1000';
  await accept('evt_heartbeat');
  const key = stripeKey('evt_heartbeat', 'grant_credit');
  let claimableMidway = -1;
  await drainUntilTried(key, async () => {
    await new Promise((r) => setTimeout(r, 2500));
    claimableMidway = await count(
      `SELECT count(*)::int AS n FROM outbox WHERE idempotency_key = $1 AND locked_at < clock_timestamp() - interval '1000 milliseconds'`,
      [key],
    );
  });
  assert.equal(claimableMidway, 0, 'the lease was renewed while the adapter ran');
  assert.equal(await count(`SELECT count(*)::int AS n FROM outbox WHERE idempotency_key = $1 AND completed_at IS NOT NULL`, [key]), 1);
});

/** A reclaim by a replica with the same worker id: only locked_at changes. */
async function reclaimAsSameWorker(key: string): Promise<void> {
  await getPool().query(
    `UPDATE outbox SET locked_at = clock_timestamp() + interval '1 millisecond', attempts = attempts + 1 WHERE idempotency_key = $1`,
    [key],
  );
}

test('a late completion is fenced even when the new holder has the same worker id', async () => {
  process.env.OUTBOX_WORKER_ID = 'shared-id';
  try {
    await accept('evt_fence_same_id');
    const key = stripeKey('evt_fence_same_id', 'grant_credit');
    await drainUntilTried(key, () => reclaimAsSameWorker(key));
    const r = await getPool().query(`SELECT completed_at FROM outbox WHERE idempotency_key = $1`, [key]);
    assert.equal(r.rows[0].completed_at, null, 'the old claim must not complete the row');
  } finally {
    delete process.env.OUTBOX_WORKER_ID;
  }
});

test('the default worker id is unique per process', async () => {
  delete process.env.OUTBOX_WORKER_ID;
  await accept('evt_worker_id');
  const key = stripeKey('evt_worker_id', 'grant_credit');
  let lockedBy = '';
  await drainUntilTried(key, async () => {
    lockedBy = (await getPool().query(`SELECT locked_by FROM outbox WHERE idempotency_key = $1`, [key])).rows[0].locked_by;
  });
  assert.match(lockedBy, /^.+:\d+:[0-9a-f]{8}$/);
});

test('a lease under one second is a configuration error', async () => {
  for (const bad of ['0', '30', '-1', 'abc']) {
    process.env.OUTBOX_LEASE_MS = bad;
    await assert.rejects(drainOne(), /OUTBOX_LEASE_MS must be at least 1000/);
  }
  process.env.OUTBOX_LEASE_MS = '30000';
});

test('the final write waits for a lease renewal already in flight', async () => {
  process.env.OUTBOX_LEASE_MS = '1000'; // renewal every ~333 ms
  await accept('evt_hb_inflight');
  const key = stripeKey('evt_hb_inflight', 'grant_credit');
  const holder = await getPool().connect();
  try {
    await drainUntilTried(key, async () => {
      // Block the row so the next renewal is stuck in flight when the adapter returns.
      await holder.query('BEGIN');
      await holder.query(`SELECT 1 FROM outbox WHERE idempotency_key = $1 FOR UPDATE`, [key]);
      await new Promise((r) => setTimeout(r, 450));
      setTimeout(() => void holder.query('COMMIT'), 200);
    });
  } finally {
    holder.release();
  }
  assert.equal(
    await count(`SELECT count(*)::int AS n FROM outbox WHERE idempotency_key = $1 AND completed_at IS NOT NULL`, [key]),
    1,
    'completion used the renewed lease token',
  );
});

test('an adapter is told (signal aborts) when another worker takes its row', async () => {
  process.env.OUTBOX_LEASE_MS = '1000'; // renewal every ~333 ms
  await accept('evt_signal');
  const key = stripeKey('evt_signal', 'grant_credit');
  let aborted = false;
  registerAdapter({
    name: 'grant_credit',
    async execute(ctx) {
      if (ctx.idempotencyKey !== key) return;
      await reclaimAsB(key);
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, 2000);
        ctx.signal?.addEventListener('abort', () => {
          aborted = true;
          clearTimeout(t);
          resolve();
        });
      });
    },
  });
  try {
    for (let i = 0; i < 3 && !aborted; i += 1) await drainOne();
  } finally {
    resetAdapters();
    process.env.OUTBOX_LEASE_MS = '30000';
  }
  assert.equal(aborted, true);
});
