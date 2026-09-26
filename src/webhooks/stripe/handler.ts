import type pg from 'pg';
import type Stripe from 'stripe';
import { getPool } from '../../db/pool.js';
import { enqueueOutbox, idempotencyKey } from '../../outbox/enqueue.js';
import { mapAdapters } from './mapAdapters.js';
import { buildOutboxPayload } from './payload.js';
import { verifyStripeEvent, WebhookRejected } from './verify.js';

export interface HandleInput {
  rawBody: string;
  signature: string | null;
}

/** Optional in-transaction callback. The Next route does not pass this. Tests do. */
export interface HandleOptions {
  beforeCommit?: (client: pg.PoolClient) => Promise<void> | void;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Production always wins, even when ALLOW_CHAOS_INJECT is set. */
function honorChaosHooks(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  return process.env.NODE_ENV === 'test' || process.env.ALLOW_CHAOS_INJECT === 'true';
}

function safeLog(err: unknown): string {
  const message = err instanceof Error ? err.message : 'unexpected error';
  return message.replace(/whsec_[A-Za-z0-9_]+/g, 'whsec_[redacted]');
}

/**
 * Verify a Stripe webhook and persist billing_events + outbox in one transaction.
 * Adapters are never called here. Callers must pass the raw body string (not JSON.parse'd).
 */
export async function handle(input: HandleInput, options?: HandleOptions): Promise<Response> {
  let event: Stripe.Event;
  try {
    event = verifyStripeEvent(input.rawBody, input.signature);
  } catch (err) {
    if (err instanceof WebhookRejected) {
      return json(400, { ok: false, error: err.code });
    }
    console.error('hooksteel verify failed', safeLog(err));
    return json(500, { ok: false, error: 'transient' });
  }

  let client: pg.PoolClient;
  try {
    client = await getPool().connect();
  } catch (err) {
    console.error('hooksteel database unavailable', safeLog(err));
    return json(500, { ok: false, error: 'transient' });
  }

  let committed = false;
  try {
    await client.query('BEGIN');
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO billing_events (
         provider, provider_event_id, livemode, event_type, payload, status
       ) VALUES ('stripe', $1, $2, $3, $4::jsonb, 'received')
       ON CONFLICT (provider, provider_event_id) DO NOTHING
       RETURNING id`,
      [event.id, event.livemode, event.type, input.rawBody],
    );

    if (inserted.rows.length === 0) {
      await client.query('COMMIT');
      committed = true;
      return json(200, { ok: true, outcome: 'duplicate' });
    }

    const billingEventId = inserted.rows[0].id;
    const adapters = mapAdapters(event.type);
    if (adapters.length === 0) {
      // Drain never visits a row with zero children, so mark it processed here.
      await client.query(
        `UPDATE billing_events SET status = 'ignored', processed_at = now() WHERE id = $1`,
        [billingEventId],
      );
    } else {
      const payload = buildOutboxPayload(event);
      for (const adapter of adapters) {
        await enqueueOutbox(client, {
          billingEventId,
          adapter,
          payload,
          idempotencyKey: idempotencyKey('stripe', event.id, adapter),
        });
      }
      await client.query(`UPDATE billing_events SET status = 'outboxed' WHERE id = $1`, [billingEventId]);
    }

    if (honorChaosHooks() && options?.beforeCommit) await options.beforeCommit(client);
    await client.query('COMMIT');
    committed = true;
    return json(200, {
      ok: true,
      outcome: adapters.length === 0 ? 'ignored' : 'outboxed',
    });
  } catch (err) {
    console.error('hooksteel webhook transaction failed', safeLog(err));
    return json(500, { ok: false, error: 'transient' });
  } finally {
    if (!committed) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Already aborted.
      }
    }
    client.release();
  }
}
