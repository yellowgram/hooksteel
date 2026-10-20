import type pg from 'pg';

/** The billed object's id (`data.object.id` for Stripe, `data.id` for Polar), if it has one. */
export function objectIdOf(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const id = (obj as { id?: unknown }).id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * One fulfilment per (event type, billed object, adapter). Providers can send two
 * different events for one change (Stripe: "in some cases, two separate Event objects
 * are generated"), so the event id alone would fulfil twice. Falls back to the event id
 * only when the event carries no object id.
 */
export function idempotencyKey(provider: string, eventType: string, objectId: string, adapter: string): string {
  return `${provider}|${eventType}|${objectId}|${adapter}`;
}

export async function enqueueOutbox(
  client: pg.PoolClient,
  row: {
    billingEventId: string;
    adapter: string;
    payload: unknown;
    idempotencyKey: string;
  },
): Promise<boolean> {
  const r = await client.query(
    // clock_timestamp(), not now(): rows from one event then drain in adapter-map order
    // (now() is the same for the whole transaction, which left the order to the random id).
    `INSERT INTO outbox (billing_event_id, adapter, payload, idempotency_key, created_at)
     VALUES ($1, $2, $3::jsonb, $4, clock_timestamp())
     ON CONFLICT (idempotency_key) DO NOTHING`,
    [row.billingEventId, row.adapter, JSON.stringify(row.payload), row.idempotencyKey],
  );
  if (r.rowCount === 0) {
    console.warn(JSON.stringify({ event: 'duplicate_object', adapter: row.adapter, idempotency_key: row.idempotencyKey }));
  }
  return (r.rowCount ?? 0) > 0;
}
