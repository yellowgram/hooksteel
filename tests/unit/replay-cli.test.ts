import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseReplayArgs } from '../../scripts/replay-cli.js';

const usage = 'usage: replay-cli.ts list | dry-run <dead_letter_id> | execute <dead_letter_id>';

test('parseReplayArgs accepts list, dry-run, and execute', () => {
  assert.deepEqual(parseReplayArgs(['list']), { ok: true, command: 'list' });
  assert.deepEqual(parseReplayArgs(['dry-run', '00000000-0000-4000-8000-000000000001']), {
    ok: true,
    command: 'dry-run',
    id: '00000000-0000-4000-8000-000000000001',
  });
  assert.deepEqual(parseReplayArgs(['execute', 'dl_raw_token']), {
    ok: true,
    command: 'execute',
    id: 'dl_raw_token',
  });
});

test('parseReplayArgs rejects empty id, a second id, flags, unknown commands, and list extras', () => {
  const rejected = [
    [],
    ['list', 'extra'],
    ['list', ''],
    ['dry-run'],
    ['dry-run', ''],
    ['dry-run', 'one', 'two'],
    ['execute'],
    ['execute', ''],
    ['execute', 'one', 'two'],
    ['inspect', 'id'],
    ['hooksteel-replay', 'list'],
    ['LIST'],
    ['--force'],
    ['--all'],
    ['--drain'],
    ['--yes'],
    ['--open'],
    ['--operator', 'ada'],
    ['dry-run', '--force'],
    ['execute', 'id', '--drain'],
    ['list', '--open'],
    ['execute', '--all', 'id'],
  ];

  for (const argv of rejected) {
    assert.deepEqual(parseReplayArgs(argv), { ok: false, message: usage }, JSON.stringify(argv));
  }
});
