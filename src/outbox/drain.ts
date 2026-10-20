import { getAdapter } from '../adapters/registry.js';
import type { AdapterResult } from '../adapters/types.js';
import { getPool } from '../db/pool.js';
import type { ClaimedOutbox, DeadLetterReason } from './types.js';

export interface DrainOptions {
  limit?: number;
  /** Runs after execute() returns and before completed_at. Tests use this to crash mid-fulfillment. */
  afterInvocation?: (idempotencyKey: string) => Promise<void> | void;
  /** Runs inside the completion transaction after the child update and before processed_at. */
  beforeMarkProcessed?: () => Promise<void> | void;
}

const CLAIM_SQL = `
UPDATE outbox o
SET locked_at = now(),
    locked_by = $2,
    attempts = o.attempts + 1
WHERE o.id = (
  SELECT id
  FROM outbox
  WHERE completed_at IS NULL
    AND available_at <= now()
    AND (
      locked_at IS NULL
      OR locked_at < now() - make_interval(secs => $1::double precision)
    )
  ORDER BY available_at ASC, created_at ASC, id ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
RETURNING o.id, o.billing_event_id, o.adapter, o.payload, o.idempotency_key, o.attempts, o.locked_by, o.locked_at::text AS locked_at
`;

function workerId(): string {
  const id = process.env.OUTBOX_WORKER_ID?.trim();
  return id ? id : 'local-dev-1';
}

function leaseSeconds(): number {
  const ms = Number(process.env.OUTBOX_LEASE_MS ?? 30000);
  if (!Number.isFinite(ms) || ms < 0) return 30;
  return ms / 1000;
}

function maxAttempts(): number {
  const n = Number(process.env.OUTBOX_MAX_ATTEMPTS ?? 5);
  if (!Number.isFinite(n) || n < 1) return 5;
  return Math.floor(n);
}

function batchSize(): number {
  const n = Number(process.env.OUTBOX_BATCH_SIZE ?? 10);
  if (!Number.isFinite(n) || n < 1) return 10;
  return Math.floor(n);
}

function errorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.slice(0, 2000);
}

async function withTransaction<T>(fn: (client: import('pg').PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  let committed = false;
  try {
    await client.query('BEGIN');
    const value = await fn(client);
    await client.query('COMMIT');
    committed = true;
    return value;
  } finally {
    if (!committed) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Already aborted.
      }
    }
    client.release();
  }
}

async function markProcessed(client: import('pg').PoolClient, billingEventId: string): Promise<void> {
  // Lock the parent so two workers finishing sibling outbox rows cannot both
  // observe the other row as still incomplete and leave processed_at null.
  await client.query(`SELECT id FROM billing_events WHERE id = $1 FOR UPDATE`, [billingEventId]);
  await client.query(
    `UPDATE billing_events
     SET processed_at = now()
     WHERE id = $1
       AND processed_at IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM outbox
         WHERE billing_event_id = $1
           AND completed_at IS NULL
       )`,
    [billingEventId],
  );
}

async function lookupProviderEventId(billingEventId: string): Promise<string> {
  const result = await getPool().query<{ provider_event_id: string }>(
    `SELECT provider_event_id FROM billing_events WHERE id = $1`,
    [billingEventId],
  );
  return result.rows[0]?.provider_event_id ?? '';
}

/**
 * Every write after the claim is fenced on the lease token (locked_by, locked_at).
 * If the lease expired and another worker reclaimed the row, the token no longer
 * matches, the write changes nothing, and this worker steps aside: the new holder
 * owns the row now. Returns false in that case.
 */
// locked_at travels as text: a JS Date would drop Postgres's microseconds and never match.
const FENCE = `id = $1 AND locked_by = $2 AND locked_at = $3::timestamptz AND completed_at IS NULL`;

function leaseLost(row: ClaimedOutbox, step: string): false {
  console.warn(
    JSON.stringify({ event: 'lease_lost', step, outbox_id: row.id, idempotency_key: row.idempotency_key, worker: row.locked_by }),
  );
  return false;
}

async function complete(
  row: ClaimedOutbox,
  lastError: string | null,
  options?: DrainOptions,
): Promise<boolean> {
  return withTransaction(async (client) => {
    const updated = await client.query(
      `UPDATE outbox
       SET completed_at = now(),
           locked_at = NULL,
           locked_by = NULL,
           last_error = $4
       WHERE ${FENCE}`,
      [row.id, row.locked_by, row.locked_at, lastError],
    );
    if (updated.rowCount === 0) return leaseLost(row, 'complete');
    if (honorChaosHooks() && options?.beforeMarkProcessed) await options.beforeMarkProcessed();
    await markProcessed(client, row.billing_event_id);
    return true;
  });
}

async function backoff(row: ClaimedOutbox, message: string): Promise<boolean> {
  return withTransaction(async (client) => {
    const updated = await client.query(
      `UPDATE outbox
       SET available_at = now() + (interval '1 second' * LEAST(60, power(2, attempts))),
           last_error = $4,
           locked_at = NULL,
           locked_by = NULL
       WHERE ${FENCE}`,
      [row.id, row.locked_by, row.locked_at, message],
    );
    return updated.rowCount === 0 ? leaseLost(row, 'backoff') : true;
  });
}

