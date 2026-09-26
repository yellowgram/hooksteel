# Polar deliverables — CoS packet

**Listing stays dark.** Do not publish. Do not start KYC. Do not open Checkout. Do not attach this zip to a live product. Org: **Suthirth solutions**. Repo: private `yellowgram/hooksteel`. Contact: hello@yellowgram.dev · https://www.yellowgram.dev

The purchase-refund window is locked at 30 days. Soft-WTP is off. This packet is the copy and the file handoff. It is not permission to publish.

## Do not list

CoS do not list while the listing is dark, there is no founder-approved clip, and there is no distribution post.

Order locked:

1. Founder-approved clip. One clip, not two provider demos. Same event four times → one side effect, rollback mid-fulfillment, Stripe and Polar in that same clip. Script: `docs/DEMO_60S.md`. If that clip cannot beat the Stripe docs and the Hookdeck homepage, do not list.
2. Distribution post, where the burn already happened. Channels: a tight X thread, Show HN, and Stripe/Polar builder chats. Shape: "we double-provisioned after a 500." Same breath: use them for ingress; this is the outbox you keep.
3. Only then is Polar the cash register. Not before.

Missing the clip or the post means do not list. A cover image does not replace either one. Do not start KYC or Checkout from this packet.

## Product

| Field | Value |
| --- | --- |
| Name | HookSteel |
| Line | Billing Event Reliability Kit |
| Price to enter | **$89 USD** (founding) |
| List price in the description | **$129 USD** |
| When to change $89 → $129 | Only when the founder says the founding window is over. Do not invent a coupon. |
| License | Single-app: one production application and one production Stripe account (test and live keys of that same account count as one). See `LICENSE`. |
| Not on this listing | Multi-app, Lock, Audit, Soft-WTP, hosted gateway, implementation services, Credit Ledger |

Soft-WTP is **off**. Do not add a waitlist, a "email me forever updates" benefit, or an outreach toggle.

No Lock product. No Audit product. Do not add those names as benefits or bumps.

## Paste-ready listing draft

Do not paste this into a visible product while the listing is dark, there is no founder-approved clip, and there is no distribution post.

---

HookSteel is owned code for Stripe and Polar webhooks. The same billing event four times still produces one side effect. The outbox row is written in the same database transaction as the event. Adapters run after that transaction commits.

You get a private GitHub repository and a zip (`hooksteel-0.1.0.zip`). You run Postgres. Your Stripe account and your Polar account stay yours. There is no hosted webhook gateway in this purchase.

**Price:** $89 founding. List price $129 after the founding window. **License:** Single-app — one production application and one production Stripe account.

**Use Hookdeck when** you need hosted ingress, fan-out, a team dashboard, or you do not want to run an outbox worker. **Use HookSteel when** the fear is a side effect that already ran inside a transaction that then rolls back, and you want that code in your repo for Stripe and Polar. Use both only if you want Hookdeck in front and this kit inside. Do not buy HookSteel if you want yellowgram to host your webhooks.

**Known limits:** exactly five chaos scenarios (no fuzzing); no hosted gateway; adapters are stubs you replace; uniqueness is per provider event id, not a global total order across providers; Polar `order.refunded` is stored and ignored (no credit clawback); the kit does not certify PCI, charge correctness, or tax. Patches are not a perpetual rewrite. Soft-WTP is off.

**Delivery:** access to the private repository `yellowgram/hooksteel`, plus the zip named `hooksteel-0.1.0.zip`. The zip has no `node_modules`, no `.env`, no `.git`, and no database dump. It does include `.env.example`. Confirm the SHA-256 in the file description against `docs/CHECKSUMS.md` in the repository (that checksum file is published beside the zip, not inside it).

**Support:** Support is GitHub Issues for 60 days from purchase. It is best-effort. There is no SLA. Founder time is at most about 2 hours per week. An Issue must include a failing chaos test name or a test-mode event id. Do not paste live secrets.

**Not included:** Out of scope, and closed without debugging: a hosted gateway or yellowgram-operated ingress; Hookdeck feature parity as a service; Soft-WTP; Lock or Audit; implementation services; debugging live keys; India-local ICP customization; expanding the chaos suite or adding fuzzing; treating HookSteel as Credit Ledger. This product is the download and private GitHub access only.

