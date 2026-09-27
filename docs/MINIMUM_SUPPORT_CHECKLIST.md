# HookSteel — Minimum-Support Product Checklist (v3)

**Owner:** yellowgram (founder)  
**Scope:** Checklist design only (what must exist so a Polar auto-delivered $89–129 digital kit stays low-touch). No Soft-WTP. No Lock/Audit SKUs. No hosted gateway. No invented live keys or revenue.  
**Product:** HookSteel — Billing Event Reliability Kit — Postgres `billing_events` + outbox + dead_letters; Stripe + Polar signed handlers; transactional outbox worker; exactly 5 chaos scenarios; replay CLI; adapter stubs; Hookdeck honesty. Buyer’s Stripe/Polar + DB. Not hosted SaaS. Not Hookdeck.  
**Income path:** One Polar SKU. Public license from 0.1.1 is PolyForm Noncommercial 1.0.0 (source-available; not OSI open source; not MIT). Paid commercial use is the Suthirth Commercial Grant. Private repo `yellowgram/hooksteel`. Sealed Release **v0.1.0** stays `hooksteel-0.1.0.zip`. Polar org **Suthirth solutions**. Live Polar stays on 0.1.0 until CoS republish after the license fence is on `main`. Do not unlist.  
**Goal:** Keep founder support near zero (≤2 h/week, 60-day Issues, no SLA) by making strangers self-serve before they open an Issue.  
**Standing note:** This checklist was written as design-only. The kit now lives in this repository. Do not change verify, handle, drain, migrations, adapters, `LICENSE`, or `src/outbox/replay.ts` from a checklist pass. Later product code still goes through **3 design + 3 code-review** passes.  
**Models mirrored:** credit-ledger MINIMUM_SUPPORT (primary Polar digital-kit shape); keel MINIMUM_OPS (ops/supervision depth for worker + dead_letter triage).

---

## (1) Final checklist v3

### A. One stranger-reproducible happy path

1. **Offline proof (≤10 min, no live Stripe/Polar network, no live keys)** — From the unzipped `v0.1.0` tree: `npm install → npm test` (or documented equivalent) green against **fixtures** that exercise Stripe + Polar signature verification paths with canned payloads/secrets. Document exact commands. Strangers must prove “same event 4× → one side effect” without booking the founder.
2. **Postgres CI path documented beside offline** — Same suite (or the 5 chaos scenarios) also runs on Postgres in CI. README states: offline fast path proves logic; Postgres CI is the ship gate. Be honest if offline uses an embedded/test DB — do not claim SQLite file = production HA for the outbox worker.
3. **60s demo script in-repo** — One clip, not two provider demos. Script: `docs/DEMO_60S.md`. Command: `npm run demo:60s` (existing chaos files `01-duplicate-delivery` and `05-db-rollback-mid-fulfillment` only; do not add a sixth chaos file). Same event four times → one side effect, rollback mid-fulfillment, Stripe and Polar in that same clip. Kill criterion: if that clip cannot beat the Stripe docs and the Hookdeck homepage, do not list. A Stripe-only or Polar-only recording is not the gate.
4. **Optional live CLI paths (documented, not required for first 10 min)** — Stripe CLI `listen` + Polar test webhook docs for buyers who want real provider round-trips after fixtures go green. Card/`sk_test_` only; never require live mode for support eligibility.
5. **Adapter stub graduation note in the happy path** — One short “you are done with stubs when…”: replace `grant_credit` / `send_email` / `invite_github` stubs with *your* implementations; keep idempotency keys; leave demo/no-op adapters out of production deploys.

### B. Defaults & env that do not brick billing

