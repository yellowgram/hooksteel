# HookSteel — DESIGN: Stripe path + chaos suite (5 scenarios)

**Owner:** yellowgram  
**Product:** HookSteel — Billing Event Reliability Kit  
**Slice:** Stripe signed webhook → same-txn `billing_events` + `outbox` → minimal drain → **exactly 5** chaos scenarios green (Postgres CI target)  
**Repo (later implement):** https://github.com/yellowgram/hooksteel (README only today)  
**This pass:** **Design only.** No application code. No git push. No cloud-agent launch. Soft-WTP OFF. No Lock/Audit/services. No hosted gateway. No Polar SDK required for Stripe path.  
**Standing practice:** 3 progressive adversarial **design** iterations (cycle 1) + cycle-2 CoS locks merged after founder greenlight. Code reviews come later after implementation.  
**Date:** 2026-09-26 ET  
**Cycle 2:** Locks merged into §1. Founder GREENLIT. Implement unlocked under 3 code-review passes on `yellowgram/hooksteel`.  
**Purchase-refund window (current policy):** **14 days**, founder lock 2026-09-26. See [`REFUND_GLOSSARY.md`](./REFUND_GLOSSARY.md). This Stripe slice did not choose that number. Do not copy a rail default over 14 days. Listing stays dark.

---

## (0) Slice lock (what implement may build later)

