import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const SEALED_V010_SHA256 = 'dddcfe5dca204cd92b2c1b2a10adbb99515d0552a4a5947693aff34a29573a65';
const SEALED_V011_SHA256 = 'e5fb3c1117b954f344fb27e7b1bf7be89d46e120839e238983d017a50e08e4d9';

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, out);
    else out.push(path);
  }
}

test('LICENSE is the MIT License for yellowgram', () => {
  const text = readFileSync('LICENSE', 'utf8');
  assert.match(text, /^MIT License\n\nCopyright \(c\) 2026 yellowgram\n/);
  assert.match(text, /Permission is hereby granted, free of charge, to any person obtaining a copy/);
  assert.match(text, /THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND/);
  assert.equal(/PolyForm/i.test(text), false);
});

test('package.json is MIT and publishable', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
    license: string;
    private?: boolean;
    homepage: string;
    repository: { url: string };
  };
  assert.equal(pkg.license, 'MIT');
  assert.equal(pkg.private, undefined);
  assert.equal(pkg.homepage, 'https://www.yellowgram.dev/oss');
  assert.match(pkg.repository.url, /github\.com\/yellowgram\/hooksteel/);
});

test('tree has no old-license fence or Polar checkout URL', () => {
  const files: string[] = [];
  walk('.', files);
  const checkoutHost = Buffer.from(['buy', 'polar.sh'].join('.'));
  const checkoutId = Buffer.from(['polar', 'cl_'].join('_'));
  for (const file of files) {
    if (file.endsWith('.zip') || file === 'CHANGELOG.md' || file.endsWith('license-mit.test.ts')) continue;
    const bytes = readFileSync(file);
    assert.equal(bytes.includes(checkoutHost), false, file);
    assert.equal(bytes.includes(checkoutId), false, file);
    const text = bytes.toString('utf8');
    assert.equal(/PolyForm|COMMERCIAL_GRANT|commercial grant/i.test(text), false, file);
  }
});

test('historical release zips are unchanged', () => {
  const v010 = createHash('sha256').update(readFileSync('release/hooksteel-0.1.0.zip')).digest('hex');
  assert.equal(v010, SEALED_V010_SHA256);
  const v011 = createHash('sha256').update(readFileSync('release/hooksteel-0.1.1.zip')).digest('hex');
  assert.equal(v011, SEALED_V011_SHA256);
});

test('demo script stays on the two chaos files', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
  assert.equal(pkg.scripts.demo, 'npm run demo:60s');
  assert.equal(
    pkg.scripts['demo:60s'],
    'tsx --test --test-concurrency=1 tests/chaos/01-duplicate-delivery.test.ts tests/chaos/05-db-rollback-mid-fulfillment.test.ts',
  );
  assert.equal(pkg.scripts['replay:list'], 'tsx scripts/replay-cli.ts list');
  assert.equal(pkg.scripts['replay:dry-run'], 'tsx scripts/replay-cli.ts dry-run');
  assert.equal(pkg.scripts['replay:execute'], 'tsx scripts/replay-cli.ts execute');
});
