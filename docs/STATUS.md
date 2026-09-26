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

**Founder GREENLIT** replay CLI design 2026-09-26. PQ1 `three_npm_scripts`. PQ2 `terminal_json_only`. See [`DESIGN_REPLAY_CLI.md`](./DESIGN_REPLAY_CLI.md) §3. Implement is a separate later PR.

## Phase

**Polar merged at `09c4f88`. Replay CLI design greenlit. Next = a separate implement PR.**

- Stripe path is on `main` at `f25f235` (`Stripe path: exactly-once webhook side effects + chaos suite`). PR: https://github.com/yellowgram/hooksteel/pull/1
- Design contract for that slice remains [`DESIGN_STRIPE_PATH.md`](./DESIGN_STRIPE_PATH.md). Code-review packs: [`CODE_REVIEW_STRIPE_PATH_PR1.md`](./CODE_REVIEW_STRIPE_PATH_PR1.md), [`COS_CODE_REVIEW_PR1.yaml`](./COS_CODE_REVIEW_PR1.yaml).
- Polar design is merged: https://github.com/yellowgram/hooksteel/pull/2 (`cursor/polar-path-design-cac1`). Docs only.
- Polar implement is merged: https://github.com/yellowgram/hooksteel/pull/3 at `09c4f88d21dae3fc01af6cae27456246b898626c` (`Polar path: dual-key HMAC verify and handlePolar`). LICENSE unchanged. CR3 P2s stayed deferred.
- Replay CLI design is **greenlit**: [`DESIGN_REPLAY_CLI.md`](./DESIGN_REPLAY_CLI.md) §1 and §3. PQ1 locked: `replay:list`, `replay:dry-run`, `replay:execute` in one `scripts/replay-cli.ts` (tsx + dotenv, no bin, no inspect). PQ2 locked: execute stdout JSON (`deadLetterId`, `outboxId`, `adapter`) is the operator note. No `--operator`. No `replayed_by`. This design change does not implement the CLI.
- RD1 and RD2 stay known limits for the implement README. Do not edit `src/outbox/replay.ts`. CR2-A-P2-002 stays deferred.
- Refund window still deferred. Soft-WTP / Lock / Audit / hosted gateway still OFF. No Polar listing / KYC.

## Next

1. A **separate** PR implements the replay CLI from [`DESIGN_REPLAY_CLI.md`](./DESIGN_REPLAY_CLI.md) §1 and §3 (three npm scripts, argv unit test, README / `BUYER_START_HERE` runbook). This design merge does not start that PR.  
2. That implement PR copies RD1 and RD2 into the README known limits and does not edit `src/outbox/replay.ts`.  
3. Ready-gate remainder (zip, checksum, landing, 60s demo) and Polar listing stay after that. CoS owns the listing. Listing stays dark now.

## Kill watch (from DECISION)

- Cannot beat Cursor+Stripe docs in 60s demo  
- 45d post-launch: &lt;3 sales AND refunds &gt;25%  
- Hookdeck/Stripe/Polar ships equivalent owned-code outbox starter free  
- Support &gt;2h/wk day 60  
- Buyers demand hosted gateway → **stop**; do not pivot to services on Polar  

*Stripe merged at f25f235. Polar merged at 09c4f88 (PR #3). Replay CLI design greenlit (PQ1 three npm scripts, PQ2 terminal JSON only). Next = a separate implement PR. Soft-WTP OFF. No Polar listing.*
