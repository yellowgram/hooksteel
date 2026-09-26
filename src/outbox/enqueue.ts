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
    `INSERT INTO outbox (billing_event_id, adapter, payload, idempotency_key)
     VALUES ($1, $2, $3::jsonb, $4)`,
    [row.billingEventId, row.adapter, JSON.stringify(row.payload), row.idempotencyKey],
  );
}