async function deadLetter(
  row: ClaimedOutbox,
  reason: DeadLetterReason,
  options?: DrainOptions,
): Promise<boolean> {
  return withTransaction(async (client) => {
    const updated = await client.query(
      `UPDATE outbox
       SET completed_at = now(),
           last_error = 'dead_lettered',
           locked_at = NULL,
           locked_by = NULL
       WHERE ${FENCE}`,
      [row.id, row.locked_by, row.locked_at],
    );
    if (updated.rowCount === 0) return leaseLost(row, 'dead_letter');
    await client.query(
      `INSERT INTO dead_letters (outbox_id, billing_event_id, reason, payload_snapshot)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (outbox_id) WHERE replayed_at IS NULL
       DO NOTHING`,
      [row.id, row.billing_event_id, reason, JSON.stringify(row.payload ?? {})],
    );
    if (honorChaosHooks() && options?.beforeMarkProcessed) await options.beforeMarkProcessed();
    await markProcessed(client, row.billing_event_id);
    return true;
  });
}

/**
 * While the adapter runs, renew the lease every third of OUTBOX_LEASE_MS so a slow
 * but healthy adapter is not reclaimed. Each renewal is fenced and moves the token
 * forward. Stop it (and await the last renewal) before any final write.
 */
function startHeartbeat(row: ClaimedOutbox): { stop: () => Promise<void> } {
  const everyMs = Math.max(50, (leaseSeconds() * 1000) / 3);
  let inFlight: Promise<void> = Promise.resolve();
  let stopped = false;
  const timer = setInterval(() => {
    inFlight = inFlight.then(async () => {
      if (stopped) return;
      const renewed = await getPool().query<{ locked_at: string }>(
        `UPDATE outbox SET locked_at = clock_timestamp() WHERE ${FENCE} RETURNING locked_at::text AS locked_at`,
        [row.id, row.locked_by, row.locked_at],
      );
      if (renewed.rows[0]) row.locked_at = renewed.rows[0].locked_at;
      else stopped = true;
    }).catch(() => {
      // A failed renewal is not fatal: the final write is still fenced.
    });
  }, everyMs);
  timer.unref();
  return {
    stop: async () => {
      stopped = true;
      clearInterval(timer);
      await inFlight;
    },
  };
}

/** Production always wins, even when ALLOW_CHAOS_INJECT is set. */
function honorChaosHooks(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  return process.env.NODE_ENV === 'test' || process.env.ALLOW_CHAOS_INJECT === 'true';
}

function skipped(result: AdapterResult): boolean {
  return Boolean(result && result.lastError === 'skipped_no_email');
}

/**
 * Claim and handle a single due outbox row. Returns false when the queue is idle.
 * Every claim, including lease reclaim, increments attempts. The lease is renewed
 * while the adapter runs, so only a stalled or crashed worker loses its row. If that
 * happens, the old worker's late writes are fenced off and the new holder wins.
 * Adapters must still be idempotent: a worker can crash after the side effect and
 * before its completion commits.
 */
export async function drainOne(options?: DrainOptions): Promise<boolean> {
  const claimed = await withTransaction(async (client) => {
    const result = await client.query<ClaimedOutbox>(CLAIM_SQL, [leaseSeconds(), workerId()]);
    return result.rows[0] ?? null;
  });
  if (!claimed) return false;
  claimed.attempts = Number(claimed.attempts);

  if (claimed.attempts > maxAttempts()) {
    // timeout and adapter_error stay in the CHECK and are not written here.
    // Throws backoff until this path; a slow adapter is not a lease-timeout dead letter.
    await deadLetter(claimed, 'max_attempts', options);
    return true;
  }

  const adapter = getAdapter(claimed.adapter);
  if (!adapter) {
    await deadLetter(claimed, 'poison', options);
    return true;
  }

  const heartbeat = startHeartbeat(claimed);
  try {
    const result = await adapter.execute({
      billingEventId: claimed.billing_event_id,
      providerEventId: await lookupProviderEventId(claimed.billing_event_id),
      payload: claimed.payload,
      idempotencyKey: claimed.idempotency_key,
    });
    if (honorChaosHooks() && options?.afterInvocation) {
      await options.afterInvocation(claimed.idempotency_key);
    }
    await heartbeat.stop();
    await complete(claimed, skipped(result) ? 'skipped_no_email' : null, options);
  } catch (err) {
    await heartbeat.stop();
    await backoff(claimed, errorMessage(err));
  }
  return true;
}

/** Process up to OUTBOX_BATCH_SIZE rows sequentially, then return. No in-process parallelism. */
export async function drainOnce(options?: DrainOptions): Promise<number> {
  const limit = options?.limit ?? batchSize();
  let processed = 0;
  for (let i = 0; i < limit; i += 1) {
    const did = await drainOne(options);
    if (!did) break;
    processed += 1;
  }
  return processed;
}
