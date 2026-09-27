# HookSteel

**Billing Event Reliability Kit** — owned code for Stripe and Polar webhooks. The same billing event, delivered again, keeps one outbox row per adapter. Side effects run after that transaction commits. Pass the idempotency key through to any external API. Replay can run an adapter again on purpose.

| | |
|---|---|
| Founding | $89 for the first 10 licenses OR 30 days after go-live, whichever comes first |
| List | $129 after that window |
| SKU | One. Do not run two Polar products. |
| Contact | hello@yellowgram.dev |
| Site | https://www.yellowgram.dev |
| License | PolyForm Noncommercial 1.0.0 (source-available; not OSI; not MIT). Paid commercial use: Suthirth Commercial Grant |

Not a hosted gateway. Soft-WTP off. Polar listing dark until the ready gate. Stripe and Polar webhooks both verify into the same outbox. `billing_events.provider` already allows `'polar'`.

## What HookSteel guarantees

- One row per `(provider, provider_event_id)`.
- When the event maps to adapters, those `outbox` rows are inserted in the **same transaction** as `billing_events`.
- Adapter side effects run in the drain **after** that transaction commits.
- Duplicate deliveries ACK with HTTP 200 and do not enqueue a second outbox row.

Outbox proves side-effect-after-commit and idempotency keys. It does not certify PCI, charge correctness, or tax.

## Quickstart

```bash
docker compose up -d
cp .env.example .env
# set STRIPE_WEBHOOK_SECRET to the whsec_ from `stripe listen` or your Dashboard endpoint
# Polar: set POLAR_WEBHOOK_SECRET to the endpoint whsec_ (polar_whs_ is rejected)
npm ci
npm run build
npm run migrate
npm test
npm run outbox:drain -- --once
```

`npm test` does not boot Next.js. Next 15 is an example under `examples/next` only. The root package does not depend on `next`. `npm run build` writes `dist/` (plain Node). Migrate and the drain script run the TypeScript sources with `tsx` and do not need that build. The Next example imports the built package; see `examples/next/README.md` for its own `.env.local` (`next dev` does not read the repo-root `.env`).

Pass the **raw body string**. Do not `JSON.parse` before `handle`.

Fetch / Hono (`Request`):

```ts
import { handle } from 'hooksteel';

app.post('/api/webhooks/stripe', async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header('stripe-signature') ?? null;
  return handle({ rawBody, signature });
});
```

Express. This is not the Fetch API. `req.text()` and `req.headers.get` do not exist on Express. Use `express.raw` so the bytes `constructEvent` checks are the bytes Stripe signed. See Troubleshooting below if verification returns 400.

```ts
import express from 'express';
import { handle } from 'hooksteel';

const app = express();

app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
    const signatureHeader = req.headers['stripe-signature'];
    const signature = typeof signatureHeader === 'string' ? signatureHeader : null;
    const response = await handle({ rawBody, signature });
    res.status(response.status).type(response.headers.get('content-type') ?? 'application/json');
    res.send(await response.text());
  },
);
```

Do not mount `express.json()` on this route. The Next route under `examples/next` is the Fetch version: `request.text()` only.

## HTTP status contract

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

`failed` and `dead` are reserved parent statuses. v0.1 does not write them. Adapter failure goes to `dead_letters`.

## Livemode and the webhook secret

Verification uses the official Stripe SDK: `stripe.webhooks.constructEvent`. Do not replace it with a hand-rolled HMAC.

`STRIPE_EXPECT_LIVEMODE` defaults to **false** when unset (test-mode kit). The kit does not infer livemode from an `sk_` prefix. `STRIPE_SECRET_KEY` is optional and is not used to verify webhooks.

The Stripe CLI `whsec_` and the Dashboard endpoint `whsec_` are different secrets. Use the one that matches how the event is forwarded.

## Chaos suite (ship gate)

Exactly five scenarios, all on Postgres. CI is `.github/workflows/chaos-postgres.yml` (`postgres:16`, Node 20): `npm ci && npm run migrate && npm test`. Signatures are minted at runtime with `stripe.webhooks.generateTestHeaderString`. No live Stripe API.

