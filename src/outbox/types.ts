export interface ClaimedOutbox {
  id: string;
  billing_event_id: string;
  adapter: string;
  payload: unknown;
  idempotency_key: string;
  attempts: number;
  /** Lease token: the claim's locked_by and locked_at. Every later write must match both. */
  locked_by: string;
  locked_at: string;
}

export type DeadLetterReason = 'timeout' | 'adapter_error' | 'poison' | 'max_attempts';
