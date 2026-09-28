# HookSteel — STATUS

**Product:** HookSteel — Billing Event Reliability Kit  
**Owner:** yellowgram  
**Contact:** hello@yellowgram.dev · www.yellowgram.dev  
**Polar organization (dashboard; not renamed this week):** Suthirth solutions (CoS owns the listing; this file does not change Polar settings)  
**Legal seller:** Suthirth Solutions, operating as yellowgram  
**Polar product id:** `8901910f-b04f-4d68-8e67-140741b544d7` (do not rename)  
**Repo:** https://github.com/yellowgram/hooksteel (public, source-available)  
**Date:** 2026-09-27 ET

---

## GO

**GO given** from DECISION.md #1 (digital-product-hunt). Primary Polar cash path for 60–90d. Soft-WTP OFF. No Lock/Audit/services. The Polar listing is live as of 2026-09-27.

**Founder GREENLIT** cycle-2 Stripe design locks (NQ1–NQ3 at recommended answers; H2/H3 demotions applied). See [`DESIGN_STRIPE_PATH.md`](./DESIGN_STRIPE_PATH.md) §1 + §4.

**Founder GREENLIT** Polar path design. PQ1 and PQ2 closed. CoS PD1–PD4 accepted. See [`DESIGN_POLAR_PATH.md`](./DESIGN_POLAR_PATH.md) §3. Implement is on `main`.

**Founder GREENLIT** replay CLI design 2026-09-26. PQ1 `three_npm_scripts`. PQ2 `terminal_json_only`. See [`DESIGN_REPLAY_CLI.md`](./DESIGN_REPLAY_CLI.md) §3. Implement is on `main`.

## Phase

