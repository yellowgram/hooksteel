import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const POLYFORM_SHA256 = 'ffcca38841adb694b6f380647e15f17c446a4d1656fed51a1e2041d064c94cc8';
const HEADER_SHA256 = 'd308862a5f8b9adb953c77896b331c3087968cbf4c03ee965a0a985751fb39cf';
const SEALED_V010_SHA256 = 'dddcfe5dca204cd92b2c1b2a10adbb99515d0552a4a5947693aff34a29573a65';
const MARKER = '# PolyForm Noncommercial License 1.0.0\n';

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, out);
    else out.push(path);
  }
}

test('LICENSE public body is the official PolyForm Noncommercial 1.0.0 text', () => {
  const text = readFileSync('LICENSE', 'utf8');
  const idx = text.indexOf(MARKER);
  assert.ok(idx > 0, 'PolyForm body missing');
  const header = text.slice(0, idx);
  const body = text.slice(idx);
  assert.equal(createHash('sha256').update(body).digest('hex'), POLYFORM_SHA256);
  assert.equal(createHash('sha256').update(header).digest('hex'), HEADER_SHA256);
  assert.match(header, /Copyright \(c\) 2026 yellowgram\n/);
  assert.match(header, /docs\/COMMERCIAL_GRANT\.md/);
  assert.match(header, /source-available = true/);
  assert.equal(
    header.includes('Required Notice: Copyright yellowgram (https://www.yellowgram.dev)\n'),
    true,
  );
  assert.equal(body.includes('<https://polyformproject.org/licenses/noncommercial/1.0.0>'), true);
});

test('package.json names PolyForm and does not claim MIT', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string; license: string };
  assert.equal(pkg.version, '0.1.1');
  assert.equal(pkg.license, 'LicenseRef-PolyForm-Noncommercial-1.0.0');
  assert.equal(pkg.license.includes('MIT'), false);
});

test('buyer-facing tree has no Polar checkout URL', () => {
  const files: string[] = [];
  walk('.', files);
  for (const file of files) {
    if (file.endsWith('.zip')) continue;
    const bytes = readFileSync(file);
    const checkoutHost = Buffer.from(['buy', 'polar.sh'].join('.'));
    const checkoutId = Buffer.from(['polar', 'cl_'].join('_'));
    assert.equal(bytes.includes(checkoutHost), false, file);
    assert.equal(bytes.includes(checkoutId), false, file);
  }
});

test('sealed hooksteel-0.1.0.zip is unchanged', () => {
  const digest = createHash('sha256').update(readFileSync('release/hooksteel-0.1.0.zip')).digest('hex');
  assert.equal(digest, SEALED_V010_SHA256);
});
