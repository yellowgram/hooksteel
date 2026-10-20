import dotenv from 'dotenv';
import { runCli } from '../src/cli.js';

dotenv.config();
void runCli(['drain', ...process.argv.slice(2)]).then((code) => process.exit(code));
