# HookSteel — Buyer / Operator Needs Beyond Minimum-Support

**Filename:** `BUYER_NEEDS_BEYOND_CHECKLIST.md` (kit buyers; dual title = Buyer / Operator)  
**Audience:** buyer of the **$89–129 Polar zip / private GitHub** (indie SaaS founder / integrator / ops) — not founder income rails  
**Baseline treated as covered:** `docs/MINIMUM_SUPPORT_CHECKLIST.md` (v3) in this repository  
**Method:** three sequential adversarial expert iterations *after* treating the minimum-support checklist as covered; each adds concrete buyer-owned needs, kills fluff.  
**Naming:** BUYER_NEEDS (buyer of the kit). Operator needs = how that buyer runs outbox/replay in *their* prod (keel-inspired depth; Polar digital-kit shape from credit-ledger).  
**Date:** 2026-09-26 ET — design-only; no code/git/outreach/PRs. Soft-WTP OFF. No Lock/Audit/services. Polar dark until ready (yellowgram concern — not a buyer deliverable).

---

## (1) Final Buyer / Operator Needs inventory

Treat checklist items (offline fixtures, Postgres chaos CI, demo flags off, livemode/sig gates, webhook HTTP contract, event-id uniqueness, same-txn outbox, `BUYER_START_HERE`, troubleshooting, Hookdeck honesty, known limits, Issue templates, semver zip+checksum, 60-day support boundary, worker docs, dead_letter/replay runbooks, etc.) as **already shipping or required of the product**. Below is what a **buyer** must still bring, decide, own, or do that the checklist does not fully specify.

### Before purchase / unzip

1. **Correct product mental model** — This is a **cloneable reliability module** on *your* Stripe and/or Polar + *your* Postgres. It is **not** hosted SaaS, not Hookdeck, not a yellowgram-operated gateway, not Credit Ledger, not Lock/Audit. Buyer must accept: you own outbox worker uptime, adapter correctness, and dead_letter triage forever.
2. **Hard-gate fit check** — Confirm your pain is **duplicate / out-of-order webhooks or side effects after rolled-back DB txns**. If you only need hosted ingress/routing/observability, **read Hookdeck honesty and walk away** — do not buy to get a managed dashboard.
3. **Hookdeck vs HookSteel decision (buyer must actually choose)** — Checklist ships the honesty text; purchase discipline does not. Use Hookdeck, HookSteel, or both (Hookdeck in front, kit inside) — decide before wiring live secrets.
4. **Provider account readiness** — Buyer owns a Stripe and/or Polar account that can run **test-mode webhooks** today; live when graduating. Founder’s Polar org (Suthirth solutions) and India rail status are irrelevant to the buyer’s accounts.
5. **Runtime prerequisites owned by the buyer** — Node 20+ (per `engines`), npm/pnpm, Postgres (ship path). Checklist pins engines/CI; **buyer provisions the host and DB**.
6. **Auth / identity plan for adapters** — Grant credit, send email, invite GitHub need *your* user ids, API tokens, and admin auth. Kit stubs have **no** identity product. Planning to hardcode a single demo user in production is a buyer failure mode.
7. **Fulfillment economics / side-effect inventory** — List every side effect that must be exactly-once per billing event (credits, license email, GitHub org invite, Slack notify…). Kit does not discover hidden dual paths for you.
8. **Org / license fit** — Public license is PolyForm Noncommercial 1.0.0 (source-available; not OSI open source; not MIT). Paid commercial production use is the Suthirth Commercial Grant: one organization, the purchased named tag, one production application, and one production Stripe account. No resale as competing boilerplate. A second production application is outside the grant. If intent is to republish a starter, **do not buy**.
9. **Support expectations calibrated** — 60 days GitHub Issues, best-effort, no SLA, ≤~2 h/week founder attention, repro required. Buyer who needs a call / Slack / implementation partner must obtain that elsewhere (not on this Polar SKU).
10. **Pin target decision** — Keep the Polar zip / tag `v0.1.0` (and checksum when published) as the team’s pin. Floating “whatever email attachment” is a buyer failure mode.
11. **Refund window awareness** — Kit purchase refund window is **30 days** (founder lock 2026-09-26). That is **not** the same as the replay CLI or a provider `order.refunded` webhook. `order.refunded` does not claw back credit. Decide purchase with the chaos demo / fixtures in mind.

