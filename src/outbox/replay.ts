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

export interface ReplayDryRun {
  deadLetterId: string;
  adapter: string;
  outboxId: string;
  /** Bound SQL. Ids are returned separately and are not interpolated into these strings. */
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

function statementsFor(): string[] {
  return [
    'UPDATE outbox SET completed_at = NULL, last_error = NULL, available_at = now(), locked_at = NULL, locked_by = NULL, attempts = 0 WHERE id = $1',
    'UPDATE dead_letters SET replayed_at = now() WHERE id = $1 AND replayed_at IS NULL',
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
  return {
    deadLetterId: row.id,
    adapter: row.adapter as string,
    outboxId: row.outbox_id as string,
    statements: statementsFor(),
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
    await client.query(
      `UPDATE outbox
       SET completed_at = NULL,
           last_error = NULL,
           available_at = now(),
           locked_at = NULL,
           locked_by = NULL,
           attempts = 0
       WHERE id = $1`,
      [row.outbox_id],
    );
    const updated = await client.query(
      `UPDATE dead_letters
       SET replayed_at = now()
       WHERE id = $1
         AND replayed_at IS NULL`,
      [row.id],
    );
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
