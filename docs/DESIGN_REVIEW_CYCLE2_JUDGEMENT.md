# HookSteel — Cycle-2 design review judgement (HookSteel owner)

**Source:** [`docs/COS_STRIPE_PATH_CYCLE2.yaml`](./COS_STRIPE_PATH_CYCLE2.yaml)  
**Role:** Expert accept / reject of CoS packet for Stripe-path design.  
**Date:** 2026-09-26 ET  
**Rule:** No implement until founder greenlights after iterating rejections below.  
**Process note:** CoS marked NQ1–NQ3 “locked” and all `design_updates` as `apply: required`. That is a CoS recommendation. **Founder override stands.** Nothing is merged into `DESIGN_STRIPE_PATH.md` §1 until you clear this judgement.

---

## Verdict in one paragraph

Cycle-1 was a correct textbook outbox sketch and was **not** shippable as written. CoS P0s on lease reclaim, attempts accounting, raw-body Next footgun, verify dependency, chaos #2/#5 substance, and migrate versioning are real. **Accept almost all required DUs into design.** Reject (or demote) a small set of CoS *accepts* that expand default fulfillment risk or over-close founder decisions. Keep **all** of CoS’s own rejected list rejected.

---

## A. Rejections to keep (CoS rejected — HookSteel agrees)

These stay **out** of v0.1 design. Do not reopen unless you write an explicit override.

### From Iter 1 — distributed systems / outbox

| # | Rejection | Why keep rejected |
|---|---|---|
| R1 | **SERIALIZABLE isolation** | Unique `(provider, provider_event_id)` + same-txn outbox + `SKIP LOCKED` is enough. SERIALIZABLE adds deadlock/support load with no buyer-facing win for this kit. |
| R2 | **LISTEN/NOTIFY required in v0.1** | Poll/`--once` drain is the Polar-kit shape. LISTEN/NOTIFY is ops complexity and a second failure mode. Later optional. |
| R3 | **`lease_expires_at` column mandatory** | Predicate on `locked_at` + `OUTBOX_LEASE_MS` is enough. Extra column is schema churn for no reclaim correctness gain. |
| R4 | **Write `billing_events.failed` on first adapter throw** | Adapter failure is an **outbox** problem (`dead_letters`). Parent event already committed correctly. Writing parent `failed` confuses “event received” vs “fulfillment stuck.” |

### From Iter 2 — Stripe contract / security

| # | Rejection | Why keep rejected |
|---|---|---|
| R5 | **Hand-rolled HMAC** | Tolerance, header parsing, and clock skew belong to `stripe.webhooks.constructEvent`. Thin HMAC is a support+security footgun. |
| R6 | **Require `sk_` in webhook process** | Webhook verify needs `whsec_` only. Forcing `sk_` couples secret surface and lies about what the path needs. |
| R7 | **Drop unmapped events** | Verified events should persist (`ignored` or equivalent). Dropping = silent holes and “Stripe sent it, kit ate it” tickets. |
| R8 | **Redacted payloads only in v0.1** | Redaction is a product of its own (field policy, support replay). Full JSONB + buyer-owned retention is honest for v0.1. |
| R9 | **PCI opinion that outbox equals billing correctness** | Outbox proves side-effect-after-commit + idempotency. It does **not** certify PCI, charge correctness, or tax. Do not claim it. |

### From Iter 3 — kit ship / support load

| # | Rejection | Why keep rejected |
|---|---|---|
| R10 | **Next as core dependency** | Kit is Node library + drain. Next is an example. Core `next` dep forces wrong mental model and slows chaos CI. |
| R11 | **Sixth chaos scenario** | DECISION lock = exactly 5. Cap stands. |
| R12 | **Grafana / worker UI** | Support checklist allows metrics *docs*; shipping UI is Soft-WTP-adjacent scope creep. |
| R13 | **Public MIT extract** | Commercial kit license (credit-ledger pattern). No public MIT carve-out in v0.1. |
| R14 | **Implement now and fix leases in code review** | Lease/attempts are design locks. Baking stuck-after-crash into first code and “fixing in CR” violates 3+3 halt. |

---

## B. HookSteel rejections / demotions of CoS *accepted* items

These are **not** in CoS’s rejected list. HookSteel rejects or demotes them for your review.

