# Troubleshooting

**Signatures fail on events you just forwarded.** The route must verify the raw body. Fetch and Next use `request.text()`. Express uses `express.raw({ type: 'application/json' })` and `req.body` as a Buffer — not `req.text()`, not `req.headers.get`, and not `express.json()`. `request.json()` or a JSON body parser changes bytes and `constructEvent` returns 400. Also check CLI `whsec_` vs Dashboard `whsec_`: they are not interchangeable. For the Next example, put `DATABASE_URL`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_EXPECT_LIVEMODE` in `examples/next/.env.local`. `next dev` does not load the repo-root `.env`.

**Polar signatures fail.**

- Placeholder secret (`whsec_replace_me`, `replace_me`, `changeme`, `test`, or empty) or any secret that does not start with `whsec_` returns 400 `invalid_webhook_secret` and stores nothing.
- `polar_whs_` is rejected. Rotate the endpoint secret in the Polar dashboard until it is a `whsec_…` value.
- Raw body re-parsed: `request.json()`, `JSON.parse` then `JSON.stringify`, or `express.json()` changes bytes and the HMAC fails. Use `request.text()`, or `express.raw({ type: 'application/json' })` and `Buffer.toString('utf8')`. Do not mount `express.json()` on the Polar route.
- Wrong key era: secrets generated before 2026-09-08 00:00 UTC and secrets generated on or after that instant use different HMAC keys. HookSteel tries both. A verifier that only uses one era fails the other.
- The endpoint is disabled after 10 consecutive non-2xx responses. 400 does not mean Polar stops. Ten strikes disable the endpoint. Do not return 200 for a bad signature to avoid that disable.
- Mapping both `order.updated` and `order.paid` to the same adapters grants twice.

For the Next example, put `POLAR_WEBHOOK_SECRET` and `POLAR_EXPECT_LIVEMODE` in `examples/next/.env.local` as well.
