# Polar deliverables — CoS packet

**Listing stays dark.** Do not publish. Do not start KYC. Do not open Checkout. Do not attach this zip to a live product. Org: **Suthirth solutions**. Repo: private `yellowgram/hooksteel`. Contact: hello@yellowgram.dev · https://www.yellowgram.dev

The purchase-refund window is locked at 14 days. Soft-WTP is off. This packet is the copy and the file handoff. It is not permission to publish.

## License fence (0.1.1)

Public license: PolyForm Noncommercial 1.0.0 in `LICENSE` (source-available; not OSI open source; not MIT). Paid commercial production use: the Suthirth Commercial Grant in `docs/COMMERCIAL_GRANT.md`. Price lock: `docs/COMMERCIAL_LOCK.md`. No coupon.

`npm run pack:release` writes `release/hooksteel-0.1.1.zip`. It does not rewrite `release/hooksteel-0.1.0.zip`. This pull request does not create GitHub Release tag `v0.1.1`.

This pull request does not change the Polar product. It does not request a freeze, an unlist, a republish, a price change, or a visibility change. Three confirms are still open. No checkout URL belongs in this packet, the README, or the zip.

## Do not list

CoS do not list while the listing is dark, there is no founder-approved clip, and there is no distribution post. Listing also stays dark until the founder types go-live. Clip and post are not that word.

Order locked:

1. Founder-approved clip. One clip, not two provider demos. Same event four times → one side effect, rollback mid-fulfillment, Stripe and Polar in that same clip. Script: `docs/DEMO_60S.md`. If that clip cannot beat the Stripe docs and the Hookdeck homepage, do not list.
2. Distribution post, where the burn already happened. Channels: a tight X thread, Show HN, and Stripe/Polar builder chats. Shape: "we double-provisioned after a 500." Same breath: use them for ingress; this is the outbox you keep.
3. Founder types go-live.
4. Only then is Polar the cash register. Not before. One SKU.

Missing the clip, the post, or go-live means do not list. A cover image does not replace any of them. Do not start KYC or Checkout from this packet.

## Product

| Field | Value |
| --- | --- |
| Name | HookSteel |
| Line | Billing Event Reliability Kit |
| Price to enter | **$89 USD** (founding) |
| List price in the description | **$129 USD** |
| Founding window | Founding $89 for the first 10 licenses OR 30 days after go-live, whichever comes first; then $129. One SKU. Do not run two Polar products. Do not invent a coupon. |
| SKU | One Polar product. Do not open a second product to change the price. |
| License | PolyForm Noncommercial 1.0.0 (`LICENSE`; source-available; not OSI open source; not MIT). Paid commercial use: Suthirth Commercial Grant (`docs/COMMERCIAL_GRANT.md`) — one organization, the purchased named tag, perpetual for that tag. Prior Single-app kit language folds into that one-organization grant. |
| Not on this listing | Multi-app, Lock, Audit, Soft-WTP, hosted gateway, implementation services, Credit Ledger |

Soft-WTP is **off**. Do not add a waitlist, a "email me forever updates" benefit, or an outreach toggle.

No Lock product. No Audit product. Do not add those names as benefits or bumps.

## Paste-ready listing draft

Do not paste this into a visible product while the listing is dark, there is no founder-approved clip, and there is no distribution post.

---

HookSteel is owned code for Stripe and Polar webhooks. The same billing event four times still produces one side effect. The outbox row is written in the same database transaction as the event. Adapters run after that transaction commits.

You get a private GitHub repository and a zip. The sealed file is `hooksteel-0.1.0.zip`. The fence pack on this branch is `hooksteel-0.1.1.zip`. This packet does not change the Polar product. You run Postgres. Your Stripe account and your Polar account stay yours. There is no hosted webhook gateway in this purchase.

**Price:** Founding $89 for the first 10 licenses OR 30 days after go-live, whichever comes first; then $129. One SKU. Do not run two Polar products. Do not invent a coupon. Soft-WTP is off. The purchase-refund window is 14 days. **License:** PolyForm Noncommercial 1.0.0 for the public tree (source-available; not OSI open source; not MIT). Paid commercial production use is the Suthirth Commercial Grant: one organization, for the purchased named tag, perpetual for that tag. Prior Single-app kit language folds into that one-organization grant. See `LICENSE` and `docs/COMMERCIAL_GRANT.md`.

**Use Hookdeck when** you need hosted ingress, fan-out, a team dashboard, or you do not want to run an outbox worker. **Use HookSteel when** the fear is a side effect that already ran inside a transaction that then rolls back, and you want that code in your repo for Stripe and Polar. Use both only if you want Hookdeck in front and this kit inside. Do not buy HookSteel if you want yellowgram to host your webhooks.

