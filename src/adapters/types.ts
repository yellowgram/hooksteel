export interface AdapterContext {
  billingEventId: string;
  providerEventId: string;
  payload: unknown;
  /** One per payment and adapter (or per event type, billed object and adapter for non-payment events): two events for one payment share it. */
  idempotencyKey: string;
  /** Aborted if this worker loses the row's lease; another worker will run it. */
  signal?: AbortSignal;
}

/** H3: missing customer_email resolves as a completed no-op, not a throw. */
export type AdapterResult = void | { lastError: 'skipped_no_email' };

export interface FulfillmentAdapter {
  name: 'grant_credit' | 'send_email' | 'invite_github' | (string & {});
  /** Idempotent on idempotencyKey — safe under duplicate drain / replay. */
  execute(ctx: AdapterContext): Promise<AdapterResult>;
}
