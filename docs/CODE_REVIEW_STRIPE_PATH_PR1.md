# HookSteel — CODE REVIEW ×3: Stripe path PR #1

**PR:** https://github.com/yellowgram/hooksteel/pull/1  
**Branch:** `cursor/stripe-path-chaos-658e` → `main`  
**Contract:** [`DESIGN_STRIPE_PATH.md`](./DESIGN_STRIPE_PATH.md) §1 (post–cycle-2, H2/H3 applied)  
**Reviewers (adversarial standing practice):** Expert A outbox/distributed systems · Expert B Stripe contract/security · Expert C kit ship/CI/support  
**Date:** 2026-09-26 ET  
**CI at review:** `chaos-postgres` **pass** (Node 20 + postgres:16; migrate + typecheck + test). Runs: [36255631437](https://github.com/yellowgram/hooksteel/actions/runs/36255631437), [36255642281](https://github.com/yellowgram/hooksteel/actions/runs/36255642281).  
**Diff size:** +3289 / −14 across kit tree (migrations, handler, drain, 5 chaos, examples/next, LICENSE, README).

This pack lists required fixes for a follow-up commit; docs-only landing on `main`. No code pushed to the PR branch from this pass.

---

## Scope checked

| Area | Artifacts |
| --- | --- |
| Schema / migrate | `migrations/000–003`, `src/db/migrate.ts` |
| Handler / verify | `src/webhooks/stripe/{handler,verify,mapAdapters,payload,hooks}.ts` |
| Outbox | `src/outbox/{drain,enqueue,replay,types}.ts`, `scripts/outbox-drain.ts` |
| Adapters | `src/adapters/*` (incl. `testInvocation`, hooks) |
| Chaos / tests | `src/chaos/inject.ts`, `tests/chaos/01–05`, `tests/setup/*`, unit suites |
| Ship surface | `package.json`, `.env.example`, `LICENSE`, `README.md`, `BUYER_START_HERE.md`, `examples/next/*`, `.github/workflows/chaos-postgres.yml`, `src/index.ts` |

---

## Expert A — Outbox / distributed systems

**Lens:** lease reclaim, attempts/backoff, `SKIP LOCKED`, txn boundaries, dead-letter terminal policy, rollback on abort, no side effects before commit, stuck-after-crash.

**Attack thesis:** Claim/complete split + multi-process drain will leave `processed_at` wrong under sibling concurrency, and crash mid–dead-letter will duplicate DL rows because `outbox_id` is not unique.

### What holds (contract match)

- Claim SQL matches §1.7: `completed_at IS NULL`, `available_at <= now()`, `(locked_at IS NULL OR locked_at < now() - lease)`, `FOR UPDATE SKIP LOCKED`, atomic `locked_at` / `locked_by` / `attempts + 1`. No `lease_expires_at` column.
- Backoff: `available_at = now() + LEAST(60, 2^attempts)` after increment; lock cleared. Unit test pins ~2s at `attempts = 1`.
- Terminal path: `INSERT dead_letters` + `outbox.completed_at` + `last_error = 'dead_lettered'` + clear lock; parent status never `failed`/`dead`.
- Handler: same-txn `billing_events` + outbox; `try/finally` ROLLBACK if no COMMIT; adapters never called in request. Chaos #4 asserts abort-before-commit → 0 rows, 0 idle-in-transaction, retry inserts once.
- Replay mutation (§1.9): refuse if `replayed_at` set / billing event missing / outbox missing; reset outbox fields + set `replayed_at`; does not call adapter.
- `--once` sequential batch via `drainOnce`; multi-process safety via `SKIP LOCKED`.
- Stuck-after-crash recovery is lease reclaim (30s default); intentional per R3.

### Findings

#### A-P1-001 — `processed_at` lost under concurrent sibling completion
- **Severity:** P1  
- **File:** `src/outbox/drain.ts` (`complete` / `markProcessed`, ~L76–L88, L99–L111)  
- **Evidence:** `markProcessed` runs in the same txn as setting one child’s `completed_at`. With two workers (README allows multi-process drain) completing the two default adapters for one event:
  1. W1 `UPDATE` grant_credit completed (uncommitted); `markProcessed` still sees send_email incomplete.  
  2. W2 `UPDATE` send_email completed (uncommitted); `markProcessed` still sees grant_credit incomplete.  
  3. Both COMMIT → all outbox rows complete, **`billing_events.processed_at` stays NULL forever**.  
  READ COMMITTED does not save this: each `markProcessed` statement still runs before the peer’s `completed_at` is visible. Single-process `--once` hides the bug; CI does not run two drain processes.  
- **Required fix:** After setting `completed_at`, take a row lock on `billing_events` (e.g. `SELECT … FOR UPDATE`) then re-evaluate `NOT EXISTS (incomplete outbox)`, **or** commit the outbox completion first and run a separate follow-up txn that only sets `processed_at`, **or** add a drain sweep that sets `processed_at` for events with zero incomplete children. Add a unit/chaos assertion with two concurrent `drainOne()` on sibling rows.

#### A-P1-002 — Crash mid–dead-letter can insert duplicate `dead_letters` for one outbox
- **Severity:** P1  
- **File:** `migrations/003_dead_letters.sql` (no `UNIQUE (outbox_id)`); `src/outbox/drain.ts` `deadLetter` (~L127–L145)  
- **Evidence:** Terminal path is `INSERT dead_letters` then `UPDATE outbox … completed_at`. If the process dies after INSERT and before UPDATE, lease reclaim increments `attempts` again and calls `deadLetter` again → second DL row for the same `outbox_id`. `listDeadLetters` / replay then see twins; second open DL can reopen an already-replayed logical failure.  
- **Required fix:** Make dead-letter insert idempotent: partial unique index on `outbox_id` (at least where `replayed_at IS NULL`), or `INSERT … ON CONFLICT DO NOTHING` after adding uniqueness, and only then mark outbox completed. Cover with a unit test that simulates INSERT-then-crash-then-reclaim.

#### A-P2-001 — Ignored events never receive `processed_at`
- **Severity:** P2  
- **File:** `src/webhooks/stripe/handler.ts` (~L71–L72); no drain sweep  
- **Evidence:** Empty map → `status = 'ignored'`, zero outbox. Design writer for `processed_at` is drain when no incomplete children; ignored rows are never visited. Vacuous “no incomplete children” never applied.  
- **Required fix or accept:** **Accept as known limit** for v0.1 *or* set `processed_at = now()` in the handler when transitioning to `ignored`. Document in README known limits if deferred.

#### A-P2-002 — Long adapter runtime > `OUTBOX_LEASE_MS` allows double claim
- **Severity:** P2  
- **File:** `src/outbox/drain.ts` (claim commits before `adapter.execute`)  
- **Evidence:** No lease heartbeat/extension. Stub adapters are instant; a buyer adapter slower than lease (default 30s) can be claimed by a second worker. Kit already requires external idempotency; still a support footgun.  
- **Accept as known limit:** Document “adapters must finish within `OUTBOX_LEASE_MS` or be idempotent under overlap.” Lease extension is out of slice (R3 / minimal drain).

#### A-P2-003 — Reclaim after crash mid-execute burns an extra `attempts` count
- **Severity:** P2  
- **File:** `src/outbox/drain.ts` CLAIM_SQL  
- **Evidence:** Every claim (including reclaim of a stale lock) does `attempts + 1`. Crash after claim without backoff/complete → lease wait → reclaim increments again without a completed adapter attempt in between. Speeds max-attempts DL under flaky hosts.  
- **Accept as known limit:** Matches frozen “claim always increments” rule; document in drain README section.

#### A-P2-004 — Replay dry-run embeds ids via string concatenation
- **Severity:** P2  
- **File:** `src/outbox/replay.ts` `statementsFor` (~L44–L48)  
- **Evidence:** Display-only SQL interpolates `outbox_id` / dead-letter id. Execute path correctly uses bound parameters. UUIDs are safe; still a bad copy-paste example if schema ever changes.  
- **Accept as known limit** for v0.1 dry-run printer; polished CLI later.

---

## Expert B — Stripe contract / security

**Lens:** `constructEvent` + raw body, livemode, placeholder secrets, HTTP 400/200/500, H2 `invoice.paid` empty default, H3 `skipped_no_email`, no `sk_` required for verify, no Polar SDK, chaos not in prod exports.

**Attack thesis:** DX snippet teaches Express the wrong body API; stub instrumentation still attempts test-table writes when `NODE_ENV` ≠ `production`.

### What holds (contract match)

- Verify: `stripe.webhooks.constructEvent(rawBody, signature, secret)`; no hand-rolled HMAC (`tests/unit/stripe-verify.test.ts`).
- Placeholder / empty / non-`whsec_` → `WebhookRejected('invalid_webhook_secret')` → **400**, no store.
- Livemode vs `STRIPE_EXPECT_LIVEMODE` (default **false**); mismatch → **400**; not inferred from `sk_`.
- `STRIPE_SECRET_KEY` optional; dummy key only to construct SDK client for verify (R6).
- HTTP table §1.4 implemented (400 poison/secret/livemode; 200 outboxed/duplicate/ignored; 500 transient/DB).
- **H2:** `invoice.paid` → `[]` in `DEFAULT_ADAPTER_MAP`; opt-in tested.
- **H3:** `send_email` missing email → `{ lastError: 'skipped_no_email' }` → `completed_at` + `last_error`, no DL.
- Next route: `request.text()` only; layout test forbids `request.json()`.
- Root `package.json`: `stripe` + `pg` only; no Polar SDK; no `next`.
- `src/index.ts` does not export/import `chaos`; layout walk enforces no production import of `src/chaos/*`.
- Secrets redacted in `safeLog` (`whsec_[redacted]`).
- Fixtures: unsigned JSON + runtime `generateTestHeaderString`; no checked-in timestamped signatures.

### Findings

#### B-P1-001 — README “Express” snippet uses Fetch/Hono APIs
- **Severity:** P1  
- **File:** `README.md` (~L40–L48)  
- **Evidence:** Snippet uses `req.text()` and `req.headers.get('stripe-signature')`. Express has neither; buyers who `JSON.parse` / use default body parsers will get signature **400** and open Issues (MINIMUM_SUPPORT troubleshooting #1). Design §1.11 asks for an honest Node/Hono/Express snippet.  
- **Required fix:** Split snippets: Fetch/Hono as now; Express example with `express.raw({ type: 'application/json' })` + `Buffer`/`rawBody` string + `req.headers['stripe-signature']`. Point at troubleshooting #1 from the Express block.

#### B-P1-002 — Shipped stubs attempt `adapter_invocations` unless `NODE_ENV=production`
- **Severity:** P1  
- **File:** `src/adapters/testInvocation.ts` (~L12–L14); called from `grant_credit.ts` / `send_email.ts` / `invite_github.ts`  
- **Evidence:** Design: “Production adapters must not write this table.” Gate is `NODE_ENV === 'production'` only. Many deploys leave `NODE_ENV` unset → every drain opens a txn, `INSERT` fails with `42P01`, catch/rollback. Silent but wasteful; if a buyer ever creates the test table in prod, stubs write durable rows. Chaos durability correctly uses a **separate** connection — keep that for tests.  
- **Required fix:** Record only when `NODE_ENV === 'test'` (or an explicit `HOOKSTEEL_RECORD_INVOCATIONS=true` set by the test harness). Default off for unset/`development`/`production`. Keep separate-connection + `ON CONFLICT DO NOTHING` for chaos #1/#5.

#### B-P2-001 — Chaos hook *slots* live in production modules
- **Severity:** P2  
- **File:** `src/adapters/hooks.ts`, `src/webhooks/stripe/hooks.ts`  
- **Evidence:** `src/chaos/inject.ts` is test-only (good). Hook setters throw unless `ALLOW_CHAOS_INJECT=true` and not production; runners no-op when disarmed. Slightly broader than “chaos only under `src/chaos`,” but inert without the arm API.  
- **Accept as known limit:** Required for chaos #4/#5 without exporting injectors from `src/index.ts`. Layout test already blocks importing `chaos` from prod trees.

#### B-P2-002 — Connect / account field not on outbox payload
- **Severity:** P2  
- **File:** `src/webhooks/stripe/payload.ts`  
- **Evidence:** Design known limit: uniqueness OK; adapters read `event.account` from stored full JSONB; no `stripe_account` column. Payload helper omits `account`.  
- **Accept as known limit** (documented in README Known limits).

#### B-P2-003 — Dummy `sk_test_…` string embedded for SDK ctor
- **Severity:** P2  
- **File:** `src/webhooks/stripe/verify.ts` (~L23)  
- **Evidence:** Unused for HTTP; constructEvent only. Could confuse greppers / secret scanners.  
- **Accept as known limit** or rename to a clearly non-secret sentinel in a follow-up nit.

---

## Expert C — Kit ship / CI / support

**Lens:** exactly 5 chaos proofs (runtime sigs, durable `adapter_invocations`), migrate versioning, engines/CI workflow, `examples/next` only, LICENSE Single-app, README honesty, zip-ready gaps.

**Attack thesis:** Next example env story and TS-only package entry will generate unzip-day Issues even when chaos CI is green.

### What holds (contract match)

- Exactly five chaos files with design names; layout test locks the list.
- Runtime-minted signatures; durable `adapter_invocations` via separate connection (chaos #5).
- Migrate: lex order, one txn per file, plain `CREATE` (no `IF NOT EXISTS` on buyer SQL), version table; second migrate no-op tested; H4 error text present.
- CI: `.github/workflows/chaos-postgres.yml` — `postgres:16`, Node 20, `npm ci && migrate && typecheck && test`. **Green on this PR.**
- `engines.node >= 20`; lockfile committed; Next only under `examples/next` with `transpilePackages: ['hooksteel']`.
- LICENSE Single-app = one prod app + one prod Stripe account (NQ2).
- README: guarantees, HTTP table, livemode/CLI vs Dashboard, 5 chaos, H2/H3 map, Hookdeck 6-bullet honesty, known limits (PII, Connect, timeout, non-total-order), support one-liner.
- Polar verify stub dir only; `provider` CHECK allows `'polar'`.
- `BUYER_START_HERE.md` thin stub present.

### Findings

#### C-P1-001 — `examples/next` env story is wrong for App Router dev
- **Severity:** P1  
- **File:** `examples/next/README.md`; no `examples/next/.env.example`  
- **Evidence:** Instructs putting `whsec_` in **root** `.env`. `next dev` does not load the monorepo root `.env`. `handle()` reads `process.env.STRIPE_WEBHOOK_SECRET` / `DATABASE_URL` → placeholder 400 or DB 500 on first stripe listen demo. High-frequency support path.  
- **Required fix:** Document `examples/next/.env.local` (or Next `env` loading) with `STRIPE_WEBHOOK_SECRET`, `DATABASE_URL`, and `STRIPE_EXPECT_LIVEMODE`; or load dotenv from repo root in the example route **only** with an explicit comment. Keep root `.env.example` as source of truth for variable names.

#### C-P1-002 — (same as B-P1-002) Test instrumentation in default stub path
- **Severity:** P1  
- **Cross-ref:** B-P1-002  
- **Ship impact:** Polar zip buyers running drain without `NODE_ENV=production` hit needless Postgres errors internally every fulfillment.  
- **Required fix:** Same as B-P1-002.

#### C-P2-001 — Package entry is raw TypeScript (`main`/`exports` → `src/index.ts`)
- **Severity:** P2  
- **File:** `package.json`  
- **Evidence:** Honest in README (tsx / Next transpile). No `build`/`dist` for plain Node CJS/ESM consumers. Fine for this slice’s scripts + Next example; zip-ready gap for “npm install into a JS-only app.”  
- **Accept as known limit** for v0.1; track build step before broader packaging.

#### C-P2-002 — `examples/next` has no lockfile
- **Severity:** P2  
- **File:** `examples/next/package.json` only  
- **Evidence:** Floating `next@^15` / React 19 — demo breakages over time.  
- **Accept as known limit** or add `examples/next/package-lock.json` in follow-up.

#### C-P2-003 — Postgres minimum version not stated (relies on `gen_random_uuid()`)
- **Severity:** P2  
- **File:** migrations `DEFAULT gen_random_uuid()`; compose/CI pin 16  
- **Evidence:** Built-in since PG13; older images need `pgcrypto`.  
- **Accept as known limit:** Document “Postgres 13+ (CI/compose: 16)” in README Migrations.

#### C-P2-004 — Dead-letter reasons `timeout` / `adapter_error` / `poison` unused
- **Severity:** P2  
- **File:** `migrations/003_dead_letters.sql` CHECK; drain only writes `max_attempts`  
- **Evidence:** Schema reserved; unknown adapter currently backoffs then `max_attempts` rather than `poison`.  
- **Accept as known limit** (replay CLI / richer reasons later).

#### C-P2-005 — STATUS honesty on PR branch vs this review halt
- **Severity:** P2 (process)  
- **File:** `docs/STATUS.md` on PR says implement done / founder review next  
- **Evidence:** Standing practice: after CR×3, halt for founder before merge. This review pack + workspace/main `STATUS` update close that loop.  
- **Required fix:** Update `docs/STATUS.md` on **main** (this push) to CR×3 done / halted for founder — not a PR code change.

---

## Merge blockers (P0)

*None.*

Core uniqueness, same-txn outbox, constructEvent/livemode/HTTP contract, H2/H3, lease reclaim + SKIP LOCKED, chaos #1–#5 shape, and CI green all match §1. No demonstrated double-fulfill or signature bypass in the reviewed tree.

---

## Should-fix before merge (P1)

| ID | Summary |
| --- | --- |
| **A-P1-001** | Fix `processed_at` under concurrent sibling drain completion; add regression test |
| **A-P1-002** | Idempotent / unique dead-letter per outbox; cover crash-mid-DL reclaim |
| **B-P1-001** | Fix README Express raw-body snippet (do not teach Fetch APIs as Express) |
| **B-P1-002** / **C-P1-002** | Gate `recordTestInvocation` to test (or explicit flag), not merely `NODE_ENV !== 'production'` |
| **C-P1-001** | Fix `examples/next` env loading docs (root `.env` is insufficient for `next dev`) |

---

## Defer / known limits (P2)

| ID | Summary | Disposition |
| --- | --- | --- |
| A-P2-001 | `ignored` events leave `processed_at` null | Accept or tiny handler fix later |
| A-P2-002 | No lease extension for slow adapters | Document; out of slice |
| A-P2-003 | Reclaim increments `attempts` after crash | Document; matches claim rule |
| A-P2-004 | Dry-run SQL string concat | OK until polished CLI |
| B-P2-001 | Hook slots in prod modules | Accept; injectors not exported |
| B-P2-002 | Connect account on payload | Documented known limit |
| B-P2-003 | Dummy sk_ sentinel in verify ctor | Nit |
| C-P2-001 | TS-only package entry | Accept for v0.1 |
| C-P2-002 | No Next example lockfile | Follow-up |
| C-P2-003 | Document PG 13+ | Docs nit |
| C-P2-004 | Unused DL reason enum values | Reserved |
| C-P2-005 | STATUS halt wording | Handled on main this pass |

---

## Verdict

**REQUEST CHANGES**

Zero P0 merge blockers; five P1s should land (or be explicitly founder-waived) before merge. CI is green and the §1 happy path / chaos suite is substantially correct — this is not a redesign reject. Prefer a follow-up commit on the PR branch addressing the P1 table; then founder merge pass.

**Counts:** P0 = **0** · P1 = **5** · P2 = **12**

---

## Appendix — CI / PR metadata

| Field | Value |
| --- | --- |
| PR URL | https://github.com/yellowgram/hooksteel/pull/1 |
| Head | `cursor/stripe-path-chaos-658e` @ `0639522d328be269dc61af8382bf07f69ef150f0` |
| Title | Stripe path: same-txn outbox, drain, and 5 Postgres chaos tests |
| Checks | `chaos` **pass** (×2 workflow runs observed) |
| Local claim (PR body) | `npm ci && migrate && test` green (20 tests) — consistent with CI |

*Review pack written 2026-09-26 ET. Founder halt before merge.*
