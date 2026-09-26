# HookSteel — DESIGN: Stripe path + chaos suite (5 scenarios)

**Owner:** yellowgram  
**Product:** HookSteel — Billing Event Reliability Kit  
**Slice:** Stripe signed webhook → same-txn `billing_events` + `outbox` → minimal drain → **exactly 5** chaos scenarios green (Postgres CI target)  
**Repo (later implement):** https://github.com/yellowgram/hooksteel (README only today)  
**This pass:** **Design only.** No application code. No git push. No cloud-agent launch. Soft-WTP OFF. No Lock/Audit/services. No hosted gateway. No Polar SDK required for Stripe path.  
**Standing practice:** 3 progressive adversarial **design** iterations documented **before** implement. Code reviews come later after implementation.  
**Date:** 2026-09-26 ET  
**Halt gate:** After this file documents exactly 3 design iterations → **STOP for founder design review** before any implement.

---

## (0) Slice lock (what implement may build later)

| In this slice | Out of this slice |
| --- | --- |
| Postgres migrations: `billing_events`, `outbox`, `dead_letters` | Polar webhook verify path (next slice) |
| Stripe signed webhook handler (Next.js/Node route) | Polished replay CLI (interface sketch OK; full CLI later) |
| Persist event + enqueue outbox in **same transaction**; side effects only via outbox **after** commit | Landing / demo video |
| Minimal outbox drain (enough for chaos #5 + duplicate proof) | Polar listing / KYC |
| Fixture-based tests + **exactly 5** chaos scenarios green; Postgres CI target documented | Full production worker supervision polish beyond minimal drain |
| Adapter stubs: `grant_credit` / `send_email` / `invite_github` | Soft-WTP, Lock, Audit, services |
| `.env.example`, commercial LICENSE stub (credit-ledger tone), README section for Stripe path | Refund window 14 vs 30 (deferred until before Polar; not blocking) |

**Schema must not block Polar:** `provider` column includes `'polar'`; Polar verify can land next without migration rewrites.

---

## (1) Final design (post–3 iterations)

### 1.1 Module layout (buyer kit tree — later implement)

```
hooksteel/
  package.json                 # engines.node ≥20; lockfile committed
  .env.example
  LICENSE                      # commercial stub (credit-ledger tone)
  README.md                    # Stripe path section + Hookdeck honesty pointer
  BUYER_START_HERE.md          # can land thin stub this slice or next
  docker-compose.yml           # Postgres for local/CI (optional but preferred)
  migrations/
    001_billing_events.sql
    002_outbox.sql
    003_dead_letters.sql
  src/
    db/
      pool.ts                  # pg Pool from DATABASE_URL
      migrate.ts               # apply SQL files (minimal)
    webhooks/
      stripe/
        verify.ts              # constructEvent / HMAC verify; livemode gate
        handler.ts             # HTTP route body: verify → txn insert → ACK
        mapAdapters.ts         # event type → outbox adapter rows (config)
      # polar/                 # STUB dir or README “next slice” — no verify yet
    outbox/
      enqueue.ts               # called inside webhook txn only
      drain.ts                 # minimal: claim → execute → complete / dead_letter
      types.ts
    adapters/
      types.ts                 # FulfillmentAdapter interface
      grant_credit.ts          # stub (no-op / in-memory record)
      send_email.ts            # stub
      invite_github.ts         # stub
      registry.ts
    chaos/                     # test-only injectors; DEFAULT OFF; prod forces off
      flags.ts
      inject.ts
  tests/
    fixtures/
      stripe/
        checkout.session.completed.json
        secrets.ts             # canned whsec_ + bodies
    unit/
      stripe-verify.test.ts
      uniqueness.test.ts
    chaos/
      01-duplicate-delivery.test.ts
      02-out-of-order.test.ts
      03-signature-fail.test.ts
      04-handler-timeout.test.ts
      05-db-rollback-mid-fulfillment.test.ts
  scripts/
    outbox-drain.ts            # npm run outbox:drain [--once]
    # replay.ts                # interface sketched in §1.9; implement later
```

**Layout rules (Iter 3):**

- Prefer one clear Next.js App Router route e.g. `app/api/webhooks/stripe/route.ts` that **delegates** to `src/webhooks/stripe/handler.ts` — keep Stripe crypto + txn logic out of the route file so Node-only tests do not need a full Next boot.
- No Polar SDK in `package.json` for this slice. Stripe official SDK optional for verify (`stripe.webhooks.constructEvent`) **or** thin HMAC helper with fixtures — either OK; document choice in README. Prefer `stripe` package for verify correctness; buyer may tree-shake.
- Chaos injectors live under `src/chaos/` and are imported **only from tests** (or gated by `ALLOW_CHAOS_INJECT=true` + `NODE_ENV !== 'production'`). Shipping injectors on in production is a support+liability class bug (MINIMUM_SUPPORT §B.6).

### 1.2 Table DDL sketch

```sql
-- 001_billing_events.sql
CREATE TABLE billing_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider          TEXT NOT NULL CHECK (provider IN ('stripe', 'polar')),
  provider_event_id TEXT NOT NULL,          -- Stripe evt_… / Polar event id
  livemode          BOOLEAN NOT NULL,
  event_type        TEXT NOT NULL,
  payload           JSONB NOT NULL,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at      TIMESTAMPTZ,           -- set when all outbox for event completed (optional this slice)
  status            TEXT NOT NULL DEFAULT 'received'
                    CHECK (status IN ('received', 'outboxed', 'failed', 'dead')),
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX billing_events_received_at_idx ON billing_events (received_at DESC);

-- 002_outbox.sql
CREATE TABLE outbox (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_event_id  UUID NOT NULL REFERENCES billing_events (id),
  adapter           TEXT NOT NULL,         -- grant_credit | send_email | invite_github | …
  payload           JSONB NOT NULL,
  idempotency_key   TEXT NOT NULL,         -- stable: provider|provider_event_id|adapter
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

**Invariants:**

1. `(provider, provider_event_id)` unique → duplicate Stripe delivery cannot insert a second row.
2. Outbox row(s) written in the **same DB transaction** as the `billing_events` insert.
3. Side effects run only in drain **after** that txn commits.
4. `idempotency_key` unique on outbox → concurrent drains / replays cannot double-complete the same adapter work at the DB layer; adapters must still be idempotent at the external API.
5. Polar provider value reserved now; Polar verify deferred.

### 1.3 Handler sequence (prose + mermaid)

**Happy path**

1. Receive raw body + `Stripe-Signature` header.
2. If secret missing / placeholder → **400** (no store).
3. Verify signature; on fail → **400** (no store).
4. Parse event; evaluate livemode vs expected (from key prefix or `STRIPE_EXPECT_LIVEMODE`) → mismatch **400** (no store).
5. Begin DB txn:
   - `INSERT … ON CONFLICT (provider, provider_event_id) DO NOTHING RETURNING id`.
   - If no row returned (conflict) → commit/rollback empty work → **200** idempotent ACK (no new outbox).
   - Else enqueue outbox row(s) for mapped adapters with stable `idempotency_key` → set status `outboxed` → **commit**.
6. Return **200** promptly. Do **not** call adapters in the request.
7. Separately: drain process claims due outbox rows, executes adapters, marks `completed_at` or escalates to `dead_letters`.

**Failure path**

- Unexpected error / DB down / insert failure after verify → **500** so Stripe retries.
- Never map poison signature to 500 (retry storm). Never map DB blip to 400 (silent drop).

```mermaid
sequenceDiagram
  participant Stripe
  participant Route as Stripe webhook route
  participant Verify as verify.ts
  participant DB as Postgres txn
  participant Drain as outbox drain
  participant Adapter as stub adapter

  Stripe->>Route: POST raw body + Stripe-Signature
  Route->>Verify: constructEvent / livemode gate
  alt bad sig / missing secret / livemode mismatch
    Verify-->>Route: reject
    Route-->>Stripe: 400 (no row)
  else ok
    Route->>DB: BEGIN
    DB->>DB: INSERT billing_events ON CONFLICT DO NOTHING
    alt duplicate
      DB-->>Route: no new row
      Route-->>Stripe: 200 ACK
    else first insert
      DB->>DB: INSERT outbox (+ idempotency_key)
      DB->>DB: COMMIT
      Route-->>Stripe: 200
      Note over Drain,Adapter: after commit only
      Drain->>DB: claim outbox (lease)
      Drain->>Adapter: execute(idempotencyKey)
      Adapter-->>Drain: ok / throw
      Drain->>DB: completed_at or dead_letters
    end
  end
```

### 1.4 HTTP status contract (frozen)

| Condition | Status | Persist event? | Outbox? |
| --- | --- | --- | --- |
| Missing / placeholder webhook secret | **400** | No | No |
| Signature verification fail (tamper / wrong secret) | **400** | No | No |
| Livemode mismatch | **400** | No | No |
| First successful verify + insert + outbox enqueue | **200** | Yes | Yes (same txn) |
| Duplicate `provider_event_id` already stored | **200** | No new row | No new rows |
| DB unavailable / txn failure / unexpected handler error after verify | **500** | No (rolled back) | No |

Stripe retries on 5xx / timeouts; does not meaningfully retry on 4xx. Mapping everything to 400 buries retries; mapping poison to 500 causes storms — both are support fires (MINIMUM_SUPPORT §B.8).

### 1.5 Env vars (`.env.example` sketch)

```bash
# Postgres — ship path for outbox + chaos. Prefer this over any demo DB.
DATABASE_URL=postgres://postgres:postgres@localhost:5432/hooksteel

# Stripe TEST-MODE. yellowgram never receives buyer keys.
# Dashboard → Developers → API keys. Use sk_test_… for local; never live in demos.
STRIPE_SECRET_KEY=sk_test_replace_me

# stripe listen --forward-to localhost:3000/api/webhooks/stripe → whsec_…
# CLI secret ≠ Dashboard endpoint secret. Use the one that matches how you forward.
STRIPE_WEBHOOK_SECRET=whsec_replace_me

# Optional override. Unset: sk_live_ expects livemode true; otherwise expects false.
# STRIPE_EXPECT_LIVEMODE=false

# App origin for docs/examples only (no Host-header open redirect patterns).
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Worker identity string written to outbox.locked_by
OUTBOX_WORKER_ID=local-dev-1

# Max adapter attempts before dead_letters (default 5)
# OUTBOX_MAX_ATTEMPTS=5

# Demo / chaos injectors — DEFAULT false. NODE_ENV=production forces off.
ALLOW_DEMO_CONTROLS=false
ALLOW_CHAOS_INJECT=false

# Polar path — reserved for next slice; unused by Stripe path.
# POLAR_WEBHOOK_SECRET=
```

### 1.6 Adapter stubs

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

Ship: in-memory / console stubs that record `(idempotencyKey)` and no-op on second call. Tests assert call count === 1 under duplicate delivery and post-rollback recover. Buyer replaces stubs; deletes demo adapters from production deploys.

**Default Stripe → adapter map (config, not magic):** e.g. `checkout.session.completed` → `[grant_credit, send_email]` (invite_github opt-in). Document in README; wrong map is buyer config, not kit silence.

### 1.7 Minimal outbox drain (this slice)

Enough to prove chaos #1 and #5:

- `SELECT … FOR UPDATE SKIP LOCKED` (or equivalent) where `completed_at IS NULL AND available_at <= now()`.
- Set `locked_at` / `locked_by`; increment `attempts`.
- Call adapter; on success set `completed_at`.
- On failure: backoff `available_at`, set `last_error`; at `OUTBOX_MAX_ATTEMPTS` → insert `dead_letters`, leave outbox incomplete or mark terminal per chosen policy (**design choice locked:** move to dead_letters and set a terminal `completed_at` **or** keep incomplete with `available_at = infinity` — prefer: insert dead_letter + set `completed_at` with sentinel note in `last_error='dead_lettered'` so drain does not spin).
- CLI/script: `npm run outbox:drain -- --once` for tests; loop optional.

Full supervision runbook stays in MINIMUM_SUPPORT §G; this slice only needs drain that tests can invoke synchronously after webhook handler returns.

### 1.8 Test plan → exactly 5 chaos scenarios

| # | Scenario | How proven (design) | Pass criterion |
| --- | --- | --- | --- |
| **1** | Duplicate delivery | POST same signed fixture **4×** (or concurrent 4×) | Exactly **one** `billing_events` row; exactly **one** successful adapter execution for each mapped adapter (stub call log) |
| **2** | Out-of-order | Deliver event B then event A (different `provider_event_id`s); both valid | Both rows stored; uniqueness intact; **ordering policy:** kit does **not** promise global total order — each event independently outboxed; adapters that need sequence must encode it in *their* payload/business logic. Document this as known limit |
| **3** | Signature fail | Tamper body or wrong `whsec_` | **400**; **zero** `billing_events`; **zero** outbox |
| **4** | Handler timeout | Chaos inject: after verify, sleep/abort **before commit** (or kill mid-txn); then Stripe-like retry with same event | First attempt leaves **no** committed row (or rolled back); retry inserts once; **one** side effect after drain. Injector off by default |
| **5** | DB rollback mid-fulfillment | After commit of event+outbox, drain starts adapter; chaos inject forces adapter throw **or** simulates “effect attempted then process crash before completed_at”; recover + re-drain | Stub external effect count stays **1** via idempotency_key; **or** if effect is non-idempotent stub mode, row lands in `dead_letters` and replay/re-drain recovers **exactly once**. Preferred proof: idempotent stub + crash before `completed_at` → second drain → still one recorded effect |

**CI target (document in README, do not invent live Stripe network jobs):**

- Offline/fast: fixtures + signature + uniqueness (may use Postgres always for honesty — **prefer Postgres for all five** so offline ≠ “SQLite pretend”).
- Ready-gate: **5 chaos green on Postgres** in CI (GitHub Actions service container or equivalent). No required job that hits live Stripe API.

**Timeouts:** handler unit tests use short chaos sleep (e.g. ≤50–100ms) + AbortSignal; do not use multi-second sleeps in CI. Drain lease TTL documented (e.g. 30s) so stuck locks become available again.

### 1.9 Replay CLI — interface sketch only (not this slice’s build)

```text
hooksteel-replay list-dead
hooksteel-replay inspect <dead_letter_id>
hooksteel-replay dry-run <dead_letter_id>
hooksteel-replay execute <dead_letter_id>   # requires idempotent adapter
```

Refuse replay of events that never entered `billing_events` (signature failures). Full CLI = later slice; schema `replayed_at` already reserved.

### 1.10 LICENSE stub (credit-ledger tone — text to ship later)

Commercial kit license — HookSteel  

Copyright (c) 2026 yellowgram  

The kit is not MIT. yellowgram distributes it as a private repository and a Polar zip. That channel is not a public MIT grant.  

You may use and modify this kit in a commercial product (Single-app / one organization at launch). yellowgram takes no revenue royalty on that product.  

You may not redistribute, resell, sublicense, or republish this kit — or a substantial portion of it — as a competing starter, boilerplate, template, theme, or course. Shipping the kit inside a product you sell is the use grant. Handing out the kit as a starter is not.  

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND. YOU ARE RESPONSIBLE FOR BILLING CORRECTNESS IN PRODUCTION. THIS KIT DOES NOT PROVIDE LEGAL, TAX, OR ACCOUNTING ADVICE AND IS NOT AFFILIATED WITH STRIPE, POLAR, OR HOOKDECK.  

*(Multi-app $249 later; not implied by Single-app. No MIT extract required for v0.1.0 unless founder later carves one.)*

### 1.11 README section outline (Stripe path)

1. What HookSteel guarantees (unique event id + same-txn outbox + side effects after commit).  
2. Quickstart: `DATABASE_URL` → migrate → `.env` whsec_ → `npm test` → `outbox:drain --once`.  
3. HTTP status contract table (§1.4).  
4. Livemode / CLI vs Dashboard secret warning.  
5. Exactly 5 chaos names + Postgres CI as ship gate.  
6. Hookdeck honesty pointer (ingress vs in-app outbox).  
7. Polar path: “next”; schema already has `provider='polar'`.  
8. Support boundary one-liner (60-day Issues, no SLA).  

### 1.12 Acceptance criteria (for later implement — checklist only)

Halt gate: **do not** treat the following as a cloud-agent runbook. Founder reviews this design first. When implement is unlocked, the slice is done when:

1. Migrations create `billing_events`, `outbox`, `dead_letters` with uniqueness + FK sketches above (Polar value allowed on `provider`).  
2. Stripe webhook route verifies signature + livemode; persists + enqueues outbox in **one** txn; no adapter calls pre-commit.  
3. HTTP status contract matches §1.4 (400 / 500 / 200-duplicate).  
4. Minimal drain executes stubs idempotently; `idempotency_key` unique.  
5. All **five** chaos tests green against **Postgres**; CI target documented in README.  
6. Adapter stubs for grant_credit / send_email / invite_github with idempotent second-call no-op.  
7. `.env.example`, LICENSE stub (credit-ledger tone), README Stripe section present.  
8. Chaos/demo flags default **off**; production forces off. No Polar SDK dependency required to run Stripe path tests.

### 1.13 Known non-goals (this slice)

- Polar webhook verification / Polar fixtures as ready-gate for *this* slice (schema reserved only).  
- Polished replay CLI, landing page, 60s demo video, Polar listing.  
- Hosted gateway / Hookdeck clone / yellowgram ingress.  
- Soft-WTP, Lock, Audit, implementation services.  
- Fuzzing or a 6th chaos scenario.  
- Multi-app license SKU.  
- Credit Ledger product surface.  
- Refund window number (14 vs 30) — **deferred until before Polar**; not a blocker for Stripe path design or implement.  
- Global total-order guarantees across events/providers.  
- Warranty of billing correctness in buyer production.

---

## (2) Delta log — 3 progressive adversarial design iterations

### Iteration 1 — Billing / webhook reliability architect

**Lens:** Transaction boundaries, uniqueness, 400 vs 500, livemode, at-least-once Stripe delivery.

**Attack thesis:** A “verify then grant in the route” design will double-fulfill after rollback and will mis-teach HTTP statuses so Stripe either stops retrying (all 400) or storms (all 500). Livemode mix-ups silently corrupt test/live DBs.

| Decision locked | Rationale |
| --- | --- |
| Same-txn insert `billing_events` + `outbox`; adapters **only** after commit | Product differentiation; chaos #5 is first-class |
| `UNIQUE (provider, provider_event_id)` + `ON CONFLICT DO NOTHING` → 200 | Duplicate delivery is ACK, not error |
| 400 = auth/poison/livemode; 500 = transient/DB; 200 = success or duplicate | Matches MINIMUM_SUPPORT §B.8 / MVP_SCOPE |
| Livemode gate from key prefix + optional explicit override | Prevents live→test DB tickets |
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
| Chaos #5: crash/throw **after** outbox commit, **during** drain; idempotent stub recovers to one effect; else dead_letter + re-drain | Matches MVP_SCOPE pass criterion |
| Prefer **Postgres for all five** in CI; document if any unit stays fixture-only | MINIMUM_SUPPORT §A.2 / §D.20 honesty |
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
| Replay = **interface sketch only** this slice | Scope control; schema ready |
| LICENSE + `.env.example` + README Stripe section in-slice | Buyer-facing honesty early |
| Adapter map is **config**, stubs are obvious no-ops | Stub graduation (BUYER_NEEDS) |
| Explicit non-goals list + Hookdeck pointer in README outline | Kill criterion #5 deflector |
| Refund 14 vs 30 **out of slice** (founder deferred until before Polar) | Not a design blocker |

**Rejected in Iter 3:** Building Polar verify “while we’re here.” Building Grafana dashboards. Abstract message-bus beyond Postgres outbox. Auth product for adapters. India-ICP copy. Soft-WTP waitlist hooks. Cloud-agent implement command packs inside this design file (halt gate).

---

## (3) Open questions for founder (non-blocking for design review)

1. **Stripe verify dependency:** official `stripe` package `constructEvent` vs thin HMAC-only helper? Design allows either; recommend official for fewer signature edge bugs.  
2. **Default adapter map** for `checkout.session.completed`: include `invite_github` by default or opt-in only? Design default = grant_credit + send_email; invite opt-in.  
3. **Dead-letter terminal policy** nuance: prefer “dead_letter + mark outbox completed with `last_error=dead_lettered`” (locked above) vs keep row forever incomplete — confirm at implement kickoff.  
4. **Package manager / Next version pin** for the private repo scaffold (e.g. Next 15 vs 14) — not locked here.  
5. ~~Refund 14 vs 30~~ — **deferred until before Polar** per founder; not open for this slice.

*No further design iterations in this file until founder review. Implement unlocked only after explicit GO.*

---

*Last updated: 2026-09-26 ET — design-only; 3/3 adversarial design iterations complete; halt for founder review.*
