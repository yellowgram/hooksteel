# HookSteel — CODE REVIEW ×3: Ready-gate PR #6

**Verdict after the fix passes: APPROVE.** The tables below are the review as first written. Every in-slice row was then fixed on this branch before the zip seal. Do not treat a "Defer" cell as open work.

**Purchase-refund window stays 30 days. Listing stays dark. Do not merge from this file. Do not list on Polar.**

The SHA-256 of `release/hooksteel-0.1.0.zip` is the table in `docs/CHECKSUMS.md` (that file is not inside the zip). `npm run pack:release` reprints that digest when the only later changes are `docs/CHECKSUMS.md` and `release/`.

Out of slice, unchanged on purpose:

- `src/outbox/replay.ts` dry-run `$1` labels (CR2-A-P2-002). Fixing them means editing that file.
- `LICENSE`. It still counts one production Stripe account and does not add a Polar-account axis (PQ2).

**Original verdict, superseded: APPROVE WITH P2 DEFER**

**PR:** https://github.com/yellowgram/hooksteel/pull/6  
**Branch:** `cursor/ready-gate-support-release-54a3` → `main`  
**First-review head:** `5f828483f36905ef6517a453c634f02223ac8236`  
**Base:** `main` @ `8dc6e10164818415f0c0f87d410eec813db94847` (Stripe + Polar + outbox + replay CLI)  
**Date:** 2026-09-26  
**CI at first review:** `chaos-postgres` **pass** on that head. Run: [36276399895](https://github.com/yellowgram/hooksteel/actions/runs/36276399895) (`# tests 54`, `# fail 0`). That run does not include the later `npm run demo:60s` step.  
**First-review zip (replaced when these fixes were sealed):** `61ef4c29e3222b28d1f6e1b377e973812fde69c42f73dee0aa51334a9b3ab09c`. That digest matched `docs/CHECKSUMS.md` only at the first-review head. The digest to ship is the table in `docs/CHECKSUMS.md` after the pack.  
**Polar listing:** not touched. This review does not list, publish, start KYC, or open Checkout.

No edits to verify, handle, drain, migrations, adapters, `LICENSE`, or `src/outbox/replay.ts`. No sixth chaos file.

This packet is inside the zip built from the commit that contains it. `docs/CHECKSUMS.md` and `release/` stay out of that zip.

---

## Merge recommendation

**Superseded by the verdict at the top: APPROVE.** The sentence below is the first-review recommendation, kept so the tables have their original context.

**First-review recommendation: APPROVE WITH P2 DEFER.** Do not merge from this review. Founder greenlights.

| Gate | Result |
| --- | --- |
| P0 ship-breaking false claim, broken zip, secret leak | None |
| P1 lock contradiction on the CoS runbook, wrong refund window, Soft-WTP, Stripe-only or Polar-only demo | None |
| P2 stale design residue, lede ambiguity, zip embarrassment if quoted | Defer. Listed below. |

---

## CR1 — Content and lock fidelity

**Lens:** Does the ready-gate copy match the founder lock (one dual-provider clip, distribution before Polar, 30-day purchase refund, Soft-WTP off, listing dark)?

**Attack thesis:** A docs pack can say "listing dark" in the CoS packet and still leave a second page that says list now, 14 days, Soft-WTP, or a Stripe-only demo.

### What holds

- `docs/DEMO_60S.md`, `docs/POLAR_DELIVERABLES.md`, `docs/LANDING.md`, and `docs/STATUS.md` all carry the same three locks: one continuous Stripe+Polar clip, kill if it cannot beat the Stripe docs and the Hookdeck homepage, and "CoS do not list while the listing is dark, there is no founder-approved clip, and there is no distribution post." `tests/unit/support-boundary.test.ts` asserts that sentence, the Hookdeck line, and `npm run demo:60s` on those four files. CI ok 50 is that test.
- `package.json` `demo:60s` is only `tests/chaos/01-duplicate-delivery.test.ts` and `tests/chaos/05-db-rollback-mid-fulfillment.test.ts`. Five chaos files remain. No sixth suite.
- Each of those two files runs Stripe, then Polar. The four narrated names match the `test()` titles exactly, including `4×`.
- Purchase-refund window is **30 days** on `README.md`, `BUYER_START_HERE.md`, `docs/REFUND_GLOSSARY.md`, `SUPPORT.md`, `docs/POLAR_DELIVERABLES.md`, `CHANGELOG.md`, and `docs/STATUS.md`. Those files do not say `14 days` or `14–30`. The unit test locks that. Support stays a separate 60-day Issues clock. Replay and `order.refunded` are named as not that refund.
- Soft-WTP is off on the listing draft, landing, changelog, status, and demo footer. No Lock, Audit, hosted gateway, or consulting bump. No "list now".
- Distribution order is clip → X / Show HN / builder chats ("we double-provisioned after a 500", Hookdeck honesty in the same breath) → Polar as cash register. Same order in the demo script, the Polar packet, landing, and status next-steps.

### Findings

| ID | Severity | File | Summary | Recommendation |
| --- | --- | --- | --- | --- |
| CR1-P2-001 | P2 | `docs/MINIMUM_SUPPORT_CHECKLIST.md` | §A.3 still says the demo must beat "ask Cursor + Stripe docs". It does not require one Stripe+Polar clip or the Hookdeck homepage. This PR edited the refund lines in the same file and left this kill sentence. The CoS runbook (the four files above) has the locked bar. | Defer. Not a merge blocker. Optional later: one sentence pointing §A.3 at `docs/DEMO_60S.md`. |
| CR1-P2-002 | P2 | `docs/DESIGN_POLAR_PATH.md`, `docs/DESIGN_REPLAY_CLI.md` | Design-time text still says the refund window is deferred and "14 vs 30" in the present tense (Polar path §3 non-goals; replay design non-goals). That was true for those slices. The ready-gate policy surfaces now lock 30 days. | Defer. Do not rewrite the design record. Optional later: a single "superseded 2026-09-26 by `docs/REFUND_GLOSSARY.md`" line. |
| CR1-P2-003 | P2 | `release/README.md` | Says the listing stays dark "until the founder says otherwise" and does not restate clip-then-post. The next line points at `docs/POLAR_DELIVERABLES.md`, which does. | Defer. |

---

## CR2 — Buyer-facing correctness and safety

**Lens:** Take the claims CR1 accepted and check them against the kit on this branch (main plus this pack). Overclaims, broken links, secrets in the zip, license drift.

**Attack thesis:** The listing can promise exactly-once side effects, a Polar SDK-free core, a 30-day refund, and a clean zip while the code, the license, or the archive says something else.

### What holds

- Chaos #1 (`tests/chaos/01-duplicate-delivery.test.ts`) matches the spoken track: four concurrent signed posts, HTTP 200, zero `adapter_invocations` before drain, two outbox rows, then one `stripe|evt_dup_1|grant_credit` and one `stripe|evt_dup_1|send_email`. Polar repeats that with `msg_polar_dup_1`. `idempotencyKey()` is `provider|provider_event_id|adapter`. Unique indexes: `(provider, provider_event_id)` and `outbox.idempotency_key`.
- Chaos #5 matches the spoken track: `grant_credit` invocation commits, drain throws before `completed_at`, second drain leaves the count at 1. Stripe fixture `evt_mid_1`, Polar `msg_polar_mid_1`. The test name is the crash, not a rollback of the grant. The demo narration says the invocation commits and the drain throws. That is the code.
- `order.refunded` is an empty entry on `DEFAULT_POLAR_ADAPTER_MAP`. No clawback adapter ships. Replay CLI (`scripts/replay-cli.ts`) lists, dry-runs, or executes one dead letter and tells the operator to drain. It does not call Polar and does not move money.
- No `@polar-sh/sdk`, `standardwebhooks`, or `svix` in `package-lock.json`. Polar verify stays `node:crypto`. The `stripe` dependency is the documented Stripe verify path.
- `LICENSE` is the Single-app grant the listing quotes: one production application and one production Stripe account. README says commercial, not MIT. Listing, landing, and changelog say the same. PQ2 left `LICENSE` unchanged; this pack does not edit it. A Polar account is not a counted axis because the license never added one. That is lock fidelity, not a new contradiction.
- Support boundary string and the out-of-scope sentence match across `SUPPORT.md`, the issue template, landing, and the Polar packet. All ten chaos `test()` titles are in `SUPPORT.md`. Template requires semver/tag/checksum, Node, OS, DB, a test-mode id, redacted booleans, and a no-secrets checkbox. `blank_issues_enabled` is false.
- Relative links in the ready-gate markdown resolve. Issue-template contact URL is `blob/main/SUPPORT.md`, which is correct once this pack is on `main`.
- Zip contract: 125 entries, prefix `hooksteel-0.1.0/`, comment `hooksteel-0.1.0`, exactly five chaos files, both `.env.example` files, `LICENSE`, migrations, no `node_modules`, no `.env` / `.env.local`, no `.git`, no `CHECKSUMS.md`, no nested zip, no dump. Secret scan: no `sk_live_`, no private key, no real `DATABASE_URL`. Fixture `whsec_` values are the chaos secrets. `docs/CODE_REVIEW_POLAR_PATH_PR3.md` repeats the public Standard Webhooks `TestWebhookSign` vector. That is not a yellowgram secret.

### Findings

| ID | Severity | File | Summary | Recommendation |
| --- | --- | --- | --- | --- |
| CR2-P2-001 | P2 | `README.md` | Lede says a Stripe side effect runs "once". Shipped proof is one row and one outbox key per adapter under duplicate delivery. The same README later documents lease overlap past `OUTBOX_LEASE_MS`, external APIs that are not idempotent just because the outbox key exists, and replay running the adapter again. Polar paste-ready copy scopes the promise to "four times → one side effect", which chaos #1 shows. | Defer. Do not treat the lede as a new exactly-once certification, and do not edit drain or replay to "fix" it. |
| CR2-P2-002 | P2 | `package.json` | `"description"` is Stripe-only ("Stripe signed webhooks…"). Pre-existing. It ships in the zip. Changelog and README body are Stripe and Polar. | Defer. |
| CR2-P2-003 | P2 | `docs/LANDING.md` | "Not a client library you must install in order to verify Stripe" can be read as "no Stripe SDK". The kit depends on `stripe` and forbids a Polar SDK. The same file correctly says there is no Polar SDK in the buyer app. | Defer. |
| CR2-P2-004 | P2 | `.github/ISSUE_TEMPLATE/bug_support.yml` | Template does not say purchase refunds are not Issues. `SUPPORT.md` and `docs/REFUND_GLOSSARY.md` do, including the 30-day window. | Defer. |
| CR2-P2-005 | P2 | `docs/LANDING.md` | Landing copy never states "30 days". It links the glossary. The refund unit test does not read this file. The Polar paste-ready listing does state 30 days. Not a wrong window. | Defer. |

---

## CR3 — Ship readiness and merge blockers

**Lens:** Would this artifact embarrass on Show HN, or push CoS to list or to ship a zip that is not the file they think it is?

**Attack thesis:** A green checksum file can still sit on a zip that does not rebuild, hides a secret, fails closed with exit 0, or teaches CoS to publish.

### What holds

- Committed `sha256sum release/hooksteel-0.1.0.zip` equals `docs/CHECKSUMS.md`. A from-scratch `git archive --mtime=2026-09-26T00:00:00Z` of this head, excluding `docs/CHECKSUMS.md` and `release/`, then setting the zip comment to `hooksteel-0.1.0`, matched that digest and every entry's CRC, size, date, and attributes. Git 2.43, Python 3.12, this VM.
- Commit `5f82848` changes only `docs/CHECKSUMS.md` and the zip. That is why a rebuild of this head matches. The pack script refuses a dirty tree outside those two paths.
- Changelog 0.1.0 matches the tree: Stripe `handle`, Polar `handlePolar` with two HMAC eras and no Polar SDK, `outbox:drain`, `replay:list` / `replay:dry-run` / `replay:execute`, five chaos files with Polar cases inside them, `invite_github` opt-in, `order.refunded` ignored, Soft-WTP off, listing dark, 30-day purchase refund, no prior release. Cited SHAs `f25f235`, `09c4f88`, and `c6a4012` are ancestors of this head. GitHub Release `v0.1.0` is not cut. The changelog says that.
- CI run 36276399895 on this head: migrate, typecheck, `npm test`, 54 tests, 0 fail. Includes the four demo tests (Stripe then Polar inside each file) and the three ready-gate unit tests. `tsx --test` on a throwaway failing test exited 1 (tsx 4.23.15 in this VM; the repo lockfile was not reinstalled here).
- Reporter order for the clip: stub files run with `tsx --test --test-concurrency=1` printed the four names as TAP `ok 1`…`ok 4` in the locked order. CI shows the real file 01 as `ok 1` then `ok 2` (Stripe duplicate, then Polar duplicate) and file 05 as `ok 9` then `ok 10` (Stripe crash, then Polar crash) inside the full suite. `01` sorts before `05`, so a path sort cannot swap the two files.
- This VM has no Postgres, so `npm run demo:60s` was not executed here. The two files it runs are part of the green CI `npm test`. `beforeEach` truncates `billing_events`, `outbox`, `dead_letters`, and `adapter_invocations`, so the Polar case does not see the Stripe rows.
- CoS packet still says: do not paste the draft into a visible product, do not start KYC or Checkout, set the refund toggle to 30 days on the unpublished product, do not publish in order to set it. Nothing in this review asks CoS to list.

### Findings

| ID | Severity | File | Summary | Recommendation |
| --- | --- | --- | --- | --- |
| CR3-P2-001 | P2 | `docs/MINIMUM_SUPPORT_CHECKLIST.md` | The "Remaining gaps" table still says chaos, CI, the demo, landing, and `LICENSE` are not built. That file is inside the zip. `docs/STATUS.md` and the tree say the opposite. The header says the checklist pass was design-only. A Show HN reader can quote the stale table. | Defer. Do not treat it as the listing. |
| CR3-P2-002 | P2 | `package.json`, `.github/workflows/chaos-postgres.yml` | `demo:60s` is not its own CI step. A break of the two-file invocation is only caught if `npm test` fails those files, or if the unit test's exact script string changes. Both are green on this head. | Defer. |
| CR3-P2-003 | P2 | `docs/README.md` | Still points agents at `/workspace/income/…` paths and says ready-gate docs "are in progress". Those paths are not buyer instructions. The sentence is stale relative to this pack and is inside the zip. | Defer. |

### Not a blocker

The first-review seal was `61ef4c29e3222b28d1f6e1b377e973812fde69c42f73dee0aa51334a9b3ab09c`. Doc fixes after that head required a new seal. The digest to ship is `docs/CHECKSUMS.md`.

---

## Explicit rejects

Not opened by this review.

- Merge
- Polar list, KYC, Checkout, or a cover image as a substitute for the clip
- Soft-WTP, Lock, Audit, hosted gateway, consulting
- A sixth chaos file, or a new demo suite
- Edits to verify, handle, drain, migrations, adapters, `LICENSE`, or `src/outbox/replay.ts`
- A Polar SDK dependency
- Leaving the pre-fix zip in place after these doc fixes (the seal was rebuilt so the zip matches the fixed tree)

---

## Passes

| Pass | Question | Result |
| --- | --- | --- |
| CR1 | Lock fidelity of the ready-gate docs | Operative quartet matches. Three P2 stale residues. |
| CR2 | Claims vs shipped kit, links, secrets, license | Demo and refund claims match the code and the zip. Five P2 wording nits. |
| CR3 | Seal, CI, exit codes, Show HN / early-list risk | Zip SHA verified and reproduced. No P0/P1. Three P2s. |
