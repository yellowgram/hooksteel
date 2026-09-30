# 60-second demo script

**Frozen for LaunchGate SR×3.** This file is the source of truth for the 60-second clip. The sections are Kill, Off camera, On camera, VO, and Shot timing. Do not film from this pass. Do not reseal the zip. Do not change the package version.

**This clip is the product.** One continuous take. Stripe and Polar in the same clip. Not two provider demos.

**The founder-approved cut is GitHub Release `clip-60s-approved`.** This file is the script. The repo does not store the video bytes. The Polar listing is live as of 2026-09-27 and sells `hooksteel-0.1.1.zip`. A cut that fails the Kill section is not a listing asset.

## Kill

If this one clip cannot beat the Stripe docs and the Hookdeck homepage, do not list.

Those pages do not show the same event four times becoming one side effect, a rollback mid-fulfillment that does not grant again, and Stripe and Polar in the same minute.

If a builder puts Stripe’s “Handle duplicate events — log the event IDs you’ve processed” screenshot beside this page’s “Record. Deliver. Keep.” brochure, they keep the free doc and bounce.

If the clip cannot make the picture those sentences name, stop. Do not add a sixth chaos scenario. Do not pivot to a hosted gateway. Do not split the proof into a Stripe video and a Polar video. Do not approve two clips. `npm run demo:60s` is the whole take, and only after migrate has already finished. If that command cannot finish inside the minute, the take fails. Do not swap in a diagram. Do not cut the rollback lines. Do not drop Polar to save time. Do not drop Stripe to save time.

`npm test` remains the code ship gate (all five files). It is not a second demo. The thing that has to beat the Stripe docs and the Hookdeck homepage is this one clip.

## Off camera

Postgres must already be up. Compose and CI use Postgres 16. No live Stripe key. No live Polar key. No Polar checkout URL. The tests mint signatures from `tests/fixtures/stripe/sign.ts` and `tests/fixtures/polar/sign.ts`.

The purchase-refund window is 14 days. That clock is not the 60-day support window and not the replay CLI. This clip is not that refund.

```bash
docker compose up -d
cp .env.example .env
npm ci
npm run migrate
```

## On camera

Camera stays on this terminal. One command. Stripe and Polar in that same output. No second take for the other provider.

```bash
npm run demo:60s
```

That command runs two existing files and no others, and each file already runs Stripe and then Polar:

- `tests/chaos/01-duplicate-delivery.test.ts`
- `tests/chaos/05-db-rollback-mid-fulfillment.test.ts`

Leave these pass lines on screen, in this order, in the same clip. Hold each one full-width for at least 2.5 seconds. Green PASS is not the proof. The line is.

1. `duplicate delivery: same signed event 4× concurrent yields one row and one invocation per adapter`
2. `polar duplicate delivery: same signed order.paid 4× concurrent yields one row and one invocation per adapter`
3. `crash after adapter_invocations write and before completed_at re-drains to count 1`
4. `polar crash after adapter_invocations write and before completed_at re-drains to count 1`

On screen, not spoken: `evt_dup_1`, `msg_polar_dup_1`, `evt_mid_1`, `msg_polar_mid_1`. Two outbox rows are two adapters (`grant_credit` and `send_email`), not two grants. Hold `grant_credit` at count 1: `stripe|evt_dup_1|grant_credit` once, `polar|msg_polar_dup_1|grant_credit` once, and the mid-fulfillment re-drain stays at 1.

Title card, under the open VO, not a silent preroll: `HookSteel — same billing event ×4, one side effect. Stripe + Polar.`

End card, about 3 seconds: owned outbox, not a gateway. `yellowgram.dev`. `hello@yellowgram.dev`. No Polar checkout URL.

## VO

Say this over that same take. Do not cut away. Do not speak the fixture ids. Do not claim exactly-once delivery from Stripe or Polar. The provider can send the event more than once. The picture is one `grant_credit` in your database.

### Open — first 10 seconds

Say these two lines in this order. Finish both before 0:10. Do not swap in another honesty line.

1. Stripe sent the same Checkout event four times after our 500. Credit granted once.
2. use them for ingress; this is the outbox you keep

### Fear

Stripe’s free page already tells a builder to log the event IDs they’ve processed. Set that screenshot beside a brochure that only says “Record. Deliver. Keep.” and they keep the free doc. The fear is the 500 after Checkout: the id can sit in a log, and the side effect can still run when the provider sends the event again.

### Proof

Say this while the four pass lines are on screen, in that order. Polar is the next lines in this same output, not a later video.

- Stripe `checkout.session.completed` is posted four times concurrently. One `billing_events` row. The handler returns 200 and does not run adapters. Two outbox rows means two adapters (`grant_credit` and `send_email`), not two grants. After drain, `stripe|evt_dup_1|grant_credit` exists once.
- Polar `order.paid` four times. `polar|msg_polar_dup_1|grant_credit` exists once.
- Rollback is still this clip. The `grant_credit` invocation commits, then the drain throws before `completed_at`. A second drain leaves that count at 1. Stripe, then Polar, same terminal.
- You run this on your Postgres. `handle` / `handlePolar`, then `outbox:drain`. No live keys.

### End

On the end card, say the honesty line again:

use them for ingress; this is the outbox you keep

## Shot timing

One clock. The VO timecodes match this table. The command is already running under the open; it is not the first spoken line.

| Clock | Picture | Sound |
| --- | --- | --- |
| 0:00–0:06 | Title card under the terminal. `npm run demo:60s` is already on screen. | Stripe sent the same Checkout event four times after our 500. Credit granted once. |
| 0:06–0:10 | Same terminal. Caption the honesty line. | use them for ingress; this is the outbox you keep |
| 0:10–0:16 | Stripe doc title on one side, “Record. Deliver. Keep.” on the other, then back to the terminal. | Fear. The free page logs processed ids. The brochure loses that screenshot. |
| 0:16–0:26 | Pass line 1, full-width at least 2.5s. Then `billing_events` 1, outbox 2, `grant_credit` 1. | Stripe proof. Two rows, two adapters, one grant. |
| 0:26–0:34 | Pass line 2, full-width at least 2.5s. | Polar proof. Same take. One `grant_credit`. |
| 0:34–0:44 | Pass line 3, full-width at least 2.5s. | Crash after the invocation write, before `completed_at`. Second drain still 1. |
| 0:44–0:52 | Pass line 4, full-width at least 2.5s. | Same crash on Polar. Still one. |
| 0:52–0:57 | Monday line on screen. | You run this on your Postgres. `handle` / `handlePolar`, then `outbox:drain`. |
| 0:57–1:00 | End card. Owned outbox. `yellowgram.dev`. `hello@yellowgram.dev`. No Polar checkout URL. | use them for ingress; this is the outbox you keep |
