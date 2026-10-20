# Polar webhooks

Polar verify is stdlib HMAC (`node:crypto`): two key eras, the exact raw body, and the headers `webhook-id`, `webhook-timestamp`, and `webhook-signature`. There is no `@polar-sh/sdk`, no `standardwebhooks`, no `svix`, and no Polar access token. A 300 second window applies in both directions. Comparison uses `timingSafeEqual` on digest bytes. Only `v1` tokens are accepted.

Secrets generated before 2026-09-08 00:00 UTC use the UTF-8 bytes of the full `whsec_…` string as the HMAC key. Secrets generated on or after that instant use Standard Webhooks: strip `whsec_` and base64-decode the remainder. The secret string does not say which era it is, so HookSteel tries both. `polar_whs_` and any other prefix are rejected.

Dashboard delivery format must be **Raw** JSON. Slack and Discord bodies are not parsed. The secret is the endpoint `whsec_`.

`provider_event_id` is the `webhook-id` header. It is not `data.id`. `order.created` and `order.paid` share an order id and are different events.

`POLAR_EXPECT_LIVEMODE` is an operator declaration written to `billing_events.livemode`. Unset means false (sandbox). Polar does not send a livemode field. A production Polar endpoint must set this true. It is not inferred from the secret. There is no `livemode_mismatch` 400 on this path.

Polar publishes a webhook IP list on the [delivery page](https://polar.sh/docs/integrate/webhooks/delivery). HookSteel does not allowlist those IPs. They change, and they are not authentication.

The stored JSONB may include customer email, billing address, and tax id. You own retention.

Fetch / Hono (`Request`):

```ts
import { handlePolar } from 'hooksteel';

app.post('/api/webhooks/polar', async (c) => {
  const rawBody = await c.req.text();
  return handlePolar({
    rawBody,
    webhookId: c.req.header('webhook-id') ?? null,
    webhookTimestamp: c.req.header('webhook-timestamp') ?? null,
    webhookSignature: c.req.header('webhook-signature') ?? null,
  });
});
```

Express. Use `express.raw` so the bytes that are signed are the bytes you verify. `req.body` is a Buffer. Call `Buffer.toString('utf8')`.

```ts
import express from 'express';
import { handlePolar } from 'hooksteel';

const app = express();

app.post(
  '/api/webhooks/polar',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
    const header = (name: string) => {
      const value = req.headers[name];
      return typeof value === 'string' ? value : null;
    };
    const response = await handlePolar({
      rawBody,
      webhookId: header('webhook-id'),
      webhookTimestamp: header('webhook-timestamp'),
      webhookSignature: header('webhook-signature'),
    });
    res.status(response.status).type(response.headers.get('content-type') ?? 'application/json');
    res.send(await response.text());
  },
);
```

Do not mount `express.json()` on this route. The Next route under `examples/next` is `request.text()` plus the three headers.

| Condition | Status | Persist? | Outbox? |
| --- | --- | --- | --- |
| Missing / placeholder / non-`whsec_` secret | **400** `invalid_webhook_secret` | No | No |
| Missing header, bad timestamp, tamper, wrong key, no `v1` match | **400** `invalid_signature` | No | No |
| Signature ok, body not a JSON object with string `type` | **400** `invalid_payload` | No | No |
| First accept + mapped adapters | **200** `outboxed` | Yes | Yes, same txn |
| First accept + empty map | **200** `ignored` | Yes (`processed_at` set) | Zero |
| Duplicate `webhook-id` already stored | **200** `duplicate` | No new row | No |
| DB unavailable / txn failure / unexpected error after verify | **500** `transient` | No (rolled back) | No |

Polar retries non-2xx (up to 10, exponential backoff) and disables the endpoint after 10 consecutive non-2xx responses. 400 does not mean Polar stops. Poison stays 400. A database blip stays 500. Returning 200 for a bad signature would ACK poison.

## Default Polar adapter map

| Event type | Adapters |
| --- | --- |
| `order.paid` | `grant_credit`, `send_email` |
| `order.created` | `[]` (persisted as `ignored`) |
| `order.updated` | `[]` (persisted as `ignored`) |
| `order.refunded` | `[]` (persisted as `ignored`; no credit clawback) |
| `checkout.created` / `checkout.updated` / `checkout.expired` | `[]` |
| `subscription.canceled` / `subscription.revoked` | `[]` |
| Any other verified type | `[]` |

`invite_github` is **opt-in**. It is not in the default Polar map.

Every `order.paid` grants, including `billing_reason=subscription_cycle`. Each delivery has its own `webhook-id`. That is a new payment. HookSteel does not special-case `billing_reason`. Integrators with subscriptions and do not want a credit on every renewal replace the `order.paid` row.

`order.updated` is not an opt-in grant alongside `order.paid`. Polar also sends `order.updated` when the order becomes paid. Mapping both `order.updated` and `order.paid` to the same adapters grants twice.

`checkout.updated → [grant_credit, send_email]` only if you also filter `data.status === 'succeeded'` and remove `order.paid` from those same adapters. HookSteel does not ship that filter. `checkout.updated` fires for `open`, `expired`, `confirmed`, `succeeded`, and `failed`.

```ts
import { DEFAULT_POLAR_ADAPTER_MAP, configurePolarAdapterMap } from 'hooksteel';

configurePolarAdapterMap({
  ...DEFAULT_POLAR_ADAPTER_MAP,
  'order.paid': ['grant_credit', 'send_email', 'invite_github'],
});
```

`order.paid` outbox payload: `{order_id, customer, customer_email, amount_total, currency, status, paid, billing_reason}`. `customer` is `data.customer_id`. `amount_total` is `data.total_amount` in cents (0 is a real amount). `customer_email` null completes `send_email` as `skipped_no_email`. Checkout opt-in payload: `{checkout_id, customer, customer_email, amount_total, currency, status}`. Any other opted-in type is `{object_id}` only.
