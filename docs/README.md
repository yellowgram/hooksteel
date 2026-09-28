# HookSteel — design pack (agents)

**Product:** HookSteel — Billing Event Reliability Kit  
**This directory:** `docs/` in `yellowgram/hooksteel`. Design history (`DESIGN_*`) plus ready-gate docs (demo script, landing copy, Polar packet, refund glossary, checksums). `SUPPORT.md` and `CHANGELOG.md` are at the repo root.  
**Application / shippable kit code:** this repository (`yellowgram/hooksteel`). Stripe path, Polar path (`handle` / `handlePolar`), migrations, drain, five chaos tests, and the replay CLI are on `main` (replay implement `c6a4012`). Ready-gate buyer docs sit beside the design notes: `SUPPORT.md`, `docs/DEMO_60S.md`, `docs/LANDING.md`, `docs/POLAR_DELIVERABLES.md`, `docs/REFUND_GLOSSARY.md`, `docs/CHECKSUMS.md`, `CHANGELOG.md`. **Do not** treat the design notes alone as the buyer zip.

---

## What lives in this public repository

This repository is public and source-available: https://github.com/yellowgram/hooksteel. The Polar listing is live as of 2026-09-27 and sells `hooksteel-0.1.1.zip` (SHA-256 `e5fb3c1117b954f344fb27e7b1bf7be89d46e120839e238983d017a50e08e4d9`).

| Docs in `docs/` | Kit code in this same repository |
| --- | --- |
| `STATUS.md` — GO, phase, next | Application source (schemas, handlers, worker, CLI, tests) |
| `MVP_SCOPE.md` — In/Out/Later, schema sketch, ready gate | Buyer-facing `README`, `BUYER_START_HERE`, LICENSE, `.env.example` |
| `MINIMUM_SUPPORT_CHECKLIST.md` — stranger self-serve bar (v3) | CI, Postgres chaos jobs, `npm run pack:release`. Live Polar sell file: `release/hooksteel-0.1.1.zip`. Sealed `hooksteel-0.1.0.zip` stays grandfathered. |
| `BUYER_NEEDS_BEYOND_CHECKLIST.md` — buyer/operator-owned needs | Polar delivery: public source-available GitHub plus `hooksteel-0.1.1.zip` |
| `DESIGN_STRIPE_PATH.md` — Stripe path + 5 chaos (cycle-1 + cycle-2 locks merged) | Stripe path code on `main` @ `f25f235`: migrations, handler, drain, chaos tests |
| `DESIGN_POLAR_PATH.md` — Polar path design×3, founder greenlit (PQ1/PQ2 closed, PD1–PD4 locks) | Polar verify + `handlePolar` merged at `09c4f88` (PR #3). CR×3 pack: [`CODE_REVIEW_POLAR_PATH_PR3.md`](./CODE_REVIEW_POLAR_PATH_PR3.md) (**APPROVE**, no P0/P1). |
| `DESIGN_REPLAY_CLI.md` — replay CLI design×3, founder greenlit 2026-09-26 (PQ1 `three_npm_scripts`, PQ2 `terminal_json_only`) | Implemented on `main` at `c6a4012` (PR #5): `replay:list`, `replay:dry-run`, `replay:execute`. `src/outbox/replay.ts` was not edited. |
| `COS_POLAR_PATH_DESIGN_REVIEW.yaml` — CoS design review; PD1–PD4 accepted | — |
| `DESIGN_REVIEW_CYCLE2_JUDGEMENT.md` — HookSteel accept/reject of CoS cycle-2 packet | — |
| This `README.md` — agent pointer | — |

**Not here:** git remotes for income docs, Polar KYC, live keys, Soft-WTP, Lock/Audit, hosted gateway.

---

## Standing rules

- Soft-WTP **OFF**. No Lock / Audit / services on Polar.
- Polar organization (dashboard; not renamed this week) is Suthirth solutions. Legal seller: Suthirth Solutions, operating as yellowgram. The Polar listing is live as of 2026-09-27. Sell file `hooksteel-0.1.1.zip`. This directory does not change Polar settings.
- Stripe path is **merged** on `main` (`f25f235`). Further kit code still goes through **3 code-review** passes.
- Polar path **design×3 is founder-greenlit** and the implement is **merged** at `09c4f88` ([`DESIGN_POLAR_PATH.md`](./DESIGN_POLAR_PATH.md) §3: PQ1 `whsec_` only, PQ2 LICENSE unchanged, PD1–PD4 accepted). No Polar SDK as a required dependency.
- Replay CLI **design×3 is founder-greenlit** and the implement is **merged** at `c6a4012` (PR #5). PQ1 `three_npm_scripts`, PQ2 `terminal_json_only`. RD1/RD2 stay README known limits. Do not edit `src/outbox/replay.ts`.
- No Soft-WTP / Lock / Audit / hosted gateway. Delivery is the public source-available repository plus the Polar zip. No checkout URL in the README or the zip.
- ICP: Global English only. Contact: hello@yellowgram.dev · www.yellowgram.dev.

## Pattern sources

These notes name outside patterns. They are not paths in this repository, and they are not buyer install steps.

- Polar digital-kit shape: credit-ledger minimum-support checklist
- Operator depth: keel minimum-ops checklist
- Product lock: digital-product-hunt decision #1 (HookSteel)

*Last updated: 2026-09-27 ET — Stripe path merged at f25f235; Polar path merged at 09c4f88; replay CLI implement merged at c6a4012. The Polar listing is live and sells `hooksteel-0.1.1.zip`. Repository is public and source-available. Purchase-refund window 14 days. Soft-WTP off.*