| # | Item | CoS said | HookSteel judgement | Disposition |
|---|---|---|---|---|
| H1 | **NQ1–NQ3 auto-locked / “CoS merges, founder override only by written reversal”** | Closed at recommended answers | Process overreach. You asked to iterate rejections **before** greenlight. Treat NQ1–NQ3 as **recommended**, not merged, until you GO. | **Reject auto-merge process.** Keep recommended answers as defaults if you clear without override. |
| H2 | **Default map includes `invoice.paid → [grant_credit]`** | DU-adapter-map | High double-fulfill risk if buyer also maps Checkout packs. Same money path as Credit Ledger pain. Demo story is Checkout. | **Demote:** `invoice.paid → []` (persist/`ignored`) by default; document as **opt-in** map row like `invite_github`. |
| H3 | **`send_email` missing `customer_email` → adapter throw → retry/DL** | DU-adapter-map | Strict is OK for money adapters; email missing is often data shape, not transient. Retry storms → DL noise → support. | **Demote:** missing email → **complete with `last_error=skipped_no_email`** (no DL) **or** document as known limit and complete successfully no-op. Prefer no-op complete for v0.1 stubs. |
| H4 | **Migrations: plain `CREATE TABLE` with no `IF NOT EXISTS`** | DU-migrate | Good for detecting half-apply; bad DX if buyer re-runs migrate after manual fix without docs. | **Accept with doc lock:** README must say “failed migrate = fix DB then re-run; do not hand-edit mid-file.” Not a reject. *(Listed so you see the trade.)* |
| H5 | **Chaos #2 title/substance reframed to uniqueness/deadlock, not ordering** | DU-chaos-proofs | Correct — but DECISION marketing still says “out-of-order.” | **Accept proof; keep scenario name “out-of-order”** with README honesty: “we prove safe under reordering/concurrency, not global total order.” Not a reject of the test. |

**Net new rejects for your iteration list:** **H1** (process), **H2** (default `invoice.paid`), **H3** (email throw→DL). H4/H5 are accept-with-notes.

---

## C. Accept into design (CoS required DUs — HookSteel agrees)

Apply these into `DESIGN_STRIPE_PATH.md` §1 **after** you greenlight (or after you settle B).

| DU | Why accept |
|---|---|
| **DU-layout** | Core = Node library + drain; Next under `examples/next`; raw `request.text()`; chaos not in prod graph. Fixes false “this is a Next app” and signature footgun. |
| **DU-ddl-status-ignored** | `ignored` for verified empty-map events. Clearer than overloading `received`. |
| **DU-ddl-lease** | Reclaim predicate on stale `locked_at` is P0. Without it, dead worker = stuck fulfillment forever. |
| **DU-attempts-backoff** | Atomic claim+increment, exponential backoff, batch `--once`, no in-process parallel. P0. |
| **DU-dead-letter-and-replay** | Terminal policy + replay mutation specified. Cycle-1 had a name with no wiring. |
| **DU-handler-http-raw-body** | Raw body mandatory; try/finally rollback; unmapped → 200 + ignored. |
| **DU-verify-and-livemode** | `constructEvent` required; livemode from `STRIPE_EXPECT_LIVEMODE` (default false); no sk_ for verify; placeholder `whsec_` detector. |
| **DU-adapter-map-and-payload** | **Accept skeleton**; apply **H2/H3** demotions above. Checkout maps + opt-in `invite_github` stay. |
| **DU-chaos-proofs** | Runtime-minted signatures; durable `adapter_invocations` on separate connection; #2/#5 pass criteria that can actually fail. Still exactly 5. |
| **DU-migrate** | Version table + lex-order one-txn-per-file. Second-run brick is a real support class. |
| **DU-env** | Lease/batch/attempts env; sk_ optional commented. |
| **DU-pii-connect-timeout-docs** | PII retention honesty, Connect note, timeout budget, Hookdeck outline, Single-app sentence (**NQ2 recommended**). |
| **DU-ci** | Postgres 16 workflow; Node 20; no Next at root. |
| **DU-status** | Honesty: not “implement next” until founder GO. |

---

## D. Recommended answers if you clear without override (not auto-merged)

| ID | Recommended | Means |
|---|---|---|
| NQ1 | `examples_next` | Root Node kit; route only under `examples/next/…` |
| NQ2 | one prod app + one prod Stripe account | test+live of that account = one; second product/account = Multi-app later |
| NQ3 | add `ignored` | empty adapter map → ignored, HTTP 200 |

Purchase-refund window is **14 days** (founder lock 2026-09-26, [`REFUND_GLOSSARY.md`](./REFUND_GLOSSARY.md)). This cycle did not pick that number.

---

## E. What I will do next (waiting on you)

1. You iterate **R1–R14** and **H1–H3** (say which to reverse, if any).  
2. On your greenlight: merge accepted DUs (+ your settled demotions) into `DESIGN_STRIPE_PATH.md` §1, append cycle-2 delta as §4, fix STATUS, push to private repo.  
3. **Then** implement under 3 code reviews → halt again for your code review pass.

No application code until that greenlight.
