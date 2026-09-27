# Polar deliverables — CoS packet

**LIVE as of 2026-09-27.** The Polar listing is live and sells `hooksteel-0.1.1.zip`. SHA-256 `e5fb3c1117b954f344fb27e7b1bf7be89d46e120839e238983d017a50e08e4d9` (`docs/CHECKSUMS.md`). GitHub Release [`v0.1.1`](https://github.com/yellowgram/hooksteel/releases/tag/v0.1.1) is published. Founding **$89** for the first 10 licenses OR 30 days after go-live, whichever comes first; then list **$129**. One SKU. Purchase-refund window **14 days**. Soft-WTP is off. No coupon.

Org: **Suthirth solutions**. Repo: public source-available https://github.com/yellowgram/hooksteel. Contact: hello@yellowgram.dev · https://www.yellowgram.dev

This packet does not change Polar product settings, price, or the refund window. It does not add a checkout URL. Delivery is the public source-available repository plus the zip from Polar.

## License

Public license: PolyForm Noncommercial 1.0.0 in `LICENSE` (source-available; not OSI open source; not MIT). Paid commercial production use: the Suthirth Commercial Grant in `docs/COMMERCIAL_GRANT.md`. Price lock: `docs/COMMERCIAL_LOCK.md`.

`npm run pack:release` can rebuild `release/hooksteel-0.1.1.zip` from `HEAD`. Do not run it to refresh these docs, and do not upload a new zip over the live Polar file. A docs change would move the digest. The live file stays the already published `hooksteel-0.1.1.zip` with the SHA above. The script does not rewrite `release/hooksteel-0.1.0.zip` and does not move tag `v0.1.0`. That 0.1.0 zip and tag stay grandfathered.

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
| Sell file | `hooksteel-0.1.1.zip` |
| SHA-256 | `e5fb3c1117b954f344fb27e7b1bf7be89d46e120839e238983d017a50e08e4d9` |
| Not on this listing | Multi-app, Lock, Audit, Soft-WTP, hosted gateway, implementation services, Credit Ledger |

Soft-WTP is **off**. Do not add a waitlist, a "email me forever updates" benefit, or an outreach toggle.

No Lock product. No Audit product. Do not add those names as benefits or bumps.

## Paste-ready listing draft

The listing is already live. Use this text when the description needs to match the sell file. Do not paste a Polar checkout URL into the README, the zip, or buyer Quickstart.

---

HookSteel is owned code for Stripe and Polar webhooks. The same billing event four times still produces one side effect. The outbox row is written in the same database transaction as the event. Adapters run after that transaction commits.

You get the public source-available GitHub repository https://github.com/yellowgram/hooksteel and the zip `hooksteel-0.1.1.zip` from Polar. SHA-256 `e5fb3c1117b954f344fb27e7b1bf7be89d46e120839e238983d017a50e08e4d9`. You run Postgres. Your Stripe account and your Polar account stay yours. There is no hosted webhook gateway in this purchase.

**Price:** Founding $89 for the first 10 licenses OR 30 days after go-live, whichever comes first; then $129. One SKU. Do not run two Polar products. Do not invent a coupon. Soft-WTP is off. The purchase-refund window is 14 days. **License:** PolyForm Noncommercial 1.0.0 for the public tree (source-available; not OSI open source; not MIT). Paid commercial production use is the Suthirth Commercial Grant: one organization, for the purchased named tag, perpetual for that tag. Prior Single-app kit language folds into that one-organization grant. See `LICENSE` and `docs/COMMERCIAL_GRANT.md`.

**Use Hookdeck when** you need hosted ingress, fan-out, a team dashboard, or you do not want to run an outbox worker. **Use HookSteel when** the fear is a side effect that already ran inside a transaction that then rolls back, and you want that code in your repo for Stripe and Polar. Use both only if you want Hookdeck in front and this kit inside. Do not buy HookSteel if you want yellowgram to host your webhooks.

**Known limits:** exactly five chaos scenarios (no fuzzing); no hosted gateway; adapters are stubs you replace; uniqueness is per provider event id, not a global total order across providers; Polar `order.refunded` is stored and ignored (no credit clawback); the kit does not certify PCI, charge correctness, or tax. Patches are not a perpetual rewrite. Soft-WTP is off.

**Delivery:** the public source-available repository `yellowgram/hooksteel`, plus `hooksteel-0.1.1.zip` from Polar. SHA-256 `e5fb3c1117b954f344fb27e7b1bf7be89d46e120839e238983d017a50e08e4d9`. The sealed `hooksteel-0.1.0.zip` on tag `v0.1.0` is grandfathered and is not the current sell file. The zip has no `node_modules`, no `.env`, no `.git`, and no database dump. It does include `.env.example`. Confirm the SHA-256 in the file description against the 0.1.1 row in `docs/CHECKSUMS.md` (that checksum file is published beside the zip, not inside it). Do not put a checkout URL in the file description.

**Support:** Support is GitHub Issues for 60 days from purchase. It is best-effort. There is no SLA. Founder time is at most about 2 hours per week. An Issue must include a failing chaos test name or a test-mode event id. Do not paste live secrets.

**Not included:** Out of scope, and closed without debugging: a hosted gateway or yellowgram-operated ingress; Hookdeck feature parity as a service; Soft-WTP; Lock or Audit; implementation services; debugging live keys; India-local ICP customization; expanding the chaos suite or adding fuzzing; treating HookSteel as Credit Ledger. This product is the Polar zip and the public source-available GitHub repository only.

A Polar purchase refund, the replay CLI, and a provider `order.refunded` webhook are three different things. The purchase-refund window is 14 days. Replay is not that refund. `order.refunded` is stored and ignored and does not claw back credit.

---

## Hookdeck honesty (do not soften)

1. What Hookdeck is good at — hosted ingress, fan-out, rate limiting, observability, retries at the edge.
2. What HookSteel owns — in-app unique event id, transactional outbox, side-effect-after-commit, chaos proofs on the buyer's Postgres.
3. Use Hookdeck when — multi-destination routing, a team dashboard, or no outbox worker.
4. Use HookSteel when — double-fulfillment after a rolled-back transaction is the fear, on Stripe and Polar.
5. Use both when — Hookdeck in front, HookSteel inside. Optional. Do not require it.
6. Do not buy HookSteel if — you want yellowgram to host your webhooks.

Same six points: `README.md` and `docs/LANDING.md`. The clip is one take, not two provider demos: same event four times → one side effect, rollback mid-fulfillment, Stripe and Polar in that same clip (`docs/DEMO_60S.md`). If a cut cannot beat the Stripe docs and the Hookdeck homepage, it is not the buyer clip. The line that ships with the clip: use them for ingress; this is the outbox you keep.

## How delivery works

Current sell file:

1. Public source-available GitHub: https://github.com/yellowgram/hooksteel. Buyers clone it. Opening an Issue does not need an invite.
2. Polar file: `hooksteel-0.1.1.zip`. SHA-256 `e5fb3c1117b954f344fb27e7b1bf7be89d46e120839e238983d017a50e08e4d9`. GitHub Release `v0.1.1` is published.

Grandfathered:

1. Tag `v0.1.0` and `release/hooksteel-0.1.0.zip` stay sealed. Do not rewrite that zip. Do not move that tag. SHA-256 `dddcfe5dca204cd92b2c1b2a10adbb99515d0552a4a5947693aff34a29573a65` (the 0.1.0 row in `docs/CHECKSUMS.md`). It is not the current Polar sell file.

`scripts/pack-release.sh` runs `git archive` of `HEAD` with a pinned mtime and sets the zip comment to the `package.json` version. The digest is stable only when the only tree differences are `docs/CHECKSUMS.md` and `release/`. Later doc edits are not that case. Do not replace the live Polar asset from this packet.

### Zip omit contract

Omitted from a pack:

- `node_modules/` (root and `examples/next`)
- `.env`, `.env.local`, and any `.env.*` that is not `.env.example`
- `.git/`
- database dumps (`*.dump`, `*.backup`, `*.sql.gz`, `pg_dump*`)
- `release/` (the zip does not contain itself)
- `docs/CHECKSUMS.md` (so the hash is not inside the hashed bytes)

Included: source, `migrations/`, tests, fixtures, both `.env.example` files, `LICENSE`, `CHANGELOG.md`, and the buyer docs. Schema SQL under `migrations/` is not a dump.

The script exits non-zero if the zip breaks that contract.

## Checksum field

Paste from `docs/CHECKSUMS.md`. The live row is:

```text
SHA-256 (hooksteel-0.1.1.zip): e5fb3c1117b954f344fb27e7b1bf7be89d46e120839e238983d017a50e08e4d9
```

Sealed prior artifact, not the current sell file:

```text
SHA-256 (hooksteel-0.1.0.zip): dddcfe5dca204cd92b2c1b2a10adbb99515d0552a4a5947693aff34a29573a65
```

Put the 0.1.1 line in the GitHub Release `v0.1.1` notes and the Polar file description. Do not replace the live 0.1.1 Polar file from a docs-only change. Do not reseal 0.1.0.

Buyer check, on a tree that has the asset:

```bash
sha256sum release/hooksteel-0.1.1.zip
```

The first field must equal the 0.1.1 row. `sha256sum release/hooksteel-0.1.0.zip` checks the grandfathered file only.

## Issues access

The repository is public and source-available. A buyer opens a GitHub Issue on https://github.com/yellowgram/hooksteel without an invite. Support is GitHub Issues, not Polar chat. Write "GitHub Issues" on the listing. Do not name Polar chat as support.

Historical, before 2026-09-27: this packet required a Polar GitHub benefit or a collaborator invite because the repository was private. That path is closed. Do not switch Issues back to invite-only.

## Maintenance

The listing is already live. This packet does not change Polar settings.

1. Price on that one product stays founding **$89** until the first **10 licenses** OR **30 days after go-live**, whichever comes first; then **$129** on that same product.
2. One SKU. Do not run two Polar products. Do not invent a coupon. Do not open a second product at $129 while the $89 product is still up.
3. Soft-WTP stays off. No waitlist benefit. No "email me forever updates" benefit.
4. Purchase-refund window stays **14 days**. Do not change it.
5. Sell file stays `hooksteel-0.1.1.zip` with SHA-256 `e5fb3c1117b954f344fb27e7b1bf7be89d46e120839e238983d017a50e08e4d9`.
6. No Lock, no Audit, no hosted gateway.

## Refund

**14 days. Founder lock 2026-09-26.** The window is already locked. Do not change it. Do not copy a rail default that is not 14 days.

Glossary: `docs/REFUND_GLOSSARY.md`.

## Cover image

CoS owns the live cover. This repo does not contain one.

Art direction: the word HookSteel; the sentence "Same billing event four times → one side effect"; a small "Stripe + Polar". No hosted-dashboard mock. No Hookdeck logo as if this product were Hookdeck. No refund-day badge. No live-checkout sticker. No revenue claim.

## GitHub Release `v0.1.1` (live sell file)

Published: https://github.com/yellowgram/hooksteel/releases/tag/v0.1.1

Release notes name `hooksteel-0.1.1.zip` and SHA-256 `e5fb3c1117b954f344fb27e7b1bf7be89d46e120839e238983d017a50e08e4d9`. This docs change does not move the tag and does not upload a replacement asset.

```text
HookSteel 0.1.1 — Billing Event Reliability Kit

Stripe + Polar signed webhooks, same-transaction outbox, drain, replay CLI, five Postgres chaos scenarios.
License: PolyForm Noncommercial 1.0.0 (source-available; not OSI; not MIT) plus the Suthirth Commercial Grant.
Not a hosted gateway. Soft-WTP off.
Purchase-refund window: 14 days. That is not the replay CLI. `order.refunded` does not claw back credit.
Delivery: public source-available GitHub plus hooksteel-0.1.1.zip.

SHA-256 (hooksteel-0.1.1.zip): e5fb3c1117b954f344fb27e7b1bf7be89d46e120839e238983d017a50e08e4d9

Changelog: CHANGELOG.md
Support: SUPPORT.md
```

## GitHub Release `v0.1.0` (sealed, grandfathered)

Historical. Tag `v0.1.0` and `hooksteel-0.1.0.zip` already exist. Leave them. Do not rewrite the zip. Do not move the tag. Do not upload that file as the current Polar sell file.

```text
HookSteel 0.1.0 — Billing Event Reliability Kit

Stripe + Polar signed webhooks, same-transaction outbox, drain, replay CLI, five Postgres chaos scenarios.
0.1.0 zip: commercial kit terms inside that sealed zip. Do not rewrite this release as PolyForm.
Not a hosted gateway. Soft-WTP off.
Purchase-refund window: 14 days. That is not the replay CLI. `order.refunded` does not claw back credit.

SHA-256 (hooksteel-0.1.0.zip): dddcfe5dca204cd92b2c1b2a10adbb99515d0552a4a5947693aff34a29573a65

Changelog: CHANGELOG.md
Support: SUPPORT.md
```

## Live

- Polar listing: live, sells `hooksteel-0.1.1.zip`
- SHA-256: `e5fb3c1117b954f344fb27e7b1bf7be89d46e120839e238983d017a50e08e4d9`
- GitHub Release `v0.1.1`: published
- Repository: public, source-available
- Price: founding $89, then $129, one SKU, Soft-WTP off, no coupon
- Purchase-refund window: 14 days
- Checkout URL: not in the README, the zip, or buyer Quickstart
- Lock / Audit / hosted gateway: not offered

## Historical pre-go-live gates

Before 2026-09-27 this packet told CoS to keep the listing unpublished until a founder-approved clip, a distribution post, and a typed go-live, and it said not to open Checkout from the packet. Those gates are closed. Go-live was 2026-09-27. Do not treat them as current instructions. The clip script remains `docs/DEMO_60S.md`.
