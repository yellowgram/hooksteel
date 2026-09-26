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

**Polar webhook path implement in progress.** Design is on `main`. This slice is verify + `handlePolar` + fixtures + example route + adapter map. Soft-WTP OFF. No Polar listing. LICENSE stays byte-identical (PQ2).

- Stripe path is on `main` at `f25f235` (`Stripe path: exactly-once webhook side effects + chaos suite`). PR: https://github.com/yellowgram/hooksteel/pull/1
- Design contract for that slice remains [`DESIGN_STRIPE_PATH.md`](./DESIGN_STRIPE_PATH.md). Code-review packs: [`CODE_REVIEW_STRIPE_PATH_PR1.md`](./CODE_REVIEW_STRIPE_PATH_PR1.md), [`COS_CODE_REVIEW_PR1.yaml`](./COS_CODE_REVIEW_PR1.yaml).
- Polar design is merged: https://github.com/yellowgram/hooksteel/pull/2 (`cursor/polar-path-design-cac1`). Docs only.
- Polar implement PR: opening on `cursor/polar-webhook-path-9fc9`. Link filled when the PR is up.
- [`DESIGN_POLAR_PATH.md`](./DESIGN_POLAR_PATH.md) §1 is the implement contract. §3: **PQ1** `whsec_` only (`polar_whs_` and any non-`whsec_` prefix → 400 `invalid_webhook_secret`; buyers rotate). **PQ2** LICENSE byte-identical this slice; Polar-org clause deferred.
- CoS [`COS_POLAR_PATH_DESIGN_REVIEW.yaml`](./COS_POLAR_PATH_DESIGN_REVIEW.yaml) **PD1–PD4** are in this implement: unsigned-livemode known limit, both HMAC eras in unit tests, README 10-strike troubleshooting, every `order.paid` including `subscription_cycle` grants with no `billing_reason` special-case.
- Refund window still deferred. Soft-WTP / Lock / Audit / hosted gateway still OFF. No Polar listing / KYC.

## Next

1. Three code-review passes on the Polar implement PR.  
2. Then polished replay CLI and the rest of the ready gate → Polar listing (CoS).

## Kill watch (from DECISION)

- Cannot beat Cursor+Stripe docs in 60s demo  
- 45d post-launch: &lt;3 sales AND refunds &gt;25%  
- Hookdeck/Stripe/Polar ships equivalent owned-code outbox starter free  
- Support &gt;2h/wk day 60  
- Buyers demand hosted gateway → **stop**; do not pivot to services on Polar  

*Stripe merged at f25f235. Polar design merged (PQ1/PQ2 closed, PD1–PD4 accepted). Polar implement in progress on `cursor/polar-webhook-path-9fc9`. Soft-WTP OFF. No Polar listing. LICENSE unchanged.*