| # | Scenario | Pass criterion |
| --- | --- | --- |
| 1 | Duplicate delivery | Same signed event 4× concurrent → one `billing_events` row and one `adapter_invocations` row per mapped adapter |
| 2 | Out-of-order + concurrent | Distinct events delivered B then A, plus concurrent duplicates → two event rows, correct outbox counts, zero deadlocks, one invocation per adapter per event. This is uniqueness under reorder, **not** a global total order |
| 3 | Signature fail | One tampered byte → 400, zero `billing_events`, zero outbox |
| 4 | Handler timeout | Abort after verify and before commit → zero committed rows, no idle-in-transaction, retry inserts once, one invocation after drain |
| 5 | DB rollback mid-fulfillment | Invocation row commits on a separate connection, then the drain throws before `completed_at`. Re-drain keeps `adapter_invocations` count at 1 |

Exactly five chaos files. Polar is covered inside those files: each one also runs the same theme for an `order.paid` signed with the post-cutoff `standard_webhooks` key. The pre-2026-09-08 `polar_hmac` key is proven in `tests/unit/polar-verify.test.ts`, not by a sixth file.

`adapter_invocations` is created by the test setup only. It is not part of buyer migrate. Stubs write that table only when `NODE_ENV=test` or `HOOKSTEEL_RECORD_INVOCATIONS=true`. Unset, `development`, and `production` do not open a connection for it.

`src/chaos` is imported only from tests. It returns option objects you pass into `handle` or `drainOnce`. Nothing in `src/index.ts` exports it, and production modules do not keep env-armed hook slots. `NODE_ENV=production` makes those helpers throw. `ALLOW_CHAOS_INJECT` defaults to false.

Local Postgres (compose file in this repo):

```bash
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/hooksteel
npm ci
npm run migrate
npm test
```

## Default adapter map

| Event type | Adapters |
| --- | --- |
| `checkout.session.completed` | `grant_credit`, `send_email` |
| `checkout.session.async_payment_succeeded` | `grant_credit`, `send_email` |
| `invoice.paid` | `[]` (persisted as `ignored`) |
| `customer.subscription.deleted` | `[]` (persisted as `ignored`) |

`invite_github` ships as a stub and is **opt-in**. `invoice.paid → [grant_credit]` is also **opt-in** (same checkout pack plus invoice grants will double-fulfill). Demo story is Checkout.

```ts
import { DEFAULT_ADAPTER_MAP, configureAdapterMap } from 'hooksteel';

configureAdapterMap({
  ...DEFAULT_ADAPTER_MAP,
  'invoice.paid': ['grant_credit'],
  'checkout.session.completed': ['grant_credit', 'send_email', 'invite_github'],
});
```

Outbox idempotency key: `provider|provider_event_id|adapter`.

`send_email` with no `customer_email` completes as a no-op: `completed_at` set and `last_error = skipped_no_email`. It does not throw, retry, or dead-letter.

Session payload: `{session_id, customer, customer_email, amount_total, currency, payment_status, mode, account}`. Opt-in invoice payload: `{invoice_id, customer, customer_email, amount_paid, currency, account}`. `account` is the Stripe Connect account on the event, or null. `grant_credit` reads `amount_total` or `amount_paid`, plus `currency` and `customer`.

## Drain

```bash
npm run outbox:drain -- --once
```

`--once` claims up to `OUTBOX_BATCH_SIZE` rows (default 10), **one after another**, then exits. Claim sets `locked_at`, `locked_by`, and `attempts = attempts + 1` with `FOR UPDATE SKIP LOCKED`. A lock older than `OUTBOX_LEASE_MS` (default 30000) can be reclaimed. There is no `lease_expires_at` column and no lease heartbeat. An adapter that runs longer than `OUTBOX_LEASE_MS` can be claimed by a second worker. Finish within the lease, or make the adapter idempotent under that overlap.

Every claim increments `attempts`, including reclaim of a stale lock. A crash after claim and before complete or backoff therefore burns an extra attempt when the lease expires. That matches the frozen claim rule. It can reach `dead_letters` sooner on a flaky host.

