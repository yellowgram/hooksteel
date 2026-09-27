# HookSteel — MVP Scope (locked from DECISION.md #1)

**Owner:** yellowgram  
**Product:** HookSteel — Billing Event Reliability Kit  
**Price:** $89 founding → $129 list. One SKU. No coupon. Public license from 0.1.1: PolyForm Noncommercial 1.0.0 (source-available; not OSI open source; not MIT). Paid commercial use: Suthirth Commercial Grant.  
**Deliverable:** Private GitHub (`yellowgram/hooksteel`) + zip. **Not** a hosted Hookdeck clone. **Not** services / Lock / Audit. Soft-WTP OFF.  
**ICP:** Global-English indie/SaaS founders on Stripe and/or Polar. **No India-ICP.**  
**Contact:** hello@yellowgram.dev · www.yellowgram.dev  
**Polar:** Suthirth solutions — **dark until ready gate**. CoS owns listing when shippable.  
**Date:** 2026-09-26 ET — design-only.

---

## In (MVP / v0.1.0)

1. **Postgres schemas** — `billing_events` (unique provider event id), `outbox`, `dead_letters`.
2. **Next.js/Node handlers** — signed webhook paths for **Stripe + Polar** (no Polar SDK as core dependency *inside* buyer apps).
3. **Transactional outbox worker** — side effects run **after** commit; never inside the webhook txn that can roll back.
4. **Chaos suite MVP = exactly 5 scenarios** (no fuzzing v1):
   - duplicate delivery
   - out-of-order
   - signature fail
   - handler timeout
   - DB rollback mid-fulfillment
5. **Replay CLI** — re-drive stored / dead-lettered events safely (idempotent).
6. **Drop-in adapter stubs** — grant credit / send email / invite GitHub (interfaces + no-op or demo stubs).
7. **README honesty** — when to use **Hookdeck** (hosted gateway) instead of this kit.
8. **Commercial license** — PolyForm Noncommercial 1.0.0 for the public tree; Suthirth Commercial Grant for paid commercial production (one organization, the purchased named tag). Prior Single-app kit language folds into that one-organization grant. No resale as competing boilerplate. No warranty for billing correctness in buyer prod. Not OSI. Not MIT.
9. **Support boundary** — 60-day GitHub Issues, best-effort, no SLA, ≤2h/wk kill if exceeded.
10. **Offline-capable fixtures** — prove Stripe + Polar paths without live provider accounts for the happy-path demo (live keys optional later).

## Out (explicit NOT)

- Hosted webhook gateway / yellowgram-operated ingress (Hookdeck clone)
- Soft-WTP, Lock, Audit, implementation services, consulting, setup labor
- Polar SDK as a **required** dependency inside buyer application core (Polar may sell the zip; buyer app must not need Polar client for Stripe path)
- Soft-WTP waitlist conversion as a product feature
- India-ICP / India-local pricing / GST theater as product wedge
- Fuzzing / infinite chaos matrix (cap = 5 scenarios)
- Multi-app $249 SKU at launch (optional later)
- Perpetual update entitlement beyond stated patch window (design: 12mo patches per DECISION price band; pin in license/changelog when shipped)
- Credit-ledger product surface (separate kit) — HookSteel is reliability layer only
- Live Polar Checkout / KYC before ready gate

## Later (post-ready / post-launch candidates — not MVP)

- Multi-app license SKU ($249)
- Additional provider adapters (Lemon Squeezy, Paddle, etc.) only if kill criteria stay green
- Extra chaos scenarios beyond the five (still no unbounded fuzz)
- Optional hosted *demo* page for marketing (not a product gateway)
- Update SKU if support load demands productized patches

---

## Schema sketch

### `billing_events`

| Column (sketch) | Notes |
| --- | --- |
| `id` | Internal UUID / bigserial |
| `provider` | `'stripe' \| 'polar'` |
| `provider_event_id` | **UNIQUE** with provider (or unique on composite) — Stripe `evt_…` / Polar event id |
| `livemode` | bool |
| `type` / `event_type` | provider event name |
| `payload` | jsonb (raw or normalized) |
| `received_at` | timestamptz |
| `processed_at` | nullable |
| `status` | received / outboxed / failed / dead |

**Invariant:** same provider event id → still one row; duplicates are no-ops after first insert.

### `outbox`

| Column (sketch) | Notes |
| --- | --- |
| `id` | UUID / bigserial |
| `billing_event_id` | FK → billing_events |
| `adapter` | e.g. `grant_credit` / `send_email` / `invite_github` |
| `payload` | jsonb for adapter |
| `created_at` | inside same txn as event insert |
| `available_at` | for delay/backoff |
| `attempts` | int |
| `locked_at` / `locked_by` | worker lease |
| `completed_at` | nullable |
| `last_error` | text |

