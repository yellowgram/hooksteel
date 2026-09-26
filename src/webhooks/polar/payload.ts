const CHECKOUT_TYPES = new Set(['checkout.created', 'checkout.updated', 'checkout.expired']);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function customerEmail(data: Record<string, unknown>): string | null {
  const customer = asRecord(data.customer);
  if (!customer) return null;
  return typeof customer.email === 'string' ? customer.email : null;
}

/**
 * Normalized outbox payload. Field names match the existing grant_credit / send_email stubs.
 * Full event JSON stays on billing_events.payload. `total_amount` of 0 is a real amount.
 */
export function buildPolarOutboxPayload(event: { type: string; data?: unknown }): Record<string, unknown> {
  const data = asRecord(event.data) ?? {};
  if (event.type === 'order.paid') {
    return {
      order_id: data.id ?? null,
      customer: data.customer_id ?? null,
      customer_email: customerEmail(data),
      amount_total: data.total_amount ?? null,
      currency: data.currency ?? null,
      status: data.status ?? null,
      paid: data.paid ?? null,
      billing_reason: data.billing_reason ?? null,
    };
  }
  if (CHECKOUT_TYPES.has(event.type)) {
    return {
      checkout_id: data.id ?? null,
      customer: data.customer_id ?? null,
      customer_email: customerEmail(data),
      amount_total: data.total_amount ?? null,
      currency: data.currency ?? null,
      status: data.status ?? null,
    };
  }
  return {
    object_id: data.id ?? null,
  };
}
