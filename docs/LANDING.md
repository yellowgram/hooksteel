# HookSteel

**Billing Event Reliability Kit**

Same billing event four times → still one side effect. Owned outbox. Stripe and Polar.

| | |
| --- | --- |
| Founding | $89 for the first 10 licenses OR 30 days after go-live, whichever comes first |
| List | $129 after that window |
| SKU | One. Do not run two Polar products. |
| Sell file | `hooksteel-0.1.1.zip` |
| SHA-256 | `e5fb3c1117b954f344fb27e7b1bf7be89d46e120839e238983d017a50e08e4d9` |
| License | PolyForm Noncommercial 1.0.0 (source-available; not OSI; not MIT). Paid commercial use: Suthirth Commercial Grant |
| ICP | Global English. Indie and SaaS founders on Stripe and/or Polar. |
| Contact | hello@yellowgram.dev · https://www.yellowgram.dev |
| Repo | https://github.com/yellowgram/hooksteel (public, source-available) |

This file is listing copy for a listing that is already live. The public site is https://www.yellowgram.dev. This file is not a checkout URL and it is not a site deploy.

## What HookSteel is

The public source-available GitHub repository and the Polar zip `hooksteel-0.1.1.zip`. Postgres tables `billing_events`, `outbox`, and `dead_letters`. Signed handlers for Stripe and Polar (no Polar SDK inside the buyer app). Side effects run after commit. Five chaos proofs. A replay CLI for dead letters.

You run it on your database. Your Stripe account and your Polar account stay yours.

## What it is not

Not a hosted webhook gateway. Not Hookdeck. Not a yellowgram-operated ingress. Not Lock, Audit, or implementation services. Not Soft-WTP. Not Credit Ledger. Not an OSI-approved open source license. Not MIT. The public license is PolyForm Noncommercial 1.0.0. Paid commercial production use is the Suthirth Commercial Grant (`docs/COMMERCIAL_GRANT.md`): one organization, the purchased named tag, perpetual for that tag. Prior Single-app kit language folds into that one-organization grant. Stripe signature checks use the `stripe` package this kit already depends on. Polar signature checks use Node `crypto`, not a Polar SDK.

Out of scope, and closed without debugging: a hosted gateway or yellowgram-operated ingress; Hookdeck feature parity as a service; Soft-WTP; Lock or Audit; implementation services; debugging live keys; India-local ICP customization; expanding the chaos suite or adding fuzzing; treating HookSteel as Credit Ledger. This product is the Polar zip and the public source-available GitHub repository only.

## Hookdeck — use them when

1. What Hookdeck is good at — hosted ingress, fan-out, rate limiting, observability, retries at the edge.
2. What HookSteel owns — in-app unique event id, transactional outbox, side-effect-after-commit, chaos proofs on your Postgres.
3. **Use Hookdeck when** you need multi-destination routing, a team dashboard, or you do not want to run an outbox worker.
4. **Use HookSteel when** double-fulfillment after a rolled-back transaction is the fear, and you want owned code on Stripe and Polar.
5. Use both when Hookdeck sits in front and HookSteel sits inside. Optional. Not required.
6. Do not buy HookSteel if you want yellowgram to host your webhooks.

The line that ships with the clip and with the post: use them for ingress; this is the outbox you keep.

## Proof

The product is one clip, not two provider demos. The script is [DEMO_60S.md](./DEMO_60S.md). The founder-approved cut is GitHub Release `clip-60s-approved`. Same event four times → one side effect, rollback mid-fulfillment, Stripe and Polar in that same clip. If a cut cannot beat the Stripe docs and the Hookdeck homepage, it is not the buyer clip.

## Listing

The Polar listing is live as of 2026-09-27. It sells `hooksteel-0.1.1.zip`. Founding $89 for the first 10 licenses OR 30 days after go-live, whichever comes first; then $129. One SKU. Purchase-refund window is 14 days. Soft-WTP is off. Org: Suthirth solutions.

Historical, closed at go-live: founder-approved clip first, then a post where the burn already happened (a tight X thread, Show HN, and Stripe/Polar builder chats, in the shape of "we double-provisioned after a 500," with Hookdeck honesty in the same breath), then Polar as the cash register.

## Call to action

Buy on Polar (org Suthirth solutions) from https://www.yellowgram.dev. This copy does not include a Polar checkout URL.

Sell file: `hooksteel-0.1.1.zip`. SHA-256 `e5fb3c1117b954f344fb27e7b1bf7be89d46e120839e238983d017a50e08e4d9`.

## Support

Support is GitHub Issues for 60 days from purchase. It is best-effort. There is no SLA. Founder time is at most about 2 hours per week. An Issue must include a failing chaos test name or a test-mode event id. Do not paste live secrets.

The repository is public and source-available. Opening an Issue does not need an invite.

The purchase-refund window is 14 days. That clock is not the 60-day support window, not the replay CLI, and not a Polar `order.refunded` webhook.

[SUPPORT.md](../SUPPORT.md) · [Refund glossary](./REFUND_GLOSSARY.md)