On adapter throw, `available_at = now() + 2^attempts seconds`, capped at 60. When `attempts` exceeds `OUTBOX_MAX_ATTEMPTS` (default 5), the row is copied to `dead_letters` (`reason = max_attempts`), `outbox.completed_at` is set, and `last_error = dead_lettered`. An adapter name that is not registered is `reason = poison` on the first claim (no retry). `timeout` and `adapter_error` stay in the check constraint for a later slice. This drain does not write them: throws still backoff until max attempts, and a slow adapter is not dead-lettered for lease timeout. One open dead letter per outbox row (`replayed_at` null). A crash after the insert and before `completed_at` does not insert a second open row. The parent `billing_events.status` stays `outboxed` or `ignored`.

When every child outbox row is complete, drain locks the billing event row and then sets `processed_at`, so two workers finishing sibling adapters cannot both miss it. An empty adapter map is `ignored` and `processed_at` is set in the handler, because drain never visits a row with zero children.

## Replay

```bash
npm run replay:list
npm run replay:dry-run -- <dead_letter_id>
npm run replay:execute -- <dead_letter_id>
npm run outbox:drain -- --once
```

**Replay** re-opens one dead-lettered outbox row so the drain can run that adapter again. **Replay is not a Polar purchase refund.** A Polar refund returns the money paid for this kit. The purchase-refund window is 14 days. `order.refunded` stays ignored and does not claw back credit. The three names are separated in [docs/REFUND_GLOSSARY.md](./docs/REFUND_GLOSSARY.md).

**Inspect** is `replay:list`. Read `reason`, `adapter`, and `replayed_at`. `replayed_at: null` is open. Rows that already have `replayed_at` set stay in the list. v0.1 drain writes `max_attempts` and `poison`. `timeout` and `adapter_error` are reserved and this drain does not write them.

Fix the adapter or the payload **before** execute. Replay does not repair a throw. For `poison`, register the adapter first or the next claim writes a new poison row.

**Dry-run one id** copied from that list. The id is `dead_letters.id`, not an outbox id and not a provider event id. Dry-run writes nothing. Read `adapter`, `outboxId`, and `deadLetterId`. The statements stay parameterized.

**Execute that one id.** It reopens that one outbox row, clears `processed_at` on the billing event, and sets `replayed_at`. It does not call the adapter. It does not run the other adapters on that event. A second execute of the same id is refused. There is no `--force`.

**Drain runs the adapter.** A `npm run outbox:drain` loop that is already up may claim the row (`available_at` is now). When nothing is looping, run `npm run outbox:drain -- --once`. Do not stop a healthy worker as a prerequisite. The CLI will not start or stop one.

One operator, one id per command. Two ids in one invocation is a usage error and writes nothing.

The idempotency key does not change. Pass it through to the external API. Replay without that discipline can double-send.

Yellowgram is not on-call for the buyer’s dead-letter queue. Whoever holds `DATABASE_URL` can run these commands. There is no audit column.

## Migrations

Postgres **13+** (`gen_random_uuid()` is built in). Docker Compose and CI use Postgres 16. Older servers need `pgcrypto` and are not the ship target.

`npm run migrate` applies `migrations/*.sql` in lexicographic order, one transaction per file, and records the filename in `hooksteel_schema_migrations`. Files use plain `CREATE` (no `IF NOT EXISTS`) so a half-applied file is visible.

If migrate fails, fix the database and re-run. Do not hand-edit a file that only partly applied; the transaction rolls back, but a database you changed by hand outside the migrator will not match the filename ledger.

## Hookdeck

1. What Hookdeck is good at — hosted ingress, fan-out, rate limiting, observability, retries at the *edge*.
2. What HookSteel owns — in-app unique event id + transactional outbox + side-effect-after-commit + chaos proofs on *your* Postgres.
3. Use Hookdeck when — you need multi-destination routing, team dashboard, or do not want to run an outbox worker.
4. Use HookSteel when — double-fulfillment after rolled-back txns is the fear; you want owned code on Stripe **and** Polar.
5. Use both when — Hookdeck in front, HookSteel inside (optional; document; do not require).
6. Do not buy HookSteel if — you want yellowgram to host your webhooks.

