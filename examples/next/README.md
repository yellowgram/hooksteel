# HookSteel Next example

Next 15 lives only in this directory. The root package does not depend on `next`.

`app/api/webhooks/stripe/route.ts` reads `request.text()` and calls `handle({ rawBody, signature })`. Do not call `request.json()` on this route.

`app/api/webhooks/polar/route.ts` reads `request.text()` and passes `webhook-id`, `webhook-timestamp`, and `webhook-signature` to `handlePolar`. Do not call `request.json()` on that route either. Set `POLAR_WEBHOOK_SECRET` and `POLAR_EXPECT_LIVEMODE` in `.env.local`.

`next dev` does **not** load the repo-root `.env`. It loads `.env`, `.env.local`, and `.env.development` from **this** directory. The root `.env.example` is the source of truth for variable names.

```bash
# from the repo root, after Postgres is up
npm ci
npm run build
npm run migrate

cd examples/next
cp .env.example .env.local
# set STRIPE_WEBHOOK_SECRET in .env.local to the CLI whsec_
npm ci
npm run dev
```

Point `stripe listen --forward-to localhost:3000/api/webhooks/stripe` at this route. Put that CLI `whsec_` in `examples/next/.env.local`, along with `DATABASE_URL` and `STRIPE_EXPECT_LIVEMODE`.
