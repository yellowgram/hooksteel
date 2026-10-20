import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool } from './pool.js';

/** The SQL files shipped with this package (src/db or dist/db → ../../migrations). */
export const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'migrations');

/** Apply HookSteel's own migrations, each in its own transaction. Returns the files applied. */
export async function migrate(dir: string = MIGRATIONS_DIR): Promise<string[]> {
  const files = readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  const pool = getPool();
  const applied = await loadApplied();
  const ran: string[] = [];

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(path.join(dir, file), 'utf8');
    const client = await pool.connect();
    let committed = false;
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO hooksteel_schema_migrations (id) VALUES ($1)', [file]);
      await client.query('COMMIT');
      committed = true;
      ran.push(file);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `migration ${file} failed and was rolled back. Fix the database, then re-run migrate. Do not hand-edit a partially applied file. ${message}`,
      );
    } finally {
      if (!committed) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // The connection may already be aborted.
        }
      }
      client.release();
    }
  }

  return ran;
}

async function loadApplied(): Promise<Set<string>> {
  const pool = getPool();
  const exists = await pool.query<{ name: string | null }>(
    `SELECT to_regclass('public.hooksteel_schema_migrations') AS name`,
  );
  if (!exists.rows[0]?.name) return new Set();
  const rows = await pool.query<{ id: string }>('SELECT id FROM hooksteel_schema_migrations');
  return new Set(rows.rows.map((row) => row.id));
}
