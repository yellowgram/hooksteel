> **Historical note (pre-go-live).** This document records the Polar-path design pass of 2026-09-26. As of 2026-09-27 the Polar listing is live and sells `hooksteel-0.1.1.zip` (SHA-256 `e5fb3c1117b954f344fb27e7b1bf7be89d46e120839e238983d017a50e08e4d9`). https://github.com/yellowgram/hooksteel is public and source-available. GitHub Release `v0.1.1` is published. Sentences below that say the listing stays dark, do not publish, or the repo is private describe that pass. They are not current commercial status. Soft-WTP stays off. Purchase-refund window stays 14 days. This note does not change Polar settings.

# HookSteel — DESIGN: Polar webhook path

**Owner:** yellowgram  
**Product:** HookSteel — Billing Event Reliability Kit  
**Slice:** Polar signed webhook → same-txn `billing_events` (`provider='polar'`) + `outbox` → **existing** drain / replay. Verify + handle + fixtures + `examples/next` route + Polar adapter map.  
**Base:** `main` @ `f25f235` (Stripe path merged). Schema, outbox, drain, replay, five chaos files, and the Stripe handler stay.  
**Repo:** https://github.com/yellowgram/hooksteel  
**This pass:** **Design only.** No application code. No Polar SDK forced into buyer apps. Soft-WTP OFF. No Lock/Audit/services. No hosted gateway. No Polar listing/KYC.  
**Purchase-refund window (current policy):** **14 days**, founder lock 2026-09-26. See [`REFUND_GLOSSARY.md`](./REFUND_GLOSSARY.md). This Polar-path slice did not choose that number. Do not copy a rail default over 14 days. At this design pass the listing was still dark; the historical note at the top is the current commercial status. `order.refunded` clawback stays out of the kit.  
**Standing practice:** 3 progressive adversarial **design** iterations in §2. **Founder GREENLIT** 2026-09-26. PQ1 and PQ2 are closed in §3. CoS PD1–PD4 are implement locks. **Implement is a separate later PR** — not this design change.  
**Date:** 2026-09-26 ET  
**Evidence read that day:** Polar delivery docs, Polar TypeScript SDK `webhooks.ts` on `master`, Standard Webhooks spec, Polar OpenAPI `2026-04`, Polar sandbox + events docs, Polar issue #13519.

---

## (0) Slice lock (what implement may build later)

| In this slice | Out of this slice |
| --- | --- |
| `src/webhooks/polar/{verify,handler,mapAdapters,payload}.ts` — stdlib HMAC, no `@polar-sh/sdk` | Any edit to `migrations/`, `src/outbox/`, drain, replay, or the Stripe verify/handler/map |
| `handlePolar({ rawBody, webhookId, webhookTimestamp, webhookSignature })` | Renaming Stripe `handle` / `mapAdapters` exports |
| Default Polar adapter map + outbox payload that existing `grant_credit` / `send_email` already understand | New adapters, refund clawback, Slack/Discord payload parsing |
| Unsigned fixture + runtime-minted signatures; unit tests; **extend the existing five chaos files** | A sixth chaos file or a sixth scenario name |
| Thin route `examples/next/app/api/webhooks/polar/route.ts` (`request.text()` only) | `next` at the repo root; Polar SDK in `examples/next` |
| `.env.example` + README / `BUYER_START_HERE` notes for the Polar path (implement pass) | LICENSE edit; Polar listing; KYC; hosted worker |
| Replace the stub `src/webhooks/polar/README.md` with the modules above | Soft-WTP, Lock, Audit, services, refund-window number |

**Schema is already Polar-ready.** `billing_events.provider` checks `IN ('stripe', 'polar')` (`migrations/001_billing_events.sql`). Do not add a migration to “add polar”.

---

## (1) Final design (post–design×3)

§1 is the lock after the three iterations in §2. Implement from §1, not from an earlier iteration’s rejected sketch.

### 1.1 Verify API (locked)

**Do not depend on `@polar-sh/sdk`, `standardwebhooks`, or `svix`.** Verify with `node:crypto` (`createHmac`, `timingSafeEqual`). That is the supported algorithm, not a temporary stand-in.

Polar’s own SDK example is fine for Polar’s docs. It is the wrong dependency for this kit (MVP_SCOPE: no Polar SDK as a required dependency inside the buyer app). A spec-only Standard Webhooks library is also the wrong single call: one constructor verifies only one secret era (see evidence).

#### Evidence