Landing copy with the same six points: [docs/LANDING.md](./docs/LANDING.md). That file is not a deployed site. The Polar call to action stays a placeholder while the listing is dark.

## Known limits

- The full Stripe event is stored as JSONB and can contain **PII**. The kit has no purger. You own retention.
- **Connect:** event ids are globally unique, so the uniqueness key still holds. The outbox payload includes `account` (or null). The full event JSONB also keeps `event.account`. There is no `stripe_account` column in v0.1.
- Verify plus the database transaction should finish in **under 2 seconds**. A cold remote database that blows that budget should return **500** so Stripe retries. That is the correct outcome.
- Chaos scenario 2 proves uniqueness and no deadlocks under reordering and concurrency. It does **not** promise a global total order.
- Adapters that call Resend, GitHub, or Stripe should pass `idempotencyKey` through when the vendor supports it. The outbox unique key does not make those APIs idempotent by itself.
- A live Polar endpoint pointed at a process with `POLAR_EXPECT_LIVEMODE` unset or false still verifies when the secret matches and stores `livemode=false`. Polar does not sign that bit. Do not invent a livemode field. Do not add `livemode_mismatch` 400 on this path. Sandbox and production are different organizations.
- Polar disables an endpoint after 10 consecutive non-2xx responses. 400 does not mean Polar stops. Ten strikes disable the endpoint.
- Every `order.paid` grants, including `billing_reason=subscription_cycle`. Buyers who do not want a credit on every renewal replace the `order.paid` row. v0.1 does not special-case `billing_reason`.
- Exactly five chaos files. Polar is covered inside them.
- The full Polar event JSONB may include customer email, billing address, and tax id. The kit has no purger. You own retention.
- Replay dry-run prints three `UPDATE` statements that each use `$1`. Those placeholders are not the same row. `outboxId` and `deadLetterId` are separate JSON fields. The billing-event id is not a field on the dry-run object. Do not paste the statements into a SQL client with one bind value. The CLI is the writer. Labeling the three `$1`s inside `replay.ts` is deferred (CR2-A-P2-002).

## Troubleshooting

**Signatures fail on events you just forwarded.** The route must verify the raw body. Fetch and Next use `request.text()`. Express uses `express.raw({ type: 'application/json' })` and `req.body` as a Buffer — not `req.text()`, not `req.headers.get`, and not `express.json()`. `request.json()` or a JSON body parser changes bytes and `constructEvent` returns 400. Also check CLI `whsec_` vs Dashboard `whsec_`: they are not interchangeable. For the Next example, put `DATABASE_URL`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_EXPECT_LIVEMODE` in `examples/next/.env.local`. `next dev` does not load the repo-root `.env`.

**Polar signatures fail.**

- Placeholder secret (`whsec_replace_me`, `replace_me`, `changeme`, `test`, or empty) or any secret that does not start with `whsec_` returns 400 `invalid_webhook_secret` and stores nothing.
- `polar_whs_` is rejected. Rotate the endpoint secret in the Polar dashboard until it is a `whsec_…` value.
- Raw body re-parsed: `request.json()`, `JSON.parse` then `JSON.stringify`, or `express.json()` changes bytes and the HMAC fails. Use `request.text()`, or `express.raw({ type: 'application/json' })` and `Buffer.toString('utf8')`. Do not mount `express.json()` on the Polar route.
- Wrong key era: secrets generated before 2026-09-08 00:00 UTC and secrets generated on or after that instant use different HMAC keys. The kit tries both. A verifier that only uses one era fails the other.
- The endpoint is disabled after 10 consecutive non-2xx responses. 400 does not mean Polar stops. Ten strikes disable the endpoint. Do not return 200 for a bad signature to avoid that disable.
- Mapping both `order.updated` and `order.paid` to the same adapters grants twice.

For the Next example, put `POLAR_WEBHOOK_SECRET` and `POLAR_EXPECT_LIVEMODE` in `examples/next/.env.local` as well.

## Polar

Polar verify is stdlib HMAC (`node:crypto`): two key eras, the exact raw body, and the headers `webhook-id`, `webhook-timestamp`, and `webhook-signature`. There is no `@polar-sh/sdk`, no `standardwebhooks`, no `svix`, and no Polar access token. A 300 second window applies in both directions. Comparison uses `timingSafeEqual` on digest bytes. Only `v1` tokens are accepted.

Secrets generated before 2026-09-08 00:00 UTC use the UTF-8 bytes of the full `whsec_…` string as the HMAC key. Secrets generated on or after that instant use Standard Webhooks: strip `whsec_` and base64-decode the remainder. The secret string does not say which era it is, so the kit tries both. `polar_whs_` and any other prefix are rejected.

Dashboard delivery format must be **Raw** JSON. Slack and Discord bodies are not parsed. The secret is the endpoint `whsec_`.

`provider_event_id` is the `webhook-id` header. It is not `data.id`. `order.created` and `order.paid` share an order id and are different events.

`POLAR_EXPECT_LIVEMODE` is an operator declaration written to `billing_events.livemode`. Unset means false (sandbox). Polar does not send a livemode field. A production Polar endpoint must set this true. It is not inferred from the secret. There is no `livemode_mismatch` 400 on this path.

Polar publishes a webhook IP list on the [delivery page](https://polar.sh/docs/integrate/webhooks/delivery). The kit does not allowlist those IPs. They change, and they are not authentication.

The stored JSONB may include customer email, billing address, and tax id. You own retention.

Fetch / Hono (`Request`):

```ts
import { handlePolar } from 'hooksteel';

