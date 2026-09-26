# HookSteel — STATUS

**Product:** HookSteel — Billing Event Reliability Kit  
**Owner:** yellowgram  
**Contact:** hello@yellowgram.dev · www.yellowgram.dev  
**Polar org (when ready):** Suthirth solutions (CoS owns listing)  
**Private repo:** https://github.com/yellowgram/hooksteel  
**Date:** 2026-09-26 ET

---

## GO

**GO given** from DECISION.md #1 (digital-product-hunt). Primary Polar cash path for 60–90d. Soft-WTP OFF. No Lock/Audit/services. Polar stays dark until ready gate.

**Founder GREENLIT** cycle-2 Stripe design locks (NQ1–NQ3 at recommended answers; H2/H3 demotions applied). See [`DESIGN_STRIPE_PATH.md`](./DESIGN_STRIPE_PATH.md) §1 + §4.

**Founder GREENLIT** Polar path design. PQ1 and PQ2 closed. CoS PD1–PD4 accepted. See [`DESIGN_POLAR_PATH.md`](./DESIGN_POLAR_PATH.md) §3.

## Phase

**Polar webhook path implement CR×3 done. Halt for founder before merge.** Verdict **APPROVE** (P0 = 0, P1 = 0, P2 = 2, neither P2 blocks merge). Design is on `main`. This slice is verify + `handlePolar` + fixtures + example route + adapter map. Soft-WTP OFF. No Polar listing. LICENSE stays byte-identical (PQ2). This review pass does not merge.

- Stripe path is on `main` at `f25f235` (`Stripe path: exactly-once webhook side effects + chaos suite`). PR: https://github.com/yellowgram/hooksteel/pull/1
- Design contract for that slice remains [`DESIGN_STRIPE_PATH.md`](./DESIGN_STRIPE_PATH.md). Code-review packs: [`CODE_REVIEW_STRIPE_PATH_PR1.md`](./CODE_REVIEW_STRIPE_PATH_PR1.md), [`COS_CODE_REVIEW_PR1.yaml`](./COS_CODE_REVIEW_PR1.yaml).
- Polar design is merged: https://github.com/yellowgram/hooksteel/pull/2 (`cursor/polar-path-design-cac1`). Docs only.
- Polar implement PR: https://github.com/yellowgram/hooksteel/pull/3 (`cursor/polar-webhook-path-9fc9`).
- [`DESIGN_POLAR_PATH.md`](./DESIGN_POLAR_PATH.md) §1 is the implement contract. §3: **PQ1** `whsec_` only (`polar_whs_` and any non-`whsec_` prefix → 400 `invalid_webhook_secret`; buyers rotate). **PQ2** LICENSE byte-identical this slice; Polar-org clause deferred.
- CoS [`COS_POLAR_PATH_DESIGN_REVIEW.yaml`](./COS_POLAR_PATH_DESIGN_REVIEW.yaml) **PD1–PD4** are in this implement: unsigned-livemode known limit, both HMAC eras in unit tests, README 10-strike troubleshooting, every `order.paid` including `subscription_cycle` grants with no `billing_reason` special-case.
- Code review ×3 of that implement: [`CODE_REVIEW_POLAR_PATH_PR3.md`](./CODE_REVIEW_POLAR_PATH_PR3.md), [`COS_CODE_REVIEW_PR3.yaml`](./COS_CODE_REVIEW_PR3.yaml). Head `cd202b8`. No P0/P1. Do not merge from the review commit.
- Refund window still deferred. Soft-WTP / Lock / Audit / hosted gateway still OFF. No Polar listing / KYC.

## Next

1. Founder reads the Polar implement review and decides merge of PR #3. The review does not merge it.  
2. Then polished replay CLI and the rest of the ready gate → Polar listing (CoS).

## Kill watch (from DECISION)

- Cannot beat Cursor+Stripe docs in 60s demo  
- 45d post-launch: &lt;3 sales AND refunds &gt;25%  
- Hookdeck/Stripe/Polar ships equivalent owned-code outbox starter free  
- Support &gt;2h/wk day 60  
- Buyers demand hosted gateway → **stop**; do not pivot to services on Polar  

*Stripe merged at f25f235. Polar design merged (PQ1/PQ2 closed, PD1–PD4 accepted). Polar implement CR×3 APPROVE on https://github.com/yellowgram/hooksteel/pull/3 (head cd202b8, no P0/P1). Halt for founder. Soft-WTP OFF. No Polar listing. LICENSE unchanged.*
