import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { closePool, getPool } from './pool.js';

dotenv.config();

export async function migrate(): Promise<string[]> {
  const dir = path.resolve(process.cwd(), 'migrations');
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

function isDirectRun(): boolean {
  const entry = process.argv[1] ?? '';
  return entry.endsWith(`${path.sep}migrate.ts`) || entry.endsWith(`${path.sep}migrate.js`);
}

if (isDirectRun()) {
  migrate()
    .then(async (ran) => {
      console.log(ran.length === 0 ? 'migrations up to date' : `applied: ${ran.join(', ')}`);
      await closePool();
    })
    .catch(async (err: unknown) => {
      console.error(err instanceof Error ? err.message : err);
      try {
        await closePool();
      } catch {
        // Ignore pool shutdown errors on the failure path.
      }
      process.exit(1);
    });
}
