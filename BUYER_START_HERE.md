# Buyer start

HookSteel is a Node kit. Postgres is the ship path.

1. Copy `.env.example` to `.env`. Set `DATABASE_URL` and `STRIPE_WEBHOOK_SECRET` to the `whsec_` that matches how you forward events (Stripe CLI secret and Dashboard endpoint secret are different). For Polar, set `POLAR_WEBHOOK_SECRET` to the endpoint `whsec_` (`polar_whs_` is rejected) and set `POLAR_EXPECT_LIVEMODE=true` on a production Polar endpoint.
2. `npm ci`
3. `npm run build` (writes `dist/` for plain Node and the Next example)
4. `npm run migrate`
5. `npm test` — five chaos scenarios against Postgres. Postgres 13+; CI uses 16. The 60-second cut (duplicate delivery and rollback) is `npm run demo:60s`. Script: [docs/DEMO_60S.md](./docs/DEMO_60S.md).
6. `npm run outbox:drain -- --once` after webhooks have been accepted.
7. Dead letters: `npm run replay:list`, then `npm run replay:dry-run -- <dead_letter_id>`, then `npm run replay:execute -- <dead_letter_id>`, then `npm run outbox:drain -- --once`. The drain runs the adapter. Replay is not a Polar purchase refund.

**Replay** re-opens one dead-lettered outbox row so the drain can run that adapter again. **Replay is not a Polar purchase refund.** A Polar refund returns the money paid for this kit. The refund window is not chosen here. `order.refunded` stays ignored and does not claw back credit. Details: [docs/REFUND_GLOSSARY.md](./docs/REFUND_GLOSSARY.md).

Support is GitHub Issues for 60 days from purchase. It is best-effort. There is no SLA. Founder time is at most about 2 hours per week. An Issue must include a failing chaos test name or a test-mode event id. Do not paste live secrets.

The Next example reads `examples/next/.env.local`, not the repo-root `.env`. See `examples/next/README.md`.

The Stripe webhook handler is `handle({ rawBody, signature })`. The Polar webhook handler is `handlePolar({ rawBody, webhookId, webhookTimestamp, webhookSignature })`. Pass the raw request body string. `npm test` covers both HMAC key eras and the five chaos files (Polar cases live in those files). The Next.js routes under `examples/next` are examples only.

Replace `grant_credit`, `send_email`, and `invite_github` with your own adapters. `invite_github` and `invoice.paid → [grant_credit]` are opt-in. See `README.md` for the HTTP status contract, Hookdeck honesty, and license (Single-app = one production application and one production Stripe account).

[SUPPORT.md](./SUPPORT.md) · [60s demo script](./docs/DEMO_60S.md) · [Refund glossary](./docs/REFUND_GLOSSARY.md) · Hookdeck: [README](./README.md#hookdeck) and [landing copy](./docs/LANDING.md).