| In this slice | Out of this slice |
| --- | --- |
| Postgres migrations: `hooksteel_schema_migrations`, `billing_events`, `outbox`, `dead_letters` | Polar webhook verify path (next slice) |
| Stripe signed webhook handler (Node library + `examples/next` route) | Polished replay CLI (schema + mutation locked; full CLI later) |
| Persist event + enqueue outbox in **same transaction**; side effects only via outbox **after** commit | Landing / demo video |
| Minimal outbox drain (enough for chaos #5 + duplicate proof) | Polar listing / KYC |
| Fixture-based tests + **exactly 5** chaos scenarios green; Postgres CI target documented | Full production worker supervision polish beyond minimal drain |
| Adapter stubs: `grant_credit` / `send_email` / `invite_github` | Soft-WTP, Lock, Audit, services |
| `.env.example`, commercial LICENSE stub (credit-ledger tone), README section for Stripe path | Purchase-refund window is **14 days** ([`REFUND_GLOSSARY.md`](./REFUND_GLOSSARY.md)). This slice did not pick it. |

**Schema must not block Polar:** `provider` column includes `'polar'`; Polar verify can land next without migration rewrites.

---

## (1) Final design (post–cycle-1 + cycle-2 locks)

### 1.1 Module layout (buyer kit tree — later implement)

```
hooksteel/
  package.json                 # engines.node ≥20; lockfile committed; NO next at root
  .env.example
  LICENSE                      # commercial stub (credit-ledger tone); Single-app = one prod app + one prod Stripe account
  README.md                    # Stripe path + Hookdeck honesty + known limits
  BUYER_START_HERE.md          # can land thin stub this slice or next
  docker-compose.yml           # Postgres for local/CI (optional but preferred)
  migrations/
    000_schema_migrations.sql  # hooksteel_schema_migrations
    001_billing_events.sql
    002_outbox.sql
    003_dead_letters.sql
  src/
    db/
      pool.ts                  # pg Pool from DATABASE_URL
      migrate.ts               # versioned apply (lex order, one txn per file)
    webhooks/
      stripe/
        verify.ts              # stripe.webhooks.constructEvent; livemode gate
        handler.ts             # handle({ rawBody, signature }) → verify → txn → ACK
        mapAdapters.ts         # event type → outbox adapter rows (config)
      # polar/                 # STUB dir or README “next slice” — no verify yet
    outbox/
      enqueue.ts               # called inside webhook txn only
      drain.ts                 # claim (lease reclaim) → execute → complete / dead_letter
      types.ts
    adapters/
      types.ts                 # FulfillmentAdapter interface
      grant_credit.ts          # stub (no-op / in-memory record)
      send_email.ts            # stub; missing email → no-op complete (H3)
      invite_github.ts         # stub
      registry.ts
    index.ts                   # production exports; MUST NOT export/import chaos
  examples/
    next/
      package.json             # next lives here only (e.g. Next 15)
      app/api/webhooks/stripe/route.ts   # request.text() → handle({ rawBody, signature })
  tests/
    fixtures/
      stripe/
        checkout.session.completed.json   # unsigned bodies; signatures minted at runtime
        secrets.ts
    unit/
      stripe-verify.test.ts
      uniqueness.test.ts
    chaos/
      01-duplicate-delivery.test.ts
      02-out-of-order.test.ts             # uniqueness/deadlock under reorder+concurrency
      03-signature-fail.test.ts
      04-handler-timeout.test.ts
      05-db-rollback-mid-fulfillment.test.ts
    setup/
      adapter_invocations.sql  # test-only table; not buyer migrate
  scripts/
    outbox-drain.ts            # npm run outbox:drain [--once]
    # replay.ts                # mutation locked in §1.9; CLI later
  .github/workflows/
    chaos-postgres.yml         # postgres:16; npm ci && migrate && test (when implement unlocked)
```

**Layout rules (cycle-2 DU-layout / NQ1 CLOSED = `examples_next`):**

- **Core kit = Node library + drain script.** Next is an **example only** under `examples/next/`. Root `package.json` **must not** depend on `next`.
- Advertised route: `examples/next/app/api/webhooks/stripe/route.ts` does **only**:
  ```ts
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');
  return handle({ rawBody, signature });
  ```
  Never `request.json()` on this route.
- Handler lives at `src/webhooks/stripe/handler.ts` and is called as `handle({ rawBody: string, signature: string | null })`. Stripe crypto + txn logic stay out of the route so Node-only tests do not boot Next.
- README includes an 8-line Node/Hono/Express snippet calling the same `handle()`.
- `src/chaos/*` is imported **only from `tests/*`**. Production `src/index.ts` does **not** export chaos. Env gate alone is not sufficient; shipping injectors on in production is a support+liability class bug (MINIMUM_SUPPORT §B.6).
- No Polar SDK in root `package.json` for this slice. Verify **must** use official `stripe` package `stripe.webhooks.constructEvent` (thin HMAC rejected — R5).

### 1.2 Table DDL sketch

```sql
-- 000_schema_migrations.sql
CREATE TABLE hooksteel_schema_migrations (
  id         TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 001_billing_events.sql
CREATE TABLE billing_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider          TEXT NOT NULL CHECK (provider IN ('stripe', 'polar')),
  provider_event_id TEXT NOT NULL,          -- Stripe evt_… / Polar event id
  livemode          BOOLEAN NOT NULL,
  event_type        TEXT NOT NULL,
  payload           JSONB NOT NULL,         -- full JSONB; buyer owns PII retention
  received_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at      TIMESTAMPTZ,           -- set when no child outbox remains incomplete
  status            TEXT NOT NULL DEFAULT 'received'
                    CHECK (status IN ('received', 'outboxed', 'ignored')),
  -- 'failed' and 'dead' reserved — do not write in v0.1 (dead_letters is the failure table)
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX billing_events_received_at_idx ON billing_events (received_at DESC);

-- 002_outbox.sql
CREATE TABLE outbox (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_event_id  UUID NOT NULL REFERENCES billing_events (id),
  adapter           TEXT NOT NULL,         -- grant_credit | send_email | invite_github | …
  payload           JSONB NOT NULL,
  idempotency_key   TEXT NOT NULL,         -- provider|provider_event_id|adapter
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  available_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts          INT NOT NULL DEFAULT 0,
  locked_at         TIMESTAMPTZ,
  locked_by         TEXT,
  completed_at      TIMESTAMPTZ,
  last_error        TEXT,
  UNIQUE (idempotency_key)
);

-- Drain index; reclaim filter (stale locked_at) is in the claim query, not the index.
CREATE INDEX outbox_drain_idx ON outbox (available_at)
  WHERE completed_at IS NULL;

-- 003_dead_letters.sql
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
```

**Status writers (NQ3 CLOSED = add `ignored`):**

| Transition | Who | Rule |
| --- | --- | --- |
| INSERT default `received` | handler | on first insert |
| → `outboxed` | handler (same txn) | `mapAdapters` returns ≥1 row + outbox inserts |
| → `ignored` | handler (same txn) | `mapAdapters` returns `[]`; zero outbox; HTTP **200** |
| `processed_at = now()` | drain | when no child outbox remains with `completed_at IS NULL` |
| never `failed` / `dead` on parent | — | adapter failure → `dead_letters` only (R4) |

**Invariants:**

1. `(provider, provider_event_id)` unique → duplicate Stripe delivery cannot insert a second row.
2. Outbox row(s) written in the **same DB transaction** as the `billing_events` insert (when mapped).
3. Side effects run only in drain **after** that txn commits.
4. `idempotency_key` unique on outbox → concurrent drains / replays cannot double-complete the same adapter work at the DB layer; adapters must still be idempotent at the external API.
5. Polar provider value reserved now; Polar verify deferred.
6. No `lease_expires_at` column (R3); reclaim uses `locked_at` + `OUTBOX_LEASE_MS`.

**Migrate versioning (DU-migrate):**

- `migrate.ts` applies SQL files in **lex order** iff `id` not present in `hooksteel_schema_migrations`, **one transaction per file**.
- SQL files use plain `CREATE TABLE` (**no `IF NOT EXISTS`**) so a half-apply is visible.
- File ids: `000_schema_migrations.sql`, `001_billing_events.sql`, `002_outbox.sql`, `003_dead_letters.sql`.
- README lock (H4): failed migrate = fix DB then re-run; do not hand-edit mid-file.
- CI: empty Postgres → migrate → test.

### 1.3 Handler sequence (prose + mermaid)

**Happy path**

1. Receive **raw body** string + `Stripe-Signature` header (mandatory input to verify).
2. If secret missing / empty / placeholder (`whsec_replace_me`, `replace_me`, `changeme`, `test`) / does not start with `whsec_` → **400** (no store). Never log the secret value.
3. Verify with `stripe.webhooks.constructEvent(rawBody, signature, secret)`; on fail → **400** (no store).
4. Compare `event.livemode` to `STRIPE_EXPECT_LIVEMODE` (default **false** if unset — test-mode kit). Do **not** infer from `sk_` prefix. Mismatch → **400** (no store).
5. Begin DB txn (try/finally: if COMMIT did not run, ROLLBACK before returning connection to pool):
   - `INSERT … ON CONFLICT (provider, provider_event_id) DO NOTHING RETURNING id`.
   - If no row returned (conflict) → commit/rollback empty work → **200** idempotent ACK (no new outbox).
   - Else call `mapAdapters(event_type)`:
     - If ≥1 adapters → enqueue outbox row(s) with stable `idempotency_key` → set status `outboxed` → **commit**.
     - If `[]` → set status `ignored`, zero outbox → **commit** → **200**.
6. Return **200** promptly. Do **not** call adapters in the request.
7. Separately: drain process claims due outbox rows (lease reclaim), executes adapters, marks `completed_at` or escalates to `dead_letters`.

**Failure path**

- Unexpected error / DB down / insert failure after verify → **500** so Stripe retries (txn rolled back).
- Never map poison signature to 500 (retry storm). Never map DB blip to 400 (silent drop).
- Chaos #4 must assert the retry INSERT is not blocked by idle-in-transaction.

```mermaid
sequenceDiagram
  participant Stripe
  participant Route as examples/next route
  participant Handler as handler.ts
  participant Verify as constructEvent
  participant DB as Postgres txn
  participant Drain as outbox drain
  participant Adapter as stub adapter

  Stripe->>Route: POST raw body + Stripe-Signature
  Route->>Handler: handle({ rawBody, signature })
  Handler->>Verify: constructEvent + livemode gate
  alt bad sig / placeholder / livemode mismatch
    Verify-->>Handler: reject
    Handler-->>Stripe: 400 (no row)
  else ok
    Handler->>DB: BEGIN
    DB->>DB: INSERT billing_events ON CONFLICT DO NOTHING
    alt duplicate
      DB-->>Handler: no new row
      Handler-->>Stripe: 200 ACK
    else first insert + mapped
      DB->>DB: INSERT outbox (+ idempotency_key); status=outboxed
      DB->>DB: COMMIT
      Handler-->>Stripe: 200
      Note over Drain,Adapter: after commit only
      Drain->>DB: claim outbox (lease reclaim)
      Drain->>Adapter: execute(idempotencyKey)
      Adapter-->>Drain: ok / throw / skipped_no_email
      Drain->>DB: completed_at or dead_letters
    else first insert + empty map
      DB->>DB: status=ignored; zero outbox; COMMIT
      Handler-->>Stripe: 200
    end
  end
```

### 1.4 HTTP status contract (frozen)

| Condition | Status | Persist event? | Outbox? |
| --- | --- | --- | --- |
| Missing / placeholder / non-`whsec_` webhook secret | **400** | No | No |
| Signature verification fail (tamper / wrong secret) | **400** | No | No |
| Livemode mismatch | **400** | No | No |
| First successful verify + insert + outbox enqueue | **200** | Yes (`outboxed`) | Yes (same txn) |
| Verified event with **empty** adapter map | **200** | Yes (`ignored`) | Zero |
| Duplicate `provider_event_id` already stored | **200** | No new row | No new rows |
| DB unavailable / txn failure / unexpected handler error after verify | **500** | No (rolled back) | No |

Stripe retries on 5xx / timeouts; does not meaningfully retry on 4xx. Mapping everything to 400 buries retries; mapping poison to 500 causes storms — both are support fires (MINIMUM_SUPPORT §B.8).

**Raw body:** JSON parse before verify is a buyer footgun and a failed signature, not a kit bug. Document in troubleshooting #1: raw body + CLI `whsec_` vs Dashboard `whsec_`.

### 1.5 Env vars (`.env.example` sketch)

```bash
# Postgres — ship path for outbox + chaos. Prefer this over any demo DB.
DATABASE_URL=postgres://postgres:postgres@localhost:5432/hooksteel

# stripe listen --forward-to … → whsec_…
# CLI secret ≠ Dashboard endpoint secret. Use the one that matches how you forward.
STRIPE_WEBHOOK_SECRET=whsec_replace_me

# Optional override. Unset → default false (test-mode kit). Do not infer from sk_.
# STRIPE_EXPECT_LIVEMODE=false

# Optional — only if your adapters call Stripe API. Unused by webhook verify / chaos / drain.
# STRIPE_SECRET_KEY=sk_test_replace_me

# App origin for docs/examples only (no Host-header open redirect patterns).
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Worker identity string written to outbox.locked_by
OUTBOX_WORKER_ID=local-dev-1

# Max adapter attempts before dead_letters (default 5)
# OUTBOX_MAX_ATTEMPTS=5

# Lease TTL for stuck locks (default 30000 ms). Reclaim: locked_at < now() - lease.
# OUTBOX_LEASE_MS=30000

# --once processes up to this many rows sequentially then exits (default 10)
# OUTBOX_BATCH_SIZE=10

# Demo / chaos injectors — DEFAULT false. NODE_ENV=production forces off.
# ALLOW_CHAOS_INJECT does not load src/chaos into production exports.
ALLOW_DEMO_CONTROLS=false
ALLOW_CHAOS_INJECT=false

# Polar path — reserved for next slice; unused by Stripe path.
# POLAR_WEBHOOK_SECRET=
```

### 1.6 Adapter stubs + default map

```ts
export interface FulfillmentAdapter {
  name: 'grant_credit' | 'send_email' | 'invite_github' | string;
  /** Idempotent on idempotencyKey — safe under duplicate drain / replay */
  execute(ctx: {
    billingEventId: string;
    providerEventId: string;
    payload: unknown;
    idempotencyKey: string;
  }): Promise<void>;
}
```

Ship: stubs that record `(idempotencyKey)` and no-op on second call. Tests assert call count === 1 under duplicate delivery and post-rollback recover via durable `adapter_invocations` (test-only). Buyer replaces stubs; deletes demo adapters from production deploys.

**Default Stripe → adapter map (config module, not magic):**

| Event type | Adapters |
| --- | --- |
| `checkout.session.completed` | `[grant_credit, send_email]` |
| `checkout.session.async_payment_succeeded` | `[grant_credit, send_email]` |
| `invoice.paid` | `[]` — **persist / `ignored` by default; opt-in map row like `invite_github` (H2 demotion)** |
| `customer.subscription.deleted` | `[]` — persist / `ignored` |
| `invite_github` | **opt-in only** — not in default map |

**H2 demotion (founder greenlight):** Do **not** default `invoice.paid → [grant_credit]`. High double-fulfill risk if buyer also maps Checkout packs. Demo story is Checkout. Document `invoice.paid → [grant_credit]` as an **opt-in** map row in README.

Persist every verified event. Empty map ⇒ status `ignored`, HTTP 200. One outbox row per (event, adapter). Same adapter twice on one event is a buyer config error (`UNIQUE idempotency_key` rejects).

`idempotency_key = provider + '|' + provider_event_id + '|' + adapter`

**Outbox payload shapes:**

- session completed / async_payment_succeeded: `{session_id, customer, customer_email, amount_total, currency, payment_status, mode}`
- invoice.paid (when opt-in mapped): `{invoice_id, customer, customer_email, amount_paid, currency}`

`grant_credit` reads `amount_total` or `amount_paid` + `currency` + `customer`.

**H3 demotion (founder greenlight):** `send_email` missing `customer_email` → **no-op complete** with `last_error=skipped_no_email` (set `completed_at`; clear lock). Do **NOT** throw → retry → dead_letter. Missing email is data shape, not transient; retry storms create DL noise.

Adapters that call external APIs SHOULD pass `idempotencyKey` to that API when the vendor supports it. Kit uniqueness does not make Resend idempotent by itself.

### 1.7 Minimal outbox drain (this slice)

**Claim SQL predicate (frozen — no `lease_expires_at` column):**

```sql
SELECT … FROM outbox
WHERE completed_at IS NULL
  AND available_at <= now()
  AND (locked_at IS NULL OR locked_at < now() - make_interval(secs => :lease_seconds))
FOR UPDATE SKIP LOCKED
```

`OUTBOX_LEASE_MS` default **30000**. Drain index may stay `(available_at) WHERE completed_at IS NULL`; reclaim filter is in the query.

**Claim must atomically:**

- set `locked_at = now()`, `locked_by = OUTBOX_WORKER_ID`, `attempts = attempts + 1`

**After increment:**

- If `attempts > OUTBOX_MAX_ATTEMPTS` (default 5): do **not** execute adapter; take dead-letter path.
- On adapter throw (attempts still ≤ max):  
  `available_at = now() + interval '1 second' * LEAST(60, 2 ^ attempts)`;  
  `last_error = message`; `locked_at = NULL`; `locked_by = NULL`.
- On adapter success (including H3 no-op skip):  
  `completed_at = now()`; `locked_at = NULL` (and for H3: `last_error = 'skipped_no_email'`).

**`--once`:** processes up to `OUTBOX_BATCH_SIZE` (default 10) rows **sequentially** in one process, then exits. Tests loop `--once` until idle. No in-process parallel adapter execution in v0.1. Multi-process OK via `SKIP LOCKED`.

**Terminal / dead-letter policy (confirmed):**

```sql
INSERT INTO dead_letters (outbox_id, billing_event_id, reason, payload_snapshot) …
UPDATE outbox SET completed_at = now(), last_error = 'dead_lettered',
  locked_at = NULL, locked_by = NULL
WHERE id = …
```

When no child outbox remains with `completed_at IS NULL`, drain sets `billing_events.processed_at = now()`. Drain does **not** write `failed`/`dead` onto `billing_events`.

CLI/script: `npm run outbox:drain -- --once` for tests; loop optional. Full supervision runbook stays in MINIMUM_SUPPORT §G.

### 1.8 Test plan → exactly 5 chaos scenarios

| # | Scenario | How proven (design) | Pass criterion |
| --- | --- | --- | --- |
| **1** | Duplicate delivery | POST same **runtime-minted** signed fixture **4× concurrent** | Exactly **one** `billing_events` row; exactly **one** `adapter_invocations` row per mapped adapter |
| **2** | Out-of-order + concurrent (uniqueness/deadlock) | Deliver B then A (distinct evt ids) **AND** concurrent A+B plus duplicate A | **2** event rows; correct outbox counts; **zero deadlocks**; 1 invocation per mapped adapter per event. Kit does **not** promise global total order. README honesty: prove safe under reordering/concurrency, not total order (H5) |
| **3** | Signature fail | Tamper one byte after mint (or wrong `whsec_`) | **400**; **zero** `billing_events`; **zero** outbox |
| **4** | Handler timeout | Chaos inject: after verify, abort **before commit**; Stripe-like retry same event | First attempt leaves **0** committed rows; retry inserts once; **1** invocation after drain; **no idle-in-transaction** blocking retry. Injector off by default |
| **5** | DB rollback mid-fulfillment | After event+outbox commit, stub writes `adapter_invocations` on **separate connection**, then throw/kill **BEFORE** `outbox.completed_at`; re-drain | `adapter_invocations COUNT = 1` for that key |

**Signatures:** minted at test runtime from unsigned fixture bodies + test `whsec_` via `stripe.webhooks.generateTestHeaderString` (or equivalent). Do **not** check in a timestamped `Stripe-Signature` header.

**Test-only table** (created by test setup, **not** buyer migrate):

```sql
CREATE TABLE adapter_invocations (
  idempotency_key TEXT PRIMARY KEY,
  adapter         TEXT NOT NULL,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Stub `execute` writes that row on a **SEPARATE connection** from the drain txn so the write survives a simulated crash. Production adapters must not write this table.

**CI target (DU-ci):**

- `.github/workflows/chaos-postgres.yml`: `services: postgres:16`; `npm ci && npm run migrate && npm test`
- `engines.node = 20`; lockfile committed; Next **not** a root dependency
- Prefer **Postgres for all five**. No required job that hits live Stripe API.
- Timeouts in tests ≤100ms + AbortSignal. Lease 30s documented; tests may shorten lease via env.

### 1.9 Replay — schema contract now; CLI later

```text
hooksteel-replay list-dead
hooksteel-replay inspect <dead_letter_id>
hooksteel-replay dry-run <dead_letter_id>
hooksteel-replay execute <dead_letter_id>   # requires idempotent adapter
```

**Replay `execute <dead_letter_id>` mutation (locked):**

- REFUSE if `dead_letters.replayed_at IS NOT NULL` (no `--force` in v0.1)
- REFUSE if billing_event row missing
- REFUSE if the event never entered `billing_events` (signature failures)
- BEGIN  
  - `UPDATE outbox SET completed_at = NULL, last_error = NULL, available_at = now(), locked_at = NULL, locked_by = NULL, attempts = 0 WHERE id = dead.outbox_id`  
  - `UPDATE dead_letters SET replayed_at = now() WHERE id = …`  
  COMMIT  
- Then run **normal drain**. Do **not** call adapter inside the replay process.
- Dry-run prints intended UPDATE + adapter name; **zero writes**.

Full CLI = later slice; schema `replayed_at` + mutation locked now.

### 1.10 LICENSE stub (credit-ledger tone — text to ship later)

**Superseded 2026-09-27.** The paragraphs below are the v0.1.0 design stub. They are not the public license. The public license is `LICENSE` (PolyForm Noncommercial 1.0.0; source-available; not an OSI-approved open source license; not MIT). Paid commercial use is `docs/COMMERCIAL_GRANT.md`.

Commercial kit license — HookSteel  

Copyright (c) 2026 yellowgram  

The kit is not MIT. yellowgram distributes it as a private repository and a Polar zip. That channel is not a public MIT grant.  

You may use and modify this kit in a commercial product under the **Single-app** grant: **one production application and one production Stripe account** (test + live keys of that same account count as one). A second production product or a second live Stripe account requires the later Multi-app SKU. Not a GitHub-org count. Not a legal-entity count. yellowgram takes no revenue royalty on that product.  

You may not redistribute, resell, sublicense, or republish this kit — or a substantial portion of it — as a competing starter, boilerplate, template, theme, or course. Shipping the kit inside a product you sell is the use grant. Handing out the kit as a starter is not.  

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND. YOU ARE RESPONSIBLE FOR BILLING CORRECTNESS IN PRODUCTION. THIS KIT DOES NOT PROVIDE LEGAL, TAX, OR ACCOUNTING ADVICE AND IS NOT AFFILIATED WITH STRIPE, POLAR, OR HOOKDECK. Outbox proves side-effect-after-commit + idempotency; it does **not** certify PCI, charge correctness, or tax (R9).  

*(Multi-app $249 later; not implied by Single-app. No MIT extract required for v0.1.0 — R13.)*

### 1.11 README section outline (Stripe path)

1. What HookSteel guarantees (unique event id + same-txn outbox + side effects after commit).  
2. Quickstart: `DATABASE_URL` → migrate → `.env` whsec_ → `npm test` → `outbox:drain --once`. Framework-agnostic: 8-line Node/Hono/Express `handle()` snippet; Next under `examples/next`.  
3. HTTP status contract table (§1.4), including **ignored** for empty map.  
4. Livemode / CLI vs Dashboard secret warning; `constructEvent` + raw body mandatory.  
5. Exactly 5 chaos names + Postgres CI as ship gate.  
6. Default adapter map + **opt-in** rows (`invite_github`, `invoice.paid → [grant_credit]`).  
7. Hookdeck honesty (paste MVP_SCOPE 6-bullet outline verbatim):  
   1. What Hookdeck is good at — hosted ingress, fan-out, rate limiting, observability, retries at the *edge*.  
   2. What HookSteel owns — in-app unique event id + transactional outbox + side-effect-after-commit + chaos proofs on *your* Postgres.  
   3. Use Hookdeck when — you need multi-destination routing, team dashboard, or do not want to run an outbox worker.  
   4. Use HookSteel when — double-fulfillment after rolled-back txns is the fear; you want owned code on Stripe **and** Polar.  
   5. Use both when — Hookdeck in front, HookSteel inside (optional; document; do not require).  
   6. Do not buy HookSteel if — you want yellowgram to host your webhooks.  
8. Known limits:  
   - full Stripe JSONB is **PII**; kit has no purger; buyer owns retention  
   - **Connect:** uniqueness OK (evt ids global); adapters read `event.account`; no `stripe_account` column in v0.1  
   - verify+txn target **&lt; 2s**; cold remote DB → 500 + Stripe retry is correct  
   - chaos #2 proves uniqueness/deadlock under reorder, **not** global total order  
9. Troubleshooting #1: raw body + CLI whsec vs Dashboard whsec.  
10. Polar path: “next”; schema already has `provider='polar'`.  
11. Support boundary one-liner (60-day Issues, no SLA).  
12. LICENSE Single-app sentence (NQ2).

### 1.12 Acceptance criteria (for later implement — checklist only)

Founder GREENLIT cycle-2 locks. When implement runs under 3 code-review passes, the slice is done when:

1. Migrations create `hooksteel_schema_migrations`, `billing_events` (status includes `ignored`), `outbox`, `dead_letters` with uniqueness + FK sketches above (Polar value allowed on `provider`); plain CREATE; versioned migrate.  
2. Stripe webhook path verifies via `constructEvent` + livemode; raw body; persists + enqueues outbox in **one** txn; empty map → `ignored`; no adapter calls pre-commit; try/finally rollback.  
3. HTTP status contract matches §1.4 (400 / 500 / 200-duplicate / 200-ignored).  
4. Minimal drain: lease reclaim predicate, atomic attempts++, exponential backoff, batch `--once`, dead_letter terminal policy + replay mutation.  
5. All **five** chaos tests green against **Postgres** with runtime-minted sigs + durable `adapter_invocations`; CI workflow documented.  
6. Adapter stubs + default map with **H2/H3**: `invoice.paid → []` default; `send_email` missing email → `skipped_no_email` no-op complete.  
7. `.env.example` (lease/batch/attempts; sk_ optional commented), LICENSE stub (Single-app NQ2), README Stripe section present.  
8. Chaos not in production export graph. No Polar SDK / no Next at root required to run Stripe path tests.  
9. `examples/next` route uses `request.text()` only.

### 1.13 Known non-goals (this slice)

- Polar webhook verification / Polar fixtures as ready-gate for *this* slice (schema reserved only).  
- Polished replay CLI binary (mutation locked; CLI later).  
- Landing page, 60s demo video, Polar listing.  
- Hosted gateway / Hookdeck clone / yellowgram ingress.  
- Soft-WTP, Lock, Audit, implementation services.  
- Fuzzing or a 6th chaos scenario (R11).  
- Multi-app license SKU.  
- Credit Ledger product surface.  
- Purchase-refund window is **14 days** ([`REFUND_GLOSSARY.md`](./REFUND_GLOSSARY.md)). This slice did not pick it. Not a Stripe-path blocker.  
- Global total-order guarantees across events/providers.  
- Warranty of billing correctness / PCI certification via outbox (R9).  
- SERIALIZABLE isolation (R1), LISTEN/NOTIFY required (R2), `lease_expires_at` column (R3), parent `failed` on adapter throw (R4).  
- Hand-rolled HMAC (R5), require `sk_` for webhook (R6), drop unmapped events (R7), redacted-only payloads (R8).  
- Next as core dependency (R10), Grafana/worker UI (R12), public MIT extract (R13), implement-now-fix-leases-in-CR (R14).

---

## (2) Delta log — Cycle 1: 3 progressive adversarial design iterations

### Iteration 1 — Billing / webhook reliability architect

**Lens:** Transaction boundaries, uniqueness, 400 vs 500, livemode, at-least-once Stripe delivery.

**Attack thesis:** A “verify then grant in the route” design will double-fulfill after rollback and will mis-teach HTTP statuses so Stripe either stops retrying (all 400) or storms (all 500). Livemode mix-ups silently corrupt test/live DBs.

| Decision locked | Rationale |
| --- | --- |
| Same-txn insert `billing_events` + `outbox`; adapters **only** after commit | Product differentiation; chaos #5 is first-class |
| `UNIQUE (provider, provider_event_id)` + `ON CONFLICT DO NOTHING` → 200 | Duplicate delivery is ACK, not error |
| 400 = auth/poison/livemode; 500 = transient/DB; 200 = success or duplicate | Matches MINIMUM_SUPPORT §B.8 / MVP_SCOPE |
| Livemode gate (refined in cycle 2: `STRIPE_EXPECT_LIVEMODE` default false) | Prevents live→test DB tickets |
| `idempotency_key` on outbox | Drain/replay safety at DB layer |
| Reserve `provider='polar'` now | Avoid migration churn next slice |
| No side effects inside request txn “for latency” | Hard ban |

**Rejected in Iter 1:** “Upsert and re-enqueue outbox on duplicate” (would double side effects). “Return 409 on duplicate” (Stripe retries weirdly; 200 ACK is correct).

### Iteration 2 — Adversarial chaos / test engineer

**Lens:** How each of the 5 scenarios is **proven**; timeouts; rollback-mid-fulfillment; CI honesty.

**Attack thesis:** Iter 1’s invariants look good on a whiteboard but tests that only check “row count = 1” without asserting adapter call counts, or that use SQLite for “chaos,” will ship a kit that flakes on Neon concurrency and fails chaos #4/#5 under real leases.

| Decision locked | Rationale |
| --- | --- |
| Exactly 5 named test files; no fuzz harness in v1 | DECISION chaos cap |
| Chaos #1 asserts **adapter execution count**, not only row count | Dup rows without dup side effects is the demo |
| Chaos #2 documents **non-total-order** policy explicitly | Prevents false “ordering bug” Issues |
| Chaos #3: zero rows on tamper | Signature path must not store first |
| Chaos #4: inject **before commit**; retry proves single insert + single effect | Timeout ≠ “effect then 500” |
| Chaos #5: crash/throw **after** outbox commit, **during** drain; idempotent stub recovers to one effect | Matches MVP_SCOPE pass criterion |
| Prefer **Postgres for all five** in CI | MINIMUM_SUPPORT §A.2 / §D.20 honesty |
| Short inject sleeps; lease/SKIP LOCKED | CI time + concurrent drain safety |
| `ALLOW_CHAOS_INJECT` default false; production force-off | §B.6 |

**Rejected in Iter 2:** Sixth scenario “network partition to Stripe API.” Live-network CI job. Multi-second timeout sleeps. Requiring a full Next server boot for every chaos test (prefer handler-level tests + thin route wrapper).

### Iteration 3 — Indie buyer / integrator (DX)

**Lens:** Node/Next layout, what **not** to overbuild, stranger unzip path, Hookdeck confusion.

**Attack thesis:** Iter 2 hardens proofs but buyers still drown if the tree is a mini-platform (queue UI, multi-tenant, Polar SDK forced, polished replay CLI blocking Stripe path). Wrong scope delays the 60s demo and invites Soft-WTP.

| Decision locked | Rationale |
| --- | --- |
| Thin route + `src/webhooks/stripe/handler.ts` testable without full Next | DX + fast chaos |
| Stripe path ships **without** Polar SDK | MINIMUM_SUPPORT §B.11 |
| Minimal drain script, not a hosted worker SaaS | Digital kit shape |
| Replay = **interface sketch** this slice (cycle 2 locked mutation) | Scope control; schema ready |
| LICENSE + `.env.example` + README Stripe section in-slice | Buyer-facing honesty early |
| Adapter map is **config**, stubs are obvious no-ops | Stub graduation (BUYER_NEEDS) |
| Explicit non-goals list + Hookdeck pointer in README outline | Kill criterion #5 deflector |
| Purchase-refund window **14 days** ([`REFUND_GLOSSARY.md`](./REFUND_GLOSSARY.md)); this slice did not pick it | Not a design blocker |

**Rejected in Iter 3:** Building Polar verify “while we’re here.” Building Grafana dashboards. Abstract message-bus beyond Postgres outbox. Auth product for adapters. India-ICP copy. Soft-WTP waitlist hooks. Cloud-agent implement command packs inside this design file (halt gate).

---

## (3) Open questions for founder

**ZERO open product questions for this slice** except:

- Purchase-refund window is **14 days** ([`REFUND_GLOSSARY.md`](./REFUND_GLOSSARY.md)). Not open inside this slice. Do not reopen it here.

### CLOSED at recommended answers (founder greenlight of cycle-2 locks)

| ID | Closed at | Means |
| --- | --- | --- |
| **NQ1** | `examples_next` | Root Node library + drain; advertised route under `examples/next/…`; no `next` at root; `npm test` does not boot Next |
| **NQ2** | one prod app + one prod Stripe account | test+live of that account = one; second product/account = Multi-app later |
| **NQ3** | add `ignored` | empty adapter map → `ignored`, HTTP 200; `failed`/`dead` reserved, not written in v0.1 |

### CLOSED from cycle-1 §3 (superseded by cycle-2 DUs)

| Was | Now |
| --- | --- |
| constructEvent vs thin HMAC | **constructEvent required** (R5 keeps thin HMAC rejected) |
| invite_github default or opt-in | **opt-in** |
| dead-letter terminal policy | **dead_letter + completed_at sentinel + replay mutation** (§1.7 / §1.9) |
| package manager / Next pin | **Node 20**; Next not root dep; Next 15 only inside `examples/next` |

### HookSteel demotions applied (H2 / H3)

| # | Demotion | Applied in §1 |
| --- | --- | --- |
| **H2** | Default map `invoice.paid → []` (persist/`ignored`); opt-in like `invite_github`. **Not** `[grant_credit]` | §1.6 |
| **H3** | Missing `customer_email` on `send_email` stub → **no-op complete** with `last_error=skipped_no_email`; do **not** throw → retry → dead_letter | §1.6 / §1.7 |

**H1** (process reject of CoS auto-merge) was resolved by **founder greenlight** of NQ1–NQ3 recommendations — now CLOSED above. H4 (migrate docs) and H5 (chaos #2 name honesty) accepted with notes into §1.2 / §1.8.

*Implement unlocked under 3 code-review passes on `yellowgram/hooksteel`. No Soft-WTP / Lock / Audit / hosted gateway / Polar SDK on Stripe path.*

---

## (4) Cycle 2 delta log

Source packet: `COS_STRIPE_PATH_CYCLE2.yaml` (schema v3) + HookSteel judgement `DESIGN_REVIEW_CYCLE2_JUDGEMENT.md`. Founder GREENLIT merge of accepted DUs with H2/H3 demotions; NQ1–NQ3 CLOSED at recommended answers.

### Iteration 1 — Distributed systems / outbox

**Expert:** distributed_systems_outbox  

**Attack thesis:** Cycle-1 locked SKIP LOCKED + completed_at then hand-waved lease TTL. Dead worker leaves rows invisible. attempts timing unspecified. Replay had a name and no mutation. Parent status values never written.

**Accepted findings → DUs:**

| Finding | Sev | Update |
| --- | --- | --- |
| I1-P0-lease-reclaim | P0 | DU-ddl-lease |
| I1-P0-attempts-accounting | P0 | DU-attempts-backoff |
| I1-P0-replay-mutation | P0 | DU-dead-letter-and-replay |
| I1-P1-parent-status-machine | P1 | DU-ddl-status-ignored |
| I1-P1-backoff-formula | P1 | DU-attempts-backoff |
| I1-P1-txn-rollback-on-abort | P1 | DU-handler-http-raw-body |
| I1-P1-claim-batch | P1 | DU-attempts-backoff |
| I1-P2-indexes | P2 | DU-ddl-lease |

**Rejected (stay out):** SERIALIZABLE isolation · LISTEN/NOTIFY required in v0.1 · `lease_expires_at` column mandatory · write `billing_events.failed` on first adapter throw.

### Iteration 2 — Stripe contract / security

**Expert:** stripe_contract_and_security  

**Attack thesis:** Advertised App Router route never locked `request.text()`. `sk_` required for a whsec-only path. Unmapped types unspecified. Checked-in signatures rot under constructEvent tolerance.

**Accepted findings → DUs:**

| Finding | Sev | Update |
| --- | --- | --- |
| I2-P0-raw-body-next | P0 | DU-handler-http-raw-body |
| I2-P0-verify-dependency | P0 | DU-verify-and-livemode |
| I2-P0-livemode-source | P0 | DU-verify-and-livemode |
| I2-P1-placeholder-secret | P1 | DU-verify-and-livemode |
| I2-P1-event-map-empty | P1 | DU-adapter-map-and-payload |
| I2-P1-fixture-signatures | P1 | DU-chaos-proofs |
| I2-P1-payload-shape | P1 | DU-adapter-map-and-payload |
| I2-P1-pii-retention | P1 | DU-pii-connect-timeout-docs |
| I2-P2-connect | P2 | DU-pii-connect-timeout-docs |
| I2-P2-timeout-budget | P2 | DU-pii-connect-timeout-docs |

**Rejected (stay out):** Hand-rolled HMAC · Require `sk_` in webhook process · Drop unmapped events · Redacted payloads only in v0.1 · PCI opinion that outbox equals billing correctness.

### Iteration 3 — Kit ship / support load

**Expert:** kit_ship_and_support_load  

**Attack thesis:** Chaos #2 cannot fail. Chaos #5 can be faked in RAM. migrate.ts bricks second run. In-root Next implies the kit is a Next app. STATUS.md already says design done.

**Accepted findings → DUs:**

| Finding | Sev | Update |
| --- | --- | --- |
| I3-P0-chaos5-durable-log | P0 | DU-chaos-proofs |
| I3-P0-chaos2-substance | P0 | DU-chaos-proofs |
| I3-P0-migrate-versioning | P0 | DU-migrate |
| I3-P1-chaos-not-in-prod-graph | P1 | DU-layout |
| I3-P1-framework-agnostic-readme | P1 | DU-layout |
| I3-P1-license-org-definition | P1 | DU-pii-connect-timeout-docs |
| I3-P1-ci-shape | P1 | DU-ci |
| I3-P1-example-route-location | P1 | DU-layout |
| I3-P1-status-doc-honesty | P1 | DU-status |
| I3-P2-hookdeck-pointer-is-outline-only | P2 | DU-pii-connect-timeout-docs |

**Rejected (stay out):** Next as core dependency · Sixth chaos scenario · Grafana / worker UI · Public MIT extract · Implement now and fix leases in code review.

### HookSteel judgement H1–H3 (on CoS *accepted* items)

| # | Item | Disposition | Outcome this merge |
| --- | --- | --- | --- |
| **H1** | NQ1–NQ3 auto-locked / CoS merges without founder | **Process reject** (do not auto-merge) | **Resolved:** founder GREENLIT recommendations → NQ1–NQ3 CLOSED in §3 |
| **H2** | Default `invoice.paid → [grant_credit]` | **Demote** | Applied: `invoice.paid → []` (persist/`ignored`); opt-in like `invite_github` |
| **H3** | `send_email` missing email → throw → retry/DL | **Demote** | Applied: no-op complete with `last_error=skipped_no_email` |
| H4 | Plain CREATE / no IF NOT EXISTS | Accept + README migrate docs | In §1.2 |
| H5 | Chaos #2 reframed to uniqueness/deadlock | Accept proof; keep name “out-of-order” + honesty | In §1.8 |

### Applied design_updates (all `apply: required`, with H2/H3)

DU-layout · DU-ddl-status-ignored · DU-ddl-lease · DU-attempts-backoff · DU-dead-letter-and-replay · DU-handler-http-raw-body · DU-verify-and-livemode · DU-adapter-map-and-payload (**+H2/H3**) · DU-chaos-proofs · DU-migrate · DU-env · DU-pii-connect-timeout-docs · DU-ci · DU-status.

---

*Last updated: 2026-09-26 ET — cycle-2 locks merged into §1; NQ1–NQ3 CLOSED; H2/H3 demotions applied; implement unlocked under 3 code-review passes. No application code in this pass.*
