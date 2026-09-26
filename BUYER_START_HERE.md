# Buyer start

HookSteel is a Node kit. Postgres is the ship path.

1. Copy `.env.example` to `.env`. Set `DATABASE_URL` and `STRIPE_WEBHOOK_SECRET` to the `whsec_` that matches how you forward events (Stripe CLI secret and Dashboard endpoint secret are different).
2. `npm ci`
3. `npm run build` (writes `dist/` for plain Node and the Next example)
4. `npm run migrate`
5. `npm test` — five chaos scenarios against Postgres. Postgres 13+; CI uses 16.
6. `npm run outbox:drain -- --once` after webhooks have been accepted.

The Next example reads `examples/next/.env.local`, not the repo-root `.env`. See `examples/next/README.md`.

The webhook handler is `handle({ rawBody, signature })`. Pass the raw request body string. The Next.js route under `examples/next` is an example only.

Replace `grant_credit`, `send_email`, and `invite_github` with your own adapters. `invite_github` and `invoice.paid → [grant_credit]` are opt-in. See `README.md` for the HTTP status contract, Hookdeck honesty, and license (Single-app = one production application and one production Stripe account).

Polar webhook verification is not in this slice. `billing_events.provider` already allows `'polar'`.
