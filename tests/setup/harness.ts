import { readFileSync } from 'node:fs';
import { after, before, beforeEach } from 'node:test';
import dotenv from 'dotenv';
import { closePool, getPool } from '../../src/db/pool.js';
import { migrate } from '../../src/db/migrate.js';
import { drainOnce } from '../../src/outbox/drain.js';
import { resetAdapterMap } from '../../src/webhooks/stripe/mapAdapters.js';
import { TEST_WEBHOOK_SECRET } from '../fixtures/stripe/secrets.js';

dotenv.config();

export { TEST_WEBHOOK_SECRET };

export function applyTestEnv(): void {
  process.env.NODE_ENV = 'test';
  process.env.HOOKSTEEL_RECORD_INVOCATIONS = 'true';
  process.env.ALLOW_CHAOS_INJECT = 'true';
  process.env.ALLOW_DEMO_CONTROLS = 'false';
  process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
  process.env.STRIPE_EXPECT_LIVEMODE = 'false';
  process.env.OUTBOX_WORKER_ID = 'test-worker';
  process.env.OUTBOX_MAX_ATTEMPTS = '5';
  process.env.OUTBOX_LEASE_MS = '30000';
  process.env.OUTBOX_BATCH_SIZE = '10';
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/hooksteel';
  }
}

export async function truncateAll(): Promise<void> {
  await getPool().query('TRUNCATE TABLE dead_letters, outbox, billing_events, adapter_invocations');
}

export async function prepareDb(): Promise<void> {
  applyTestEnv();
  await migrate();
  const sql = readFileSync(new URL('./adapter_invocations.sql', import.meta.url), 'utf8');
  await getPool().query(sql);
  await truncateAll();
  resetAdapterMap();
}

export async function resetState(): Promise<void> {
  applyTestEnv();
  resetAdapterMap();
  await truncateAll();
}

export function installDbHooks(): void {
  before(async () => {
    await prepareDb();
  });
  beforeEach(async () => {
    await resetState();
  });
  after(async () => {
    await closePool();
  });
}

export async function drainUntilIdle(): Promise<void> {
  for (let i = 0; i < 20; i += 1) {
    const processed = await drainOnce();
    if (processed === 0) return;
  }
  throw new Error('outbox did not drain to idle');
}

export async function count(sql: string, params: unknown[] = []): Promise<number> {
  const result = await getPool().query<{ n: number }>(sql, params);
  return Number(result.rows[0]?.n ?? 0);
}

export async function idleInTransaction(): Promise<number> {
  return count(
    `SELECT count(*)::int AS n
     FROM pg_stat_activity
     WHERE datname = current_database()
       AND state = 'idle in transaction'
       AND application_name = 'hooksteel'`,
  );
}

export async function deadlocks(): Promise<number> {
  return count(
    `SELECT deadlocks::int AS n
     FROM pg_stat_database
     WHERE datname = current_database()`,
  );
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
