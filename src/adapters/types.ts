export interface AdapterContext {
  billingEventId: string;
  providerEventId: string;
  payload: unknown;
  idempotencyKey: string;
}

/** H3: missing customer_email resolves as a completed no-op, not a throw. */
export type AdapterResult = void | { lastError: 'skipped_no_email' };

export interface FulfillmentAdapter {
  name: 'grant_credit' | 'send_email' | 'invite_github' | (string & {});
  /** Idempotent on idempotencyKey — safe under duplicate drain / replay. */
  execute(ctx: AdapterContext): Promise<AdapterResult>;
}
