import { getPool } from '../db/pool.js';

export class ReplayRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReplayRefusedError';
  }
}

interface DeadLetterRow {
  id: string;
  outbox_id: string | null;
  billing_event_id: string | null;
  replayed_at: Date | null;
  adapter: string | null;
  event_id: string | null;
}

export interface ReplayStep {
  /** Parameterized SQL. The id is in `params`, never interpolated. */
  sql: string;
  params: [string];
}

export interface ReplayDryRun {
  deadLetterId: string;
  adapter: string;
  outboxId: string;
  billingEventId: string;
  /** Exactly what execute runs, in order, each with its own bind value. */
  steps: ReplayStep[];
  /** The SQL of `steps`, for older callers. Each `$1` binds a different id; see `steps`. */
  statements: string[];
}

async function lockDeadLetter(client: import('pg').PoolClient, deadLetterId: string): Promise<DeadLetterRow> {
  const result = await client.query<DeadLetterRow>(
    `SELECT d.id,
            d.outbox_id,
            d.billing_event_id,
            d.replayed_at,
            o.adapter,
            b.id AS event_id
     FROM dead_letters d
     LEFT JOIN outbox o ON o.id = d.outbox_id
     LEFT JOIN billing_events b ON b.id = d.billing_event_id
     WHERE d.id = $1
     FOR UPDATE OF d`,
    [deadLetterId],
  );
  return refuseUnlessReplayable(result.rows[0]);
}

/** The replay, as data. Dry-run prints it and execute runs it, so they cannot drift apart. */
function replaySteps(row: DeadLetterRow): ReplayStep[] {
  return [
    {
      sql: 'UPDATE outbox SET completed_at = NULL, last_error = NULL, available_at = now(), locked_at = NULL, locked_by = NULL, attempts = 0 WHERE id = $1',
      params: [row.outbox_id as string],
    },
    { sql: 'UPDATE billing_events SET processed_at = NULL WHERE id = $1', params: [row.billing_event_id as string] },
    { sql: 'UPDATE dead_letters SET replayed_at = now() WHERE id = $1 AND replayed_at IS NULL', params: [row.id] },
  ];
}

async function readDeadLetter(deadLetterId: string): Promise<DeadLetterRow> {
  const result = await getPool().query<DeadLetterRow>(
    `SELECT d.id,
            d.outbox_id,
            d.billing_event_id,
            d.replayed_at,
            o.adapter,
            b.id AS event_id
     FROM dead_letters d
     LEFT JOIN outbox o ON o.id = d.outbox_id
     LEFT JOIN billing_events b ON b.id = d.billing_event_id
     WHERE d.id = $1`,
    [deadLetterId],
  );
  return refuseUnlessReplayable(result.rows[0]);
}

function refuseUnlessReplayable(row: DeadLetterRow | undefined): DeadLetterRow {
  if (!row) throw new ReplayRefusedError('dead letter not found');
  if (row.replayed_at) throw new ReplayRefusedError('dead letter already replayed');
  if (!row.billing_event_id || !row.event_id) {
    throw new ReplayRefusedError('billing event is missing; refusing replay of an event that never entered billing_events');
  }
  if (!row.outbox_id || !row.adapter) throw new ReplayRefusedError('outbox row is missing');
  return row;
}

/** Print the intended replay mutation. Does not write. */
export async function replayDryRun(deadLetterId: string): Promise<ReplayDryRun> {
  const row = await readDeadLetter(deadLetterId);
  const steps = replaySteps(row);
  return {
    deadLetterId: row.id,
    adapter: row.adapter as string,
    outboxId: row.outbox_id as string,
    billingEventId: row.billing_event_id as string,
    steps,
    statements: steps.map((step) => step.sql),
  };
}

/**
 * Re-open the outbox row and mark the dead letter replayed.
 * Does not call the adapter; the normal drain performs the side effect.
 */
export async function replayExecute(deadLetterId: string): Promise<{ outboxId: string; adapter: string }> {
  const client = await getPool().connect();
  let committed = false;
  try {
    await client.query('BEGIN');
    const row = await lockDeadLetter(client, deadLetterId);
    let updated: { rowCount: number | null } = { rowCount: 0 };
    for (const step of replaySteps(row)) updated = await client.query(step.sql, step.params);
    if (updated.rowCount !== 1) throw new ReplayRefusedError('dead letter already replayed');
    await client.query('COMMIT');
    committed = true;
    return { outboxId: row.outbox_id as string, adapter: row.adapter as string };
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

export async function listDeadLetters(): Promise<
  Array<{ id: string; reason: string; adapter: string | null; replayed_at: Date | null }>
> {
  const result = await getPool().query<{
    id: string;
    reason: string;
    adapter: string | null;
    replayed_at: Date | null;
  }>(
    `SELECT d.id, d.reason, o.adapter, d.replayed_at
     FROM dead_letters d
     LEFT JOIN outbox o ON o.id = d.outbox_id
     ORDER BY d.failed_at ASC`,
  );
  return result.rows;
}
