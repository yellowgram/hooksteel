import type pg from 'pg';
import { getPool } from '../../db/pool.js';
import { enqueueOutbox, idempotencyKey } from '../../outbox/enqueue.js';
import { mapPolarAdapters } from './mapAdapters.js';
import { buildPolarOutboxPayload } from './payload.js';
import { verifyPolarWebhook, PolarWebhookRejected } from './verify.js';

export interface PolarHandleInput {
  rawBody: string;
  webhookId: string | null;
  webhookTimestamp: string | null;
  webhookSignature: string | null;
}

/** Optional in-transaction callback. The Next route does not pass this. Tests do. */
export interface PolarHandleOptions {
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
  return message.replace(/whsec_[A-Za-z0-9+/=]+/g, 'whsec_[redacted]');
}

/**
 * Verify a Polar webhook and persist billing_events + outbox in one transaction.
 * Adapters are never called here. Callers must pass the raw body string (not JSON.parse'd).
 * provider_event_id is the webhook-id header, never data.id.
 */
export async function handlePolar(input: PolarHandleInput, options?: PolarHandleOptions): Promise<Response> {
  let verified: ReturnType<typeof verifyPolarWebhook>;
  try {
    verified = verifyPolarWebhook(input);
  } catch (err) {
    if (err instanceof PolarWebhookRejected) {
      return json(400, { ok: false, error: err.code });
    }
    console.error('hooksteel polar verify failed', safeLog(err));
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
       ) VALUES ('polar', $1, $2, $3, $4::jsonb, 'received')
       ON CONFLICT (provider, provider_event_id) DO NOTHING
       RETURNING id`,
      [verified.webhookId, verified.livemode, verified.event.type, input.rawBody],
    );

    if (inserted.rows.length === 0) {
      await client.query('COMMIT');
      committed = true;
      return json(200, { ok: true, outcome: 'duplicate' });
    }

    const billingEventId = inserted.rows[0].id;
    const adapters = mapPolarAdapters(verified.event.type);
    if (adapters.length === 0) {
      await client.query(
        `UPDATE billing_events SET status = 'ignored', processed_at = now() WHERE id = $1`,
        [billingEventId],
      );
    } else {
      const payload = buildPolarOutboxPayload(verified.event);
      for (const adapter of adapters) {
        await enqueueOutbox(client, {
          billingEventId,
          adapter,
          payload,
          idempotencyKey: idempotencyKey('polar', verified.webhookId, adapter),
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
    console.error('hooksteel polar webhook transaction failed', safeLog(err));
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