### Unzip, prove, graduate off stubs

12. **Reproduce offline suite and archive proof** — `npm install → npm test` (fixtures); keep output + semver/checksum as the team baseline. Checklist supplies green CI; **buyer stores proof** for later “our fork vs upstream” triage.
13. **Confirm all 5 chaos scenario names locally (or via CI logs)** — duplicate, out-of-order, signature fail, handler timeout, DB rollback mid-fulfillment. If any are skipped in your fork, you no longer have the product you bought.
14. **Optional provider test-mode graduation (buyer-owned)** — Stripe CLI and/or Polar test webhooks with *their* secrets after fixtures go green. Checklist documents; **buyer runs it on their keys**.
15. **Verify known limits against *their* policy tolerance** — Exactly 5 chaos (no fuzz); no global cross-provider total order; no hosted gateway; adapters are stubs. If unacceptable, walk to Hookdeck or build in-house — do not open “make it Hookdeck” Issues.
16. **Replace adapter stubs (or delete demo adapters)** — Wire real `grant_credit` / `send_email` / `invite_github` (or your own names) with idempotency keys. Checklist warns; **buyer must execute**.
17. **Postgres for anything shipped** — `DATABASE_URL`, migrate `billing_events` / `outbox` / `dead_letters`, prefer over any solo demo DB. Buyer owns Neon/Supabase/Docker ops and TLS when required.

### Configure money / webhook path

18. **Env contract filled with *buyer* secrets** — Stripe and/or Polar secrets + webhook signing secrets (CLI vs Dashboard endpoint — correct one per environment), app URL, worker identity, demo flags **false** in any deploy.
19. **Livemode discipline** — Never point live webhooks at a test DB (or reverse). Checklist gates; **buyer owns key hygiene**.
20. **Webhook endpoint registration in provider Dashboards** — Stripe/Polar URL, events subscribed, signing secret rotated into env. Kit does not click Dashboards for you.
21. **Which events enqueue which adapters** — Map `checkout.session.completed` / Polar order events / etc. to adapter names in *your* config. Wrong map → silent no-ops or wrong side effects.
22. **Idempotency key strategy** — Derive stable keys from `(provider, provider_event_id, adapter)` (or documented equivalent). Buyer must not randomize keys on retry.
23. **HTTP status contract internalized by the team** — 400 vs 500 vs 200-duplicate is operational knowledge, not only README trivia. On-call must not “fix” statuses without reading the contract.

### Integrate adapters & application surface

24. **Call shape: webhook → insert event+outbox (one txn) → commit → worker → adapter** — Implement in *their* server paths. Never grant/email/invite inside the pre-commit webhook handler “just this once.”
25. **Kill dual fulfillment paths** — Inventory every place that can grant credits, send license mail, or invite to GitHub; all must go through outbox adapters (or an explicitly documented exception). A second “just call Resend in the route” path nullifies the kit.
26. **Timeout / partial-failure UX** — Provider retries and worker delays mean UX must not claim “invite sent!” solely from webhook 200. Buyer owns product copy.
27. **Staging vs live split** — Separate provider apps/accounts or clearly separated test/live keys + DBs. Do not flip one `.env` under load without a written checklist.
28. **Hookdeck coexistence (if any)** — If using Hookdeck in front: still keep unique event id + outbox inside the app; do not assume Hookdeck dedupe replaces transactional outbox.

### Operate & upgrade (buyer as operator)