6. **Demo / chaos flags default off; production forces off** — Any `ALLOW_DEMO_*`, chaos injectors, or “fail this handler” switches stay closed unless explicitly enabled in non-production. Shipping with injectors on is a support+liability class bug.
7. **Livemode / signature gates** — Test secrets expect test events; live secrets expect live. Mismatch → HTTP **400**, event id **not** stored. Document optional explicit override only with a written reason. Prevents “live webhooks into test DB” silent corruption tickets.
8. **Webhook HTTP status contract frozen in docs** — Signature fail / missing-or-placeholder secret / livemode mismatch → **400**. DB down, unexpected handler error, outbox insert failure → **500** (provider retries). Duplicate already-persisted event → **200** (idempotent ACK). Mapping everything to 400 buries retries; mapping everything to 500 causes infinite retry storms on poison — document both.
9. **Provider event-id uniqueness enforced in schema + tests** — `(provider, provider_event_id)` unique. Concurrent duplicate inserts must not double-enqueue outbox side effects. This is the product core; undocumented uniqueness is a non-product.
10. **Outbox written in the same DB transaction as `billing_events` insert** — Documented invariant. Side effects **never** run inside the webhook request before commit. Rollback mid-fulfillment is a first-class chaos scenario (#5), not a footnote.
11. **No Polar SDK required in buyer app core** — Stripe path works without Polar client libraries. Polar path uses signed webhook verification per Polar docs / thin verify helper — not “install Polar SDK to process Stripe.” Listing and README repeat this.
12. **Webhook URL / origin hygiene** — Document that buyers register Dashboard endpoints themselves; kit does not invent open-redirect “fix Host header” patterns for fulfillment callbacks. Adapter stubs that call external APIs must take explicit base URLs from env.

### C. Docs that replace the founder

13. **`BUYER_START_HERE.md` as the Polar zip front door** — Unzip → install → migrate → offline test → 5 chaos names → Hookdeck walk-away link → support boundary in ≤1 screen. Stub front doors are not enough.
14. **README troubleshooting = real top failures** — Maintain a short runbook for: (1) CLI `whsec_` vs Dashboard webhook secret mix-up (Stripe), (2) Polar signature secret env mix-up, (3) duplicate events still double-firing because side effect ran *before* commit / outside outbox, (4) demo/chaos flags still on in deploy, (5) 400-for-everything so provider stopped retrying, (6) outbox worker not running, (7) dead_letter pile ignored, (8) replay without idempotency key. Kill invented folklore.
15. **Hookdeck honesty section stays prominent** — Same outline as MVP_SCOPE (ingress vs in-app outbox). Polar listing links it. Deflects “make this hosted” Issues into a product decision, not a free feature build. Kill criterion if buyers demand hosted gateway → stop; do not pivot to services on Polar.
16. **Known limits block required (ship + listing)** — Exactly 5 chaos scenarios (no fuzz); public license PolyForm Noncommercial 1.0.0 plus the Suthirth Commercial Grant (one organization, the purchased named tag, one production application, one production Stripe account); no hosted gateway; side effects are buyer-owned adapters; ordering policy for out-of-order is documented as “unique-id + outbox,” not global total order across providers; 12mo patches (when stated) ≠ perpetual rewrite. Listing must not contradict README. Not OSI open source. Not MIT.
17. **Issue template that forces repro** — Require: kit semver / zip checksum or tag `v0.1.0`, Node version, OS, DB engine, failing **test name** (prefer chaos scenario name) or provider **test-mode** event id, redacted env **booleans only** (no secrets). Missing repro → auto comment + close after N days. No live secrets pasted — template states this.
18. **Purchase refund vs provider “replay” glossary** — Kit purchase refund window is **30 days** (founder lock 2026-09-26). CoS sets the Polar refund toggle to 30 days before the listing goes light. Listing stays dark. “Replay” = CLI re-drive of billing events / dead letters — not a money refund. Two different words; one support fire if conflated. `order.refunded` stays ignored and does not claw back credit.
19. **Private-repo Issues access path documented for CoS** — Buyers need a written way onto Issues for 60 days (Polar GitHub benefit auto-invite, collaborator invite, or handoff). Without this, “support” is a Polar chat that is not in the product boundary. Repo: `yellowgram/hooksteel`.

### D. Tests / CI that keep strangers off your calendar

20. **Exactly 5 chaos scenarios green on Postgres CI (ready gate)** — duplicate delivery; out-of-order; signature fail; handler timeout; DB rollback mid-fulfillment. No required job that hits live Stripe/Polar network.
21. **Offline fast path (fixtures) on every push** — Signature + uniqueness + outbox enqueue tests without network. Be honest in README if offline DB ≠ Postgres; Postgres job remains the ready-gate proof.
22. **Node engine pin + lockfile** — `engines.node` ≥20 (or documented LTS); lockfile committed; Actions matrix at least current LTS. “Works on my Node” is classic digital-goods bleed.
23. **Idempotent adapter contract covered by tests** — Stub adapters + at least one test proving replay / duplicate outbox drain does not double-call external effect when idempotency key matches.

### E. Versioned release strangers can pin

24. **Semver tag + Polar zip name match** — GitHub Release `v0.1.0` asset e.g. `hooksteel-0.1.0.zip`. Polar auto-delivers that asset. README / `BUYER_START_HERE` / `package.json` version agree.
25. **Checksum published next to the zip** — SHA-256 of the Release asset in Release notes and/or `docs/`. Strangers verify download integrity without asking CoS “is this the real file?”
26. **Changelog with upgrade/break notes** — Env renames, webhook status meaning changes, outbox schema migrations, chaos scenario set changes, adapter interface breaks, demo-flag behavior. v0.1.0 purchase = source at buy time; patch window per commercial terms; Soft-WTP stays off (no “email us for free forever upgrades” motion).
27. **Zip contents contract (documented)** — No `node_modules`, no `.env` / `.env.local`, no DB dump files, no `.git`. Includes `.env.example`. Polar listing “How delivery works” stays accurate.

### F. Support & money boundary (thin free, no fake SLA)

28. **SUPPORT boundary written once and linked everywhere** — GitHub Issues **60 days from purchase**; best-effort; **no SLA**; ~≤2 h/week; require failing test name or test-mode event id; no live secrets. Paste the same text in README, Polar listing, Issue template, and `BUYER_START_HERE`.
29. **Out-of-scope auto-reply ready** — Hosted gateway / yellowgram-operated ingress; Hookdeck feature parity as a service; Lock/Audit; Soft-WTP outreach; implementation services; “debug my production live keys”; India-local ICP customization; adding unbounded chaos/fuzz as free work; Credit Ledger product conflation. Template closes these without founder improvisation.
30. **No Lock / Audit / Soft-WTP / services doors on Polar** — Listing and docs state: this product is the download + private GitHub access only. Do not advertise services that are not sold. Polar AUP: human services not primary offering.
31. **License one-liner visible** — Public license is PolyForm Noncommercial 1.0.0 (`LICENSE`; source-available; not OSI open source; not MIT). Paid commercial production use is the Suthirth Commercial Grant (`docs/COMMERCIAL_GRANT.md`): one organization, the purchased named tag, perpetual for that tag; one production application and one production Stripe account (test and live of that same account count as one). No resale as competing boilerplate. No warranty for billing correctness in buyer prod. One SKU. A second production application is outside the grant.
32. **Purchase refund policy aligned with Polar toggle** — **Founder lock 2026-09-26: 30 days.** README, `BUYER_START_HERE`, `docs/REFUND_GLOSSARY.md`, and `docs/POLAR_DELIVERABLES.md` state 30 days. CoS sets the Polar refund toggle to 30 days before the listing goes light. Do not publish to set it. Do not leave a rail default that is not 30 days. Listing stays dark.

### G. Ops: outbox worker supervision, dead_letter triage, replay runbook

33. **Outbox worker supervision documented as production babysitting** — How to run the worker (process / cron drain), lease/lock semantics, what “worker down” looks like (events accepted, side effects stall). Demo boot may drain once; production must keep the worker alive. README failure-mode table links “fulfillment never arrived” → check worker.
34. **Dead_letter triage runbook** — When rows land in `dead_letters`: inspect reason (timeout / adapter_error / poison / max_attempts); fix adapter or payload; replay via CLI with idempotency; do not delete silently. Poison signature failures that never entered `billing_events` are **not** replay candidates.
35. **Replay CLI runbook** — Dry-run → execute → verify one side effect; document concurrency (do not run two replays of same id); document that replay is operator-owned and yellowgram is not on-call for buyer dead_letter queues.
36. **Observability minimum for thin support** — Document fields buyers should log/metric: webhook HTTP status counts, outbox depth, dead_letter count, worker heartbeat. Kit need not ship a hosted dashboard; buyers own Grafana/etc. Prevents “is it working?” founder Slack.

---

## (2) Delta log (v0 → v1 → v2 → v3)

### Iteration 1 — Adversarial expert A (billing / webhook money-path + support-load) → v1

**Attack thesis:** A “clone the Stripe recipe” checklist that ignores webhook status codes, livemode gates, side-effects-before-commit, and provider event-id uniqueness will generate double-grant / double-email emergencies that blow the ≤2 h/week cap — money-path bugs feel like founder pages even when they are buyer misconfig.

| Change | Rationale |
| --- | --- |
| Add livemode + signature gates; freeze 400 vs 500 vs 200-duplicate contract | Prevents silent corruption and buried / infinite provider retries |
| Add same-txn outbox + side-effect-after-commit as required invariant | Rollback-after-fulfillment is the product’s reason to exist |
| Add provider event-id uniqueness + concurrent duplicate tests | Core differentiation; without it HookSteel is a blog post |
| Add demo/chaos flags default-off + production force-off | Injector-on-in-prod is a billing-lie class incident |
| Add Hookdeck honesty as support deflector, not marketing fluff | Stops hosted-gateway feature-request flood (kill criterion #5) |
| Add dead_letter + replay as **required** ops, not footnotes | Stall-after-accept without triage = “kit ate my fulfillment” tickets |
| Add purchase-refund vs replay glossary | Polar “refund” confusion vs CLI replay |

### Iteration 2 — Adversarial expert B (OSS / digital-goods maintainer DX) → v2

**Attack thesis:** v1 hardens money/webhook semantics but still lets Polar delivery friction, private-repo Issues access, missing repro templates, Node drift, and “which zip is real?” become the founder’s day job — especially with a **private** empty repo that buyers cannot Issues into without an access path.

| Change | Rationale |
| --- | --- |
| Expand happy path: offline fixtures + Postgres CI honesty + optional live CLI | Two ramps so network-blocked buyers still self-serve |
| Require Issue template with chaos test name / test-mode event id | Boundary in README is fiction without triage mechanics |
| Require CoS private-repo Issues access path (`yellowgram/hooksteel`) | 60-day support on private repo without invite = Polar DMs forever |
| Semver + zip name + checksum + changelog break notes | Digital goods need pin + integrity |
| Node engines + lockfile + Postgres chaos job as ready gate | Offline-only green recreates concurrency tickets on first Neon deploy |
| Zip contents contract (no secrets / no `node_modules`) | Leaked `.env` in the download is fatal |
| Polar listing alignment: no Lock/Audit/Soft-WTP/services; Polar dark until ready | Listing lies become policy fights; early Polar violates DECISION |
| No Polar SDK as core buyer-app dependency | Prevents “why must I install Polar to do Stripe?” support |
| Kill perpetual-update Soft-WTP | Patch window yes; free forever founder labor no |

### Iteration 3 — Adversarial expert C (indie buyer / integrator) → v3

**Attack thesis:** v2 is maintainer-hygienic but buyers still burn founder hours when the zip front door is thin, Hookdeck walk-away is buried, stub graduation is unclear, and production babysitting (outbox worker, dead_letters, replay) is not an explicit “you own this” gate — keel-style ops depth applied to a Polar digital kit.

| Change | Rationale |
| --- | --- |
| Upgrade `BUYER_START_HERE` to ≤1-screen front door | Polar zip open → first 10 minutes without founder |
| Add adapter stub graduation into happy path | Stubs-as-product is the #1 false finish line |
| Elevate Hookdeck honesty + known limits into listing-linked requirements | Wrong-buyer purchase → refund/support regardless of demo quality |
| Add §G worker supervision + dead_letter triage + replay runbook + thin observability | Integrators assume webhook 200 = fulfillment done |
| Out-of-scope auto-reply pack (hosted, Lock/Audit, Soft-WTP, live-key debug, fuzz expansion) | Enforces support boundary under phone-first hours |
| Align Polar refund toggle with the purchase-refund window | **Founder lock 2026-09-26: 30 days.** See `docs/REFUND_GLOSSARY.md`. Do not copy a rail default over 30 days. |
| 60s demo script as checklist item tied to kill criterion | One Stripe+Polar clip. If it cannot beat the Stripe docs and the Hookdeck homepage, do not list. |
| Dual Stripe+Polar fixture paths called out in §A/§D | Single-provider kit fails DECISION differentiation |

**Killed / demoted**

- **Hosted Hookdeck-clone / yellowgram ingress** — Kill criterion #5; demoted permanently from checklist “ops.”
- **Soft-WTP / waitlist / Lock / Audit / implementation SKUs on Polar** — Standing fence; killed from money-boundary doors.
- **Unbounded chaos / fuzzing as v1 support requirement** — MVP = exactly 5; demoted to Later.
- **Polar SDK-in-app as install path** — Dangerous coupling; killed.
- **A second license SKU** — One Polar product. A second production application is outside the Suthirth Commercial Grant. Do not add another license product from this checklist.
- **Credit-ledger conflation** (“include reserve/finalize”) — Separate product; killed from HookSteel min-support.
- **India-ICP customization** — Global English only; killed.

**Ready-gate status** (the rows below used to say this work was not built; that is no longer true)

| Ready-gate item | Checklist coverage | Where it stands |
| --- | --- | --- |
| 5 chaos green on Postgres CI | §D.20 | On `main`. `.github/workflows/chaos-postgres.yml` runs migrate, `npm run demo:60s`, and `npm test` on Postgres 16. |
| Stripe + Polar paths + fixtures | §A.1, §B, §D.21 | On `main`. `handle` and `handlePolar`. No Polar SDK. |
| Outbox worker + replay CLI | §B.10, §G.33–35 | On `main`. `npm run outbox:drain`, `replay:list`, `replay:dry-run`, `replay:execute`. |
| 60s demo | §A.3 | Script is `docs/DEMO_60S.md`. `npm run demo:60s` runs chaos `01` and `05` only. The founder still has to film and approve the one clip. A recording is not in the repo. |
| Hookdeck honesty | §C.15 | `README.md`, `docs/LANDING.md`, and `docs/POLAR_DELIVERABLES.md`. |
| Commercial license | §F.31 | `LICENSE` is PolyForm Noncommercial 1.0.0. Paid use is `docs/COMMERCIAL_GRANT.md`. Not OSI. Not MIT. |
| Polar | §F + STATUS | Listing stays dark until the founder-approved clip and the distribution post. CoS do not list while the listing is dark, there is no founder-approved clip, and there is no distribution post. |

---

## (3) How to use this checklist

- **Before Polar goes live:** Walk §A–§G; anything missing is a kit doc/process gap or a CoS listing gap — fix design/docs first; implement code under **3+3**, do not invent Soft-WTP or hosted features.
- **Issue triage:** If the repro pack (§C.17) is missing, do not debug; paste the template reply.
- **Kill clock link:** Support >2 h/week with no update SKU → kill or productize updates. Buyers demand hosted gateway → **stop**. This checklist exists to keep you under those lines.
- **Later implement:** When code changes are needed to close gaps, run **3 design + 3 code-review** adversarial passes; do not treat this design checklist as a substitute for those.

---

## (4) Top risks if ignored

1. **Side effects inside webhook txn / before commit** — Double fulfillment after rollback; product differentiation collapses to a blog recipe.
2. **Webhook 400-for-everything or 500-for-poison** — Provider stops retrying *or* retry storms; founder debugs “missing” / “duplicate” fulfillment that is status-code design.
3. **No outbox worker in prod** — Events ACK’d, adapters never run; irreversible trust loss.
4. **Purchase refund language ≠ Polar toggle / ≠ replay CLI docs** — Chargebacks and angry Polar messages despite correct outbox.
5. **Private repo + no Issues access path** — “60-day support” unusable; all traffic hits founder DMs.
6. **Wrong buyer (needs hosted gateway) with no Hookdeck walk-away** — Feature-request flood; Soft-WTP temptation; kill-clock pressure.
7. **Unsigned / checksum-free zip handoff** — Integrity and “which version am I on?” tickets forever.
8. **Chaos set creeps past 5 / fuzzing “just one more”** — Ready gate never clears; Cursor race lost on calendar.

---

## Appendix — Quick map from thin seed → v3

| Seed theme | Fate in v3 |
| --- | --- |
| Offline fixtures + demo | Kept, expanded: fixtures, Postgres honesty, 60s demo, optional live CLI, stub graduation (§A) |
| Safe defaults | Kept, hardened: demo off, livemode/sig, HTTP contract, unique event id, same-txn outbox, no Polar SDK core, URL hygiene (§B) |
| Docs / troubleshooting | Kept: START_HERE, Hookdeck honesty, known limits, Issue template, refund/replay glossary, Issues access (§C) |
| CI | Kept: 5 chaos on Postgres, offline fast path, engines, idempotent adapter tests (§D) |
| Versioned zip | Kept: semver/zip match, checksum, changelog, zip omit contract (§E) |
| Support boundary | Kept: 60-day/no SLA/≤2h, out-of-scope pack, no Lock/Audit/Soft-WTP, license, refund toggle align (§F) |
| — | **New (keel-inspired):** worker supervision + dead_letter triage + replay runbook + thin observability (§G) |

*Last updated: 2026-09-26 ET — checklist text started as design-only. Kit code, five chaos files, replay CLI, and ready-gate docs are in this repository. Listing stays dark. Purchase-refund window 30 days.*
