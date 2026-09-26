import { getPool } from '../db/pool.js';

function isUndefinedTable(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === '42P01';
}

/**
 * Test-only durable log. Writes on a separate connection so a drain crash after
 * this commit cannot erase the row. Production (NODE_ENV=production) never writes.
 * Buyers without the test table get a no-op (relation missing).
 */
export async function recordTestInvocation(idempotencyKey: string, adapter: string): Promise<void> {
  if (process.env.NODE_ENV === 'production') return;

  const client = await getPool().connect();
  let committed = false;
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO adapter_invocations (idempotency_key, adapter)
       VALUES ($1, $2)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [idempotencyKey, adapter],
    );
    await client.query('COMMIT');
    committed = true;
  } catch (err) {
    if (isUndefinedTable(err)) return;
    throw err;
  } finally {
    if (!committed) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Already aborted, including undefined-table.
      }
    }
    client.release();
  }
}
