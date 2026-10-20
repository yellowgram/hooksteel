import type { PaymentFamily } from '../../outbox/enqueue.js';

/** Default Stripe event → adapter names. `invoice.paid` and subscription.deleted persist as ignored. */
export const DEFAULT_ADAPTER_MAP: Readonly<Record<string, readonly string[]>> = Object.freeze({
  'checkout.session.completed': Object.freeze(['grant_credit', 'send_email']),
  'checkout.session.async_payment_succeeded': Object.freeze(['grant_credit', 'send_email']),
  'invoice.paid': Object.freeze([] as readonly string[]),
  'customer.subscription.deleted': Object.freeze([] as readonly string[]),
});

let adapterMap: Readonly<Record<string, readonly string[]>> = DEFAULT_ADAPTER_MAP;

const INVOICE_EVENTS = ['invoice.paid', 'invoice.payment_succeeded'] as const;
const PAYMENT_INTENT_EVENTS = ['payment_intent.succeeded', 'charge.succeeded'] as const;

function mappedTo(map: Readonly<Record<string, readonly string[]>>, events: readonly string[], adapter: string): string | null {
  for (const e of events) {
    if (Object.prototype.hasOwnProperty.call(map, e) && (map[e] ?? []).includes(adapter)) return e;
  }
  return null;
}

/**
 * Refuses a map under which one payment would run an adapter twice. Every subscription
 * payment sends `invoice.paid` (keyed by the invoice) and `payment_intent.succeeded` (keyed by
 * the PaymentIntent), and an event payload cannot always link the two (newer Stripe API
 * versions dropped `PaymentIntent.invoice`). So one adapter may be mapped to the invoice events
 * or to the PaymentIntent events, never both.
 */
export function validateAdapterMap(map: Readonly<Record<string, readonly string[]>>): void {
  if (!map || typeof map !== 'object') throw new TypeError('hooksteel: the adapter map must be an object of event type -> adapter names');
  for (const [eventType, adapters] of Object.entries(map)) {
    if (!Array.isArray(adapters) || adapters.some((a) => typeof a !== 'string' || a.length === 0)) {
      throw new TypeError(`hooksteel: adapter map entry "${eventType}" must be a list of adapter names`);
    }
  }
  for (const adapter of new Set(Object.values(map).flat())) {
    const inv = mappedTo(map, INVOICE_EVENTS, adapter);
    const pi = mappedTo(map, PAYMENT_INTENT_EVENTS, adapter);
    if (inv && pi) {
      throw new Error(
        `hooksteel: adapter "${adapter}" is mapped to both ${inv} and ${pi}. One subscription payment sends both events with different ids, so "${adapter}" would run twice. Map it to one of them.`,
      );
    }
  }
}

export function configureAdapterMap(map: Readonly<Record<string, readonly string[]>>): void {
  validateAdapterMap(map);
  adapterMap = map;
}

/**
 * Which payment event besides Checkout the adapter is mapped to, if any. Checkout Sessions are
 * keyed to match it (see paymentIdOf in outbox/enqueue.ts).
 */
export function paymentFamilyOf(adapter: string): PaymentFamily | null {
  if (mappedTo(adapterMap, INVOICE_EVENTS, adapter)) return 'invoice';
  if (mappedTo(adapterMap, PAYMENT_INTENT_EVENTS, adapter)) return 'payment_intent';
  return null;
}

export function resetAdapterMap(): void {
  adapterMap = DEFAULT_ADAPTER_MAP;
}

export function mapAdapters(eventType: string): readonly string[] {
  if (Object.prototype.hasOwnProperty.call(adapterMap, eventType)) {
    return adapterMap[eventType] ?? [];
  }
  return [];
}
