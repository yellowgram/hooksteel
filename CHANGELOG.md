# Changelog

## 0.3.0 — 2026-10-19

### Fixed

- `hooksteel --help` (also `-h`, `help`) prints usage and exits 0; before, it exited 1.
- **One payment fulfilled twice.** The idempotency key was per event id, and one payment can arrive as several events: Stripe can send two Event objects for one change, a delayed payment sends `checkout.session.completed` and then `checkout.session.async_payment_succeeded`, and Checkout is followed by `payment_intent.succeeded` or the first `invoice.paid`. Payment-success events are now keyed on the payment, `stripe|pay:<PaymentIntent, else invoice, else session id>|<adapter>` (Polar: `polar|pay:<order id>|<adapter>` for `order.created`/`order.paid`); other events use `provider|<event type>|<object id>|<adapter>`. A second event for the same payment queues nothing.
- **No fulfilment before payment.** A Checkout Session completed with `payment_status: "unpaid"` used to queue `grant_credit` before the money arrived. It now queues nothing (outcome `awaiting_payment`); `async_payment_succeeded` fulfils it. Unpaid Polar orders are skipped the same way.
- **Upgrading:** rows queued by 0.2.x use the old per-event keys and will not dedupe against a later event for the same payment. Drain the outbox (`hooksteel drain --once` until idle) before upgrading.
- `OUTBOX_LEASE_MS` under 1000 is a configuration error (it was accepted down to 0, which caused duplicate runs).
- The default `OUTBOX_WORKER_ID` is unique per process (was `local-dev-1` for every replica).
- Adapters get `signal`, aborted when the worker loses the row's lease.
- **A worker that lost its lease could overwrite the next worker's result.** If an adapter outlived `OUTBOX_LEASE_MS`, a second worker reclaimed the row. The first worker's late completion, backoff or dead-letter then landed anyway and could mark the row done, push it back, or dead-letter work the second worker had finished. Those writes are now fenced on the claim's `(locked_by, locked_at)` token. A stale worker changes nothing and logs `lease_lost`. No migration is needed.
- **Slow adapters no longer lose their lease.** While an adapter runs, the worker renews the lease every third of `OUTBOX_LEASE_MS`, so only a stalled or dead worker's row is reclaimed.
- A fenced-off dead letter no longer writes a `dead_letters` row.
- An event's adapters now drain in adapter-map order (for example `grant_credit` before `send_email`). Before, rows from one event had the same `created_at` and their order was random.

### Added

- **Your own adapters.** `registerAdapter({ name, execute })`, and `hooksteel drain --adapters <module>` for the CLI worker. Before, the only adapters were the built-in examples, which do nothing, and there was no supported way to replace them.
- A `hooksteel` command in the npm package: `hooksteel migrate`, `hooksteel drain [--once]` and `hooksteel replay list | dry-run <id> | execute <id>`. Before, the worker and replay tools were repo scripts that weren't shipped, so npm users had no worker. `drain` exits cleanly on SIGTERM/SIGINT after finishing the row in hand.

### Fixed (packaging)

- `migrate()` applies the migrations shipped with the package. Before, it read `./migrations` from the caller's working directory, which from an installed package meant the app's own folder, or nothing.
- `migrate()` no longer loads `.env` as a side effect of importing `hooksteel`; only the CLI does.
- `npm pack` / `npm publish` now build first (`prepack`), so a stale `dist/` cannot ship.

### Changed

- **The built-in example adapters no longer run outside tests.** They only validate the payload, so in a real deployment they marked orders fulfilled without doing anything. Now, unless `NODE_ENV=test` or `HOOKSTEEL_EXAMPLE_ADAPTERS=true`, they throw a message saying to register your own adapter. The row retries, then dead-letters, and can be replayed once your adapter is in place.

- `replayDryRun` also returns `billingEventId` and `steps: [{ sql, params }]`. Each statement now shows the id it binds; before, three statements each said `$1` without saying which row. `execute` runs exactly these steps. `statements` is kept for older callers.
- `npm run demo` now runs the two chaos files directly (the `demo:60s` script is gone).
- README rewritten as a quickstart plus a guarantees-and-limits section. The reference material moved to `docs/REFERENCE.md`, `docs/POLAR.md` and `docs/TROUBLESHOOTING.md`. The internal status, start-here and demo-script docs are removed.

## 0.2.0 — 2026-10-19

- Relicensed to MIT. Sales, pricing and internal review documents were removed from the tree. `package.json` is publishable (`files`, `repository`, `homepage`). No runtime behavior change.

## 0.1.1 — 2026-09-27

- License-only patch under the previous license. No runtime behavior change.

## 0.1.0 — 2026-09-26

- First release: Stripe (`handle`) and Polar (`handlePolar`) signed webhooks into `billing_events`, the outbox in the same transaction, the drain worker, the replay CLI, the five Postgres chaos tests, and the `grant_credit`, `send_email` and `invite_github` adapter stubs.
- Releases before 0.2.0 were published under a different license.
