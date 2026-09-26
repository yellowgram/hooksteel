# HookSteel — CODE REVIEW ×3: Polar path PR #3

**Verdict: APPROVE**

**PR:** https://github.com/yellowgram/hooksteel/pull/3  
**Branch:** `cursor/polar-webhook-path-9fc9` → `main`  
**Head reviewed:** `cd202b8ed7737fdd6c014181a34743e84e533ade` (matches `origin/cursor/polar-webhook-path-9fc9`)  
**Base:** `origin/main` @ `9d7b443` (Polar design merged). Stripe path remains `f25f235` under that.  
**Contract:** [`DESIGN_POLAR_PATH.md`](./DESIGN_POLAR_PATH.md) §1 (founder greenlit) + [`COS_POLAR_PATH_DESIGN_REVIEW.yaml`](./COS_POLAR_PATH_DESIGN_REVIEW.yaml) PD1–PD4, PQ1, PQ2  
**Reviewers (this pass):** Expert A billing/webhook reliability · Expert B Polar signature/security · Expert C kit scope / chaos / DX  
**Date:** 2026-09-26 ET  
**CI at review:** `chaos` **pass** on this head. Runs: [36270600324](https://github.com/yellowgram/hooksteel/actions/runs/36270600324), [36270604634](https://github.com/yellowgram/hooksteel/actions/runs/36270604634).  
**Implement diff vs `origin/main`:** 25 files, +1420 / −26. Empty diffs: `LICENSE`, `migrations/`, `src/outbox/`, `src/adapters/`, `src/webhooks/stripe/`, `src/chaos/`, `package.json`.

No product-code fixes in this pass. P2s below are not merge blockers.

Soft-WTP stays off. This pack does not merge the PR.

---

## Scope checked

| Area | Result |
| --- | --- |
| Verify | `src/webhooks/polar/verify.ts` — `node:crypto` only |
| Handler | `src/webhooks/polar/handler.ts` — same txn shape as shipped Stripe `handle` |
| Map / payload | `mapAdapters.ts`, `payload.ts` |
| Route / env / README | `examples/next/app/api/webhooks/polar/route.ts`, both `.env.example` files, `README.md`, `BUYER_START_HERE.md` |
| Tests | `tests/unit/polar-verify.test.ts`, Polar cases inside `tests/chaos/01`–`05`, `tests/unit/layout.test.ts` |
| Forbidden edits | Stripe handler, outbox, drain, replay, adapters, migrations, chaos injector, root dependencies, `LICENSE` |

Stripe CR1/CR2 P1s were not re-opened. Nothing in this diff touches the files those fixes live in.

---

## Expert A — Billing / webhook reliability

**Lens:** verify-then-txn, `provider_event_id`, duplicate and ignored, outbox in the same transaction, chaos hook gated, HTTP 400/200/500.

**Attack thesis:** A Polar port that dedupes on `data.id`, grants `order.updated`, or commits the outbox on a different connection will double-fulfill or ACK a rolled-back grant. A chaos hook that still runs when `NODE_ENV=production` will abort live traffic.

### What holds

- Verify runs before `getPool().connect()`. `invalid_webhook_secret`, `invalid_signature`, and `invalid_payload` return **400** and do not insert (`handler.ts` ~L44–L52).
- `provider_event_id` is `verified.webhookId` (the `webhook-id` header). The insert is `('polar', $1, …)` with `ON CONFLICT (provider, provider_event_id) DO NOTHING`. `data.id` is stored on the JSON payload and copied to `order_id` / `checkout_id` / `object_id` only. Unit test: same `data.id`, two webhook ids → two rows; replay of one webhook id → `200 duplicate` and still two rows.
- Duplicate path commits the empty transaction and returns `200 { outcome: 'duplicate' }` with no new outbox (`handler.ts` ~L75–L78).
- Empty map sets `status = 'ignored'` and `processed_at = now()` in that same transaction, zero outbox (`handler.ts` ~L83–L86). `order.updated` unit test asserts both.
- Mapped path calls `enqueueOutbox(client, …)` on the open transaction client, then `status = 'outboxed'`, then commit. `idempotencyKey('polar', webhookId, adapter)`. Adapters are not called in the request. Chaos #1 asserts zero `adapter_invocations` until drain for Stripe; the Polar case asserts one invocation per adapter after drain.
- `try/finally` rolls back when `COMMIT` did not run. Chaos #4 Polar case: `beforeCommit` sees the uncommitted row, response is **500** `transient`, committed count is 0, `idle in transaction` is 0, retry inserts once, drain invokes each adapter once.
- `honorChaosHooks()` returns false when `NODE_ENV=production` before it looks at `ALLOW_CHAOS_INJECT`. Otherwise it requires `NODE_ENV=test` or `ALLOW_CHAOS_INJECT=true`. Unit test sets both `production` and `ALLOW_CHAOS_INJECT=true`, passes a throwing `beforeCommit`, and asserts the hook was not called and the outcome is `200 outboxed`.
- HTTP table matches §1.4. There is no Polar `livemode_mismatch` code. `POLAR_EXPECT_LIVEMODE` unset / `''` / `yes` stores `false`; `true` and `1` store `true`. Unit test covers that matrix.
- Default map grants only `order.paid` → `[grant_credit, send_email]`. `order.created`, `order.updated`, `order.refunded`, `checkout.*`, `subscription.canceled`, `subscription.revoked`, and unknown types are `[]`. `invite_github` is absent. `subscription_cycle` still outboxes `grant_credit` (unit test). No `billing_reason` branch in the handler or map.
- Outbox payload for `order.paid` uses `customer = data.customer_id`, `amount_total = data.total_amount` (0 stays 0), `customer_email = data.customer.email`. `grant_credit.ts` / `send_email.ts` are unchanged. Null email: drain completes `send_email` with `skipped_no_email` and invokes `grant_credit` once (H3).

### Findings

None.

---

## Expert B — Polar signature / security

**Lens:** both HMAC eras (PD2), `whsec_` only (PQ1), `timingSafeEqual`, 300s window, raw body, no SDK, no secret in logs.

**Attack thesis:** One key era, a string compare, or a re-parsed body will either drop real Polar deliveries or accept a tampered one. A lenient base64 decoder or a logged secret fails PQ1/R5.

### What holds

- `verify.ts` imports only `createHmac` and `timingSafeEqual` from `node:crypto`. No `@polar-sh/sdk`, `standardwebhooks`, or `svix`. Root `package.json` and `examples/next/package.json` gain no dependency. Layout test rejects any dependency whose name matches `/polar/i`.
- Secret gate: trim, then reject empty, `whsec_replace_me`, `replace_me`, `changeme`, `test`, and any value that does not start with `whsec_`. Unit test includes `polar_whs_example_secret` and `sk_test_not_a_webhook` → **400** `invalid_webhook_secret`, zero rows. Unset env is the same.
- Keys: UTF-8 of the full secret, plus strict-base64 of the `whsec_` remainder when that decode is non-empty and not byte-equal to the UTF-8 key. Signed content is `webhookId + "." + timestamp + "." + rawBody`. Tokens are space-separated; only `v1` is tried. Compare is digest bytes via `timingSafeEqual` after a length check (so a short token cannot throw `timingSafeEqual` into a 500).
- Timestamp: integer string only (no float, no trailing junk), reject if `< now-300s` or `> now+300s` using `Date.now()/1000`. `webhook-id` containing `.` is `invalid_signature`. JSON parse runs only after the MAC matches; a non-object or a missing string `type` is `invalid_payload` and stores nothing.
- **PD2, in repo:** `both HMAC eras accept the same body and secret` asserts the two schemes produce different `v1` signatures and that each returns `200 outboxed`. A secret whose remainder is not base64 (`whsec_not-valid-base64`) still accepts `polar_hmac`. Wrong-key cases for both schemes are 400 and store nothing.
- **PD2, independent of `sign.ts`:** This review ran `verifyPolarWebhook` against the published Standard Webhooks vector in `libraries/go/webhook_test.go` `TestWebhookSign` (not the kit’s signer):

  | Field | Value |
  | --- | --- |
  | Secret | `whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw` |
  | `webhook-id` | `msg_p5jXN8AQM9LWM0D4loKWxJek` |
  | `webhook-timestamp` | `1614265330` |
  | Body | `{"test": 2432232314}` |
  | Signature | `v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=` |

  An independent HMAC (decoded `whsec_` remainder, SHA-256, standard base64) equals that signature. `verifyPolarWebhook` accepted it: the only error was `invalid_payload`, because that body has no string `type`. That is after the MAC check. The UTF-8-key MAC of the same bytes is different (`v1,TcxlhK9b6UD6iVI1ZU2tTqp8PEVfYRseNNfa6b+LcUg=`) and was also accepted. A different `whsec_` secret rejected the published signature as `invalid_signature`. A dotted `webhook-id` with a valid MAC over that id was `invalid_signature`. Age of exactly 300s was accepted; 301s was `invalid_signature`. That matches Polar’s SDK (`timestamp < now-300` / `> now+300`) and §1.1.
- For integer timestamp strings, signing `webhookTimestamp` is the same as Polar’s `Math.floor(Number(header))`. Non-integers are rejected here, which §1.1 requires. Polar’s delivery timestamps are integer unix seconds.
- `strictBase64` is stricter than Polar’s `atob` (alphabet, padding, canonical round-trip). The published canonical signature passed. Non-canonical encodings fail closed.
- Logs: rejected webhooks return the code only. Unexpected errors go through `safeLog`, which rewrites `whsec_[A-Za-z0-9+/=]+` to `whsec_[redacted]`. The secret is not a SQL parameter. `verify.ts` has no `console.*`.
- Next route is `request.text()` plus the three headers. Layout test forbids `request.json()` and `@polar-sh/sdk` on that file. README Express block uses `express.raw` and `Buffer.toString('utf8')`, same shape as the shipped Stripe snippet.

### Findings

#### B-P2-001 — Published MAC vector is not pinned in-repo

- **Severity:** P2  
- **File:** `tests/unit/polar-verify.test.ts`; `tests/fixtures/polar/sign.ts`  
- **Evidence:** PD2 is met. Both eras accept, and the signatures differ, so a verify path that only tried the UTF-8 key would fail the standard-webhooks case. `sign.ts` still carries its own copy of `strictBase64`. This review’s out-of-band check matched `TestWebhookSign`. The suite itself does not freeze that signature, so a later edit that changes both copies the same way would stay green.  
- **change_required:** Not before merge. Optional follow-up: one unit assertion that the published body, id, timestamp, and `v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=` verify under that published secret (mock `Date.now` into the 300s window) and that a body without string `type` is `invalid_payload`, not `invalid_signature`.

---

## Expert C — Kit scope / chaos / DX

**Lens:** five chaos files only, Polar cases present, `LICENSE` byte-identical (PQ2), README PD1/PD3/PD4, no migration churn, adapters not rewritten.

**Attack thesis:** A sixth chaos file, a LICENSE rewrite, a new migration, or `grant_credit` learning `total_amount` / `customer_id` breaks the slice lock even if verify is correct.

### What holds

- `tests/chaos/` is exactly `01-duplicate-delivery.test.ts`, `02-out-of-order.test.ts`, `03-signature-fail.test.ts`, `04-handler-timeout.test.ts`, `05-db-rollback-mid-fulfillment.test.ts`. Layout test locks that list. Each file keeps its Stripe case and adds one Polar case. Polar chaos mints `standard_webhooks` only (`polarHandleInput`).
- Polar chaos assertions match §1.8: #1 four concurrent → one `provider='polar'` row and one invocation per adapter; #2 B then A plus a concurrent duplicate → two webhook ids, zero new deadlocks, one invocation per adapter per id, and the comment refuses an `order.created`-before-`order.paid` claim; #3 one tampered byte and a timestamp 301s old → 400, zero rows, zero outbox; #4 abort-before-commit → rollback, no idle transaction, retry once; #5 committed Polar outbox, crash after the separate-connection invocation, re-drain keeps `adapter_invocations` at 1.
- `git diff origin/main...HEAD -- LICENSE` is empty (0 bytes). PQ2 holds.
- `git diff` is empty for `migrations/`, `src/outbox/`, `src/adapters/`, `src/webhooks/stripe/`, `src/chaos/`. `grant_credit` still reads `amount_total ?? amount_paid`, `currency`, and `customer`. It does not mention `total_amount` or `customer_id`.
- **PD1** known limit (`README.md` ~L196) states that a live Polar endpoint pointed at `POLAR_EXPECT_LIVEMODE` unset or false still verifies when the secret matches and stores `livemode=false`, that Polar does not sign that bit, and that this path must not add `livemode_mismatch` 400.
- **PD3** troubleshooting (~L206–L213) includes placeholder secret, `polar_whs_` rejected (rotate in the dashboard), raw-body reparse, wrong key era, and endpoint disable after 10 consecutive non-2xx. It says not to return 200 for a bad signature, and that mapping `order.updated` and `order.paid` to the same adapters grants twice.
- **PD4** is in known limits (~L198) and the Polar map section (~L306): every `order.paid` grants, including `billing_reason=subscription_cycle`; buyers who do not want renewal grants change the map; v0.1 does not special-case `billing_reason`.
- `.env.example` and `examples/next/.env.example` carry `POLAR_WEBHOOK_SECRET` and `POLAR_EXPECT_LIVEMODE` with the §1.5 comments. No `POLAR_ACCESS_TOKEN`. `BUYER_START_HERE.md` points at `handlePolar` and `npm test` and no longer says Polar verification is out of slice.
- `src/index.ts` adds `handlePolar`, the Polar map exports, and `buildPolarOutboxPayload`. It does not export `PolarHandleOptions`, verify errors, or `src/chaos`. Stub `src/webhooks/polar/README.md` is gone.
- Hookdeck’s six bullets are unchanged from `origin/main` (the “Stripe and Polar” phrase was already on main).
- CI workflow file is untouched. Both `chaos` runs on this head passed.

### Findings

#### C-P2-001 — First HTTP table does not say it is Stripe-only

- **Severity:** P2  
- **File:** `README.md` ~L78–L88, contrasted with the Polar table ~L280–L288 and known limit ~L196  
- **Evidence:** The first heading is “HTTP status contract” and includes “Livemode mismatch → 400”. That row is the Stripe contract. Polar §1.4 and PD1 forbid a Polar `livemode_mismatch` 400, and the Polar section says so. A reader who stops at the first table can apply the Stripe row to Polar.  
- **change_required:** Not before merge. Optional: title that first table “Stripe”. Do not add a Polar mismatch 400.

---

## Prior design locks verified

| Lock | Status | Evidence |
| --- | --- | --- |
| PQ1 `whsec_` only | Holds | `isInvalidWebhookSecret`; unit list includes `polar_whs_` and a non-`whsec_` sample |
| PQ2 LICENSE byte-identical | Holds | `git diff origin/main...HEAD -- LICENSE` is empty |
| PD1 unsigned livemode | Holds | README known limit; no mismatch 400 in `verify.ts` / `handler.ts`; livemode unit matrix |
| PD2 both HMAC eras | Holds | Unit test both schemes on one body+secret; independent `TestWebhookSign` vector accepted |
| PD3 troubleshooting | Holds | Placeholder, raw body, wrong era, `polar_whs_`, 10-strike disable |
| PD4 every `order.paid` grants | Holds | No `billing_reason` branch; unit test `subscription_cycle` outboxes `grant_credit`; README states it |
| `provider_event_id` = `webhook-id` | Holds | Insert parameter is the header id; shared `data.id` test stores two rows |
| Same-txn outbox, ignored `processed_at`, 500 rollback | Holds | Handler control flow; chaos #4 and #5 |
| Production chaos hook off | Holds | `honorChaosHooks` + unit test with `ALLOW_CHAOS_INJECT=true` |
| Five chaos files, Polar inside them | Holds | Directory listing + layout test + per-file Polar test |
| No SDK, no migration, adapters untouched | Holds | Empty diffs; layout dependency walk |
| Stripe `handle` unchanged | Holds | Empty diff `src/webhooks/stripe/` |

---

## Explicit rejects

Kept rejected. Not opened by this review.

- Sixth chaos file, or a dual-scheme matrix inside the five chaos files
- `@polar-sh/sdk`, `standardwebhooks`, or `svix` as the verify implementation
- Any edit to `LICENSE` (PQ2)
- A migration, including one that “adds polar” or a livemode column
- Rewriting `grant_credit` / `send_email` / `invite_github` for Polar field names
- Edits to drain, replay, outbox SQL, or the Stripe verify/handler/map
- Dedupe on `data.id`
- Default grant on `order.updated`, `checkout.updated`, or `order.created`
- HTTP 200 on a bad signature to dodge Polar’s 10-strike disable
- Polar’s sample 202/403 as the kit contract
- `livemode_mismatch` 400, or inferring livemode from the secret or an access token
- A Polar organization access token required to verify
- Shipping one HMAC era and patching the other in code review (R14)
- Reopening Stripe CR1/CR2 P1s (A-P1-001/002, B-P1-001/002, C-P1-001, CR2-A-P1-001/002, CR2-B-P1-001)
- Soft-WTP, Lock, Audit, hosted gateway, Polar listing, refund-window number

---

## Merge blockers (P0)

*None.*

No signature bypass, no dedupe on `data.id`, no outbox write outside the verify transaction, no production chaos hook.

---

## Should-fix before merge (P1)

*None.*

| ID | Summary |
| --- | --- |
| — | — |

---

## Defer / known limits (P2)

| ID | Summary | change_required |
| --- | --- | --- |
| **B-P2-001** | In-repo tests do not pin the published Standard Webhooks MAC | Optional follow-up assertion. Behavior already matches the vector. Not a merge blocker. |
| **C-P2-001** | First HTTP table omits “Stripe” on the livemode-mismatch row | Optional heading. PD1 text is already in known limits and the Polar section. Do not add a Polar mismatch 400. |

---

## Verdict

**APPROVE**

P0 = **0**. P1 = **0**. P2 = **2**. Neither P2 requires a code change before merge. CI `chaos` is green on `cd202b8`. PQ1, PQ2, and PD1–PD4 hold. Stripe CR1/CR2 P1s were not reopened.

Founder decides merge. This review does not merge PR #3.

---

## Appendix — CI / PR metadata

| Field | Value |
| --- | --- |
| PR URL | https://github.com/yellowgram/hooksteel/pull/3 |
| Head | `cursor/polar-webhook-path-9fc9` @ `cd202b8ed7737fdd6c014181a34743e84e533ade` |
| Base | `main` @ `9d7b443` |
| Checks | `chaos` **pass** (two runs on this head) |
| Local crypto check | Published `TestWebhookSign` vector accepted by `verifyPolarWebhook` (signature stage) |
| Suite re-run in this pass | Not repeated here. CI on this head is the suite proof. |

*Review pack written 2026-09-26 ET. Findings only. No product-code fixes. Do not merge from this commit.*
