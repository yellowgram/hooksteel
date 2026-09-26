CREATE TABLE dead_letters (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_id         UUID REFERENCES outbox (id),
  billing_event_id  UUID REFERENCES billing_events (id),
  reason            TEXT NOT NULL
                    CHECK (reason IN ('timeout', 'adapter_error', 'poison', 'max_attempts')),
  payload_snapshot  JSONB NOT NULL,
  failed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  replayed_at       TIMESTAMPTZ
);

CREATE INDEX dead_letters_open_idx ON dead_letters (failed_at)
  WHERE replayed_at IS NULL;
