# HookSteel — design pack (agents)

**Product:** HookSteel — Billing Event Reliability Kit  
**This directory:** `/workspace/income/hooksteel/` — **design-only** docs for yellowgram agents and founder.  
**Application / shippable kit code:** this repository (`yellowgram/hooksteel`). Stripe path (migrations, handler, drain, 5 chaos tests) is implemented. **Do not** treat the design notes alone as the buyer zip.

---

## What lives here vs the private repo

| Here (`/workspace/income/hooksteel/`) | Private repo `yellowgram/hooksteel` |
| --- | --- |
| `STATUS.md` — GO, phase, next | Application source (schemas, handlers, worker, CLI, tests) |
| `MVP_SCOPE.md` — In/Out/Later, schema sketch, ready gate | Buyer-facing `README`, `BUYER_START_HERE`, LICENSE, `.env.example` |
| `MINIMUM_SUPPORT_CHECKLIST.md` — stranger self-serve bar (v3) | CI, Postgres chaos jobs, release zips |
| `BUYER_NEEDS_BEYOND_CHECKLIST.md` — buyer/operator-owned needs | Polar delivery artifacts (when ready) |
| `DESIGN_STRIPE_PATH.md` — Stripe path + 5 chaos (cycle-1 + cycle-2 locks merged) | Stripe path code on `main` @ `f25f235`: migrations, handler, drain, chaos tests |
| `DESIGN_POLAR_PATH.md` — Polar path design×3, founder greenlit (PQ1/PQ2 closed, PD1–PD4 locks) | Polar verify + `handlePolar` on PR #3. CR×3 pack: [`CODE_REVIEW_POLAR_PATH_PR3.md`](./CODE_REVIEW_POLAR_PATH_PR3.md) (**APPROVE**, no P0/P1). Halt for founder. |
| `COS_POLAR_PATH_DESIGN_REVIEW.yaml` — CoS design review; PD1–PD4 accepted | — |
| `DESIGN_REVIEW_CYCLE2_JUDGEMENT.md` — HookSteel accept/reject of CoS cycle-2 packet | — |
| This `README.md` — agent pointer | — |

**Not here:** git remotes for income docs, Polar KYC, live keys, Soft-WTP, Lock/Audit, hosted gateway.

---

## Standing rules

- Soft-WTP **OFF**. No Lock / Audit / services on Polar.
- Polar org (Suthirth solutions) stays **dark until ready gate** (see `MVP_SCOPE.md`).
- Stripe path is **merged** on `main` (`f25f235`). Further kit code still goes through **3 code-review** passes.
- Polar path **design×3 is founder-greenlit** and merged ([`DESIGN_POLAR_PATH.md`](./DESIGN_POLAR_PATH.md) §3: PQ1 `whsec_` only, PQ2 LICENSE unchanged, PD1–PD4 accepted). Implement CR×3 is **APPROVE** on `cursor/polar-webhook-path-9fc9` (no P0/P1). Halt for founder before merge. No Polar SDK as a required dependency. No Soft-WTP / Lock / Audit / hosted gateway.
- ICP: Global English only. Contact: hello@yellowgram.dev · www.yellowgram.dev.

## Pattern sources

- Primary Polar digital-kit shape: `/workspace/income/credit-ledger-shim/`
- Ops/operator depth model: `/workspace/keel/MINIMUM_OPS_CHECKLIST.md`, `OPERATOR_NEEDS_BEYOND_CHECKLIST.md`
- Product lock: `/workspace/income/digital-product-hunt/DECISION.md` §#1 HookSteel

*Last updated: 2026-09-26 ET — Stripe path merged at f25f235; Polar design merged; Polar implement CR×3 APPROVE, halt for founder.*
