# Support

HookSteel is MIT-licensed open source (https://github.com/yellowgram/hooksteel). There is no paid support, no support window, and no SLA. GitHub Issues are best-effort. Nobody is on-call for your outbox, your dead-letter queue, or your production keys.

Security reports go to [SECURITY.md](SECURITY.md), not public Issues with exploit detail. Use the bug issue template. An Issue without the repro fields may not be debugged.

## What to include

- HookSteel version (from `package.json`) and git tag or npm version
- Node version (`node -v`), operating system, and database engine (Postgres version)
- One failing chaos test name from the list below, or a **test-mode** provider event id (`evt_…` from Stripe test mode, or a Polar test-mode `webhook-id`)
- Redacted environment booleans only: `true`, `false`, or unset. Never the secret string.

Booleans that belong in the Issue: `STRIPE_EXPECT_LIVEMODE`, `POLAR_EXPECT_LIVEMODE`, `ALLOW_DEMO_CONTROLS`, `ALLOW_CHAOS_INJECT`, `HOOKSTEEL_RECORD_INVOCATIONS`, and `NODE_ENV`.

Do not paste `STRIPE_WEBHOOK_SECRET`, `POLAR_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `DATABASE_URL`, live `sk_live_` / `whsec_` values, or a live-mode event id.

## Chaos test names that count

- `duplicate delivery: same signed event 4× concurrent yields one row and one invocation per adapter`
- `polar duplicate delivery: same signed order.paid 4× concurrent yields one row and one invocation per adapter`
- `out-of-order + concurrent deliveries keep uniqueness and do not deadlock`
- `polar out-of-order + concurrent deliveries keep uniqueness and do not deadlock`
- `tampered body is 400 and stores nothing`
- `polar tampered body and stale timestamp are 400 and store nothing`
- `abort before commit rolls back, leaves no idle transaction, and retry inserts once`
- `polar abort before commit rolls back, leaves no idle transaction, and retry inserts once`
- `crash after adapter_invocations write and before completed_at re-drains to count 1`
- `polar crash after adapter_invocations write and before completed_at re-drains to count 1`

There are five chaos files; Polar cases run inside them.

## Out of scope

A hosted gateway or ingress service, implementation help, and debugging live keys.

`order.refunded` does not claw back credit, and replay does not move money. See `docs/REFUND_GLOSSARY.md`.
