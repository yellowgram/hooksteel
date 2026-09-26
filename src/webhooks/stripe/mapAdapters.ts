/** Default Stripe event → adapter names. `invoice.paid` and subscription.deleted persist as ignored. */
export const DEFAULT_ADAPTER_MAP: Readonly<Record<string, readonly string[]>> = Object.freeze({
  'checkout.session.completed': Object.freeze(['grant_credit', 'send_email']),
  'checkout.session.async_payment_succeeded': Object.freeze(['grant_credit', 'send_email']),
  'invoice.paid': Object.freeze([] as readonly string[]),
  'customer.subscription.deleted': Object.freeze([] as readonly string[]),
});

let adapterMap: Readonly<Record<string, readonly string[]>> = DEFAULT_ADAPTER_MAP;

export function configureAdapterMap(map: Readonly<Record<string, readonly string[]>>): void {
  adapterMap = map;
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
