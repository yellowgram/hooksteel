import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { drainLoop } from '../../src/cli.js';
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
  while ((await count('SELECT count(*) FROM outbox WHERE completed_at IS NULL')) > 0) {
    assert.ok(Date.now() < deadline, 'loop drained the outbox');
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  stop.abort();
  await withTimeout(loop, 1000);
});