**Known limits:** exactly five chaos scenarios (no fuzzing); no hosted gateway; adapters are stubs you replace; uniqueness is per provider event id, not a global total order across providers; Polar `order.refunded` is stored and ignored (no credit clawback); the kit does not certify PCI, charge correctness, or tax. Patches are not a perpetual rewrite. Soft-WTP is off.

**Delivery:** access to the private repository `yellowgram/hooksteel`, plus the zip. The sealed file is `hooksteel-0.1.0.zip`. The fence pack on this branch is `hooksteel-0.1.1.zip`. This packet does not change the Polar product. The zip has no `node_modules`, no `.env`, no `.git`, and no database dump. It does include `.env.example`. Confirm the SHA-256 in the file description against the matching row in `docs/CHECKSUMS.md` (that checksum file is published beside the zip, not inside it). Do not put a checkout URL in the file description.

**Support:** Support is GitHub Issues for 60 days from purchase. It is best-effort. There is no SLA. Founder time is at most about 2 hours per week. An Issue must include a failing chaos test name or a test-mode event id. Do not paste live secrets.

**Not included:** Out of scope, and closed without debugging: a hosted gateway or yellowgram-operated ingress; Hookdeck feature parity as a service; Soft-WTP; Lock or Audit; implementation services; debugging live keys; India-local ICP customization; expanding the chaos suite or adding fuzzing; treating HookSteel as Credit Ledger. This product is the download and private GitHub access only.

A Polar purchase refund, the replay CLI, and a provider `order.refunded` webhook are three different things. The purchase-refund window is 14 days. Replay is not that refund. `order.refunded` is stored and ignored and does not claw back credit.

---

## Hookdeck honesty (do not soften)

1. What Hookdeck is good at — hosted ingress, fan-out, rate limiting, observability, retries at the edge.
2. What HookSteel owns — in-app unique event id, transactional outbox, side-effect-after-commit, chaos proofs on the buyer's Postgres.
3. Use Hookdeck when — multi-destination routing, a team dashboard, or no outbox worker.
4. Use HookSteel when — double-fulfillment after a rolled-back transaction is the fear, on Stripe and Polar.
5. Use both when — Hookdeck in front, HookSteel inside. Optional. Do not require it.
6. Do not buy HookSteel if — you want yellowgram to host your webhooks.

Same six points: `README.md` and `docs/LANDING.md`.

## How delivery works

The sealed artifact is version `0.1.0`:

1. Private GitHub: `yellowgram/hooksteel`. Not a public clone URL.
2. Sealed file: `release/hooksteel-0.1.0.zip`. This pull request does not rewrite it and does not move tag `v0.1.0`. Buyers of that release should see the name `hooksteel-0.1.0.zip`.

The license-fence pack on this branch is `release/hooksteel-0.1.1.zip`. This pull request does not attach it to Polar and does not create GitHub Release tag `v0.1.1`.

Build (already run for the file on this branch; re-run only to reproduce):

```bash
npm run pack:release
```

`scripts/pack-release.sh` runs `git archive` of `HEAD` with a pinned mtime. It then sets the zip comment to `hooksteel-0.1.0` (git archive would otherwise store the commit id, and the digest would change when this checksum file is committed). The digest is stable when the only tree differences are `docs/CHECKSUMS.md` and `release/`.

### Zip omit contract

Omitted:

- `node_modules/` (root and `examples/next`)
- `.env`, `.env.local`, and any `.env.*` that is not `.env.example`
- `.git/`
- database dumps (`*.dump`, `*.backup`, `*.sql.gz`, `pg_dump*`)
- `release/` (the zip does not contain itself)
- `docs/CHECKSUMS.md` (so the hash is not inside the hashed bytes)

Included: source, `migrations/`, tests, fixtures, both `.env.example` files, `LICENSE`, `CHANGELOG.md`, and the buyer docs. Schema SQL under `migrations/` is not a dump.

The script exits non-zero if the zip breaks that contract.

## Checksum field

Paste the hex from `docs/CHECKSUMS.md`. Do not type a hash from memory. This packet does not embed the hex, because the checksum file is generated from the zip and is not inside the zip.

```text
SHA-256 (hooksteel-0.1.0.zip): <paste the sealed 0.1.0 row in docs/CHECKSUMS.md>
SHA-256 (hooksteel-0.1.1.zip): <paste the 0.1.1 row in docs/CHECKSUMS.md>
```

Use the row that matches the file you are describing. Do not replace the live 0.1.0 Polar file from this pull request.

Put that line in:

- GitHub Release `v0.1.0` notes
- the Polar file description

Buyer check, from a checkout that has the asset. Use the filename you were given:

```bash
sha256sum release/hooksteel-0.1.0.zip
sha256sum release/hooksteel-0.1.1.zip
```

## Issues access (expected path)

