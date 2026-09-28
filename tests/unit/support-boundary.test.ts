import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const BOUNDARY =
  'Support is GitHub Issues for 60 days from purchase. It is best-effort. There is no SLA. Founder time is at most about 2 hours per week. An Issue must include a failing chaos test name or a test-mode event id. Do not paste live secrets.';

const OUT_OF_SCOPE =
  'Out of scope, and closed without debugging: a hosted gateway or yellowgram-operated ingress; Hookdeck feature parity as a service; coupons or cold invoices; Lock or Audit; implementation services; debugging live keys; India-local ICP customization; expanding the chaos suite or adding fuzzing; treating HookSteel as Credit Ledger. This product is the Polar zip and the public source-available GitHub repository only.';

const BOUNDARY_FILES = [
  'SUPPORT.md',
  'README.md',
  'BUYER_START_HERE.md',
  'docs/POLAR_DELIVERABLES.md',
  'docs/LANDING.md',
  '.github/ISSUE_TEMPLATE/bug_support.yml',
];

const OUT_OF_SCOPE_FILES = [
  'SUPPORT.md',
  'docs/POLAR_DELIVERABLES.md',
  'docs/LANDING.md',
  '.github/ISSUE_TEMPLATE/bug_support.yml',
];

test('support boundary text is identical where buyers and CoS read it', () => {
  for (const file of BOUNDARY_FILES) {
    const text = readFileSync(file, 'utf8');
    assert.equal(text.includes(BOUNDARY), true, file);
  }
  for (const file of OUT_OF_SCOPE_FILES) {
    const text = readFileSync(file, 'utf8');
    assert.equal(text.includes(OUT_OF_SCOPE), true, file);
  }
});

test('purchase refund window is 14 days on the policy surfaces', () => {
  const files = [
    'README.md',
    'BUYER_START_HERE.md',
    'docs/REFUND_GLOSSARY.md',
    'SUPPORT.md',
    'docs/POLAR_DELIVERABLES.md',
    'CHANGELOG.md',
    'docs/STATUS.md',
    'docs/LANDING.md',
    'docs/COMMERCIAL_LOCK.md',
    '.github/ISSUE_TEMPLATE/bug_support.yml',
  ];
  for (const file of files) {
    const raw = readFileSync(file, 'utf8');
    const text = raw.replaceAll('30 days after go-live', '');
    assert.equal(text.includes('14 days'), true, file);
    assert.equal(text.includes('30 days'), false, file);
    assert.equal(text.includes('30-day'), false, file);
    assert.equal(raw.includes('14–30'), false, file);
  }
  const glossary = readFileSync('docs/REFUND_GLOSSARY.md', 'utf8');
  assert.match(glossary, /order\.refunded/);
  assert.match(glossary, /does not claw back credit/);
  assert.match(glossary, /not a refund/);
});

test('the 60s clip is one Stripe and Polar take, and the Polar listing is live', () => {
  const breath = 'use them for ingress; this is the outbox you keep';
  const sell = 'hooksteel-0.1.1.zip';
  const sha = 'e5fb3c1117b954f344fb27e7b1bf7be89d46e120839e238983d017a50e08e4d9';
  const checksums = readFileSync('docs/CHECKSUMS.md', 'utf8');
  assert.equal(checksums.includes(`\`${sell}\` | \`${sha}\``), true);
  for (const file of [
    'README.md',
    'docs/POLAR_DELIVERABLES.md',
    'docs/STATUS.md',
    'docs/LANDING.md',
    'release/README.md',
    'docs/COMMERCIAL_LOCK.md',
  ]) {
    const text = readFileSync(file, 'utf8');
    assert.equal(text.includes(sell), true, file);
    assert.equal(text.includes(sha), true, file);
    assert.equal(text.includes('public source-available'), true, file);
    assert.match(text, /listing is live/i, file);
  }
  const demo = readFileSync('docs/DEMO_60S.md', 'utf8');
  assert.equal(demo.includes(breath), true);
  assert.equal(demo.includes('Hookdeck homepage'), true);
  assert.match(demo, /One continuous take/);
  assert.match(demo, /Not two provider demos/);
  assert.match(demo, /npm run demo:60s/);
  assert.match(demo, /listing is live/i);
  const current = [
    'README.md',
    'SUPPORT.md',
    'BUYER_START_HERE.md',
    'CHANGELOG.md',
    'release/README.md',
    'docs/STATUS.md',
    'docs/POLAR_DELIVERABLES.md',
    'docs/LANDING.md',
    'docs/COMMERCIAL_LOCK.md',
    'docs/DEMO_60S.md',
    'docs/REFUND_GLOSSARY.md',
    'docs/README.md',
    '.github/ISSUE_TEMPLATE/bug_support.yml',
  ];
  const banned = [/listing stays dark/i, /do not publish/i, /release not cut/i, /v0\.1\.1` is not cut/, /v0\.1\.1` is not created/, /\(private\)/];
  for (const file of current) {
    const text = readFileSync(file, 'utf8');
    for (const pattern of banned) {
      assert.equal(pattern.test(text), false, `${file} ${pattern}`);
    }
  }
});

test('demo and pack scripts stay on the existing five chaos files', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
    version: string;
    scripts: Record<string, string>;
  };
  assert.equal(pkg.version, '0.1.1');
  assert.equal(pkg.scripts.demo, 'npm run demo:60s');
  assert.equal(
    pkg.scripts['demo:60s'],
    'tsx --test --test-concurrency=1 tests/chaos/01-duplicate-delivery.test.ts tests/chaos/05-db-rollback-mid-fulfillment.test.ts',
  );
  assert.equal(pkg.scripts['pack:release'], 'bash scripts/pack-release.sh');
  assert.equal(pkg.scripts['replay:list'], 'tsx scripts/replay-cli.ts list');
  assert.equal(pkg.scripts['replay:dry-run'], 'tsx scripts/replay-cli.ts dry-run');
  assert.equal(pkg.scripts['replay:execute'], 'tsx scripts/replay-cli.ts execute');
});

test('Soft-WTP appears once in STATUS; buyer surfaces use coupons language; SECURITY and product buy path exist', () => {
  const status = readFileSync('docs/STATUS.md', 'utf8');
  assert.equal((status.match(/Soft-WTP/g) || []).length, 1);
  assert.match(status, /Soft-WTP stays forbidden/);
  const polar = readFileSync('docs/POLAR_DELIVERABLES.md', 'utf8');
  assert.doesNotMatch(polar, /Soft-WTP/);
  assert.match(polar, /coupon|cold invoices/i);
  assert.equal(readFileSync('SECURITY.md', 'utf8').length > 0, true);
  const readme = readFileSync('README.md', 'utf8');
  assert.match(readme, /yellowgram\.dev\/hooksteel/);
  assert.match(readme, /Paid delta/);
  assert.match(readme, /SECURITY\.md/);
  assert.doesNotMatch(readme, /buy\.polar\.sh/);
});
