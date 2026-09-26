import { getPool } from '../db/pool.js';

function isUndefinedTable(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === '42P01';
}

/** Off unless the test runner or an explicit flag asks for the durable log. */
export function shouldRecordTestInvocations(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.HOOKSTEEL_RECORD_INVOCATIONS === 'true';
}

/**
 * Test-only durable log on a separate connection so a drain crash after this
 * commit cannot erase the row. Unset, development, and production do not write.
 */
export async function recordTestInvocation(idempotencyKey: string, adapter: string): Promise<void> {
  if (!shouldRecordTestInvocations()) return;

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
