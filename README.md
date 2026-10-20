# HookSteel

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

HookSteel makes Stripe and Polar payment webhooks safe to act on. Each verified event is stored once, and the work it triggers (grant credits, send the receipt email, invite to GitHub) is queued in the same Postgres transaction. A worker then runs that work after the commit, with retries, a dead-letter queue and a replay command.

The problem it solves: providers deliver webhooks at least once, sometimes out of order, and your handler can crash halfway. Without care that means double-granted credits, or a credit granted for a transaction that rolled back. HookSteel is the small piece of code, living in your app and your database, that makes those cases boring.

- Verifies Stripe signatures with the official SDK, and Polar (Standard Webhooks) signatures with `node:crypto`.
- One row per `(provider, event id)`. A duplicate delivery gets HTTP 200 and creates nothing new.
- A transactional outbox: side effects run only after the event's transaction commits.
- A worker with leases, lease renewal, fencing, exponential backoff and dead letters.
- A replay command for dead letters that re-runs one adapter, on purpose.
- Five chaos tests on real Postgres: duplicate delivery, reordering, bad signature, handler timeout, and a crash mid-fulfilment.

## Five-minute quickstart

Needs Node 20+ and Docker (or any Postgres 13+).

```bash
git clone https://github.com/yellowgram/hooksteel && cd hooksteel
docker compose up -d          # Postgres 16 on localhost:5432
cp .env.example .env
npm ci
npm run migrate
npm run demo                  # duplicate delivery and crash-mid-fulfilment, on fixtures
```

The demo needs no Stripe or Polar account; it signs fixture events itself. `npm test` runs everything.

### In your app

```bash
npm install hooksteel
export DATABASE_URL=postgres://…
npx hooksteel migrate        # creates billing_events, outbox, dead_letters (and its own migrations table)
```

Hand the handler the **raw** request body. Parsing the JSON first changes the bytes and the signature check fails.

```ts
import { handle, handlePolar } from 'hooksteel';

// Fetch, Hono or Next.js route handlers
app.post('/api/webhooks/stripe', async (c) =>
  handle({ rawBody: await c.req.text(), signature: c.req.header('stripe-signature') ?? null }),
);

app.post('/api/webhooks/polar', async (c) =>
  handlePolar({
    rawBody: await c.req.text(),
    webhookId: c.req.header('webhook-id') ?? null,
    webhookTimestamp: c.req.header('webhook-timestamp') ?? null,
    webhookSignature: c.req.header('webhook-signature') ?? null,
  }),
);
```

With Express, use `express.raw({ type: 'application/json' })` on that route (never `express.json()`), pass `req.body.toString('utf8')` as `rawBody`, and copy the returned `Response` status and body to `res`. A full Next.js example is in [examples/next](examples/next).

