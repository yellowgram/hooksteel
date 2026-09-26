# HookSteel

**Billing Event Reliability Kit** — owned code so a Stripe webhook side effect runs after commit, once, even when Stripe delivers the same event again.

| | |
|---|---|
| Founding | $89 |
| List | $129 |
| Contact | hello@yellowgram.dev |
| Site | https://www.yellowgram.dev |
| License | Single-app: one production application and one production Stripe account |

Not a hosted gateway. Soft-WTP off. Polar listing dark until the ready gate. Polar webhook verification is the next slice; `billing_events.provider` already allows `'polar'`.

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
npm ci
npm run migrate
npm test
npm run outbox:drain -- --once
```

`npm test` does not boot Next.js. Next 15 is an example under `examples/next` only. The root package does not depend on `next`. The package entry is TypeScript (`src/index.ts`); the npm scripts run it with `tsx`, and the Next example transpiles it.

Framework-agnostic handler (Hono, Express, or any Node server). Pass the **raw body string**. Do not `JSON.parse` before `handle`.

```ts
import { handle } from 'hooksteel';

app.post('/api/webhooks/stripe', async (req, res) => {
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');
  const response = await handle({ rawBody, signature });
  res.status(response.status).send(await response.text());
});
```

The same call is the whole of `examples/next/app/api/webhooks/stripe/route.ts`.

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

`adapter_invocations` is created by the test setup only. It is not part of buyer migrate. `src/chaos` is imported only from tests. `NODE_ENV=production` forces injectors off. `ALLOW_CHAOS_INJECT` defaults to false.

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

Session payload: `{session_id, customer, customer_email, amount_total, currency, payment_status, mode}`. Opt-in invoice payload: `{invoice_id, customer, customer_email, amount_paid, currency}`. `grant_credit` reads `amount_total` or `amount_paid`, plus `currency` and `customer`.

## Drain

```bash
npm run outbox:drain -- --once
```

`--once` claims up to `OUTBOX_BATCH_SIZE` rows (default 10), **one after another**, then exits. Claim sets `locked_at`, `locked_by`, and `attempts = attempts + 1` with `FOR UPDATE SKIP LOCKED`. A lock older than `OUTBOX_LEASE_MS` (default 30000) can be reclaimed. There is no `lease_expires_at` column.

On adapter throw, `available_at = now() + 2^attempts seconds`, capped at 60. When `attempts` exceeds `OUTBOX_MAX_ATTEMPTS` (default 5), the row is copied to `dead_letters` (`reason = max_attempts`), `outbox.completed_at` is set, and `last_error = dead_lettered`. The parent `billing_events.status` stays `outboxed` or `ignored`. When every child outbox row is complete, drain sets `processed_at`.

Replay mutation (no polished CLI in this slice): refuse when `replayed_at` is set or the billing event row is missing; otherwise clear the outbox completion fields, set `dead_letters.replayed_at`, commit, and let a normal drain run. Dry-run returns the intended `UPDATE`s and the adapter name and writes nothing.

## Migrations

`npm run migrate` applies `migrations/*.sql` in lexicographic order, one transaction per file, and records the filename in `hooksteel_schema_migrations`. Files use plain `CREATE` (no `IF NOT EXISTS`) so a half-applied file is visible.

If migrate fails, fix the database and re-run. Do not hand-edit a file that only partly applied; the transaction rolls back, but a database you changed by hand outside the migrator will not match the filename ledger.

## Hookdeck

1. What Hookdeck is good at — hosted ingress, fan-out, rate limiting, observability, retries at the *edge*.
2. What HookSteel owns — in-app unique event id + transactional outbox + side-effect-after-commit + chaos proofs on *your* Postgres.
3. Use Hookdeck when — you need multi-destination routing, team dashboard, or do not want to run an outbox worker.
4. Use HookSteel when — double-fulfillment after rolled-back txns is the fear; you want owned code on Stripe **and** Polar.
5. Use both when — Hookdeck in front, HookSteel inside (optional; document; do not require).
6. Do not buy HookSteel if — you want yellowgram to host your webhooks.

## Known limits

- The full Stripe event is stored as JSONB and can contain **PII**. The kit has no purger. You own retention.
- **Connect:** event ids are globally unique, so the uniqueness key still holds. Adapters can read `event.account` from the stored payload. There is no `stripe_account` column in v0.1.
- Verify plus the database transaction should finish in **under 2 seconds**. A cold remote database that blows that budget should return **500** so Stripe retries. That is the correct outcome.
- Chaos scenario 2 proves uniqueness and no deadlocks under reordering and concurrency. It does **not** promise a global total order.
- Adapters that call Resend, GitHub, or Stripe should pass `idempotencyKey` through when the vendor supports it. The outbox unique key does not make those APIs idempotent by itself.

## Troubleshooting

**Signatures fail on events you just forwarded.** The route must verify the raw body (`request.text()`, or the raw buffer). `request.json()` changes bytes and `constructEvent` returns 400. Also check CLI `whsec_` vs Dashboard `whsec_`: they are not interchangeable.

## Polar

Not in this slice. No Polar SDK. Schema already accepts `provider = 'polar'`. See `src/webhooks/polar/README.md`.

## Support

Support is 60-day GitHub Issues, best-effort, no SLA.

## License

Commercial kit, not MIT. The Single-app grant is one production application and one production Stripe account (test and live keys of that same account count as one). See `LICENSE`.

## Docs

- [STATUS](./docs/STATUS.md)
- [DESIGN — Stripe path + chaos](./docs/DESIGN_STRIPE_PATH.md) — §1 is the contract this tree implements
- [Cycle-2 judgement](./docs/DESIGN_REVIEW_CYCLE2_JUDGEMENT.md)
- [MVP scope](./docs/MVP_SCOPE.md) · [MINIMUM_SUPPORT](./docs/MINIMUM_SUPPORT_CHECKLIST.md) · [Buyer needs](./docs/BUYER_NEEDS_BEYOND_CHECKLIST.md)
