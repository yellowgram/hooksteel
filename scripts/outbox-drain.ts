import dotenv from 'dotenv';
import { closePool } from '../src/db/pool.js';
import { drainOnce } from '../src/outbox/drain.js';

dotenv.config();

const once = process.argv.includes('--once');

async function loop(): Promise<void> {
  for (;;) {
    const processed = await drainOnce();
    if (processed === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

if (once) {
  drainOnce()
    .then(async (processed) => {
      console.log(`outbox drain --once processed ${processed}`);
      await closePool();
    })
    .catch(async (err: unknown) => {
      console.error(err instanceof Error ? err.message : err);
      try {
        await closePool();
      } catch {
        // Ignore shutdown errors.
      }
      process.exit(1);
    });
} else {
  loop().catch(async (err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    try {
      await closePool();
    } catch {
      // Ignore shutdown errors.
    }
    process.exit(1);
  });
}
