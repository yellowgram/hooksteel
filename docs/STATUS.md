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

**Founder GREENLIT** cycle-2 design locks (NQ1–NQ3 at recommended answers; H2/H3 demotions applied). See [`DESIGN_STRIPE_PATH.md`](./DESIGN_STRIPE_PATH.md) §1 + §4.

## Phase

**Stripe path implemented** on this repo per [`DESIGN_STRIPE_PATH.md`](./DESIGN_STRIPE_PATH.md) §1 (cycle-2 locks, H2/H3 demotions): migrations, `constructEvent` handler, same-transaction outbox, minimal drain, exactly 5 Postgres chaos tests, Next example only under `examples/next`.

Not in this tree: Polar verify, polished replay CLI, landing, Polar listing, hosted gateway.

## Next

1. Founder code-review of the Stripe path PR.  
2. Then Polar verify, polished replay CLI, ready-gate rest → Polar listing (CoS).

## Kill watch (from DECISION)

- Cannot beat Cursor+Stripe docs in 60s demo  
- 45d post-launch: &lt;3 sales AND refunds &gt;25%  
- Hookdeck/Stripe/Polar ships equivalent owned-code outbox starter free  
- Support &gt;2h/wk day 60  
- Buyers demand hosted gateway → **stop**; do not pivot to services on Polar  

*Stripe path is in the repo. Polar verify, replay CLI, and listing stay later.*