29. **Outbox worker process supervision** — Run the worker (or cron drain) in production; alert if heartbeat dies. Checklist documents; **buyer runs the babysitter**. Events can ACK while fulfillment stalls — that is on the buyer.
30. **Dead_letter triage ownership** — Assign a human who inspects `dead_letters`, fixes adapters, and replays. Yellowgram is not that on-call.
31. **Replay CLI discipline** — Dry-run first; one operator; respect idempotency; never replay signature-failed payloads that never entered `billing_events`.
32. **Outbox depth / dead_letter metrics in *their* ops** — Kit may not ship Grafana; buyer wires counts to whatever they use. Investigate depth growth before customers notice missing invites.
33. **Deploy topology** — Multiple app instances OK on Postgres with row locks/leases; do not multi-mount a single-file demo DB across servers; one logical worker lease story.
34. **Upgrade discipline** — Read changelog break notes before replacing the tree with a newer zip/tag (if any). Re-run tests + staging webhook replay. Purchase has **no Soft-WTP perpetual free rewrite entitlement**.
35. **Secret rotation & leak response** — Rotate provider secrets, webhook secrets, DB URLs; never paste into Issues. If a secret hits chat/git, buyer owns provider rollback — founder will close the Issue.
36. **On-call ownership split** — Who gets paged for webhook 500 storms, worker down, dead_letter spikes, Stripe/Polar outage, adapter third-party outage (Resend, GitHub). SUPPORT.md boundary means yellowgram is not that on-call.

### When things break

37. **Local repro pack before any Issue** — Semver/checksum, Node/OS, DB engine, failing **chaos test name** or provider **test-mode** event id, redacted env booleans. Matches templates; **buyer must produce it**.
38. **First-line triage tree owned by buyer** — (1) Demo/chaos flags on? (2) Wrong whsec (CLI vs Dashboard)? (3) Side effect still inside request txn? (4) Livemode mismatch → 400? (5) Worker running? (6) Dead letters accumulating? (7) Dual fulfillment path? (8) Adapter non-idempotent? Checklist lists modes; buyer needs them in *their* ops wiki.
39. **Classify incidents correctly** — Duplicate delivery absorbed by unique id, timeout then single replay, documented out-of-order policy — are **expected** within design when adapters are idempotent, not “kit double-charged.” True double side effect after green chaos usually means a dual path or broken idempotency key — buyer bug class.
40. **Rollback plan** — Known-good zip/tag + DB backup/migrate strategy; ability to halt adapters independently of accepting webhooks (feature flag).
41. **Escalation clock** — Inside 60 days + repro → Issue. Outside window / needs implementation / wants Lock-Audit / wants hosted gateway → elsewhere. Do not discover the boundary during an outage.

### Explicitly NOT provided by the kit (buyer must obtain elsewhere)

42. **Hosted SaaS webhook gateway, multi-tenant yellowgram ingress, or managed Hookdeck alternative** — Self-host the kit or use Hookdeck.
43. **Auth / identity / customer portal product** — Bring your own; stubs are not login.
44. **Real grant-credit / email / GitHub invite implementations** — Stubs only; buyer supplies tokens and business logic.
45. **Unbounded chaos fuzzing, global total-order bus, exactly-once across arbitrary external APIs without idempotency** — Documented absences; implement yourself if required.
46. **Polar SDK forced into Stripe-only apps** — Not a core dependency; Polar sold you the zip only.
47. **Lock, Audit, implementation services, or Soft-WTP sales motion** — Not on this Polar product.
48. **Live chat, calls, SLA, or support after 60 days** — Best-effort Issues only inside the window.
49. **Legal/compliance sign-off that “outbox = billing correctness forever”** — No warranty; buyer owns production correctness.
50. **India GST invoicing for *your* end customers, or founder’s payout/KYC** — Buyer’s tax and provider account problems. Global English ICP only.
51. **Credit Ledger / real-time credit hard-gate product** — Separate yellowgram kit if/when ready; not included.
52. **A second production application on this purchase** — Outside the Suthirth Commercial Grant. One SKU. Do not assume the grant covers unlimited products.
53. **Founder as free integration engineer or 24/7 on-call for your outbox** — Out of charter.
54. **Polar Checkout early / waitlist Soft-WTP** — Yellowgram keeps Polar dark until ready; not a buyer-facing deliverable to chase.

---

## (2) Delta log per iteration

### Iteration 1 — Expert A (first-time indie Stripe/Polar founder buying the zip)

**Thesis:** Checklist makes the *kit* stranger-reproducible; a first-time buyer still fails on mental model (Hookdeck vs owned outbox), provider account readiness, adapter identity, dual fulfillment paths, and “I thought webhook 200 meant the email sent.”

