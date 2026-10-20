#!/usr/bin/env node
/**
 * hooksteel migrate | drain [--once] | replay list | replay dry-run <id> | replay execute <id>
 *
 * Reads DATABASE_URL (and a .env in the working directory, if present).
 */
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import { closePool } from './db/pool.js';
import { migrate } from './db/migrate.js';
import { drainOnce } from './outbox/drain.js';
import { listDeadLetters, replayDryRun, replayExecute } from './outbox/replay.js';

export const REPLAY_USAGE = 'usage: hooksteel replay list | dry-run <dead_letter_id> | execute <dead_letter_id>';
const USAGE = `usage:
  hooksteel migrate                       apply HookSteel's migrations
  hooksteel drain [--once]                run the outbox worker (--once: one batch, then exit)
  hooksteel replay list                   list dead letters not yet replayed
  hooksteel replay dry-run <id>           show what execute would run; writes nothing
  hooksteel replay execute <id>           re-open one dead letter for the worker`;

export type ReplayArgs =
  | { ok: true; command: 'list' }
  | { ok: true; command: 'dry-run'; id: string }
  | { ok: true; command: 'execute'; id: string }
  | { ok: false; message: string };

/** Argv only. Does not open a pool. Flags are refused so nothing is replayed in bulk by accident. */
export function parseReplayArgs(argv: string[]): ReplayArgs {
  if (argv.some((token) => token.startsWith('-'))) return { ok: false, message: REPLAY_USAGE };
  const [command, ...rest] = argv;
  if (command === 'list') {
    return rest.length === 0 ? { ok: true, command: 'list' } : { ok: false, message: REPLAY_USAGE };
  }
  if (command === 'dry-run' || command === 'execute') {
    if (rest.length !== 1 || rest[0] === '') return { ok: false, message: REPLAY_USAGE };
    return { ok: true, command, id: rest[0] };
  }
  return { ok: false, message: REPLAY_USAGE };
}

function writeJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

async function replay(argv: string[]): Promise<number> {
  const parsed = parseReplayArgs(argv);
  if (!parsed.ok) {
    console.error(parsed.message);
    return 1;
  }
  if (parsed.command === 'list') {
    const rows = await listDeadLetters();
    writeJson({ command: 'list', count: rows.length, rows });
  } else if (parsed.command === 'dry-run') {
    writeJson({ command: 'dry-run', ...(await replayDryRun(parsed.id)) });
  } else {
    const executed = await replayExecute(parsed.id);
    writeJson({
      command: 'execute',
      deadLetterId: parsed.id,
      outboxId: executed.outboxId,
      adapter: executed.adapter,
      next: 'the worker picks it up on its next pass (hooksteel drain --once to run it now)',
    });
  }
  return 0;
}

/**
 * The worker loop. On SIGTERM or SIGINT it finishes the row in hand, then exits, so a
 * deploy does not leave a row to wait out its lease.
 */
export async function drainLoop(signal: AbortSignal, idleMs = 1000): Promise<void> {
  while (!signal.aborted) {
    const processed = await drainOnce();
    if (processed === 0 && !signal.aborted) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, idleMs);
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          resolve();
        }, { once: true });
      });
    }
  }
}

async function drain(argv: string[]): Promise<number> {
  const unknown = argv.filter((arg) => arg !== '--once');
  if (unknown.length > 0) {
    console.error(USAGE);
    return 1;
  }
  if (argv.includes('--once')) {
    console.log(`outbox drain --once processed ${await drainOnce()}`);
    return 0;
  }
  const stop = new AbortController();
  for (const sig of ['SIGTERM', 'SIGINT'] as const) {
    process.once(sig, () => {
      console.log(`outbox drain: ${sig}, finishing the current batch`);
      stop.abort();
    });
  }
  await drainLoop(stop.signal);
  return 0;
}

export async function runCli(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  try {
    if (command === 'migrate' && rest.length === 0) {
      const ran = await migrate();
      console.log(ran.length === 0 ? 'migrations up to date' : `applied: ${ran.join(', ')}`);
      return 0;
    }
    if (command === 'drain') return await drain(rest);
    if (command === 'replay') return await replay(rest);
    console.error(USAGE);
    return 1;
  } catch (err: unknown) {
    console.error(err instanceof Error ? err.message : err);
    return 1;
  } finally {
    try {
      await closePool();
    } catch {
      // Ignore shutdown errors.
    }
  }
}

function isEntrypoint(): boolean {
  // npm runs bins through a symlink in node_modules/.bin, so compare real paths.
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(path.resolve(entry))).href;
  } catch {
    return false;
  }
}

if (isEntrypoint()) {
  dotenv.config({ quiet: true });
  void runCli(process.argv.slice(2)).then((code) => process.exit(code));
}