A Polar purchase refund, the replay CLI, and a provider `order.refunded` webhook are three different things. The purchase-refund window is 30 days. Replay is not that refund. `order.refunded` is stored and ignored and does not claw back credit.

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

Two artifacts, same version `0.1.0`:

1. Private GitHub: `yellowgram/hooksteel`. Not a public clone URL.
2. File: `release/hooksteel-0.1.0.zip` in this repo, uploaded as the Polar file and as the GitHub Release asset. Buyers should see the name `hooksteel-0.1.0.zip`.

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
SHA-256 (hooksteel-0.1.0.zip): <paste docs/CHECKSUMS.md>
```

Put that line in:

- GitHub Release `v0.1.0` notes
- the Polar file description

Buyer check, from a checkout that has the asset:

```bash
sha256sum release/hooksteel-0.1.0.zip
```

## Issues access (expected path)

Support is GitHub Issues, not Polar chat. The repository is private, so a buyer cannot open an Issue until CoS grants access.

Configure this only when the founder allows the listing to go light. Not now.

1. Preferred: Polar benefit "GitHub repository" → `yellowgram/hooksteel`, with permission that can **open an Issue** (Triage or Write).
2. If that benefit can only clone and cannot open Issues: CoS invites the purchase email as a collaborator with Triage or Write for the support window.
3. Write "GitHub Issues" on the listing. Do not name Polar chat as support.
4. Do not make the repository public in order to skip invites.

Until that benefit is actually on, do not tell buyers it already works.

## Refund toggle

**30 days. Founder lock 2026-09-26.** Before the listing goes light, set the Polar refund toggle to 30 days. You may set that toggle on the unpublished product. Do not publish. Do not start KYC or Checkout. Do not leave a rail default that is not 30 days. Listing stays dark.

Glossary: `docs/REFUND_GLOSSARY.md`.

## Cover image

CoS supplies the image. This repo does not contain one. Founder approves it before the listing goes light.

Art direction: the word HookSteel; the sentence "Same billing event four times → one side effect"; a small "Stripe + Polar". No hosted-dashboard mock. No Hookdeck logo as if this product were Hookdeck. No refund-day badge. No live-checkout sticker. No revenue claim.

A finished image does not turn the listing on.

## GitHub Release `v0.1.0` (CoS cuts this)

This branch does not create the Release. After the docs pack is on `main`:

1. Check out `main` and pull.
2. Confirm `release/hooksteel-0.1.0.zip` is the file from that commit. Do not rebuild unless `npm run pack:release` prints the same SHA-256.
3. `sha256sum release/hooksteel-0.1.0.zip` matches `docs/CHECKSUMS.md`.
4. Create GitHub Release **tag `v0.1.0`** on that `main` commit. Upload `release/hooksteel-0.1.0.zip`. The asset filename stays `hooksteel-0.1.0.zip`.
5. Release notes:

```text
HookSteel 0.1.0 — Billing Event Reliability Kit

Stripe + Polar signed webhooks, same-transaction outbox, drain, replay CLI, five Postgres chaos scenarios.
Single-app license. Not a hosted gateway. Soft-WTP off.
Purchase-refund window: 30 days. That is not the replay CLI. `order.refunded` does not claw back credit.

SHA-256 (hooksteel-0.1.0.zip): <paste docs/CHECKSUMS.md>

Changelog: CHANGELOG.md
Support: SUPPORT.md
```

6. Stop. Do not upload the asset to a **visible** Polar product. Do not start KYC or Checkout. CoS do not list while the listing is dark, there is no founder-approved clip, and there is no distribution post. The purchase-refund window is already 30 days. Set the Polar refund toggle to 30 days before the listing goes light. Do not publish in order to set it.

## Still dark

- Polar product visibility: dark / unpublished
- No founder-approved 60s clip yet (one clip: Stripe and Polar, four deliveries, one side effect, rollback)
- No distribution post yet (X, Hacker News, Stripe/Polar builder chats)
- Checkout: off
- KYC: not started from this packet
- Soft-WTP: off
- Lock / Audit: not offered
- Hosted gateway: not offered