| Source | What it locks |
| --- | --- |
| [Polar — Handle & monitor webhook deliveries](https://polar.sh/docs/integrate/webhooks/delivery), fetched 2026-09-26 | Secrets **generated before 2026-09-08 00:00 UTC** are “Polar HMAC”: the HMAC key is the **UTF-8 bytes of the full `whsec_…` string**. Secrets **generated on or after that instant** are Standard Webhooks: pass `whsec_…` through as a Standard Webhooks secret (strip `whsec_`, base64-decode the remainder). The delivery page says Polar SDKs **1.0.0-alpha.19 and later** try **both** keys. `sdk/typescript/src/webhooks.ts` on `master` (fetched the same day) does that. Polar retries failed deliveries (up to 10, exponential backoff), times out at **10s**, asks handlers to respond within **2s**, and **disables the endpoint after 10 consecutive non-2xx responses**. |
| [polar `sdk/typescript/src/webhooks.ts` on master](https://github.com/polarsource/polar/blob/master/sdk/typescript/src/webhooks.ts), fetched 2026-09-26 | Tolerance **300 seconds** both directions. Signed content `` `${webhookId}.${Math.floor(timestamp)}.${body}` ``. Header `webhook-signature` is space-separated `v1,<base64>`. `hmacKeys`: always the UTF-8 secret, plus base64-decode of the `whsec_` remainder when that decode is non-empty and different. Compare HMAC bytes (WebCrypto `verify`), not strings. |
| [Standard Webhooks spec](https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md) | Symmetric scheme HMAC-SHA256, secret serialized as base64 with a `whsec_` prefix, signature id `v1`, constant-time compare, timestamp tolerance against replay, `webhook-id` stable across retries and used as the idempotency key. Id and timestamp must not contain `.` (concatenation attack). Sign the **exact** body bytes; do not re-serialize JSON. |
| [polarsource/polar#13519](https://github.com/polarsource/polar/issues/13519) (open, updated 2026-08-10) | Explains the pre-cutoff behavior: the server base64-encoded the **entire** secret before constructing `StandardWebhook`, so the real HMAC key is the literal UTF-8 secret (prefix included). A spec-only “strip `whsec_` and base64-decode” verifier fails those deliveries. The issue text still mentions a historical `polar_whs_` prefix; the 2026-09-26 delivery page only shows `whsec_…`. **PQ1 CLOSED:** `whsec_` only. Reject `polar_whs_` and any other prefix. |
| [Polar OpenAPI](https://polar.sh/docs/openapi.json) `info.version` **2026-04** | `WebhookOrderPaidPayload` is `{ type, timestamp, data }` with `data` = `Order`. `Order` requires `id`, `customer_id` (uuid), `customer`, `total_amount` (cents, after discounts and taxes), `currency`, `status`, `paid`, `billing_reason`. `OrderCustomer.email` is `string \| null`. `CheckoutStatus` is `open \| expired \| confirmed \| succeeded \| failed`. **No schema property is named `livemode`, `sandbox`, or `environment`.** |
| [Sandbox](https://polar.sh/docs/integrate/sandbox) | Sandbox is a **separate server and organization** (`sandbox.polar.sh` / `sandbox-api.polar.sh`), not a test-mode flag on the event. |
| [Webhook events](https://polar.sh/docs/integrate/webhooks/events) and [Orders](https://polar.sh/docs/features/orders) | After a successful charge, Polar sends `order.updated` **and** `order.paid` with the same paid order. `order.paid` is the event that means payment was received. Renewal sequences also emit `order.paid`. `order.created` can still be `pending`. |

#### Algorithm

Headers (names are case-insensitive on the wire; the route passes the three values through):

- `webhook-id` — stable delivery/event id across Polar retries. **This** is `provider_event_id`.
- `webhook-timestamp` — unix seconds, integer.
- `webhook-signature` — one or more space-separated `v1,<base64>` tokens (rotation). Ignore tokens whose version is not `v1`. `v1a` (asymmetric) is **not** accepted in v0.1.

```text
secret = trim(POLAR_WEBHOOK_SECRET)
reject secret as invalid_webhook_secret when it is empty, a placeholder
  (whsec_replace_me, replace_me, changeme, test), or does not start with "whsec_"

reject as invalid_signature when any header is missing or empty
reject as invalid_signature when webhook-id contains "."
reject as invalid_signature when webhook-timestamp is not an integer string
  (no floats, no trailing junk)
reject as invalid_signature when timestamp is < now-300s or > now+300s
  (tolerance fixed at 300; not an env knob in v0.1)

keys = [ utf8(secret) ]                                    # Polar HMAC, pre-2026-09-08
remainder = secret without the "whsec_" prefix
decoded = strictBase64(remainder)                          # Standard Webhooks, on/after cutoff
if decoded is non-empty and not byte-equal to utf8(secret): keys.push(decoded)

signed = webhookId + "." + timestamp + "." + rawBody       # rawBody exact, not re-JSON'd
for each space-separated token "v1,<sig>":
  sigBytes = strictBase64(sig)
  for each key:
    mac = HMAC-SHA256(key, utf8(signed))
    if sigBytes.length == mac.length and timingSafeEqual(sigBytes, mac): ACCEPT

otherwise invalid_signature
```

`strictBase64` accepts only `A–Z a–z 0–9 + /` with optional `=` padding. Do not use a lenient decoder that ignores illegal characters. Compare **digest bytes**, never the base64 text. Never log the secret; redact `whsec_…` if a message is logged (same spirit as the Stripe handler).

After the signature accepts:

1. `JSON.parse(rawBody)`. Failure, or a body that is not an object with a string `type`, → **400** `invalid_payload`. No row.
2. There is **no** livemode field to check. Do not invent one. Do not read an access token.

**Why both keys.** The secret string does not carry its creation time. Trying only the Standard Webhooks key fails pre-cutoff endpoints (issue #13519). Trying only the UTF-8 key fails post-cutoff endpoints (delivery page, on/after 2026-09-08). The current Polar SDK tries both. HookSteel does the same in `node:crypto`.

**Why this is not the Stripe R5 violation.** R5 forbids a hand-rolled Stripe HMAC that skips `constructEvent` (tolerance, scheme, livemode). Polar has no `constructEvent` we are allowed to require. The forbidden Polar shapes are the insecure ones: string compare, no timestamp window, HMAC over a re-serialized body, or a single key era.

#### `provider_event_id`

| Use | Do not use |
| --- | --- |
| `webhook-id` header | `data.id` (that is the order, checkout, or subscription id) |

`order.created` and `order.paid` share one order id and are different events. Deduping on `data.id` would ACK the paid event as a duplicate of the created event and grant nothing. Standard Webhooks and the Polar signer use the webhook event id, which stays stable when Polar retries that delivery.

Uniqueness stays `UNIQUE (provider, provider_event_id)`. The same id text on Stripe and Polar is two rows. `idempotency_key` stays `polar|${webhookId}|${adapter}` via the existing `idempotencyKey()` helper.

#### Livemode column

`billing_events.livemode` is `NOT NULL` and the column stays. Polar does not attest the bit.

| Rule | Detail |
| --- | --- |
| Env | `POLAR_EXPECT_LIVEMODE`. Unset or empty → **false** (sandbox / test-mode kit). `true` or `1` → true. Anything else → false. Do not infer it from a secret prefix or an access token. |
| Stored value | The boolean from that env, on every accepted Polar event. |
| Mismatch 400 | **Not implemented** on this path. There is nothing signed to compare. |
| Operator duty | Sandbox webhooks and production webhooks are different Polar organizations, secrets, and processes. A production deploy that accepts live Polar traffic sets `POLAR_EXPECT_LIVEMODE=true`. The column is an **operator declaration**, not a Polar-signed fact. |

Cross-wiring a live endpoint at a process that left the flag false still verifies if the secret matches, and the row is stored `livemode=false`. README must say that in the known-limits list. See the MINIMUM_SUPPORT cross-check in §4.

### 1.2 Module layout (buyer kit — later implement)

```
src/webhooks/polar/
  verify.ts          # node:crypto dual-key HMAC; no Polar SDK import
  handler.ts         # handlePolar(...) → verify → one txn → ACK
  mapAdapters.ts     # Polar event type → adapter names
  payload.ts         # normalized outbox payload for existing stubs
examples/next/app/api/webhooks/polar/route.ts
tests/fixtures/polar/
  order.paid.json    # unsigned body
  secrets.ts         # whsec_ test secret whose two keys differ
  sign.ts            # mint id, timestamp, v1 signature at runtime
tests/unit/polar-verify.test.ts
tests/chaos/01-….test.ts … 05-….test.ts   # extend in place; no 06-
```

Stripe files, `src/outbox/*`, `migrations/*`, and `src/adapters/*` are not part of the edit set. `src/index.ts` **adds** exports only:

| Keep (Stripe) | Add (Polar) |
| --- | --- |
| `handle` | `handlePolar` |
| `mapAdapters`, `DEFAULT_ADAPTER_MAP`, `configureAdapterMap`, `resetAdapterMap` | `mapPolarAdapters`, `DEFAULT_POLAR_ADAPTER_MAP`, `configurePolarAdapterMap`, `resetPolarAdapterMap` |
| `buildOutboxPayload` | `buildPolarOutboxPayload` |

Do not export Polar `HandleOptions`, verify errors, or anything from `src/chaos`. Production `src/index.ts` still must not import `src/chaos`.

Root `package.json` gains **no** dependency. `examples/next/package.json` gains **no** `@polar-sh/sdk`. The existing layout test that rejects a dependency whose name matches `/polar/i` stays green.

**Route** (`examples/next` only):

```ts
import { handlePolar } from 'hooksteel';

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  return handlePolar({
    rawBody,
    webhookId: request.headers.get('webhook-id'),
    webhookTimestamp: request.headers.get('webhook-timestamp'),
    webhookSignature: request.headers.get('webhook-signature'),
  });
}
```

Never `request.json()` on this route. README keeps an 8-line Fetch/Hono snippet and an Express snippet that uses `express.raw` and `Buffer.toString('utf8')` — the same raw-body rule as Stripe. Do not mount `express.json()` on the Polar route.

`handlePolar` options may include the same test-only `beforeCommit` hook the Stripe handler already has. The Next route does not pass it. `NODE_ENV=production` forces the hook off even if `ALLOW_CHAOS_INJECT` is set.

### 1.3 Handler sequence

Copy the **shipped** Stripe handler (`src/webhooks/stripe/handler.ts` at `f25f235`), not an older sentence in `DESIGN_STRIPE_PATH.md` that left `processed_at` solely to the drain. The merged Stripe code sets `processed_at` in the same transaction when the map is empty. Polar does that too.

1. Verify (§1.1). `invalid_webhook_secret`, `invalid_signature`, `invalid_payload` → **400**, no store.
2. `livemode = POLAR_EXPECT_LIVEMODE` (default false).
3. Begin a DB transaction. `try/finally`: if `COMMIT` did not run, `ROLLBACK` before releasing the client.
4. `INSERT INTO billing_events (provider, provider_event_id, livemode, event_type, payload, status) VALUES ('polar', webhookId, livemode, type, rawBody::jsonb, 'received') ON CONFLICT (provider, provider_event_id) DO NOTHING RETURNING id`.
5. Conflict (no row) → commit the empty transaction → **200** `{ ok: true, outcome: 'duplicate' }`. No new outbox.
6. Else `mapPolarAdapters(type)`:
   - One or more names → `buildPolarOutboxPayload` → `enqueueOutbox` each with `idempotencyKey('polar', webhookId, adapter)` → `status='outboxed'` → commit → **200** `outcome: 'outboxed'`.
   - `[]` → `status='ignored'`, `processed_at=now()`, zero outbox → commit → **200** `outcome: 'ignored'`.
7. Do not call adapters in the request. Drain is the existing worker, unchanged.
8. DB down, pool failure, or any throw after a successful verify → **500** `{ ok: false, error: 'transient' }`, transaction rolled back.

```mermaid
sequenceDiagram
  participant Polar
  participant Route as examples/next polar route
  participant Handler as handlePolar
  participant Verify as node:crypto dual-key
  participant DB as Postgres txn
  participant Drain as existing outbox drain

  Polar->>Route: POST raw body + webhook-id/timestamp/signature
  Route->>Handler: handlePolar({ rawBody, webhookId, webhookTimestamp, webhookSignature })
  Handler->>Verify: HMAC both keys, 300s window, timingSafeEqual
  alt bad secret / bad sig / bad JSON
    Verify-->>Handler: reject
    Handler-->>Polar: 400 (no row)
  else ok
    Handler->>DB: BEGIN
    DB->>DB: INSERT billing_events provider=polar ON CONFLICT DO NOTHING
    alt duplicate webhook-id
      Handler-->>Polar: 200 duplicate
    else mapped
      DB->>DB: INSERT outbox; status=outboxed; COMMIT
      Handler-->>Polar: 200 outboxed
      Note over Drain: after commit only; unchanged drain
    else empty map
      DB->>DB: status=ignored; processed_at=now(); COMMIT
      Handler-->>Polar: 200 ignored
    end
  end
```

### 1.4 HTTP status contract (frozen)

Same three codes as Stripe. Polar’s sample route returns 202 and 403; HookSteel does not. Any **2xx** ACKs a Polar delivery (their OpenAPI webhook response is described as 200). **400** and **500** are both non-2xx, so Polar will retry either one.

| Condition | Status | Persist? | Outbox? |
| --- | --- | --- | --- |
| Missing / placeholder / non-`whsec_` secret | **400** `invalid_webhook_secret` | No | No |
| Missing header, bad timestamp, tamper, wrong key, no `v1` match | **400** `invalid_signature` | No | No |
| Signature ok, body not a JSON object with string `type` | **400** `invalid_payload` | No | No |
| First accept + mapped adapters | **200** `outboxed` | Yes | Yes, same txn |
| First accept + empty map | **200** `ignored` | Yes (`processed_at` set) | Zero |
| Duplicate `webhook-id` already stored | **200** `duplicate` | No new row | No |
| DB unavailable / txn failure / unexpected error after verify | **500** `transient` | No (rolled back) | No |

**Polar retry behavior (known limit, not a reason to change the codes).** From the delivery page: retries up to 10 times with exponential backoff; the endpoint is disabled after **10 consecutive non-2xx** responses; request timeout is 10 seconds; they recommend a response within 2 seconds. Stripe does not meaningfully retry 4xx. Polar retries 400 **and** 500, then disables the endpoint. That is why poison stays **400** (logs and the body say signature, not outage) and a DB blip stays **500**. Returning **200** for a bad signature to “avoid the 10-strike disable” would ACK poison. Do not do that.

Verify + the insert transaction should still aim to finish well under 2 seconds. A cold database that blows the budget correctly surfaces as **500**, and Polar retries. Same honesty as the Stripe timeout note.

There is no Polar `livemode_mismatch` code. §4 records the checklist gap.

### 1.5 Env vars (implement updates `.env.example`)

Stripe lines stay. Replace the reserved Polar comment with:

```bash
# Polar endpoint secret from the dashboard. Current docs: whsec_…
# Pre-2026-09-08 secrets and later secrets use different HMAC keys; the kit tries both.
# PQ1 CLOSED: whsec_ only. polar_whs_ and any other prefix are rejected — rotate them in Polar.
POLAR_WEBHOOK_SECRET=whsec_replace_me

# Operator declaration written to billing_events.livemode. Unset → false (sandbox).
# Polar does not send a livemode field. Production Polar endpoints must set this true.
# Not inferred from the secret. No Polar access token is required to verify webhooks.
# POLAR_EXPECT_LIVEMODE=false
```

`examples/next/.env.example` lists the same two names (Next reads that directory’s env, not the repo root). No `POLAR_ACCESS_TOKEN` / OAT on the webhook path.

Placeholder set matches Stripe: empty, `whsec_replace_me`, `replace_me`, `changeme`, `test`, and any value that does not start with `whsec_`.

### 1.6 Adapter map (H2 spirit)

Separate module from Stripe. A shared map would let a Polar type fall through into Stripe defaults, or the reverse. `configurePolarAdapterMap` / `resetPolarAdapterMap` are their own module state. Tests reset in `afterEach` the same way Stripe tests do.

| Event type | Default adapters | Why |
| --- | --- | --- |
| `order.paid` | `[grant_credit, send_email]` | Payment received. Polar’s orders doc: the event integrations act on. **PD4:** every `order.paid` grants, including `billing_reason=subscription_cycle`. Each delivery has its own `webhook-id`. That is a new payment, not a duplicate. v0.1 does not special-case `billing_reason`. |
| `order.created` | `[]` | Can still be `pending` / unpaid. Persist `ignored`. |
| `order.updated` | `[]` | Polar also sends this when the order becomes paid, **with the same order as `order.paid`**. A default grant here double-fulfills. |
| `order.refunded` | `[]` | Persist only. No credit clawback in this slice. |
| `checkout.created` / `checkout.updated` / `checkout.expired` | `[]` | `checkout.updated` fires for `open`, `expired`, `confirmed`, `succeeded`, and `failed`. Default-granting it double-fulfills `order.paid` on the success path. |
| `subscription.canceled` / `subscription.revoked` | `[]` | Same “persist, do not fulfill” role as Stripe `customer.subscription.deleted`. |
| Any other verified `type` | `[]` | Persist `ignored`, HTTP 200. Do not drop (R7). |

`invite_github` stays **opt-in**. It is not in the default Polar map.

**Opt-in README warnings (implement writes them):**

- `checkout.updated → [grant_credit, send_email]` only if the buyer also filters `data.status === 'succeeded'` **and** removes `order.paid` from those same adapters. The kit does not ship that filter in the default map.
- `order.updated` is not an opt-in grant alongside `order.paid`.
- **PD4.** Buyers who sell subscriptions and do not want a credit on every renewal replace the `order.paid` row. The kit does not branch on `billing_reason` in v0.1.

**Outbox payload** for `order.paid` (full event JSON stays on `billing_events.payload`):

```text
order_id          data.id
customer          data.customer_id          # grant_credit requires this
customer_email    data.customer.email       # null → existing H3 skip
amount_total      data.total_amount         # cents after discounts and taxes
currency          data.currency
status            data.status
paid              data.paid
billing_reason    data.billing_reason
```

`grant_credit` already reads `amount_total ?? amount_paid`, `currency`, and `customer`. `send_email` already no-ops with `last_error=skipped_no_email` when `customer_email` is missing. **Do not edit those adapters** to learn Polar shapes. Do not copy billing address, tax id, or the embedded product into the outbox payload. `total_amount` of `0` (free order) is a real amount; it is not “missing”.

If a buyer opts an event in and the payload has no `customer` / amount / currency, the existing `grant_credit` throw → retry → `dead_letters` path applies. That is adapter failure, not a 400.

Checkout opt-in payload, only when a buyer’s map asks for a checkout type: `{ checkout_id, customer: customer_id, customer_email, amount_total: total_amount, currency, status }`. Status is included so a custom adapter can see `succeeded`. The default map never asks.

Other opted-in types get `{ object_id: data.id }` only. Pointing `grant_credit` at that shape is a buyer config error.

Dashboard delivery format must be **Raw** JSON. Slack and Discord formats are not parsed. A non-JSON body fails closed as `invalid_payload`.

### 1.7 What is reused unchanged

| Piece | Polar rule |
| --- | --- |
| Migrations `000`–`004` | No new file. `provider='polar'` already allowed. |
| `enqueueOutbox` / `idempotencyKey` | Call them. Do not fork. |
| Drain, lease, backoff, dead letter, replay | No edits. A Polar outbox row is just an outbox row. |
| `grant_credit` / `send_email` / `invite_github` | No edits. H3 already covers a null email. |
| Chaos injector | Tests pass `beforeCommit` into `handlePolar`. Production export graph stays clean. |
| CI workflow | Same `chaos-postgres.yml`: `npm ci && npm run migrate && npm test`. No second workflow. No live Polar network. |
| LICENSE | Single-app sentence stays: one production application and one production Stripe account. This slice does not add a Polar-org count and does not reword the file. |

### 1.8 Fixtures and the five chaos themes

Signatures are minted at runtime. Do not commit `webhook-signature` or a frozen timestamp.

Test secret: a fixed `whsec_` + standard base64 whose decoded bytes are **not** the UTF-8 of the full secret, and which is not a placeholder. `sign.ts` takes `scheme: 'polar_hmac' | 'standard_webhooks'` and writes a `v1,` token. `webhook-id` values in tests contain no `.`.

**Unit file `tests/unit/polar-verify.test.ts` (offline, no network). PD2: both HMAC eras are green before ship. Chaos may mint only `standard_webhooks`. Shipping one era and repairing the other in code review is an R14 miss.**

- Both schemes (`polar_hmac` and `standard_webhooks`) accept the same body and secret.
- Wrong key, one-byte tamper, missing header, non-integer timestamp, timestamp older than 300s, timestamp more than 300s ahead, `webhook-id` containing `.` → 400 `invalid_signature`, zero rows.
- Placeholder, empty, and non-`whsec_` (including a `polar_whs_…` sample) → 400 `invalid_webhook_secret`, zero rows.
- Valid signature, body not JSON → 400 `invalid_payload`, zero rows.
- Two bodies, same `data.id`, different `webhook-id` → two `billing_events` rows.
- Same `webhook-id` twice → one row, second response `duplicate`.
- `order.paid` → `outboxed`, adapters `grant_credit` + `send_email`, payload `amount_total` = `total_amount`.
- `order.updated` → `ignored`, `processed_at` set, zero outbox.
- `customer.email: null` on `order.paid` → after the existing drain, `send_email` completes with `skipped_no_email` and `grant_credit` runs once.
- `verify.ts` contains `createHmac` and `timingSafeEqual`. It does not import `@polar-sh/sdk`, `standardwebhooks`, or `svix`.
- Stripe `verify.ts` still does not contain `createHmac` (the layout/stripe-verify tests stay).

**Chaos files — extend, do not add `06-`.** Stripe cases in each file stay. Polar cases use the `standard_webhooks` mint (current era). The pre-cutoff key is the unit test’s job, so the five files are not doubled.

| # | File | Polar case inside the same theme |
| --- | --- | --- |
| 1 | `01-duplicate-delivery.test.ts` | Same signed `order.paid` **4× concurrent** → one `provider='polar'` row; one `adapter_invocations` row per mapped adapter |
| 2 | `02-out-of-order.test.ts` | Two `webhook-id`s, deliver B then A, plus a concurrent duplicate → two Polar rows, no deadlock, one invocation per adapter per id. Does **not** claim `order.created` is ordered before `order.paid`. Not a global total order (H5). |
| 3 | `03-signature-fail.test.ts` | One tampered byte, and a timestamp older than 300s → 400, zero new rows, zero outbox |
| 4 | `04-handler-timeout.test.ts` | `beforeCommit` abort on `handlePolar` → zero committed rows, no idle-in-transaction, retry inserts once, one invocation after drain |
| 5 | `05-db-rollback-mid-fulfillment.test.ts` | The outbox row comes from a committed Polar `order.paid`. Invocation commits on the separate test connection, then throw before `completed_at`. Re-drain keeps `adapter_invocations` count at 1. |

`adapter_invocations` stays test-only. No new buyer table.

### 1.9 README / troubleshooting outline (implement writes the buyer docs)

Add, do not replace the Stripe sections:

1. Polar verify is stdlib HMAC, dual key, raw body, three headers. No Polar SDK and no access token.
2. HTTP table in §1.4, plus the 10-strike disable and “400 does not mean Polar stops.”
3. **PD1 known limit (required wording).** A live Polar endpoint pointed at a process with `POLAR_EXPECT_LIVEMODE` unset or false still verifies when the secret matches and stores `livemode=false`. Polar does not sign that bit. Do not invent a livemode field. Do not add `livemode_mismatch` 400 on this path. Sandbox and production are different organizations.
4. Default map and the `order.updated` / `checkout.updated` double-fulfill warning.
5. Dashboard format **Raw**. Secret is the endpoint `whsec_`.
6. **PD3 troubleshooting (required).** Include: placeholder secret, raw body re-parsed, wrong key era, `polar_whs_` rejected (PQ1 — rotate in the Polar dashboard), and **endpoint disabled after 10 consecutive non-2xx** (400 does not stop Polar; 10 strikes disable the endpoint). Also say that mapping both `order.updated` and `order.paid` to the same adapters grants twice.
7. Optional pointer to Polar’s published webhook IP list on the delivery page. The kit does **not** allowlist IPs (they change, and they are not authentication).
8. Full JSONB may include customer email, billing address, and tax id. Buyer owns retention. Same PII limit as Stripe.
9. `BUYER_START_HERE.md`: drop “Polar webhook verification is not in this slice” and point at `handlePolar` + `npm test`.

Hookdeck honesty bullets stay verbatim. Known limits must include the PD1 cross-wire sentence, the PD3 10-strike disable, the PD4 renewal-grant sentence, and “exactly five chaos files, Polar covered inside them.”

### 1.10 R1–R14 and H1–H3, applied to Polar

| Id | Polar disposition |
| --- | --- |
| R1 | No `SERIALIZABLE`. Uniqueness + `ON CONFLICT` + the existing drain. |
| R2 | No `LISTEN/NOTIFY`. |
| R3 | No `lease_expires_at`. Drain untouched. |
| R4 | No `billing_events.failed` / `dead`. Adapter failure stays on `dead_letters`. |
| R5 | No insecure verify. Stdlib HMAC **with** both documented keys, 300s window, and `timingSafeEqual` is required. `@polar-sh/sdk` is not the substitute. |
| R6 | No Polar organization access token for webhook verify. |
| R7 | Unmapped types are stored `ignored`, HTTP 200. |
| R8 | Full payload JSONB. No redaction layer in v0.1. |
| R9 | Outbox still does not certify charge, tax, or PCI correctness. LICENSE warranty sentence unchanged. |
| R10 | Next only under `examples/next`. |
| R11 | No sixth chaos scenario and no fuzz harness. |
| R12 | No Grafana / worker UI. |
| R13 | No public MIT extract. LICENSE file not edited. |
| R14 | Dual-key verify is locked **here**. Do not ship one key era and “fix the other in code review.” |
| H1 | **Closed by founder**, not by silence. PQ1 = `whsec_` only. PQ2 = LICENSE unchanged this slice. See §3. |
| H2 | `order.updated` and `checkout.updated` default to `[]`, not `[grant_credit]`. |
| H3 | Null `customer.email` uses the existing `skipped_no_email` no-op. Do not throw that into `dead_letters`. |

---

## (2) Delta log — 3 progressive adversarial design iterations

Each iteration attacks the design as it stood after the previous one. Accepted rows are in §1. Rejected rows stay rejected.

### Iteration 1 — Billing / webhook reliability architect

**Lens:** Transaction boundary, what the idempotency key actually is, 400 vs 500, double-fulfill on Polar’s two-event paid sequence.

**Attack thesis:** The obvious port is “`validateEvent` from `@polar-sh/sdk`, insert `data.id`, grant on every `order.*` and `checkout.updated`.” That puts a forbidden SDK in the buyer app, collapses `order.created` and `order.paid` into one row, and grants twice when Polar emits `order.updated` and `order.paid` for one charge.

| Accepted | Rationale |
| --- | --- |
| Same transaction, same status machine, existing drain and replay | Differentiation is already shipped; Polar must not fork the outbox |
| `provider_event_id = webhook-id`, never `data.id` | Order id is shared across event types; webhook id is stable across retries |
| 400 poison / 500 after verify / 200 duplicate or ignored | Kit contract in MINIMUM_SUPPORT §B.8 and the Stripe handler |
| Default grant **only** on `order.paid`; `order.updated` and `checkout.updated` stay `[]` | Delivery sequence in Polar’s events doc double-fires the paid order |
| Persist every verified type; empty map → `ignored` + `processed_at` | Matches shipped Stripe handler, not a drop |
| Raw body required; route is `request.text()` | Re-serializing JSON breaks HMAC |
| No migration, `provider` check already includes `'polar'` | Avoid a rewrite of the merged schema |

| Rejected | Why it stays out |
| --- | --- |
| `@polar-sh/sdk` `validateEvent` as the verify implementation | MVP_SCOPE / MINIMUM_SUPPORT §B.11. Listing on Polar does not mean the kit depends on Polar’s client. |
| Dedupe on order id, checkout id, or subscription id | Second event for the same object would ACK as a duplicate and skip fulfillment |
| 409 on duplicate | Stripe path already locked 200 ACK; Polar treats non-2xx as failure |
| Grant on `order.created` because “an order exists” | Status can be unpaid |
| Side effects inside the request transaction | Hard ban, same as Stripe |

Iteration 1 left the MAC as “HMAC-SHA256 the body with the secret.” Iteration 2 is that sentence being wrong.

### Iteration 2 — Polar signature contract / security

**Lens:** Key derivation split, timestamp, constant time, what Polar actually retries, livemode fiction.

**Attack thesis:** A single HMAC key, a string compare, or `JSON.parse` before verify will either fail 100% of one secret era or accept a replay. Returning 200 on a bad signature to dodge Polar’s endpoint disable stores poison. Inventing `event.livemode` because the column is `NOT NULL` writes a lie into a signed-looking field.

| Accepted | Rationale |
| --- | --- |
| Dual keys exactly as the delivery page + SDK `hmacKeys`: UTF-8 of the full `whsec_…` **and** base64-decode of the remainder | Secret strings do not carry a generation date. One era each is a known production outage (#13519 vs post-2026-09-08 docs). |
| Signed content `webhook-id + "." + integer timestamp + "." + exact raw body` | SDK and Standard Webhooks spec. Floor/float timestamps are rejected instead of silently rewritten. |
| 300s window, both directions, not configurable | SDK `webhookToleranceSeconds = 5 * 60`. An env knob is a support footgun. |
| `timingSafeEqual` on digest bytes; strict base64; skip non-`v1` | Spec: constant-time compare. `v1a` is not what Polar’s HMAC delivery uses. |
| Reject `.` inside `webhook-id` | Spec concatenation warning |
| `invalid_payload` after a good signature when JSON/`type` is unusable | Distinguishes Slack/Discord format and garbage from a bad MAC. Still 400, no store. |
| Keep 400 for poison even though Polar retries non-2xx and disables after 10 | 200 would ACK poison. 500 would look like an outage. Document the 10-strike limit. |
| `livemode` stored from `POLAR_EXPECT_LIVEMODE` (default false) only | OpenAPI 2026-04 has no such field. Sandbox is another server. Do not invent a payload bit. |
| Require a `whsec_` prefix; placeholders match Stripe | Delivery page (2026-09-26) shows `whsec_…` for both eras |
| Runtime-minted signatures; unit tests hit **both** schemes | Checked-in timestamps rot. Chaos does not need to run twice (Iteration 3). |
| No access token involved in verify | R6 spirit |

| Rejected | Why it stays out |
| --- | --- |
| `standardwebhooks` or `svix` as a required dependency | One library constructor verifies one key era unless the caller pre-encodes. That encoding is the bug #13519 describes. `node:crypto` can try both without a new dependency. |
| UTF-8 key only, or Standard Webhooks key only | Each fails the other era |
| Compare base64 strings, or `===` on hex | Not constant time; encoding differences false-fail |
| `JSON.parse` then `JSON.stringify` before HMAC | Breaks the signature (spec). Troubleshooting item, not a kit convenience. |
| HTTP 202 / 403 to copy Polar’s sample | Splits the kit contract. 202 is still 2xx and 403 is still retried. 200 / 400 / 500 stay. |
| 200 on bad signature “so Polar does not disable the endpoint” | ACK of poison |
| IP allowlist inside the verifier | Delivery page publishes IPs, including a new one. IPs are not the MAC. Document only. |
| A `livemode` property read from `data` or from the secret prefix | Not in the OpenAPI schemas. Inventing it is a false gate. |
| Configurable tolerance, `v1a`, or a second signature header | Out of the documented Polar HMAC |

### Iteration 3 — Indie buyer / kit scope / chaos cap

**Lens:** What a stranger unzip must not grow. Five chaos files. License. Adapters. Support load.

**Attack thesis:** Iteration 2 is specific enough that an implementer will “finish the job”: sixth chaos file, replay CLI rewrite, LICENSE clause for Polar orgs, a Polar-aware `grant_credit`, Slack payloads, a hosted retry worker, and a refund-window decision. That misses the slice and re-opens fences the founder already locked.

| Accepted | Rationale |
| --- | --- |
| Extend `tests/chaos/01`–`05` in place. No `06-` file. Dual-key proof stays in the unit file; chaos mints the post-cutoff scheme once. | MVP cap is five scenarios. Themes get a Polar case. A second full matrix is a sixth suite in disguise. |
| Outbox payload uses `amount_total` / `customer` / `customer_email` so **existing** stubs work | `grant_credit` throws if those are absent. A Polar-shaped payload would force an adapter rewrite and a second H3. |
| Null email stays H3 via the current `send_email` | Data shape, not a transient error |
| `order.paid` includes renewals; buyers narrow the map if they do not want that | A new `webhook-id` is a new payment. Special-casing `subscription_cycle` by default drops legitimate grants without a founder rule. |
| Separate Polar map module and prefixed exports | Stripe `mapAdapters` stays. One process-global map cannot serve both. |
| `handlePolar` name; Stripe `handle({ rawBody, signature })` unchanged | The Next Stripe route and tests keep working |
| README, `.env.example`, `BUYER_START_HERE` updates are in the implement checklist | Buyers need the secret-era and Raw-format notes or they open Issues |
| Copy shipped handler semantics (`processed_at` on `ignored`, rollback in `finally`) | Designing against the pre-merge doc would “fix” Polar away from Stripe |
| Zero edits to migrations, outbox, drain, replay, adapters, LICENSE | Shared machinery is the product. LICENSE Single-app text is unchanged on purpose. |

| Rejected | Why it stays out |
| --- | --- |
| Sixth chaos file, fuzz, or running all five themes under both HMAC schemes | Cap is five. Unit tests cover the second key. |
| Rewriting `grant_credit` / adding `amount_net` as a second required field | `total_amount` maps onto `amount_total`. `net_amount` (pre-tax) is a different product choice and is not the default. |
| Default-ignore `subscription_cycle` | Not documented as “do not fulfill.” Buyers opt out in config. |
| `order.refunded` → automatic credit reversal | Clawback stays out of the kit. Purchase-refund window is **14 days** ([`REFUND_GLOSSARY.md`](./REFUND_GLOSSARY.md)). |
| Slack/Discord delivery formats | Dashboard Raw is the integration. Other formats fail `invalid_payload`. |
| Polished replay CLI, worker supervisor, Grafana | Replay mutation already shipped. This slice does not reopen it. |
| Hosted gateway / yellowgram retry proxy “because Polar disables endpoints” | Kill criterion. Document the 10-strike rule instead. |
| Polar listing, sandbox org, KYC, Soft-WTP, Lock, Audit | Out of this 2026-09-26 pass. The listing was still dark then. Soft-WTP, Lock, and Audit stay off. |
| LICENSE edit to count Polar organizations, or to reinterpret Single-app | Founder lock for this pass: commercial Single-app text unchanged. |
| Migration adding `livemode_source` or widening `provider` | Column and check already fit. |
| `next` or `@polar-sh/sdk` at the repo root | Layout test already forbids both shapes. |
| Implement-now inside this design PR | Founder greenlit the design. Implement is a separate later PR. |

---

## (3) Open questions for founder

**Founder GREENLIT.** No open product questions remain for this slice. PQ1 and PQ2 are answered locks. CoS findings PD1–PD4 from [`COS_POLAR_PATH_DESIGN_REVIEW.yaml`](./COS_POLAR_PATH_DESIGN_REVIEW.yaml) are accepted as implement locks. Purchase-refund window is **14 days** ([`REFUND_GLOSSARY.md`](./REFUND_GLOSSARY.md)). This slice did not pick that number.

### PQ1 — CLOSED: `whsec_` only

| | |
| --- | --- |
| Question | Must verify accept a webhook secret that starts with `polar_whs_`, or only `whsec_`? |
| **Answer** | **`whsec_` only.** |
| Lock | Empty, placeholders (`whsec_replace_me`, `replace_me`, `changeme`, `test`), `polar_whs_…`, and any other non-`whsec_` prefix → **400** `invalid_webhook_secret`, no store. |
| Buyer action | Rotate the endpoint secret in the Polar dashboard until it is a `whsec_…` value. |
| Not in this answer | Accepting `polar_whs_` as a Polar-HMAC UTF-8 key. That option is rejected. |

### PQ2 — CLOSED: LICENSE unchanged this slice

| | |
| --- | --- |
| Question | Does the Single-app LICENSE need a Polar-org clause in this slice? |
| **Answer** | **Leave LICENSE unchanged.** |
| Lock | The implement PR keeps `LICENSE` **byte-identical**. Wording stays one production application and one production Stripe account. |
| Deferred | A Polar-org clause, and any Multi-app reword, wait until a later listing decision. Do not add them in the Polar implement PR. |

### PD1–PD4 — accepted implement locks

| ID | Sev | Lock |
| --- | --- | --- |
| **PD1** | P1 | README known limits must say: a live Polar endpoint pointed at a process with `POLAR_EXPECT_LIVEMODE` unset or false still verifies if the secret matches and stores `livemode=false`. Do not invent a Polar livemode field. Do not add `livemode_mismatch` 400 on this path. |
| **PD2** | P1 | Unit tests mint and accept **both** `polar_hmac` and `standard_webhooks` for the same body and secret before ship. Chaos may mint only `standard_webhooks`. One era shipped, the other “fixed in code review,” is rejected (R14). |
| **PD3** | P2 | Implement README troubleshooting includes placeholder secret, raw-body reparse, wrong key era, `polar_whs_` rejected, and **endpoint disabled after 10 consecutive non-2xx**. |
| **PD4** | P2 | Document that **every** `order.paid` grants, including `billing_reason=subscription_cycle`. Buyers who do not want renewal grants change the Polar map. No `billing_reason` special-case in v0.1. |

### Closed — do not reopen in implement

| Topic | Lock |
| --- | --- |
| PQ1 secret prefix | **`whsec_` only.** |
| PQ2 LICENSE | **Byte-identical** on the implement PR. Polar-org clause deferred. |
| Refund window | **14 days** ([`REFUND_GLOSSARY.md`](./REFUND_GLOSSARY.md)). Not a Polar-path blocker. This slice did not pick the number. |
| Which HMAC keys | **Both**, per §1.1 and PD2. |
| Livemode payload field | **Absent.** PD1 documents the unsigned column. Do not invent a field. |
| HTTP 200 / 400 / 500 | Frozen in §1.4. |
| `provider` enum / new migration | No. |
| Sixth chaos scenario | No. |
| Polar SDK as a required dependency | No. |
| Implement inside the design PR | **No.** Design merges first. Polar code is a separate PR. |

No separate `DESIGN_POLAR_PATH_OPEN.md`.

---

## (4) Cross-check — MINIMUM_SUPPORT and BUYER_NEEDS

Checklist items the Stripe slice already satisfies (Postgres CI, engines, zip/checksum, Issue template, 60-day support text, Hookdeck bullets, worker runbook, replay mutation) stay satisfied. This table is only the Polar delta.

| Checklist / buyer need | Result in this design |
| --- | --- |
| MINIMUM_SUPPORT §A.1 / §D.21 — offline Polar signature fixtures, no live keys | **In slice.** Unit + chaos extensions. No network. |
| §A.2 / §D.20 — five chaos scenarios on Postgres CI | **Met by extension.** Same workflow, same five filenames. |
| §A.4 — optional live Polar round-trip | **Document only** (dashboard + Raw + secret). Not a CI job. |
| §B.6 — chaos flags default off; production forces off | **Inherited.** `handlePolar` uses the same production guard as `handle`. |
| §B.7 — livemode mismatch → 400, event not stored | **Gap, explicit.** Polar events do not carry the bit (OpenAPI + sandbox docs). Kit stores `POLAR_EXPECT_LIVEMODE` and documents the cross-wire risk. It does not fake a 400. |
| §B.8 — 400 / 500 / 200-duplicate | **Met**, with a Polar-specific known limit: non-2xx is retried and 10 strikes disable the endpoint. |
| §B.9 — `(provider, provider_event_id)` unique | **Met** on `webhook-id`. |
| §B.10 — same-txn outbox; no side effects before commit | **Met.** Drain unchanged. |
| §B.11 — no Polar SDK in the buyer app core | **Met.** This is the verify lock. |
| §B.12 — buyer registers the endpoint; no Host-header tricks | **Met.** Raw format called out. IP list is a doc pointer, not a code gate. |
| §C.14 troubleshooting item (2) Polar secret mix-up | **In the implement README outline** (§1.9): key era, `polar_whs_`, raw body, Raw vs Slack. |
| §C.18 / §F.32 — purchase refund vs replay | **14 days** in [`REFUND_GLOSSARY.md`](./REFUND_GLOSSARY.md). Replay stays the CLI word. This slice did not edit the glossary. |
| §D.23 — idempotent adapter contract | **Inherited.** Same stubs, same `idempotency_key` shape. |
| §F.31 — Single-app license one-liner | **Unchanged file.** |
| §G — worker, dead letter, replay | **Inherited.** No Polar-specific worker. |
| BUYER_NEEDS §18–21 — their secret, their dashboard, their event map, livemode discipline | **Buyer-owned.** Design tells them sandbox ≠ production and not to map `order.updated` together with `order.paid`. |
| BUYER_NEEDS §46 — do not force a Polar SDK into a Stripe app | **Met.** Stripe `handle` stays SDK-free of Polar. Polar verify is stdlib. |
| BUYER_NEEDS §11 / §54 — refund awareness; Polar stays dark | **Met.** This doc is not a listing and does not set the refund toggle. |

Ready-gate items still outside this slice: 60s demo recording, landing, checksummed zip, Polar org listing. They are not quietly pulled forward.

---

## (5) Explicit rejects

| Reject | Reason |
| --- | --- |
| `@polar-sh/sdk` (or any Polar client) as a required dependency of the kit or of `examples/next` | MVP_SCOPE, MINIMUM_SUPPORT §B.11, layout test |
| `standardwebhooks` / `svix` as a required dependency | Single-era key trap; stdlib can try both |
| Hand-rolled **insecure** verify (no window, string compare, parse-then-stringify, one key era) | R5 spirit. The locked stdlib algorithm is the allowed one. |
| Redesign of the Stripe schema, `provider` check, outbox, drain, or replay | Merged at `f25f235`. Polar inserts a row the current code already allows. |
| Sixth chaos file or a new scenario name | MVP cap. Proof rides inside the five themes + unit tests. |
| Hosted worker, yellowgram ingress, retry proxy | Not a gateway product |
| Polar listing, KYC, sandbox-org setup, Soft-WTP, Lock, Audit, services | Dark / off |
| `order.refunded` clawback | Stays out. Persist the event as `ignored` only. Purchase-refund window is **14 days** ([`REFUND_GLOSSARY.md`](./REFUND_GLOSSARY.md)). |
| LICENSE rewrite, including a Polar-org Single-app gloss | Commercial text unchanged |
| Deduping on `data.id` | Collides event types |
| Default adapters on `order.updated`, `checkout.updated`, or `order.created` | Double-fulfill or unpaid grant (H2 spirit) |
| Editing `grant_credit` / `send_email` for Polar field names | Payload is normalized to the fields they already read |
| IP allowlist enforcement; Slack/Discord body support; Polar OAT required to verify | Not the signature, not Raw JSON, not the webhook secret |
| HTTP 202/403 split; 200 on bad signature | Breaks the kit contract or ACKs poison |
| Migration for livemode, `lease_expires_at`, or `SERIALIZABLE` | R1/R3. Livemode stays the existing column. |
| Fuzzing, Grafana, public MIT extract, implement-inside-this-design-PR | R11–R13. Design is greenlit; Polar code is a later PR. |
| Shipping one HMAC era and repairing the other in code review | R14 |

---

## (6) Success criteria (later implement pass)

Founder GREENLIT this design. Implement is a **separate later PR**, then three code-review passes. Do not add Polar application code to the design PR. That later change is done when all of the following hold:

1. `src/webhooks/polar/verify.ts` implements §1.1 with `node:crypto` only. Both keys, 300s window, `timingSafeEqual`, strict base64, **PQ1 `whsec_` gate** (reject `polar_whs_` and any other prefix as `invalid_webhook_secret`), no secret in logs.
2. `handlePolar` matches §1.3–§1.4, including same-txn outbox, `ignored` + `processed_at`, duplicate 200, 500 after verify with rollback. Stripe `handle` behavior unchanged.
3. Default map and `order.paid` payload match §1.6. `grant_credit` / `send_email` / drain / replay / migrations have **no** diff.
4. `examples/next/.../polar/route.ts` is `request.text()` plus the three headers. Root package has no `next` and no Polar SDK. `src/index.ts` adds the Polar exports in §1.2 and still does not export chaos or handle options.
5. **PD2.** Unit tests in §1.8 are green, including **both** HMAC schemes on the same body and secret, and “same order id, two webhook ids → two rows.”
6. The five existing chaos files each contain the Polar case in §1.8 and still contain their Stripe cases. `tests/chaos/` has exactly those five test files. `chaos-postgres` runs them with no live Polar calls.
7. `.env.example`, `examples/next/.env.example`, `README.md`, and `BUYER_START_HERE.md` match §1.5 and §1.9, including **PD1** (unsigned livemode / cross-wire known limit), **PD3** (10-strike disable in troubleshooting), and **PD4** (every `order.paid`, including `subscription_cycle`, grants; no `billing_reason` special-case).
8. **PQ2.** `LICENSE` is byte-identical to the file on `main` at design-merge time. No Polar-org clause.
9. Stub `src/webhooks/polar/README.md` is gone (replaced by the modules). `npm test` and `npm run typecheck` green on Postgres.

---

*Last updated: 2026-09-26 ET — founder GREENLIT. PQ1 `whsec_` only. PQ2 LICENSE unchanged. PD1–PD4 accepted. Design PR merges as docs. Polar implement is a separate later PR. No application code in this pass.*
