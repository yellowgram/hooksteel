import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { drainLoop, loadAdapters } from '../../src/cli.js';
import { registerAdapter, resetAdapters } from '../../src/adapters/registry.js';
import { getPool } from '../../src/db/pool.js';
import { drainOnce } from '../../src/outbox/drain.js';
import { MIGRATIONS_DIR, migrate } from '../../src/db/migrate.js';
import { handle } from '../../src/webhooks/stripe/handler.js';
import { checkoutBody, signBody } from '../fixtures/stripe/sign.js';
import { count, installDbHooks, withTimeout } from '../setup/harness.js';

installDbHooks();

test('migrate uses the migrations shipped with the package, not the caller\'s working directory', async () => {
  assert.equal(path.basename(MIGRATIONS_DIR), 'migrations');
  const elsewhere = mkdtempSync(path.join(tmpdir(), 'hs-cwd-'));
  mkdirSync(path.join(elsewhere, 'migrations'));
  writeFileSync(path.join(elsewhere, 'migrations', '001_app.sql'), 'SELECT 1/0;');
  const cwd = process.cwd();
  process.chdir(elsewhere);
  try {
    assert.deepEqual(await migrate(), []);
  } finally {
    process.chdir(cwd);
  }
});

test('drain loop works the queue, then stops promptly when aborted', async () => {
  const body = checkoutBody({ id: 'evt_cli_loop' });
  const res = await handle({ rawBody: body, signature: signBody(body) });
  assert.equal(res.status, 200);

  const stop = new AbortController();
  const loop = drainLoop(stop.signal, 60_000);
  const deadline = Date.now() + 5000;
  while ((await count('SELECT count(*)::int AS n FROM outbox WHERE completed_at IS NULL')) > 0) {
    assert.ok(Date.now() < deadline, 'loop drained the outbox');
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  stop.abort();
  await withTimeout(loop, 1000);
});

test('outside tests the built-in example adapters refuse, and a registered adapter runs instead', async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const body = checkoutBody({ id: 'evt_example_refused' });
    assert.equal((await handle({ rawBody: body, signature: signBody(body) })).status, 200);
    await drainOnce();
    assert.equal(await count('SELECT count(*)::int AS n FROM outbox WHERE completed_at IS NOT NULL'), 0, 'nothing marked done');
    assert.equal(
      await count('SELECT count(*)::int AS n FROM outbox WHERE strpos(last_error, $1) > 0', ['built-in example']),
      2,
      'both rows say why',
    );

    const ran: string[] = [];
    const dir = mkdtempSync(path.join(tmpdir(), 'hs-adapters-'));
    const file = path.join(dir, 'adapters.mjs');
    writeFileSync(
      file,
      `export const adapters = ['grant_credit', 'send_email'].map((name) => ({ name, execute: async (ctx) => { globalThis.__hsRan.push(name + ':' + ctx.idempotencyKey); } }));`,
    );
    (globalThis as { __hsRan?: string[] }).__hsRan = ran;
    assert.deepEqual(await loadAdapters(file), ['grant_credit', 'send_email']);
    await getPool().query('UPDATE outbox SET available_at = now()');
    await drainOnce();
    assert.deepEqual(ran.sort(), ['grant_credit:stripe|evt_example_refused|grant_credit', 'send_email:stripe|evt_example_refused|send_email']);
    assert.equal(await count('SELECT count(*)::int AS n FROM outbox WHERE completed_at IS NULL'), 0);
  } finally {
    process.env.NODE_ENV = previous;
    resetAdapters();
  }
});

test('registerAdapter rejects malformed adapters', () => {
  assert.throws(() => registerAdapter({ name: '', execute: async () => undefined }), TypeError);
  assert.throws(() => registerAdapter({ name: 'x' } as never), TypeError);
});
