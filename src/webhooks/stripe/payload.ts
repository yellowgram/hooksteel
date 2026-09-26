import type Stripe from 'stripe';

type StripeObject = {
  id?: string;
  customer?: unknown;
  customer_email?: unknown;
  customer_details?: { email?: unknown };
  amount_total?: unknown;
  amount_paid?: unknown;
  currency?: unknown;
  payment_status?: unknown;
  mode?: unknown;
};

function objectOf(event: Stripe.Event): StripeObject {
  return event.data.object as StripeObject;
}

function emailOf(obj: StripeObject): string | null {
  if (typeof obj.customer_email === 'string' && obj.customer_email.length > 0) {
    return obj.customer_email;
  }
  const nested = obj.customer_details?.email;
  if (typeof nested === 'string' && nested.length > 0) return nested;
  return null;
}

/** Normalized outbox payload. Full event JSON stays on billing_events.payload. */
export function buildOutboxPayload(event: Stripe.Event): Record<string, unknown> {
  const obj = objectOf(event);
  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    return {
      session_id: obj.id ?? null,
      customer: obj.customer ?? null,
      customer_email: emailOf(obj),
      amount_total: obj.amount_total ?? null,
      currency: obj.currency ?? null,
      payment_status: obj.payment_status ?? null,
      mode: obj.mode ?? null,
      account: event.account ?? null,
    };
  }
  if (event.type === 'invoice.paid') {
    return {
      invoice_id: obj.id ?? null,
      customer: obj.customer ?? null,
      customer_email: emailOf(obj),
      amount_paid: obj.amount_paid ?? null,
      currency: obj.currency ?? null,
      account: event.account ?? null,
    };
  }
  return {
    object_id: obj.id ?? null,
    account: event.account ?? null,
  };
}