Support is GitHub Issues, not Polar chat. The repository is private, so a buyer cannot open an Issue until CoS grants access.

Configure this only when the founder allows the listing to go light. Not now.

1. Preferred: Polar benefit "GitHub repository" → `yellowgram/hooksteel`, with permission that can **open an Issue** (Triage or Write).
2. If that benefit can only clone and cannot open Issues: CoS invites the purchase email as a collaborator with Triage or Write for the support window.
3. Write "GitHub Issues" on the listing. Do not name Polar chat as support.
4. Do not make the repository public in order to skip invites.

Until that benefit is actually on, do not tell buyers it already works.

## CoS flip checklist

Do not flip the listing on from this packet. Listing stays dark until the founder-approved clip, the distribution post, and the founder types go-live. CoS do not list while the listing is dark, there is no founder-approved clip, and there is no distribution post.

When those three exist, one Polar product only:

Founding $89 for the first 10 licenses OR 30 days after go-live, whichever comes first; then $129. One SKU. Do not run two Polar products.

1. Price on that product is founding **$89**.
2. Founding window: first **10 licenses** OR **30 days after go-live**, whichever comes first; then set that same product to **$129**.
3. One SKU. Do not run two Polar products. Do not invent a coupon. Do not open a second product at $129 while the $89 product is still up.
4. Soft-WTP stays off. No waitlist benefit. No "email me forever updates" benefit.
5. Purchase-refund window is **14 days**. Set the Polar refund toggle to 14 days before the listing goes light. Do not publish to set it.
6. Stop if the clip, the post, or the typed go-live is missing. Do not start KYC or Checkout to get ahead of that word.

## Refund toggle

**14 days. Founder lock 2026-09-26.** Before the listing goes light, set the Polar refund toggle to 14 days. You may set that toggle on the unpublished product. Do not publish. Do not start KYC or Checkout. Do not leave a rail default that is not 14 days. Listing stays dark.

Glossary: `docs/REFUND_GLOSSARY.md`.

## Cover image

CoS supplies the image. This repo does not contain one. Founder approves it before the listing goes light.

Art direction: the word HookSteel; the sentence "Same billing event four times → one side effect"; a small "Stripe + Polar". No hosted-dashboard mock. No Hookdeck logo as if this product were Hookdeck. No refund-day badge. No live-checkout sticker. No revenue claim.

A finished image does not turn the listing on.

## GitHub Release `v0.1.0` (sealed)

This branch does not create a Release and does not move tag `v0.1.0`. `npm run pack:release` now writes `hooksteel-0.1.1.zip` from `package.json`. It does not reseal `hooksteel-0.1.0.zip`. If tag `v0.1.0` and its asset already exist, leave them.

1. Check out `main` and pull.
2. Confirm `release/hooksteel-0.1.0.zip` is the sealed file. Do not rebuild it.
3. `sha256sum release/hooksteel-0.1.0.zip` matches the sealed 0.1.0 row in `docs/CHECKSUMS.md`.
4. Do not upload a new asset onto tag `v0.1.0`. The asset filename stays `hooksteel-0.1.0.zip`.
5. Release notes:

```text
HookSteel 0.1.0 — Billing Event Reliability Kit

Stripe + Polar signed webhooks, same-transaction outbox, drain, replay CLI, five Postgres chaos scenarios.
0.1.0 zip: commercial kit terms inside that sealed zip. Do not rewrite this release as PolyForm.
Not a hosted gateway. Soft-WTP off.
Purchase-refund window: 14 days. That is not the replay CLI. `order.refunded` does not claw back credit.

SHA-256 (hooksteel-0.1.0.zip): <paste the sealed 0.1.0 row in docs/CHECKSUMS.md>

Changelog: CHANGELOG.md
Support: SUPPORT.md
```

6. Stop. Do not upload the asset to a **visible** Polar product. Do not start KYC or Checkout. CoS do not list while the listing is dark, there is no founder-approved clip, and there is no distribution post. Listing stays dark until the founder types go-live. The purchase-refund window is already 14 days. Set the Polar refund toggle to 14 days before the listing goes light. Do not publish in order to set it. Founding $89 for the first 10 licenses OR 30 days after go-live, whichever comes first; then $129. One SKU. Do not run two Polar products. Soft-WTP stays off.

## Still dark

- Polar product visibility: dark / unpublished
- No founder-approved 60s clip yet (one clip: Stripe and Polar, four deliveries, one side effect, rollback)
- No distribution post yet (X, Hacker News, Stripe/Polar builder chats)
- Founder has not typed go-live
- One SKU when it does go light: founding $89 for the first 10 licenses OR 30 days after go-live, whichever comes first; then $129. Do not run two Polar products.
- Checkout: off
- KYC: not started from this packet
- Soft-WTP: off
- Lock / Audit: not offered
- Hosted gateway: not offered
