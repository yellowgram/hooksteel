# HookSteel — design pack (agents)

**Product:** HookSteel — Billing Event Reliability Kit  
**This directory:** `/workspace/income/hooksteel/` — **design-only** docs for yellowgram agents and founder.  
**Application / shippable kit code:** private GitHub repo [`yellowgram/hooksteel`](https://github.com/yellowgram/hooksteel) (empty until implement passes). **Do not** treat this folder as the buyer zip.

---

## What lives here vs the private repo

| Here (`/workspace/income/hooksteel/`) | Private repo `yellowgram/hooksteel` |
| --- | --- |
| `STATUS.md` — GO, phase, next | Application source (schemas, handlers, worker, CLI, tests) |
| `MVP_SCOPE.md` — In/Out/Later, schema sketch, ready gate | Buyer-facing `README`, `BUYER_START_HERE`, LICENSE, `.env.example` |
| `MINIMUM_SUPPORT_CHECKLIST.md` — stranger self-serve bar (v3) | CI, Postgres chaos jobs, release zips |
| `BUYER_NEEDS_BEYOND_CHECKLIST.md` — buyer/operator-owned needs | Polar delivery artifacts (when ready) |
| `DESIGN_STRIPE_PATH.md` — Stripe path + 5 chaos (cycle-1 + cycle-2 locks merged; implement unlocked) | — |
| `DESIGN_REVIEW_CYCLE2_JUDGEMENT.md` — HookSteel accept/reject of CoS cycle-2 packet | — |
| This `README.md` — agent pointer | — |

**Not here:** git remotes for income docs, Polar KYC, live keys, Soft-WTP, Lock/Audit, hosted gateway.

---

## Standing rules

- Soft-WTP **OFF**. No Lock / Audit / services on Polar.
- Polar org (Suthirth solutions) stays **dark until ready gate** (see `MVP_SCOPE.md`).
- Implement under **3 code-review** adversarial passes (design cycle-2 locks already merged into `DESIGN_STRIPE_PATH.md` §1).
- Stripe path **cycle-2 locks merged**; implement unlocked on `yellowgram/hooksteel` (see `STATUS.md`). No Soft-WTP / Lock / Audit / hosted gateway / Polar SDK on Stripe path.
- ICP: Global English only. Contact: hello@yellowgram.dev · www.yellowgram.dev.

## Pattern sources

- Primary Polar digital-kit shape: `/workspace/income/credit-ledger-shim/`
- Ops/operator depth model: `/workspace/keel/MINIMUM_OPS_CHECKLIST.md`, `OPERATOR_NEEDS_BEYOND_CHECKLIST.md`
- Product lock: `/workspace/income/digital-product-hunt/DECISION.md` §#1 HookSteel

*Last updated: 2026-09-26 ET — cycle-2 locks merged; implement unlocked.*
