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

export type PaymentFamily = 'invoice' | 'payment_intent';

/**
 * The payment an event is about, for events that report a successful payment. One payment
 * can arrive as several events with different ids: an invoice and the PaymentIntent that paid
 * it, or a Checkout Session that carries both. `family` is the other payment event the adapter
 * is mapped to (see paymentFamilyOf in webhooks/stripe/mapAdapters.ts), so a Checkout Session
 * is keyed by the id that event will carry: its invoice for `invoice.paid`, its PaymentIntent
 * for `payment_intent.succeeded`.
 */
export function paymentIdOf(provider: string, eventType: string, obj: unknown, family?: PaymentFamily | null): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  if (provider === 'stripe') {
    switch (eventType) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        if (family === 'invoice') return idOf(o.invoice) ?? idOf(o.payment_intent) ?? objectIdOf(o);
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
 * report a successful payment (see paymentIdOf). Every other event runs each adapter once:
 * `provider|event type|object id|evt:<event id>|adapter`. Those events can repeat for one object
 * (`customer.subscription.updated` fires on every change), so keying them on the object alone
 * would run the adapter for the first change only.
 */
export function idempotencyKey(
  provider: string,
  eventType: string,
  obj: unknown,
  fallbackId: string,
  adapter: string,
  family?: PaymentFamily | null,
): string {
  const payment = paymentIdOf(provider, eventType, obj, family);
  if (payment) return `${provider}|pay:${payment}|${adapter}`;
  return `${provider}|${eventType}|${objectIdOf(obj) ?? '-'}|evt:${fallbackId}|${adapter}`;
}

/**
 * True when an adapter that is also mapped to another payment event must skip this
 * subscription-mode Checkout Session and leave the grant to that event, because the session
 * cannot carry the id that event will be keyed by:
 * - mapped to `payment_intent.succeeded` / `charge.succeeded`: a subscription session never has
 *   a PaymentIntent of its own (Stripe sets `payment_intent` only in payment mode), so it always
 *   skips; each charged invoice arrives as `payment_intent.succeeded`.
 * - mapped to `invoice.paid` / `invoice.payment_succeeded`: a session with no `invoice` id (Stripe
 *   sets it only "if it exists", for example not yet for a billing-cycle anchor) skips; the first
 *   invoice arrives as `invoice.paid`. With an invoice id the session is keyed by it instead.
 * Keying by the subscription id is not safe: `invoice.paid` carries the invoice id, and where an
 * invoice names its subscription differs by API version.
 */
export function fulfilledByLaterEvent(provider: string, eventType: string, obj: unknown, family?: PaymentFamily | null): boolean {
  if (provider !== 'stripe' || !family || !eventType.startsWith('checkout.session.')) return false;
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  const subscription = o.mode === 'subscription' || idOf(o.subscription) !== null;
  if (!subscription) return false;
  if (family === 'payment_intent') return idOf(o.payment_intent) === null;
  return idOf(o.invoice) === null;
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
