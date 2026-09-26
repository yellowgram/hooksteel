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

## Phase

**Stripe path merged. Polar path design×3 done; halted for founder review before any Polar implement.**

- Stripe path is on `main` at `f25f235` (`Stripe path: exactly-once webhook side effects + chaos suite`). PR: https://github.com/yellowgram/hooksteel/pull/1
- Design contract for that slice remains [`DESIGN_STRIPE_PATH.md`](./DESIGN_STRIPE_PATH.md). Code-review packs: [`CODE_REVIEW_STRIPE_PATH_PR1.md`](./CODE_REVIEW_STRIPE_PATH_PR1.md), [`COS_CODE_REVIEW_PR1.yaml`](./COS_CODE_REVIEW_PR1.yaml).
- Polar design×3: [`DESIGN_POLAR_PATH.md`](./DESIGN_POLAR_PATH.md). Verify is stdlib dual-key HMAC (no Polar SDK). One founder question (PQ1, legacy `polar_whs_` prefix) with a recommended `whsec_`-only default. Refund window still deferred.
- No Polar application code in this phase. Soft-WTP / Lock / Audit / hosted gateway still OFF. No Polar listing / KYC.

## Next

1. **Founder** reviews [`DESIGN_POLAR_PATH.md`](./DESIGN_POLAR_PATH.md) (PQ1 especially).  
2. After that review, Polar implement (verify + handle + fixtures + example route + adapter map) under 3 code-review passes. Do not start it from this design PR.  
3. Then polished replay CLI and the rest of the ready gate → Polar listing (CoS).

## Kill watch (from DECISION)

- Cannot beat Cursor+Stripe docs in 60s demo  
- 45d post-launch: &lt;3 sales AND refunds &gt;25%  
- Hookdeck/Stripe/Polar ships equivalent owned-code outbox starter free  
- Support &gt;2h/wk day 60  
- Buyers demand hosted gateway → **stop**; do not pivot to services on Polar  

*Stripe merged at f25f235. Polar design×3 halted for founder review. No Polar implement yet.*
