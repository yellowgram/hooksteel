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
RETURNING o.id, o.billing_event_id, o.adapter, o.payload, o.idempotency_key, o.attempts
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

async function complete(
  row: ClaimedOutbox,
  lastError: string | null,
  options?: DrainOptions,
): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE outbox
       SET completed_at = now(),
           locked_at = NULL,
           locked_by = NULL,
           last_error = $2
       WHERE id = $1`,
      [row.id, lastError],
    );
    if (honorChaosHooks() && options?.beforeMarkProcessed) await options.beforeMarkProcessed();
    await markProcessed(client, row.billing_event_id);
  });
}

async function backoff(row: ClaimedOutbox, message: string): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE outbox
       SET available_at = now() + (interval '1 second' * LEAST(60, power(2, attempts))),
           last_error = $2,
           locked_at = NULL,
           locked_by = NULL
       WHERE id = $1`,
      [row.id, message],
    );
  });
}

async function deadLetter(
  row: ClaimedOutbox,
  reason: DeadLetterReason,
  options?: DrainOptions,
): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO dead_letters (outbox_id, billing_event_id, reason, payload_snapshot)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (outbox_id) WHERE replayed_at IS NULL
       DO NOTHING`,
      [row.id, row.billing_event_id, reason, JSON.stringify(row.payload ?? {})],
    );
    await client.query(
      `UPDATE outbox
       SET completed_at = now(),
           last_error = 'dead_lettered',
           locked_at = NULL,
           locked_by = NULL
       WHERE id = $1`,
      [row.id],
    );
    if (honorChaosHooks() && options?.beforeMarkProcessed) await options.beforeMarkProcessed();
    await markProcessed(client, row.billing_event_id);
  });
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
 * Every claim, including lease reclaim, increments attempts. There is no heartbeat:
 * an adapter that runs longer than OUTBOX_LEASE_MS can be claimed again and must be
 * idempotent under that overlap.
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
    await complete(claimed, skipped(result) ? 'skipped_no_email' : null, options);
  } catch (err) {
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
