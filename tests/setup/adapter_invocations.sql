-- Test-only durable invocation log. Not applied by buyer migrate.
-- IF NOT EXISTS is intentional here so the suite can re-run; buyer SQL files do not use it.
CREATE TABLE IF NOT EXISTS adapter_invocations (
  idempotency_key TEXT PRIMARY KEY,
  adapter         TEXT NOT NULL,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
