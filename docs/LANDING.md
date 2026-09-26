# HookSteel

**Billing Event Reliability Kit**

Same billing event four times → still one side effect. Owned outbox. Stripe and Polar.

| | |
| --- | --- |
| Founding | $89 |
| List | $129 |
| License | Single-app: one production application and one production Stripe account |
| ICP | Global English. Indie and SaaS founders on Stripe and/or Polar. |
| Contact | hello@yellowgram.dev · https://www.yellowgram.dev |

This file is listing copy. It is not a site deploy. Do not publish it as a live page from this repo.

## What HookSteel is

A private GitHub repository and a zip. Postgres tables `billing_events`, `outbox`, and `dead_letters`. Signed handlers for Stripe and Polar (no Polar SDK inside the buyer app). Side effects run after commit. Five chaos proofs. A replay CLI for dead letters.

You run it on your database. Your Stripe account and your Polar account stay yours.

## What it is not

Not a hosted webhook gateway. Not Hookdeck. Not a yellowgram-operated ingress. Not Lock, Audit, or implementation services. Not Soft-WTP. Not Credit Ledger. Not a client library you must install in order to verify Stripe.

Out of scope, and closed without debugging: a hosted gateway or yellowgram-operated ingress; Hookdeck feature parity as a service; Soft-WTP; Lock or Audit; implementation services; debugging live keys; India-local ICP customization; expanding the chaos suite or adding fuzzing; treating HookSteel as Credit Ledger. This product is the download and private GitHub access only.

## Hookdeck — use them when

1. What Hookdeck is good at — hosted ingress, fan-out, rate limiting, observability, retries at the edge.
2. What HookSteel owns — in-app unique event id, transactional outbox, side-effect-after-commit, chaos proofs on your Postgres.
3. **Use Hookdeck when** you need multi-destination routing, a team dashboard, or you do not want to run an outbox worker.
4. **Use HookSteel when** double-fulfillment after a rolled-back transaction is the fear, and you want owned code on Stripe and Polar.
5. Use both when Hookdeck sits in front and HookSteel sits inside. Optional. Not required.
6. Do not buy HookSteel if you want yellowgram to host your webhooks.

## Proof

The filmed proof is still the founder's. The script is [DEMO_60S.md](./DEMO_60S.md): same event four times → one `grant_credit`, then a crash before `completed_at` that does not grant again. If that cannot beat "ask Cursor" on the rollback, do not list the product.

## Call to action

Polar checkout is **dark**. There is no purchase URL in this copy.

`[CTA placeholder — Polar product URL, org Suthirth solutions. Do not publish. Listing stays dark until the founder clears the ready gate.]`

## Support

Support is GitHub Issues for 60 days from purchase. It is best-effort. There is no SLA. Founder time is at most about 2 hours per week. An Issue must include a failing chaos test name or a test-mode event id. Do not paste live secrets.

[SUPPORT.md](../SUPPORT.md) · [Refund glossary](./REFUND_GLOSSARY.md)
