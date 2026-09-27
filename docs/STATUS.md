# HookSteel — STATUS

**Product:** HookSteel — Billing Event Reliability Kit  
**Owner:** yellowgram  
**Contact:** hello@yellowgram.dev · www.yellowgram.dev  
**Polar org (when ready):** Suthirth solutions (CoS owns listing)  
**Private repo:** https://github.com/yellowgram/hooksteel  
**Date:** 2026-09-27 ET

---

## GO

**GO given** from DECISION.md #1 (digital-product-hunt). Primary Polar cash path for 60–90d. Soft-WTP OFF. No Lock/Audit/services. Polar stays dark until ready gate.

**Founder GREENLIT** cycle-2 Stripe design locks (NQ1–NQ3 at recommended answers; H2/H3 demotions applied). See [`DESIGN_STRIPE_PATH.md`](./DESIGN_STRIPE_PATH.md) §1 + §4.

**Founder GREENLIT** Polar path design. PQ1 and PQ2 closed. CoS PD1–PD4 accepted. See [`DESIGN_POLAR_PATH.md`](./DESIGN_POLAR_PATH.md) §3. Implement is on `main`.

**Founder GREENLIT** replay CLI design 2026-09-26. PQ1 `three_npm_scripts`. PQ2 `terminal_json_only`. See [`DESIGN_REPLAY_CLI.md`](./DESIGN_REPLAY_CLI.md) §3. Implement is on `main`.

## Phase

**Ready gate in progress. Replay CLI merged at `c6a4012`. Listing dark. Purchase-refund window 30 days (founder lock 2026-09-26). Founding $89 for the first 10 licenses OR 30 days after go-live, whichever comes first; then $129. One SKU. Do not run two Polar products. The 60s demo is the product: one clip, Stripe and Polar together. Distribution before Polar. Listing stays dark until the founder-approved clip, the distribution post, and the founder types go-live.**

- Stripe path is on `main` at `f25f235` (`Stripe path: exactly-once webhook side effects + chaos suite`). PR: https://github.com/yellowgram/hooksteel/pull/1
- Design contract for that slice remains [`DESIGN_STRIPE_PATH.md`](./DESIGN_STRIPE_PATH.md). Code-review packs: [`CODE_REVIEW_STRIPE_PATH_PR1.md`](./CODE_REVIEW_STRIPE_PATH_PR1.md), [`COS_CODE_REVIEW_PR1.yaml`](./COS_CODE_REVIEW_PR1.yaml).
- Polar design is merged: https://github.com/yellowgram/hooksteel/pull/2 (`cursor/polar-path-design-cac1`). Docs only.
- Polar implement is merged: https://github.com/yellowgram/hooksteel/pull/3 at `09c4f88d21dae3fc01af6cae27456246b898626c` (`Polar path: dual-key HMAC verify and handlePolar`). LICENSE unchanged. CR3 P2s stayed deferred.
- Replay CLI design is **greenlit**: [`DESIGN_REPLAY_CLI.md`](./DESIGN_REPLAY_CLI.md) §1 and §3. PQ1 locked: `replay:list`, `replay:dry-run`, `replay:execute` in one `scripts/replay-cli.ts` (tsx + dotenv, no bin, no inspect). PQ2 locked: execute stdout JSON (`deadLetterId`, `outboxId`, `adapter`) is the operator note. No `--operator`. No `replayed_by`.
- Replay CLI **implement is merged**: https://github.com/yellowgram/hooksteel/pull/5 at `c6a4012dd25d1aff64f19223669453ffdec2058a` (`feat(replay): npm scripts list/dry-run/execute wrapping shipped mutation`). Polar path lineage stays `09c4f88` (PR #3). `src/outbox/replay.ts` was not edited. CR2-A-P2-002 stays deferred (README known limit). Listing stays dark.
- RD1 and RD2 are README known limits. Do not edit `src/outbox/replay.ts`.
- Purchase-refund window is **30 days** (founder lock 2026-09-26). CoS sets the Polar refund toggle to 30 days before the listing goes light. Do not publish to set it. Soft-WTP / Lock / Audit / hosted gateway still OFF. No Polar listing / KYC.
- Ready-gate docs are in the tree: [SUPPORT.md](../SUPPORT.md), [DEMO_60S.md](./DEMO_60S.md) (script only; not filmed; one clip is the product), [LANDING.md](./LANDING.md) (not a deployed site), [POLAR_DELIVERABLES.md](./POLAR_DELIVERABLES.md), [REFUND_GLOSSARY.md](./REFUND_GLOSSARY.md), [CHECKSUMS.md](./CHECKSUMS.md), [CHANGELOG.md](../CHANGELOG.md). Sealed zip: `release/hooksteel-0.1.0.zip` (do not rewrite; do not move tag `v0.1.0`). License-fence pack: `release/hooksteel-0.1.1.zip`, built by `npm run pack:release`. GitHub Release tag `v0.1.1` is not cut. CoS steps are in the Polar packet. Listing stays dark.
- **License fence prep (2026-09-27).** Public license is PolyForm Noncommercial 1.0.0 (`LICENSE`): source-available, not OSI open source, not MIT. Paid commercial production use is the Suthirth Commercial Grant ([COMMERCIAL_GRANT.md](./COMMERCIAL_GRANT.md)): one organization, the purchased named tag, perpetual for that tag. Prior Single-app kit language folds into that one-organization grant. Price lock: [COMMERCIAL_LOCK.md](./COMMERCIAL_LOCK.md). Soft-WTP off. No coupon. No checkout URL in README or the zip. The fence does not claw back already-distributed v0.1.0 zips. Live Polar stays on 0.1.0 until CoS republish after this fence is on `main`. Do not unlist. Do not edit the Polar product from the fence pull request. Do not merge until LaunchGate CR and License Gate freeze.
- **Founder clarification 2026-09-26.** The 60s demo is the product: one clip, same event four times → one side effect, rollback mid-fulfillment, Stripe and Polar in that clip. Not two provider demos. Kill criterion: if that clip cannot beat the Stripe docs and the Hookdeck homepage, do not list. Distribution order: founder-approved clip, then a post on X, Hacker News, and Stripe/Polar builder chats ("we double-provisioned after a 500") with "use them for ingress; this is the outbox you keep" in the same breath, and only then Polar as the cash register. CoS do not list while the listing is dark, there is no founder-approved clip, and there is no distribution post.
- The purchase-refund window is **30 days**. See [REFUND_GLOSSARY.md](./REFUND_GLOSSARY.md). Replay CLI is not that refund. `order.refunded` stays ignored and does not claw back credit.

