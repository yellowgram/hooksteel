CREATE TABLE billing_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider          TEXT NOT NULL CHECK (provider IN ('stripe', 'polar')),
  provider_event_id TEXT NOT NULL,
  livemode          BOOLEAN NOT NULL,
  event_type        TEXT NOT NULL,
  payload           JSONB NOT NULL,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at      TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'received'
                    CHECK (status IN ('received', 'outboxed', 'ignored')),
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX billing_events_received_at_idx ON billing_events (received_at DESC);