**Live.** The Polar listing is live as of 2026-09-27 and sells `hooksteel-0.1.1.zip`. SHA-256 `e5fb3c1117b954f344fb27e7b1bf7be89d46e120839e238983d017a50e08e4d9` (`docs/CHECKSUMS.md`). GitHub Release [`v0.1.1`](https://github.com/yellowgram/hooksteel/releases/tag/v0.1.1) is published. Purchase-refund window 14 days (founder lock 2026-09-26). Founding $89 for the first 10 licenses OR 30 days after go-live, whichever comes first; then $129. One SKU. Do not run two Polar products. Soft-WTP off. Delivery is this public source-available repository plus the zip from Polar. No checkout URL in the README or the zip.

- Stripe path is on `main` at `f25f235` (`Stripe path: exactly-once webhook side effects + chaos suite`). PR: https://github.com/yellowgram/hooksteel/pull/1
- Design contract for that slice remains [`DESIGN_STRIPE_PATH.md`](./DESIGN_STRIPE_PATH.md). Code-review packs: [`CODE_REVIEW_STRIPE_PATH_PR1.md`](./CODE_REVIEW_STRIPE_PATH_PR1.md), [`COS_CODE_REVIEW_PR1.yaml`](./COS_CODE_REVIEW_PR1.yaml).
- Polar design is merged: https://github.com/yellowgram/hooksteel/pull/2 (`cursor/polar-path-design-cac1`). Docs only.
- Polar implement is merged: https://github.com/yellowgram/hooksteel/pull/3 at `09c4f88d21dae3fc01af6cae27456246b898626c` (`Polar path: dual-key HMAC verify and handlePolar`). LICENSE unchanged. CR3 P2s stayed deferred.
- Replay CLI design is **greenlit**: [`DESIGN_REPLAY_CLI.md`](./DESIGN_REPLAY_CLI.md) §1 and §3. PQ1 locked: `replay:list`, `replay:dry-run`, `replay:execute` in one `scripts/replay-cli.ts` (tsx + dotenv, no bin, no inspect). PQ2 locked: execute stdout JSON (`deadLetterId`, `outboxId`, `adapter`) is the operator note. No `--operator`. No `replayed_by`.
- Replay CLI **implement is merged**: https://github.com/yellowgram/hooksteel/pull/5 at `c6a4012dd25d1aff64f19223669453ffdec2058a` (`feat(replay): npm scripts list/dry-run/execute wrapping shipped mutation`). Polar path lineage stays `09c4f88` (PR #3). `src/outbox/replay.ts` was not edited. CR2-A-P2-002 stays deferred (README known limit).
- RD1 and RD2 are README known limits. Do not edit `src/outbox/replay.ts`.
- Purchase-refund window is **14 days** (founder lock 2026-09-26). It is already locked. Do not change it. Soft-WTP / Lock / Audit / hosted gateway stay off.
- Buyer docs are in the tree: [SUPPORT.md](../SUPPORT.md), [DEMO_60S.md](./DEMO_60S.md) (script; founder-approved cut is GitHub Release `clip-60s-approved`), [LANDING.md](./LANDING.md) (listing copy; the public site is https://www.yellowgram.dev; this file is not a checkout URL), [POLAR_DELIVERABLES.md](./POLAR_DELIVERABLES.md), [REFUND_GLOSSARY.md](./REFUND_GLOSSARY.md), [CHECKSUMS.md](./CHECKSUMS.md), [CHANGELOG.md](../CHANGELOG.md). Sealed zip: `release/hooksteel-0.1.0.zip` (do not rewrite; do not move tag `v0.1.0`). Live Polar sell file: `release/hooksteel-0.1.1.zip`. GitHub Release `v0.1.1` is published.
- **License fence (2026-09-27).** Public license is PolyForm Noncommercial 1.0.0 (`LICENSE`): source-available, not OSI open source, not MIT. Paid commercial production use is the HookSteel commercial grant ([COMMERCIAL_GRANT.md](./COMMERCIAL_GRANT.md)): one organization, the purchased named tag, perpetual for that tag. Prior Single-app kit language folds into that one-organization grant. Price lock: [COMMERCIAL_LOCK.md](./COMMERCIAL_LOCK.md). Soft-WTP off. No coupon. No checkout URL in README or the zip. The fence does not claw back already-distributed v0.1.0 zips. That license-fence change did not itself edit Polar product settings. The listing is live and sells `hooksteel-0.1.1.zip`.
- **Founder clarification 2026-09-26 (closed by go-live).** The 60s demo is the product: one clip, same event four times → one side effect, rollback mid-fulfillment, Stripe and Polar in that clip. Not two provider demos. If a cut cannot beat the Stripe docs and the Hookdeck homepage, it is not the buyer clip. The order that closed go-live was the founder-approved clip, then a post ("we double-provisioned after a 500") with "use them for ingress; this is the outbox you keep" in the same breath, then Polar as the cash register. That order is finished.
- The purchase-refund window is **14 days**. See [REFUND_GLOSSARY.md](./REFUND_GLOSSARY.md). Replay CLI is not that refund. `order.refunded` stays ignored and does not claw back credit.

## Next

Go-live already happened on 2026-09-27. Remaining work is maintenance of the live listing. This file does not change Polar product settings, price, or the 14-day refund.

1. Keep the Polar sell file as `hooksteel-0.1.1.zip` with SHA-256 `e5fb3c1117b954f344fb27e7b1bf7be89d46e120839e238983d017a50e08e4d9`. Do not replace that file from a docs-only change. Do not reseal `release/hooksteel-0.1.0.zip`. Do not move tag `v0.1.0`.
2. Delivery stays the public source-available repository https://github.com/yellowgram/hooksteel plus the zip from Polar. Support is public GitHub Issues. Opening an Issue does not need an invite.
3. Keep Soft-WTP off. One SKU. Founding $89 for the first 10 licenses OR 30 days after go-live, whichever comes first; then $129 on that same product. Purchase-refund window stays 14 days. No coupon. No checkout URL in the README, the zip, or buyer Quickstart.
4. Do not claim Lock, Audit, a hosted gateway, MIT, or OSI open source.

## Kill watch (from DECISION)

- A buyer clip that cannot beat the Stripe docs and the Hookdeck homepage (founder clarification 2026-09-26)  
- 45d post-launch: &lt;3 sales AND refunds &gt;25%  
- Hookdeck/Stripe/Polar ships equivalent owned-code outbox starter free  
- Support &gt;2h/wk day 60  
- Buyers demand hosted gateway → **stop**; do not pivot to services on Polar  

*Stripe merged at f25f235. Polar merged at 09c4f88 (PR #3). Replay CLI implement merged at c6a4012 (PR #5, PQ1 three npm scripts, PQ2 terminal JSON only). The Polar listing is live as of 2026-09-27 and sells hooksteel-0.1.1.zip. The 60s demo is one Stripe+Polar clip. Purchase-refund window 14 days. Polar lineage stays 09c4f88. Soft-WTP OFF. Public source-available repository.*