**Invariant:** outbox row written in the **same DB transaction** as `billing_events` insert; worker drains **after** commit.

### `dead_letters`

| Column (sketch) | Notes |
| --- | --- |
| `id` | UUID / bigserial |
| `outbox_id` / `billing_event_id` | provenance |
| `reason` | timeout / adapter_error / poison / max_attempts |
| `payload_snapshot` | jsonb |
| `failed_at` | timestamptz |
| `replayed_at` | nullable |

---

## Provider paths

| Path | MVP requirement |
| --- | --- |
| **Stripe** | Verify signature (`whsec_`); gate livemode vs key; insert event by `evt_id`; enqueue outbox; HTTP **400** for bad sig / livemode mismatch / missing secret; **500** for DB/transient so Stripe retries; **200** when duplicate already stored (idempotent ACK). |
| **Polar** | Verify Polar webhook signature per Polar docs; same uniqueness + outbox pattern; fixtures without requiring Polar SDK in buyer app core. |
| **Shared** | No side effects (email/credit/GitHub) inside the request txn before commit. |

---

## Exactly 5 chaos scenarios

| # | Scenario | Pass criterion (design) |
| --- | --- | --- |
| 1 | **Duplicate delivery** | Same event 4× → one `billing_events` row, one successful side effect |
| 2 | **Out-of-order** | Later event processed before earlier does not corrupt unique-id invariants; documented ordering policy |
| 3 | **Signature fail** | Tampered body → 400; no row; no outbox |
| 4 | **Handler timeout** | Mid-handler kill → provider retry safe; no double side effect after recover |
| 5 | **DB rollback mid-fulfillment** | Side effect attempted after outbox write but before/around rollback path → no orphan external effect *or* dead_letter + replay recovers exactly once |

No fuzzing v1. No sixth scenario in MVP.

---

## Replay CLI responsibilities

- List / inspect `dead_letters` and failed outbox rows
- Replay by id with **idempotent** adapter calls (same keys)
- Dry-run mode (print intended adapter calls)
- Refuse replay of unsigned / signature-failed events that never entered `billing_events`
- Log who/when (local operator note) — buyer owns auth around the CLI

---

## Adapter stub interfaces (drop-in)

```ts
// Design sketch — not shipped code in this design pass
interface FulfillmentAdapter {
  name: 'grant_credit' | 'send_email' | 'invite_github' | string;
  /** Must be idempotent on (billing_event_id, adapter, idempotency_key) */
  execute(ctx: {
    billingEventId: string;
    providerEventId: string;
    payload: unknown;
    idempotencyKey: string;
  }): Promise<void>;
}
```

Stubs ship with no-op / console / in-memory implementations. Buyer wires real Stripe credit grants / Resend / GitHub invites.

---

## Hookdeck honesty one-pager outline

1. **What Hookdeck is good at** — hosted ingress, fan-out, rate limiting, observability, retries at the *edge*.
2. **What HookSteel owns** — in-app unique event id + **transactional outbox** + side-effect-after-commit + chaos proofs on *your* Postgres.
3. **Use Hookdeck when** — you need multi-destination routing, team dashboard, or do not want to run an outbox worker.
4. **Use HookSteel when** — double-fulfillment after rolled-back txns is the fear; you want owned code on Stripe **and** Polar.
5. **Use both when** — Hookdeck in front, HookSteel inside (optional; document; do not require).
6. **Do not buy HookSteel if** — you want yellowgram to host your webhooks.

---

## Ready-gate checklist (copy from DECISION)

- [ ] 5 chaos tests green on Postgres CI  
- [ ] Stripe + Polar webhook paths documented with test fixtures  
- [ ] Outbox worker + replay CLI  
- [ ] 60s demo recorded/approved (“same event 4× → one side effect”)  
- [ ] Landing / README with Hookdeck “use them when…” honesty  
- [ ] Commercial license (no resale as competing kit)  
- [ ] **Then:** Polar org + GitHub benefit + Checkout (CoS; Suthirth solutions)

---

## Differentiation (locked)

> Same billing event four times → still one side effect. Owned outbox. Stripe + Polar.

## Kill criteria (locked)

1. Cannot beat Cursor + Stripe docs in a **60s** demo  
2. 45d post-launch: &lt;3 sales AND refunds &gt;25%  
3. Hookdeck / Stripe / Polar ships equivalent **owned-code outbox starter** free  
4. Support &gt;2h/wk after day 60  
5. Buyers demand hosted gateway → **stop**; do not pivot to services on Polar  

*Last updated: 2026-09-26 ET — design-only; no code/git/outreach/Polar in this pass.*
