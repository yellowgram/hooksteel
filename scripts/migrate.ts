import dotenv from 'dotenv';
import { runCli } from '../src/cli.js';

dotenv.config();
void runCli(['migrate']).then((code) => process.exit(code));