app.post('/api/webhooks/polar', async (c) => {
  const rawBody = await c.req.text();
  return handlePolar({
    rawBody,
    webhookId: c.req.header('webhook-id') ?? null,
    webhookTimestamp: c.req.header('webhook-timestamp') ?? null,
    webhookSignature: c.req.header('webhook-signature') ?? null,
  });
});
```

Express. Use `express.raw` so the bytes that are signed are the bytes you verify. `req.body` is a Buffer. Call `Buffer.toString('utf8')`.

```ts
import express from 'express';
import { handlePolar } from 'hooksteel';

const app = express();

app.post(
  '/api/webhooks/polar',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
    const header = (name: string) => {
      const value = req.headers[name];
      return typeof value === 'string' ? value : null;
    };
    const response = await handlePolar({
      rawBody,
      webhookId: header('webhook-id'),
      webhookTimestamp: header('webhook-timestamp'),
      webhookSignature: header('webhook-signature'),
    });
    res.status(response.status).type(response.headers.get('content-type') ?? 'application/json');
    res.send(await response.text());
  },
);
```

Do not mount `express.json()` on this route. The Next route under `examples/next` is `request.text()` plus the three headers.

| Condition | Status | Persist? | Outbox? |
| --- | --- | --- | --- |
| Missing / placeholder / non-`whsec_` secret | **400** `invalid_webhook_secret` | No | No |
| Missing header, bad timestamp, tamper, wrong key, no `v1` match | **400** `invalid_signature` | No | No |
| Signature ok, body not a JSON object with string `type` | **400** `invalid_payload` | No | No |
| First accept + mapped adapters | **200** `outboxed` | Yes | Yes, same txn |
| First accept + empty map | **200** `ignored` | Yes (`processed_at` set) | Zero |
| Duplicate `webhook-id` already stored | **200** `duplicate` | No new row | No |
| DB unavailable / txn failure / unexpected error after verify | **500** `transient` | No (rolled back) | No |

Polar retries non-2xx (up to 10, exponential backoff) and disables the endpoint after 10 consecutive non-2xx responses. 400 does not mean Polar stops. Poison stays 400. A database blip stays 500. Returning 200 for a bad signature would ACK poison.

### Default Polar adapter map

| Event type | Adapters |
| --- | --- |
| `order.paid` | `grant_credit`, `send_email` |
| `order.created` | `[]` (persisted as `ignored`) |
| `order.updated` | `[]` (persisted as `ignored`) |
| `order.refunded` | `[]` (persisted as `ignored`; no credit clawback) |
| `checkout.created` / `checkout.updated` / `checkout.expired` | `[]` |
| `subscription.canceled` / `subscription.revoked` | `[]` |
| Any other verified type | `[]` |

`invite_github` is **opt-in**. It is not in the default Polar map.

Every `order.paid` grants, including `billing_reason=subscription_cycle`. Each delivery has its own `webhook-id`. That is a new payment. v0.1 does not special-case `billing_reason`. Buyers who sell subscriptions and do not want a credit on every renewal replace the `order.paid` row.

`order.updated` is not an opt-in grant alongside `order.paid`. Polar also sends `order.updated` when the order becomes paid. Mapping both `order.updated` and `order.paid` to the same adapters grants twice.

`checkout.updated → [grant_credit, send_email]` only if you also filter `data.status === 'succeeded'` and remove `order.paid` from those same adapters. The kit does not ship that filter. `checkout.updated` fires for `open`, `expired`, `confirmed`, `succeeded`, and `failed`.

```ts
import { DEFAULT_POLAR_ADAPTER_MAP, configurePolarAdapterMap } from 'hooksteel';

