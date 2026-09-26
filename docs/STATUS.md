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

**Founder GREENLIT** Polar path design. PQ1 and PQ2 closed. CoS PD1–PD4 accepted. See [`DESIGN_POLAR_PATH.md`](./DESIGN_POLAR_PATH.md) §3. Implement is on `main`.

**Founder GREENLIT** replay CLI design 2026-09-26. PQ1 `three_npm_scripts`. PQ2 `terminal_json_only`. See [`DESIGN_REPLAY_CLI.md`](./DESIGN_REPLAY_CLI.md) §3. Implement is on `main`.

## Phase

**Ready gate in progress. Replay CLI merged at `c6a4012`. Listing dark. Refund window TBD (founder flag).**

- Stripe path is on `main` at `f25f235` (`Stripe path: exactly-once webhook side effects + chaos suite`). PR: https://github.com/yellowgram/hooksteel/pull/1
- Design contract for that slice remains [`DESIGN_STRIPE_PATH.md`](./DESIGN_STRIPE_PATH.md). Code-review packs: [`CODE_REVIEW_STRIPE_PATH_PR1.md`](./CODE_REVIEW_STRIPE_PATH_PR1.md), [`COS_CODE_REVIEW_PR1.yaml`](./COS_CODE_REVIEW_PR1.yaml).
- Polar design is merged: https://github.com/yellowgram/hooksteel/pull/2 (`cursor/polar-path-design-cac1`). Docs only.
- Polar implement is merged: https://github.com/yellowgram/hooksteel/pull/3 at `09c4f88d21dae3fc01af6cae27456246b898626c` (`Polar path: dual-key HMAC verify and handlePolar`). LICENSE unchanged. CR3 P2s stayed deferred.
- Replay CLI design is **greenlit**: [`DESIGN_REPLAY_CLI.md`](./DESIGN_REPLAY_CLI.md) §1 and §3. PQ1 locked: `replay:list`, `replay:dry-run`, `replay:execute` in one `scripts/replay-cli.ts` (tsx + dotenv, no bin, no inspect). PQ2 locked: execute stdout JSON (`deadLetterId`, `outboxId`, `adapter`) is the operator note. No `--operator`. No `replayed_by`.
- Replay CLI **implement is merged**: https://github.com/yellowgram/hooksteel/pull/5 at `c6a4012dd25d1aff64f19223669453ffdec2058a` (`feat(replay): npm scripts list/dry-run/execute wrapping shipped mutation`). Polar path lineage stays `09c4f88` (PR #3). `src/outbox/replay.ts` was not edited. CR2-A-P2-002 stays deferred (README known limit). Listing stays dark.
- RD1 and RD2 are README known limits. Do not edit `src/outbox/replay.ts`.
- Refund window still deferred. Soft-WTP / Lock / Audit / hosted gateway still OFF. No Polar listing / KYC.
- Ready-gate docs are in the tree: [SUPPORT.md](../SUPPORT.md), [DEMO_60S.md](./DEMO_60S.md) (script only; not filmed), [LANDING.md](./LANDING.md) (not a deployed site), [POLAR_DELIVERABLES.md](./POLAR_DELIVERABLES.md), [REFUND_GLOSSARY.md](./REFUND_GLOSSARY.md), [CHECKSUMS.md](./CHECKSUMS.md), [CHANGELOG.md](../CHANGELOG.md). Zip asset: `release/hooksteel-0.1.0.zip`, built by `npm run pack:release`. GitHub Release `v0.1.0` is not cut. CoS steps are in the Polar packet. Listing stays dark.
- The purchase-refund day count is **TBD**. Do not set the Polar refund toggle. Do not write a day count. See [REFUND_GLOSSARY.md](./REFUND_GLOSSARY.md).

## Next

1. Founder films and approves [DEMO_60S.md](./DEMO_60S.md). The file is the script. A recording is not in the repo.
2. Founder names the purchase-refund day count. Until that number exists, CoS leaves the Polar refund toggle unset.
3. CoS follows [POLAR_DELIVERABLES.md](./POLAR_DELIVERABLES.md) to cut GitHub Release `v0.1.0` with `release/hooksteel-0.1.0.zip` and the SHA-256 from [CHECKSUMS.md](./CHECKSUMS.md). Do not publish the Polar product.
4. Listing stays dark. No Checkout, no KYC, no Soft-WTP, no Lock/Audit, no hosted gateway. Polar lineage stays `09c4f88`.

## Kill watch (from DECISION)

- Cannot beat Cursor+Stripe docs in 60s demo  
- 45d post-launch: &lt;3 sales AND refunds &gt;25%  
- Hookdeck/Stripe/Polar ships equivalent owned-code outbox starter free  
- Support &gt;2h/wk day 60  
- Buyers demand hosted gateway → **stop**; do not pivot to services on Polar  

*Stripe merged at f25f235. Polar merged at 09c4f88 (PR #3). Replay CLI implement merged at c6a4012 (PR #5, PQ1 three npm scripts, PQ2 terminal JSON only). Ready-gate docs in progress (support, demo script, landing copy, zip + SHA). Refund days TBD. Polar lineage stays 09c4f88. Soft-WTP OFF. Listing dark.*
