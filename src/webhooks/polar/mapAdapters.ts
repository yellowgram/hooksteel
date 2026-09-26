/** Default Polar event → adapter names. Empty lists are persisted as ignored. */
export const DEFAULT_POLAR_ADAPTER_MAP: Readonly<Record<string, readonly string[]>> = Object.freeze({
  'order.paid': Object.freeze(['grant_credit', 'send_email']),
  'order.created': Object.freeze([] as readonly string[]),
  'order.updated': Object.freeze([] as readonly string[]),
  'order.refunded': Object.freeze([] as readonly string[]),
  'checkout.created': Object.freeze([] as readonly string[]),
  'checkout.updated': Object.freeze([] as readonly string[]),
  'checkout.expired': Object.freeze([] as readonly string[]),
  'subscription.canceled': Object.freeze([] as readonly string[]),
  'subscription.revoked': Object.freeze([] as readonly string[]),
});

let adapterMap: Readonly<Record<string, readonly string[]>> = DEFAULT_POLAR_ADAPTER_MAP;

export function configurePolarAdapterMap(map: Readonly<Record<string, readonly string[]>>): void {
  adapterMap = map;
}

export function resetPolarAdapterMap(): void {
  adapterMap = DEFAULT_POLAR_ADAPTER_MAP;
}

export function mapPolarAdapters(eventType: string): readonly string[] {
  if (Object.prototype.hasOwnProperty.call(adapterMap, eventType)) {
    return adapterMap[eventType] ?? [];
  }
  return [];
}
