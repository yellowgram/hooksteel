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

## Phase

**Polar merged at `09c4f88`. Next = replay CLI design. Implement halted.**

- Stripe path is on `main` at `f25f235` (`Stripe path: exactly-once webhook side effects + chaos suite`). PR: https://github.com/yellowgram/hooksteel/pull/1
- Design contract for that slice remains [`DESIGN_STRIPE_PATH.md`](./DESIGN_STRIPE_PATH.md). Code-review packs: [`CODE_REVIEW_STRIPE_PATH_PR1.md`](./CODE_REVIEW_STRIPE_PATH_PR1.md), [`COS_CODE_REVIEW_PR1.yaml`](./COS_CODE_REVIEW_PR1.yaml).
- Polar design is merged: https://github.com/yellowgram/hooksteel/pull/2 (`cursor/polar-path-design-cac1`). Docs only.
- Polar implement is merged: https://github.com/yellowgram/hooksteel/pull/3 at `09c4f88d21dae3fc01af6cae27456246b898626c` (`Polar path: dual-key HMAC verify and handlePolar`). LICENSE unchanged. CR3 P2s stayed deferred.
- Replay CLI is **design×3 only**: [`DESIGN_REPLAY_CLI.md`](./DESIGN_REPLAY_CLI.md). §1 is the lock (three `npm run` commands over the shipped `listDeadLetters` / `replayDryRun` / `replayExecute`). No application code in the design PR. **Implement halted** until the founder greenlights §1 and answers PQ1 and PQ2.
- CR2-A-P2-002 (dry-run `$1` labels) stays deferred. Do not “fix” it in the design or in a silent implement.
- Refund window still deferred. Soft-WTP / Lock / Audit / hosted gateway still OFF. No Polar listing / KYC.

## Next

1. Founder reads [`DESIGN_REPLAY_CLI.md`](./DESIGN_REPLAY_CLI.md) §1 and answers §3 (PQ1 command surface, PQ2 stdout vs an audit column).  
2. Replay CLI **implement stays halted** until that greenlight. A later PR would add only the scripts, the argv unit test, and the README / `BUYER_START_HERE` runbook from §1.  
3. Ready-gate remainder (zip, checksum, landing, 60s demo) and Polar listing stay after that. CoS owns the listing. Listing stays dark now.

## Kill watch (from DECISION)

- Cannot beat Cursor+Stripe docs in 60s demo  
- 45d post-launch: &lt;3 sales AND refunds &gt;25%  
- Hookdeck/Stripe/Polar ships equivalent owned-code outbox starter free  
- Support &gt;2h/wk day 60  
- Buyers demand hosted gateway → **stop**; do not pivot to services on Polar  

*Stripe merged at f25f235. Polar merged at 09c4f88 (PR #3). Next = replay CLI design ([`DESIGN_REPLAY_CLI.md`](./DESIGN_REPLAY_CLI.md)). Implement halted. Soft-WTP OFF. No Polar listing.*
