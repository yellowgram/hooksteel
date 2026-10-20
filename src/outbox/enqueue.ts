import type pg from 'pg';

/** The billed object's id (`data.object.id` for Stripe, `data.id` for Polar), if it has one. */
export function objectIdOf(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const id = (obj as { id?: unknown }).id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

function idOf(v: unknown): string | null {
  if (typeof v === 'string' && v.length > 0) return v;
  return objectIdOf(v);
}

/**
 * The payment an event is about, for events that report a successful payment. One payment
 * can arrive as several events of different types (Checkout `completed` then
 * `async_payment_succeeded` for a delayed payment, Checkout plus `payment_intent.succeeded`,
 * a subscription Checkout plus its first `invoice.paid`), so fulfilment is keyed on the
 * payment, not on the event type.
 */
export function paymentIdOf(provider: string, eventType: string, obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  if (provider === 'stripe') {
    switch (eventType) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        return idOf(o.payment_intent) ?? idOf(o.invoice) ?? objectIdOf(o);
      case 'payment_intent.succeeded':
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        return objectIdOf(o);
      case 'charge.succeeded':
        return idOf(o.payment_intent) ?? objectIdOf(o);
      default:
        return null;
    }
  }
  if (provider === 'polar') {
    return eventType === 'order.paid' || eventType === 'order.created' ? objectIdOf(o) : null;
  }
  return null;
}

/**
 * True when the event is about a payment that has not been made yet: a Stripe Checkout
 * Session with `payment_status: "unpaid"` (a delayed method such as ACH or SEPA; Stripe sends
 * `checkout.session.async_payment_succeeded` when the money arrives), or a Polar order that is
 * not paid. Nothing is queued for such an event, so no adapter grants before payment.
 */
export function awaitingPayment(provider: string, eventType: string, obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  if (provider === 'stripe') return eventType.startsWith('checkout.session.') && o.payment_status === 'unpaid';
  if (provider === 'polar') return eventType.startsWith('order.') && (o.paid === false || o.status === 'pending');
  return false;
}

/**
 * One fulfilment per payment and adapter: `provider|pay:<payment id>|adapter` for events that
 * report a successful payment (see paymentIdOf). Other events keep one run per (event type,
 * billed object, adapter): `provider|event type|object id|adapter`, falling back to the event
 * id only when the event carries no object id.
 */
export function idempotencyKey(provider: string, eventType: string, obj: unknown, fallbackId: string, adapter: string): string {
  const payment = paymentIdOf(provider, eventType, obj);
  if (payment) return `${provider}|pay:${payment}|${adapter}`;
  return `${provider}|${eventType}|${objectIdOf(obj) ?? fallbackId}|${adapter}`;
}

export async function enqueueOutbox(
  client: pg.PoolClient,
  row: {
    billingEventId: string;
    adapter: string;
    payload: unknown;
    idempotencyKey: string;
    providerEventId?: string;
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
    console.warn(JSON.stringify({ event: 'duplicate_payment_or_object', provider_event_id: row.providerEventId, adapter: row.adapter, idempotency_key: row.idempotencyKey }));
  }
  return (r.rowCount ?? 0) > 0;
}
