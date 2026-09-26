import path from 'node:path';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import { closePool } from '../src/db/pool.js';
import { listDeadLetters, replayDryRun, replayExecute } from '../src/outbox/replay.js';

const USAGE = 'usage: replay-cli.ts list | dry-run <dead_letter_id> | execute <dead_letter_id>';

export type ReplayArgs =
  | { ok: true; command: 'list' }
  | { ok: true; command: 'dry-run'; id: string }
  | { ok: true; command: 'execute'; id: string }
  | { ok: false; message: string };

/** Argv only. Does not open a pool. */
export function parseReplayArgs(argv: string[]): ReplayArgs {
  if (argv.some((token) => token.startsWith('-'))) {
    return { ok: false, message: USAGE };
  }

  const [command, ...rest] = argv;
  if (command === 'list') {
    if (rest.length !== 0) return { ok: false, message: USAGE };
    return { ok: true, command: 'list' };
  }

  if (command === 'dry-run' || command === 'execute') {
    if (rest.length !== 1 || rest[0] === '') return { ok: false, message: USAGE };
    return { ok: true, command, id: rest[0] };
  }

  return { ok: false, message: USAGE };
}

function writeJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

async function runReplayCli(): Promise<void> {
  const parsed = parseReplayArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(parsed.message);
    process.exit(1);
  }

  try {
    if (parsed.command === 'list') {
      const rows = await listDeadLetters();
      writeJson({ command: 'list', count: rows.length, rows });
    } else if (parsed.command === 'dry-run') {
      const dryRun = await replayDryRun(parsed.id);
      writeJson({ command: 'dry-run', ...dryRun });
    } else {
      const executed = await replayExecute(parsed.id);
      writeJson({
        command: 'execute',
        deadLetterId: parsed.id,
        outboxId: executed.outboxId,
        adapter: executed.adapter,
        next: 'npm run outbox:drain -- --once',
      });
    }
    await closePool();
  } catch (err: unknown) {
    console.error(err instanceof Error ? err.message : err);
    try {
      await closePool();
    } catch {
      // Ignore shutdown errors.
    }
    process.exit(1);
  }
}

function isReplayCliEntrypoint(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

if (isReplayCliEntrypoint()) {
  dotenv.config();
  void runReplayCli();
}
