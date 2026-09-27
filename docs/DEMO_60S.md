# 60-second demo script

**This clip is the product.** One continuous take. Stripe and Polar in the same clip. Not two provider demos.

**The founder-approved cut is GitHub Release `clip-60s-approved`.** This file is the script. The repo does not store the video bytes. The public post is linked from the README Quickstart. The Polar listing is live as of 2026-09-27 and sells `hooksteel-0.1.1.zip`.

## Kill criterion

If this one clip cannot beat the Stripe docs and the Hookdeck homepage, it is not the buyer clip. Those pages do not show the same event four times becoming one side effect, a rollback mid-fulfillment that does not grant again, and Stripe and Polar in the same minute. If the clip cannot, stop. Do not add a sixth chaos scenario. Do not pivot to a hosted gateway. Do not split the proof into a Stripe video and a Polar video and call either one the gate.

## Off camera

Postgres must already be up. Compose and CI use Postgres 16. No live Stripe key. No live Polar key. The tests mint signatures from `tests/fixtures/stripe/sign.ts` and `tests/fixtures/polar/sign.ts`.

```bash
docker compose up -d
cp .env.example .env
npm ci
npm run migrate
```

## On camera — one clip

Camera stays on this terminal. One command. No second take for the other provider.

```bash
npm run demo:60s
```

That command runs two existing files and no others, and each file already runs Stripe and then Polar:

- `tests/chaos/01-duplicate-delivery.test.ts`
- `tests/chaos/05-db-rollback-mid-fulfillment.test.ts`

Leave these pass lines on screen, in this order, in the same clip:

1. `duplicate delivery: same signed event 4× concurrent yields one row and one invocation per adapter`
2. `polar duplicate delivery: same signed order.paid 4× concurrent yields one row and one invocation per adapter`
3. `crash after adapter_invocations write and before completed_at re-drains to count 1`
4. `polar crash after adapter_invocations write and before completed_at re-drains to count 1`

## What to say, over that same take

Do not cut away.

- Stripe `checkout.session.completed` is posted four times concurrently (fixture id `evt_dup_1`). One `billing_events` row. The handler returns 200 and does not run adapters. Two outbox rows means two adapters (`grant_credit` and `send_email`), not two grants. After drain, `stripe|evt_dup_1|grant_credit` exists once.
- Polar is the next lines in this same output, not a later video. `order.paid` four times (webhook id `msg_polar_dup_1`). `polar|msg_polar_dup_1|grant_credit` exists once.
- Rollback is still this clip. Different fixtures (`evt_mid_1`, Polar `msg_polar_mid_1`). The `grant_credit` invocation commits, then the drain throws before `completed_at`. A second drain leaves that count at 1. Stripe, then Polar, same terminal.
- Say this in the same breath: use them for ingress; this is the outbox you keep.

## If it does not fit in one clip

`npm run demo:60s` is the whole take, and only after migrate has already finished. If that command cannot finish inside the minute, the take fails the kill criterion. Do not swap in a diagram. Do not cut the rollback lines. Do not drop Polar to save time. Do not drop Stripe to save time. Do not approve two clips, one per provider. Do not add a chaos file to make the story shorter.

`npm test` remains the code ship gate (all five files). It is not a second demo. The thing that has to beat the Stripe docs and the Hookdeck homepage is this one clip.

## Listing

The Polar listing is live as of 2026-09-27. It sells `hooksteel-0.1.1.zip`. See `docs/POLAR_DELIVERABLES.md`. The order that closed go-live was this clip, then a post where the burn already happened (use them for ingress; this is the outbox you keep), then the listing. That order is finished. It is not a new gate.

## Not in this file

No live keys. No Polar checkout URL. Soft-WTP off. The purchase-refund window stays 14 days. This clip is not that refund. The Polar listing is live. Delivery is the public source-available repository plus the Polar zip.
