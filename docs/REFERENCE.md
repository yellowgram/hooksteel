# HookSteel reference

The details behind the README: what each HTTP status means, how livemode works, the default adapter maps and payloads, and migrations. Polar specifics are in [POLAR.md](POLAR.md). Fixes for common failures are in [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Stripe: HTTP status contract

| Condition | Status | Persist event? | Outbox? |
| --- | --- | --- | --- |
| Missing / placeholder / non-`whsec_` webhook secret | **400** | No | No |
| Signature verification fail (tamper / wrong secret) | **400** | No | No |
| Livemode mismatch | **400** | No | No |
| First successful verify + insert + outbox enqueue | **200** | Yes (`outboxed`) | Yes (same txn) |
| Verified event with an **empty** adapter map | **200** | Yes (`ignored`) | Zero |
| Duplicate `provider_event_id` already stored | **200** | No new row | No new rows |
| DB unavailable / txn failure / unexpected error after verify | **500** | No (rolled back) | No |

Placeholder secrets: `whsec_replace_me`, `replace_me`, `changeme`, `test`, empty, or any value that does not start with `whsec_`. The secret value is never logged.

`failed` and `dead` are reserved parent statuses. HookSteel does not write them. Adapter failure goes to `dead_letters`.

## Livemode and the webhook secret

Verification uses the official Stripe SDK: `stripe.webhooks.constructEvent`. Do not replace it with a hand-rolled HMAC.

`STRIPE_EXPECT_LIVEMODE` defaults to **false** when unset (test mode). HookSteel does not infer livemode from an `sk_` prefix. `STRIPE_SECRET_KEY` is optional and is not used to verify webhooks.

The Stripe CLI `whsec_` and the Dashboard endpoint `whsec_` are different secrets. Use the one that matches how the event is forwarded.

## Default Stripe adapter map

| Event type | Adapters |
| --- | --- |
| `checkout.session.completed` | `grant_credit`, `send_email` |
| `checkout.session.async_payment_succeeded` | `grant_credit`, `send_email` |
| `invoice.paid` | `[]` (persisted as `ignored`) |
| `customer.subscription.deleted` | `[]` (persisted as `ignored`) |

`invite_github` ships as a stub and is **opt-in**. `invoice.paid → [grant_credit]` is also **opt-in** (same checkout pack plus invoice grants will double-fulfill).

```ts
import { DEFAULT_ADAPTER_MAP, configureAdapterMap } from 'hooksteel';

configureAdapterMap({
  ...DEFAULT_ADAPTER_MAP,
  'invoice.paid': ['grant_credit'],
  'checkout.session.completed': ['grant_credit', 'send_email', 'invite_github'],
});
```

Outbox idempotency key: for payment-success events (Stripe `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `payment_intent.succeeded`, `invoice.paid`, `invoice.payment_succeeded`, `charge.succeeded`; Polar `order.created`, `order.paid`) it is `provider|pay:<payment_id>|adapter`, where `payment_id` is the PaymentIntent id, else the invoice id, else the object id. Other events use `provider|event_type|object_id|adapter`, where `object_id` is Stripe's `data.object.id` or Polar's `data.id` (the event id if the event has none). A second event with the same key queues nothing. A Checkout Session with `payment_status: "unpaid"`, or a Polar order that is not paid, queues nothing (outcome `awaiting_payment`).

`send_email` with no `customer_email` completes as a no-op: `completed_at` set and `last_error = skipped_no_email`. It does not throw, retry, or dead-letter.

Session payload: `{session_id, customer, customer_email, amount_total, currency, payment_status, mode, account}`. Opt-in invoice payload: `{invoice_id, customer, customer_email, amount_paid, currency, account}`. `account` is the Stripe Connect account on the event, or null. `grant_credit` reads `amount_total` or `amount_paid`, plus `currency` and `customer`.

## Migrations

Postgres **13+** (`gen_random_uuid()` is built in). Docker Compose and CI use Postgres 16. Older servers need `pgcrypto` and are not the ship target.

`npm run migrate` applies `migrations/*.sql` in lexicographic order, one transaction per file, and records the filename in `hooksteel_schema_migrations`. Files use plain `CREATE` (no `IF NOT EXISTS`) so a half-applied file is visible.

If migrate fails, fix the database and re-run. Do not hand-edit a file that only partly applied; the transaction rolls back, but a database you changed by hand outside the migrator will not match the filename ledger.