| Added (concrete) | Why checklist alone is insufficient |
| --- | --- |
| Mental model: owned module, not Hookdeck / not hosted | Docs exist; buyer must *internalize* before paying or wiring live keys |
| Hookdeck vs kit as *buyer decision* | Honesty text ships; purchase discipline does not |
| Stripe and/or Polar account + Postgres host provisioning | Engines in package.json ≠ laptop/server ready |
| Auth / tokens for adapters pre-wiring | Stubs have no identity product |
| Side-effect inventory before integrate | Hidden dual paths nullify uniqueness |
| License / support / refund-window calibration | Listing states terms; buyer must accept no SLA, PolyForm Noncommercial for the public tree, and the Suthirth Commercial Grant for paid production use |
| Archive fixtures proof + run optional live test themselves | Happy path is product-owned; proof retention is buyer-owned |
| Replace stubs as required graduation | START_HERE warns; execution is buyer work |
| Env fill with *their* secrets; CLI vs Dashboard whsec | `.env.example` is a template, not their production |
| Worker supervision + dead_letter owner named | Scripts documented; process babysitting is buyer ops |

**Killed as fluff:** “read the README carefully,” “be careful with webhooks,” “monitor everything” without naming which signal (worker heartbeat, outbox depth, dead_letter count).

### Iteration 2 — Expert B (security / money-path conscious integrator) attacks/expands A

**Thesis:** A’s list gets a solo founder to green fixtures, but under-specifies blast radius: livemode hygiene, Dashboard event subscription, idempotency key design, HTTP status team training, Hookdeck-in-front coexistence, secret leak response, and correct incident taxonomy inside documented limits.

| Change | Rationale |
| --- | --- |
| **Add** livemode discipline + staging/live split | Cross-mode webhooks corrupt event stores |
| **Add** Dashboard webhook registration as buyer-owned | Kit cannot click Stripe/Polar Dashboard for them |
| **Add** event→adapter map as owned config | Wrong map = silent miss or wrong side effect |
| **Add** idempotency key strategy (stable, not random) | Retry storms without keys = double side effect |
| **Add** inventory of all fulfillment paths (kill dual path) | One ungated Resend call nullifies the product |
| **Add** webhook 200 ≠ UX “done” team training | Classic “invite missing” false bug |
| **Add** Hookdeck coexistence rule (dedupe ≠ outbox) | Prevents false safety when using both |
| **Add** known-limits tolerance check before demanding fuzz/hosted | Stops “add fuzzing / host this for free” Issues |
| **Add** secret rotation / never-paste-in-Issues rule | Support template exists; buyer culture must match |
| **Add** money/fulfillment-incident classification within design | Prevents false “kit double-charged” postmortems |
| **Expand** NOT-provided: hosted gateway, real adapters, Credit Ledger, Multi-app, warranty, Polar-SDK-forced | Stops shopping-list Issues |
| **Kill** vague “secure the server”; replace with key hygiene + no pre-commit side effects + idempotent adapters | Actionable only |

### Iteration 3 — Expert C (ops / production SaaS operator) → final inventory

**Thesis:** B hardened money-path security; production operators still need worker liveness alerting, dead_letter RACI, outbox depth metrics, deploy topology, upgrade entitlement clarity, on-call split across provider/adapter/worker, rollback, and a pre-chosen escalation clock — or the $89–129 kit becomes an unpaid pager for yellowgram (keel-style operator depth on a Polar digital good).

| Change | Rationale |
| --- | --- |
| **Add** worker liveness alerting | Dead worker = silent fulfillment black holes after 200 ACK |
| **Add** dead_letter RACI + replay discipline | Triage without a named human = pile-up |
| **Add** outbox depth / dead_letter metrics in *their* ops | Docs ≠ production drift detection |
| **Add** Postgres multi-instance vs demo-DB topology choice | First horizontal scale recreates lock/lease tickets |
| **Add** upgrade discipline + no Soft-WTP perpetual rewrite | One-shot zip economics + optional patch window |
| **Add** on-call ownership split (webhook vs worker vs adapter vendor vs Stripe/Polar) | Founder is not their pager |
| **Add** rollback + independent adapter kill switch | Webhook fix ≠ stopping a runaway invite storm |
| **Add** escalation clock (60-day + repro vs paid-elsewhere / Hookdeck) | Outage is wrong time to read Polar FAQ |
| **Add** refund vs replay glossary internalization | Prevents support misroutes |
| **Harden** Integrate section into mandatory outbox state machine in *their* code | Watching fixtures ≠ shipping reliability |
| **Note** Polar-dark-until-ready as yellowgram gate, not buyer blocker | Honest; Soft-WTP stays off |
| **Kill** Soft-WTP / Lock / Audit / founder income items | Out of charter for buyer-needs |
| **Kill** “nice webhook analytics warehouse”; keep depth + dead_letter + heartbeat | Minimum that unblocks production |

