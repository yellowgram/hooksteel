export interface ClaimedOutbox {
  id: string;
  billing_event_id: string;
  adapter: string;
  payload: unknown;
  idempotency_key: string;
  attempts: number;
}

export type DeadLetterReason = 'timeout' | 'adapter_error' | 'poison' | 'max_attempts';
