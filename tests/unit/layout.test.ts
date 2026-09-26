import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import * as api from '../../src/index.js';

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'chaos' || name === 'node_modules') continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (name.endsWith('.ts')) acc.push(full);
  }
  return acc;
}

test('production entry does not export or import chaos', () => {
  for (const key of Object.keys(api)) {
    assert.equal(/chaos/i.test(key), false, key);
  }
  const indexSrc = readFileSync('src/index.ts', 'utf8');
  assert.doesNotMatch(indexSrc, /chaos/);
  assert.doesNotMatch(indexSrc, /HandleOptions/);
  assert.doesNotMatch(indexSrc, /DrainOptions/);
  assert.equal(typeof api.handle, 'function');
  assert.equal(typeof api.handlePolar, 'function');
  assert.equal(typeof api.mapPolarAdapters, 'function');
  assert.equal(typeof api.buildPolarOutboxPayload, 'function');
  assert.equal(typeof api.configurePolarAdapterMap, 'function');
  assert.equal(typeof api.resetPolarAdapterMap, 'function');
  assert.ok(api.DEFAULT_POLAR_ADAPTER_MAP);

  const roots = ['src', 'scripts', 'examples'];
  for (const root of roots) {
    for (const file of walk(root)) {
      const text = readFileSync(file, 'utf8');
      assert.doesNotMatch(text, /from\s+['"][^'"]*\/chaos(?:\/|['"])/, file);
    }
  }
});

test('root package does not depend on next or a Polar SDK', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
    engines?: { node?: string };
    main?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.equal(deps.next, undefined);
  assert.equal(deps.standardwebhooks, undefined);
  assert.equal(deps.svix, undefined);
  for (const name of Object.keys(deps)) {
    assert.equal(/polar/i.test(name), false, name);
  }
  const nextPkg = JSON.parse(readFileSync('examples/next/package.json', 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const nextDeps = { ...nextPkg.dependencies, ...nextPkg.devDependencies };
  for (const name of Object.keys(nextDeps)) {
    assert.equal(/polar/i.test(name), false, name);
    assert.notEqual(name, 'standardwebhooks', name);
    assert.notEqual(name, 'svix', name);
  }
  assert.match(pkg.engines?.node ?? '', /20/);
  assert.match(pkg.main ?? '', /^(\.\/)?dist\/index\.js$/);
});

test('exactly five chaos tests and the Next route uses request.text()', () => {
  const chaos = readdirSync('tests/chaos').filter((name) => name.endsWith('.test.ts')).sort();
  assert.deepEqual(chaos, [
    '01-duplicate-delivery.test.ts',
    '02-out-of-order.test.ts',
    '03-signature-fail.test.ts',
    '04-handler-timeout.test.ts',
    '05-db-rollback-mid-fulfillment.test.ts',
  ]);
  const route = readFileSync('examples/next/app/api/webhooks/stripe/route.ts', 'utf8');
  assert.match(route, /request\.text\(\)/);
  assert.doesNotMatch(route, /request\.json\(/);
  assert.match(route, /handle\(\{\s*rawBody,\s*signature\s*\}\)/);

  const polarRoute = readFileSync('examples/next/app/api/webhooks/polar/route.ts', 'utf8');
  assert.match(polarRoute, /request\.text\(\)/);
  assert.doesNotMatch(polarRoute, /request\.json\(/);
  assert.match(polarRoute, /handlePolar/);
  assert.doesNotMatch(polarRoute, /@polar-sh\/sdk/);
  assert.equal(existsSync('src/webhooks/polar/README.md'), false);

  const prodFiles = walk('src');
  assert.equal(prodFiles.some((file) => file.endsWith(`${path.sep}hooks.ts`)), false);
  const prod = prodFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
  assert.match(prod, /FOR UPDATE SKIP LOCKED/);
  assert.doesNotMatch(prod, /SERIALIZABLE/);
  assert.doesNotMatch(prod, /LISTEN\s/);
  assert.doesNotMatch(prod, /lease_expires_at/);
  assert.doesNotMatch(prod, /setBeforeCommitHook/);
  assert.doesNotMatch(prod, /setAfterInvocationHook/);
  assert.match(prod, /NODE_ENV === 'production'/);
  assert.match(prod, /ALLOW_CHAOS_INJECT === 'true'/);
});
