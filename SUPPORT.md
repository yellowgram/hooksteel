# Support

**Product:** HookSteel — Billing Event Reliability Kit  
**Contact:** hello@yellowgram.dev · https://www.yellowgram.dev  
**Repo:** https://github.com/yellowgram/hooksteel (private)

## Boundary

Support is GitHub Issues for 60 days from purchase. It is best-effort. There is no SLA. Founder time is at most about 2 hours per week. An Issue must include a failing chaos test name or a test-mode event id. Do not paste live secrets.

The 60 days start on the Polar purchase date. After that window, Issues are outside support. Yellowgram is not on-call for your outbox, your dead-letter queue, or your production keys.

Use the bug/support issue template. An Issue without the repro fields is not debugged.

The same boundary is in `README.md`, `BUYER_START_HERE.md`, `docs/POLAR_DELIVERABLES.md`, `docs/LANDING.md`, and `.github/ISSUE_TEMPLATE/bug_support.yml`.

## What to include

- Kit semver, git tag, and checksum (`v0.1.0` and the SHA-256 in `docs/CHECKSUMS.md`)
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

There are five chaos files. Polar cases live inside those files. A request to add a sixth scenario or a fuzz suite is out of scope.

## Out of scope

Out of scope, and closed without debugging: a hosted gateway or yellowgram-operated ingress; Hookdeck feature parity as a service; Soft-WTP; Lock or Audit; implementation services; debugging live keys; India-local ICP customization; expanding the chaos suite or adding fuzzing; treating HookSteel as Credit Ledger. This product is the download and private GitHub access only.

## Auto-reply

Paste this and close when the request is out of scope or has no repro:

> Support is GitHub Issues for 60 days from purchase. It is best-effort. There is no SLA. Founder time is at most about 2 hours per week. An Issue must include a failing chaos test name or a test-mode event id. Do not paste live secrets.
>
> Out of scope, and closed without debugging: a hosted gateway or yellowgram-operated ingress; Hookdeck feature parity as a service; Soft-WTP; Lock or Audit; implementation services; debugging live keys; India-local ICP customization; expanding the chaos suite or adding fuzzing; treating HookSteel as Credit Ledger. This product is the download and private GitHub access only.
>
> If you are inside 60 days and this is an in-scope kit bug, reopen with the template: kit semver, tag, and checksum; Node; OS; DB; a failing chaos test name or a test-mode event id; and redacted booleans only.

Purchase refunds are not Issues. Replay is not a refund. See `docs/REFUND_GLOSSARY.md`. The refund day count is not set.