Set `STRIPE_WEBHOOK_SECRET` and/or `POLAR_WEBHOOK_SECRET` (the endpoint's `whsec_…` secret).

### Your adapters

An adapter is the code that actually fulfils an order. The built-in `grant_credit`, `send_email` and `invite_github` are **examples**: they check the payload and do nothing else. Outside tests they refuse to run (the row retries and then dead-letters with a message saying so), so an order is never marked fulfilled by a stub. Write your own under the same names, or under new names and point the adapter map at them with `configureAdapterMap` / `configurePolarAdapterMap`:

```js
// adapters.mjs
export const adapters = [
  {
    name: 'grant_credit',
    async execute({ payload, idempotencyKey }) {
      // Make this idempotent on idempotencyKey: it can run more than once.
      // The key is per payment (PaymentIntent, invoice or Checkout Session id) and adapter,
      // not per event, so every event about one payment shares it.
      await credits.grant(payload.customer, payload.amount_total, { idempotencyKey });
    },
  },
  {
    name: 'send_email',
    async execute({ payload, idempotencyKey }) {
      await resend.emails.send({ to: payload.customer_email, /* … */ }, { idempotencyKey });
    },
  },
];
```

Then run the worker as its own process:

```bash
npx hooksteel drain --adapters ./adapters.mjs          # loops; on SIGTERM it finishes the row in hand and exits
npx hooksteel drain --adapters ./adapters.mjs --once   # one batch, then exit (cron, scheduled job)
```

Or, inside your app, `registerAdapter(adapter)` for each one and call `drainOnce()` (or `drainLoop(abortSignal)`) yourself. If rows dead-lettered before your adapters were in place, replay them (below). Inside this repo, `npm run migrate`, `npm run outbox:drain` and `npm run replay:*` run the same commands from source.

## How it works

1. **Verify.** A bad or missing signature, or a placeholder secret, gets 400 and nothing is stored.
2. **Store and enqueue, in one transaction.** The event goes into `billing_events`; one `outbox` row per adapter goes in with it. The adapter map decides which adapters an event type triggers (for example `checkout.session.completed` → `grant_credit`, `send_email`). An unmapped type is stored as `ignored`. A database error gets 500, so the provider retries.
3. **Drain.** The worker claims due rows with `FOR UPDATE SKIP LOCKED` and runs the adapter. Each outbox row has an idempotency key. For events that report a successful payment it is `provider|pay:<payment id>|adapter`, where the payment id is the PaymentIntent, then the invoice, then the Checkout Session (Polar: the order), so it is the same for every event about one payment. A Checkout Session is keyed by its invoice if the adapter is also mapped to `invoice.paid` (a subscription session without an invoice id leaves the grant to `invoice.paid`). For subscriptions, map `invoice.paid`: with `payment_intent.succeeded` only charged payments grant, so a free trial, a fully discounted period or an invoice paid from customer balance grants nothing. An adapter can't be mapped to both `invoice.paid` and `payment_intent.succeeded`: `configureAdapterMap` throws, because one subscription payment sends both with different ids. Other events run once per event: `provider|event type|object id|evt:<event id>|adapter`. Pass it to any external API you call (Stripe, Resend, GitHub), so a retry cannot double-send there either.
4. **Retry or dead-letter.** If an adapter throws, the row is retried after 2^attempts seconds, at most 60. After `OUTBOX_MAX_ATTEMPTS` (default 5) it moves to `dead_letters`. An adapter name that isn't registered dead-letters at once as `poison`.
5. **Replay.** Fix the cause, then re-open one dead letter so the worker runs that adapter again:

   ```bash
   npx hooksteel replay list
   npx hooksteel replay dry-run <dead_letter_id>    # shows each statement with its bind value; writes nothing
   npx hooksteel replay execute <dead_letter_id>    # re-opens the row; the worker does the work
   ```

   Replay never moves money. It is unrelated to a customer refund ([docs/REFUND_GLOSSARY.md](docs/REFUND_GLOSSARY.md)).

### Leases

A claim takes a lease for `OUTBOX_LEASE_MS` (default 30 s). While the adapter runs, the worker renews the lease every third of that time. A slow adapter that is still working therefore keeps its row. Only a worker that has stalled or died loses it. A stalled worker may still be running its adapter when another worker takes the row; the adapter's `signal` (an `AbortSignal`) aborts when its lease renewal fails, so a long adapter can stop. `OUTBOX_LEASE_MS` below 1000 is refused at startup.

If a lease does expire and another worker takes the row, the first worker's late writes are fenced off. Completion, backoff and dead-lettering all check the claim's `(locked_by, locked_at)` token, and the first worker logs `lease_lost` and steps aside. Every claim counts as an attempt, including a reclaim after a crash.

## Guarantees and limits

What HookSteel guarantees:

- One `billing_events` row per provider event id, under any amount of concurrent duplicate delivery.
- One fulfilment per payment and adapter. `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `payment_intent.succeeded`, `invoice.paid`, `invoice.payment_succeeded` and `charge.succeeded` (Polar: `order.created`, `order.paid`) are keyed on the payment: the PaymentIntent, else the invoice, else the Checkout Session. So a delayed payment, Checkout plus `payment_intent.succeeded`, or a subscription Checkout plus its first `invoice.paid` runs each adapter once. A second event for the same payment is recorded but queues nothing (it logs `duplicate_payment_or_object` with the provider event id). For a subscription, map either `invoice.paid` or `payment_intent.succeeded` to an adapter, not both: an invoice and its PaymentIntent have different ids.
- Nothing is queued while a payment is unpaid: a Checkout Session with `payment_status: "unpaid"` (ACH, SEPA and other delayed methods) is recorded with outcome `awaiting_payment`, and `checkout.session.async_payment_succeeded` fulfils it. A Polar order that is not paid is skipped the same way.
- Non-payment events (for example `customer.subscription.updated`) run your adapter once per event. Stripe can occasionally send two events for one change, so an adapter on such an event should set state ("plan is pro") rather than add to it.
- Outbox rows exist if and only if their event's transaction committed.
- An adapter never runs for an event that rolled back.
- A worker that lost its lease cannot overwrite the new holder's result.

What it does not:

- **Exactly-once side effects.** Delivery to your adapters is at least once. A worker can crash after the side effect and before it records completion, and the next worker will run the adapter again with the same idempotency key. Make adapters idempotent on that key (the chaos test for this is `05-db-rollback-mid-fulfillment`).
- **Ordering.** Events are deduplicated, not ordered. Two different events can be processed in either order.
- **Hosting, routing or dashboards.** HookSteel is a library plus a worker inside your app. If you want hosted ingress with fan-out and a UI, use a service like Hookdeck. You can also put one in front of HookSteel.
- **Data retention.** The full provider event is stored as JSON and can contain personal data (email, address, tax id). Nothing purges it; that's your call.
- **Business rules.** Refunds and subscription renewals are not special-cased. Polar's `order.refunded` is stored and ignored. Every `order.paid`, including renewals, grants by default. Change the adapter map if that's wrong for you; the [reference](docs/REFERENCE.md) and [Polar notes](docs/POLAR.md) list the traps, for example mapping both `order.updated` and `order.paid` grants twice.
- **Access control.** Anyone with `DATABASE_URL` can replay dead letters. There is no audit column.
- **Keep the handler fast.** Verify plus the insert should finish in under about 2 seconds. A slow remote database should return 500 and let the provider retry.

## Configuration

| Env | Default | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | — | Postgres 13+ |
| `STRIPE_WEBHOOK_SECRET` | — | Endpoint `whsec_…` (the Stripe CLI and the Dashboard use different secrets) |
| `STRIPE_EXPECT_LIVEMODE` | `false` | Reject events whose `livemode` doesn't match |
| `POLAR_WEBHOOK_SECRET` | — | Endpoint `whsec_…` (`polar_whs_` is rejected; rotate it) |
| `POLAR_EXPECT_LIVEMODE` | `false` | Recorded on each Polar event; Polar does not sign a livemode flag |
| `OUTBOX_WORKER_ID` | `<hostname>:<pid>:<random>` | Written to `locked_by`, for logs and debugging. Unique per process by default |
| `OUTBOX_LEASE_MS` | `30000` | Lease length in milliseconds (at least 1000); renewed while the adapter runs |
| `OUTBOX_MAX_ATTEMPTS` | `5` | Attempts before a dead letter |
| `OUTBOX_BATCH_SIZE` | `10` | Rows per `--once` run, handled one after another |

`HOOKSTEEL_EXAMPLE_ADAPTERS=true` lets the built-in example adapters run outside tests (for a local trial only). Test hooks (`ALLOW_CHAOS_INJECT`, `HOOKSTEEL_RECORD_INVOCATIONS`) are off by default and always off with `NODE_ENV=production`.

## More

- [docs/REFERENCE.md](docs/REFERENCE.md): HTTP status table, livemode, default adapter maps and payloads, migrations
- [docs/POLAR.md](docs/POLAR.md): Polar verification, statuses, adapter map and traps
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md): signature failures and other common problems
- [SUPPORT.md](SUPPORT.md): what to put in an issue. [SECURITY.md](SECURITY.md): private reports.

## Development

```bash
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/hooksteel
npm ci && npm run migrate && npm test
```

CI runs the same against Postgres 16 on Node 20. The chaos suite is kept to the five files in `tests/chaos/`; Polar cases run inside them.

Releases before 0.2.0 (tags `v0.1.0`, `v0.1.1`) were published under a different license; 0.2.0 and later are MIT. There is no paid support.

## License

MIT. See [LICENSE](LICENSE).

---

Part of yellowgram open source tools: https://www.yellowgram.dev/oss
