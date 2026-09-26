-- Reclaim uses locked_at compared to now() minus OUTBOX_LEASE_MS.
CREATE TABLE outbox (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_event_id  UUID NOT NULL REFERENCES billing_events (id),
  adapter           TEXT NOT NULL,
  payload           JSONB NOT NULL,
  idempotency_key   TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  available_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts          INT NOT NULL DEFAULT 0,
  locked_at         TIMESTAMPTZ,
  locked_by         TEXT,
  completed_at      TIMESTAMPTZ,
  last_error        TEXT,
  UNIQUE (idempotency_key)
);

CREATE INDEX outbox_drain_idx ON outbox (available_at)
  WHERE completed_at IS NULL;
