# HookSteel Next example

Next 15 lives only in this directory. The root package does not depend on `next`.

`app/api/webhooks/stripe/route.ts` reads `request.text()` and calls `handle({ rawBody, signature })`. Do not call `request.json()` on this route.

```bash
# from the repo root, after migrate
cd examples/next
npm install
npm run dev
```

Point `stripe listen --forward-to localhost:3000/api/webhooks/stripe` at this route and put that CLI `whsec_` in the root `.env`.
