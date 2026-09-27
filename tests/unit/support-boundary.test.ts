import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const BOUNDARY =
  'Support is GitHub Issues for 60 days from purchase. It is best-effort. There is no SLA. Founder time is at most about 2 hours per week. An Issue must include a failing chaos test name or a test-mode event id. Do not paste live secrets.';

const OUT_OF_SCOPE =
  'Out of scope, and closed without debugging: a hosted gateway or yellowgram-operated ingress; Hookdeck feature parity as a service; Soft-WTP; Lock or Audit; implementation services; debugging live keys; India-local ICP customization; expanding the chaos suite or adding fuzzing; treating HookSteel as Credit Ledger. This product is the download and private GitHub access only.';

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

test('purchase refund window is 30 days on the policy surfaces', () => {
  const files = [
    'README.md',
    'BUYER_START_HERE.md',
    'docs/REFUND_GLOSSARY.md',
    'SUPPORT.md',
    'docs/POLAR_DELIVERABLES.md',
    'CHANGELOG.md',
    'docs/STATUS.md',
    'docs/LANDING.md',
    '.github/ISSUE_TEMPLATE/bug_support.yml',
  ];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    assert.equal(text.includes('30 days'), true, file);
    assert.equal(text.includes('14 days'), false, file);
    assert.equal(text.includes('14–30'), false, file);
  }
  const glossary = readFileSync('docs/REFUND_GLOSSARY.md', 'utf8');
  assert.match(glossary, /order\.refunded/);
  assert.match(glossary, /does not claw back credit/);
  assert.match(glossary, /not a refund/);
});

test('the 60s clip is one Stripe and Polar take, and Polar waits on distribution', () => {
  const clip = 'CoS do not list while the listing is dark, there is no founder-approved clip, and there is no distribution post.';
  const breath = 'use them for ingress; this is the outbox you keep';
  for (const file of ['docs/DEMO_60S.md', 'docs/POLAR_DELIVERABLES.md', 'docs/STATUS.md', 'docs/LANDING.md', 'release/README.md']) {
    const text = readFileSync(file, 'utf8');
    assert.equal(text.includes(clip), true, file);
    assert.equal(text.includes(breath), true, file);
    assert.equal(text.includes('Hookdeck homepage'), true, file);
  }
  const demo = readFileSync('docs/DEMO_60S.md', 'utf8');
  assert.match(demo, /One continuous take/);
  assert.match(demo, /Not two provider demos/);
  assert.match(demo, /npm run demo:60s/);
});

test('demo and pack scripts stay on the existing five chaos files', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
    version: string;
    scripts: Record<string, string>;
  };
  assert.equal(pkg.version, '0.1.1');
  assert.equal(
    pkg.scripts['demo:60s'],
    'tsx --test --test-concurrency=1 tests/chaos/01-duplicate-delivery.test.ts tests/chaos/05-db-rollback-mid-fulfillment.test.ts',
  );
  assert.equal(pkg.scripts['pack:release'], 'bash scripts/pack-release.sh');
  assert.equal(pkg.scripts['replay:list'], 'tsx scripts/replay-cli.ts list');
  assert.equal(pkg.scripts['replay:dry-run'], 'tsx scripts/replay-cli.ts dry-run');
  assert.equal(pkg.scripts['replay:execute'], 'tsx scripts/replay-cli.ts execute');
});
