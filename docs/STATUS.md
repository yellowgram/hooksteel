# HookSteel — STATUS

**Product:** HookSteel — Billing Event Reliability Kit  
**Owner:** yellowgram  
**Contact:** hello@yellowgram.dev · www.yellowgram.dev  
**Polar org (when ready):** Suthirth solutions (CoS owns listing)  
**Private repo (README only):** https://github.com/yellowgram/hooksteel  
**Date:** 2026-09-26 ET

---

## GO

**GO given** from DECISION.md #1 (digital-product-hunt). Primary Polar cash path for 60–90d. Soft-WTP OFF. No Lock/Audit/services. Polar stays dark until ready gate.

## Phase

**Stripe path design done / implement next** — halted for founder design review.

Design pack: [`DESIGN_STRIPE_PATH.md`](./DESIGN_STRIPE_PATH.md) (3/3 progressive adversarial design iterations documented). No application code, no git push, no cloud-agent launch in this pass.

## Next

1. **Founder reviews** `DESIGN_STRIPE_PATH.md` (halt gate). Resolve open questions in §3 if desired.  
2. After explicit GO: implement Stripe path in `yellowgram/hooksteel` under **3 code-review** adversarial passes (schema + signed webhook + same-txn outbox + minimal drain + 5 chaos on Postgres CI).  
3. Then Polar path, polished replay CLI, ready-gate rest → Polar listing (CoS).

## Kill watch (from DECISION)

- Cannot beat Cursor+Stripe docs in 60s demo  
- 45d post-launch: &lt;3 sales AND refunds &gt;25%  
- Hookdeck/Stripe/Polar ships equivalent owned-code outbox starter free  
- Support &gt;2h/wk day 60  
- Buyers demand hosted gateway → **stop**; do not pivot to services on Polar  

*Design-only complete for Stripe slice; waiting on founder before implement.*