configurePolarAdapterMap({
  ...DEFAULT_POLAR_ADAPTER_MAP,
  'order.paid': ['grant_credit', 'send_email', 'invite_github'],
});
```

`order.paid` outbox payload: `{order_id, customer, customer_email, amount_total, currency, status, paid, billing_reason}`. `customer` is `data.customer_id`. `amount_total` is `data.total_amount` in cents (0 is a real amount). `customer_email` null completes `send_email` as `skipped_no_email`. Checkout opt-in payload: `{checkout_id, customer, customer_email, amount_total, currency, status}`. Any other opted-in type is `{object_id}` only.

## Support

Support is GitHub Issues for 60 days from purchase. It is best-effort. There is no SLA. Founder time is at most about 2 hours per week. An Issue must include a failing chaos test name or a test-mode event id. Do not paste live secrets.

[SUPPORT.md](./SUPPORT.md)

## License

Source-available under the PolyForm Noncommercial License 1.0.0. That public license is not an OSI-approved open source license. It is not MIT. The text is `LICENSE`.

Paid commercial production use is the Suthirth Commercial Grant: one organization, for the purchased named tag, perpetual for that tag. Prior Single-app kit language folds into that one-organization grant. See [docs/COMMERCIAL_GRANT.md](./docs/COMMERCIAL_GRANT.md).

Not a hosted gateway. Soft-WTP is off. No coupon. Price and refund lock: [docs/COMMERCIAL_LOCK.md](./docs/COMMERCIAL_LOCK.md). Already-distributed `v0.1.0` zips keep the terms that shipped inside them.

## Docs

- [SUPPORT](./SUPPORT.md) — 60-day boundary
- [60s demo script](./docs/DEMO_60S.md) — script only; founder films later
- [Refund glossary](./docs/REFUND_GLOSSARY.md) — 14-day purchase refund, replay CLI, and `order.refunded`
- [Landing copy](./docs/LANDING.md) — Hookdeck honesty; not a deployed site
- [Changelog](./CHANGELOG.md) · [Checksums](./docs/CHECKSUMS.md)
- [Polar deliverables (CoS, listing stays dark)](./docs/POLAR_DELIVERABLES.md)
- [Suthirth Commercial Grant](./docs/COMMERCIAL_GRANT.md) · [Commercial lock](./docs/COMMERCIAL_LOCK.md)
- [STATUS](./docs/STATUS.md)
- [DESIGN — Stripe path + chaos](./docs/DESIGN_STRIPE_PATH.md) — §1 is the contract this tree implements
- [Cycle-2 judgement](./docs/DESIGN_REVIEW_CYCLE2_JUDGEMENT.md)
- [MVP scope](./docs/MVP_SCOPE.md) · [MINIMUM_SUPPORT](./docs/MINIMUM_SUPPORT_CHECKLIST.md) · [Buyer needs](./docs/BUYER_NEEDS_BEYOND_CHECKLIST.md)