---

## (3) Map — already in checklist vs new beyond-checklist

| Buyer need (short) | In checklist v3? | Beyond (buyer must…) |
| --- | --- | --- |
| Offline fixtures + Postgres chaos + optional live CLI | **Yes** §A/§D | Archive proof; run on *their* machine/keys |
| Demo/chaos off; livemode; HTTP contract; unique event id; same-txn outbox | **Yes** §B | Never deploy injectors; no pre-commit side effects |
| `BUYER_START_HERE` / troubleshooting / Hookdeck honesty / known limits | **Yes** §C | Internalize fit; execute walk-away or graduate stubs |
| Issue template + 60-day boundary | **Yes** §C/§F | Produce repro; accept no SLA |
| Semver zip + checksum + changelog | **Yes** §E | Pin in *their* records; no float |
| Worker + dead_letter + replay runbooks | **Yes** §G | Run worker; triage; alert; own on-call |
| Product mental model & Hookdeck decision | Partial in README | **New** — mandatory pre-purchase acceptance |
| Adapter auth / tokens / identity | Warned | **New** — buyer design |
| Side-effect inventory / dual-path kill | Implicit | **New** |
| Event→adapter map | Schema only | **New** — buyer config |
| Staging/live split + deploy topology | Mentioned | **New** — buyer ops |
| On-call / rollback / escalation clock | Support boundary only | **New** |
| Warranty / hosted gateway / Lock-Audit / Credit Ledger / Multi-app | Non-goals | **New** — explicit NOT provided |

---

## (4) Top 10 beyond-checklist items

Ranked by **“buyer cannot succeed without this”** (success = exactly-once side effects in *their* app on *their* Stripe/Polar, worker alive, triage without the founder).

| Rank | Need | Why blocking |
| --- | --- | --- |
| 1 | **Webhook → same-txn event+outbox → commit → worker → idempotent adapter; kill dual paths** | Pre-commit side effects or second Resend call = product failure |
| 2 | **Replace stubs; own adapter auth/tokens** | Stubs-as-prod or missing tokens = silent/no fulfillment |
| 3 | **Hookdeck vs HookSteel (vs both) decision before and after purchase** | Wrong product fit → refund/support bleed |
| 4 | **Stripe/Polar test→live webhook + livemode discipline on *their* accounts** | No Dashboard endpoint / cross-mode = miss or corrupt store |
| 5 | **Run outbox worker in production + alert if it dies** | 200 ACK with dead worker = invisible stalls |
| 6 | **Dead_letter RACI + replay dry-run discipline** | Pile-up without owner; unsafe replay doubles effects |
| 7 | **Postgres for shipped multi-process; honest demo-DB limits** | First scale event recreates lease/lock tickets |
| 8 | **Stable idempotency keys + event→adapter map** | Random keys / wrong map = doubles or misses |
| 9 | **On-call split + rollback + adapter kill switch** | Founder is not pager; outages need buyer halt |
| 10 | **Repro pack + first-line triage before Issues; calibrated 60-day/no-SLA expectations** | Without this, every confusion becomes founder hours |

---

## Appendix — How to use this doc

- **Founders / checklist owners:** Do not duplicate these as more product slogans; some may inspire docs (e.g. stub graduation inside `BUYER_START_HERE`), but ownership stays with the buyer. Closing product gaps later = **3 design + 3 code-review**.
- **Buyers / integrators / operators:** Walk **Before purchase → Unzip/prove → Configure → Integrate → Operate**; treat **NOT provided** as hard stops.
- **Out of charter:** Soft-WTP, Lock/Audit SKUs, hosted gateway pivot, founder payout/KYC, invented revenue — intentionally excluded.

*Last updated: 2026-09-26 ET — design-only; no code/git/outreach/PRs in this pass.*
