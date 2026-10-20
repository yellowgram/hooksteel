import type pg from 'pg';

export function idempotencyKey(provider: string, providerEventId: string, adapter: string): string {
  return `${provider}|${providerEventId}|${adapter}`;
}

export async function enqueueOutbox(
  client: pg.PoolClient,
  row: {
    billingEventId: string;
    adapter: string;
    payload: unknown;
    idempotencyKey: string;
  },
): Promise<void> {
  await client.query(
    // clock_timestamp(), not now(): rows from one event then drain in adapter-map order
    // (now() is the same for the whole transaction, which left the order to the random id).
    `INSERT INTO outbox (billing_event_id, adapter, payload, idempotency_key, created_at)
     VALUES ($1, $2, $3::jsonb, $4, clock_timestamp())`,
    [row.billingEventId, row.adapter, JSON.stringify(row.payload), row.idempotencyKey],
  );
}