## Next

1. Founder films and approves the one clip in [DEMO_60S.md](./DEMO_60S.md). Stripe and Polar, four deliveries, one side effect, rollback, same clip. A Stripe-only or Polar-only recording is not the gate. A recording is not in the repo.
2. Founder posts that clip where the burn already happened: a tight X thread, Show HN, and Stripe/Polar builder chats. Same breath: use them for ingress; this is the outbox you keep.
3. Founder types go-live. Listing stays dark until the founder-approved clip, the distribution post, and that word.
4. Only after that approved clip, that distribution post, and go-live may CoS list on Polar, as the cash register. One SKU. Founding $89 for the first 10 licenses OR 30 days after go-live, whichever comes first; then $129. Do not run two Polar products. CoS do not list while the listing is dark, there is no founder-approved clip, and there is no distribution post.
5. CoS sets the Polar refund toggle to 30 days before the listing goes light. Do not publish the product to do that. GitHub Release `v0.1.0` steps are in [POLAR_DELIVERABLES.md](./POLAR_DELIVERABLES.md). Do not publish the Polar product. No Checkout, no KYC, no Soft-WTP, no Lock/Audit, no hosted gateway. Polar lineage stays `09c4f88`.

## Kill watch (from DECISION)

- One clip cannot beat the Stripe docs and the Hookdeck homepage (founder clarification 2026-09-26; do not list)  
- 45d post-launch: &lt;3 sales AND refunds &gt;25%  
- Hookdeck/Stripe/Polar ships equivalent owned-code outbox starter free  
- Support &gt;2h/wk day 60  
- Buyers demand hosted gateway → **stop**; do not pivot to services on Polar  

*Stripe merged at f25f235. Polar merged at 09c4f88 (PR #3). Replay CLI implement merged at c6a4012 (PR #5, PQ1 three npm scripts, PQ2 terminal JSON only). Ready-gate docs in progress. The 60s demo is one Stripe+Polar clip. Distribution before Polar. Purchase-refund window 30 days. Polar lineage stays 09c4f88. Soft-WTP OFF. Listing dark.*
