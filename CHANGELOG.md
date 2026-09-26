# Changelog

## 0.1.0 — 2026-09-26

First baseline of the Billing Event Reliability Kit. `package.json` version is `0.1.0`. The GitHub Release tag `v0.1.0` is a CoS step (`docs/POLAR_DELIVERABLES.md`); this file does not mean the tag already exists. There is no older release to upgrade from.

### Included

- Stripe signed webhooks (`handle`) into `billing_events`, with outbox rows in the same transaction
- Polar signed webhooks (`handlePolar`): two HMAC key eras, no Polar SDK
- Outbox drain (`npm run outbox:drain`)
- Replay CLI (`npm run replay:list`, `replay:dry-run`, `replay:execute`) — not a purchase refund
- Exactly five Postgres chaos scenarios: duplicate delivery, out-of-order, signature fail, handler timeout, DB rollback mid-fulfillment. Polar cases live in those five files
- Adapter stubs: `grant_credit`, `send_email`, `invite_github` (`invite_github` is opt-in)

### Known limits

- No hosted gateway. Soft-WTP is off. No Lock. No Audit.
- Polar listing stays dark.
- Purchase-refund window is 30 days (founder lock 2026-09-26). That is not the replay CLI.
- Founding price is $89 for the first 10 licenses OR 30 days after go-live, whichever comes first; then $129. One SKU. Do not run two Polar products. Soft-WTP is off. Listing stays dark until the founder-approved clip, the distribution post, and the founder types go-live.
- `order.refunded` is stored as `ignored` and does not claw back credit.
- The chaos set stays at five files. No fuzzing.
- Single-app license only. Multi-app is not included.
- The outbox does not certify PCI, charge correctness, or tax.
- README "Known limits" still holds for Connect, stored PII, the Polar livemode declaration, and replay dry-run `$1` labels (CR2-A-P2-002 deferred).

### Break notes

None. First baseline. Buyers pin the zip named `hooksteel-0.1.0.zip` and the SHA-256 in `docs/CHECKSUMS.md`.
