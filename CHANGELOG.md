# Changelog

## 0.1.1 — 2026-09-27

License fence patch. No product behavior change. Not a hosted gateway. Soft-WTP stays off. No Lock. No Audit. No coupon.

### License

- Public license is the PolyForm Noncommercial License 1.0.0 in `LICENSE` (yellowgram header, then the official text unchanged). Source-available. Not an OSI-approved open source license. Not MIT.
- Paid commercial production use is the HookSteel commercial grant in `docs/COMMERCIAL_GRANT.md`: one organization, the purchased named tag, perpetual for that tag. Prior Single-app kit language folds into that one-organization grant.
- Price and refund lock is `docs/COMMERCIAL_LOCK.md`. Founding $89 for the first 10 licenses OR 30 days after go-live, whichever comes first; then $129. One SKU. Purchase-refund window is 14 days.
- The fence does not claw back rights on already-distributed `hooksteel-0.1.0.zip` copies. That zip is not rewritten. Tag `v0.1.0` is not moved.
- The Polar listing is live as of 2026-09-27 and sells `hooksteel-0.1.1.zip`. SHA-256 `e5fb3c1117b954f344fb27e7b1bf7be89d46e120839e238983d017a50e08e4d9`. GitHub Release `v0.1.1` is published. Delivery is the public source-available repository plus that zip. The license-fence commit did not itself change Polar product settings. Soft-WTP stays off.

### Break notes

None for runtime behavior. Buyers of the 0.1.1 tag pin `hooksteel-0.1.1.zip` and the SHA-256 in `docs/CHECKSUMS.md`.

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
- At the 0.1.0 baseline the Polar listing was still dark. Go-live is recorded under 0.1.1.
- Purchase-refund window is 14 days (founder lock 2026-09-26). That is not the replay CLI.
- Founding price is $89 for the first 10 licenses OR 30 days after go-live, whichever comes first; then $129. One SKU. Do not run two Polar products. Soft-WTP is off. At 0.1.0 the listing was still dark, pending the founder-approved clip, the distribution post, and go-live. That gate closed when the listing went live on 0.1.1.
- `order.refunded` is stored as `ignored` and does not claw back credit.
- The chaos set stays at five files. No fuzzing.
- 0.1.0 shipped a Single-app commercial kit license inside that sealed zip (not MIT). From 0.1.1 the public license is PolyForm Noncommercial 1.0.0 and paid commercial use is the HookSteel commercial grant. The 0.1.0 zip is unchanged.
- The outbox does not certify PCI, charge correctness, or tax.
- README "Known limits" still holds for Connect, stored PII, the Polar livemode declaration, and replay dry-run `$1` labels (CR2-A-P2-002 deferred).

### Break notes

None. First baseline. Buyers pin the zip named `hooksteel-0.1.0.zip` and the SHA-256 in `docs/CHECKSUMS.md`.
