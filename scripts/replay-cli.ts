import path from 'node:path';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import { runCli } from '../src/cli.js';

export { parseReplayArgs, type ReplayArgs } from '../src/cli.js';

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(path.resolve(entry)).href) {
  dotenv.config();
  void runCli(['replay', ...process.argv.slice(2)]).then((code) => process.exit(code));
}
