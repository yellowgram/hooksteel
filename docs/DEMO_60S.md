# 60-second demo script

**Script only.** The founder films and approves a recording later. This repo has no video.

**Kill criterion.** If this cannot be shown in about 60 seconds — four deliveries, one `grant_credit`, and a crash before `completed_at` that does not grant a second time — do not list HookSteel on Polar. Asking Cursor plus the Stripe docs does not show that crash. Stop. Do not add a sixth chaos scenario. Do not pivot to a hosted gateway.

## Off camera

Postgres must already be up. Compose and CI use Postgres 16. No live Stripe key. No live Polar key. The tests mint signatures from `tests/fixtures/stripe/sign.ts` and `tests/fixtures/polar/sign.ts`.

```bash
docker compose up -d
cp .env.example .env
npm ci
npm run migrate
```

## On camera

```bash
npm run demo:60s
```

That npm script runs two existing files and no others:

- `tests/chaos/01-duplicate-delivery.test.ts`
- `tests/chaos/05-db-rollback-mid-fulfillment.test.ts`

Leave these pass lines on screen:

1. `duplicate delivery: same signed event 4× concurrent yields one row and one invocation per adapter`
2. `polar duplicate delivery: same signed order.paid 4× concurrent yields one row and one invocation per adapter`
3. `crash after adapter_invocations write and before completed_at re-drains to count 1`
4. `polar crash after adapter_invocations write and before completed_at re-drains to count 1`

## What to say

- Stripe `checkout.session.completed` is posted four times concurrently (fixture id `evt_dup_1`). Polar `order.paid` is the same shape (webhook id `msg_polar_dup_1`).
- One `billing_events` row. The handler returns 200 and does **not** run adapters. Two outbox rows means two adapters (`grant_credit` and `send_email`), not two grants. After drain, `stripe|evt_dup_1|grant_credit` exists once. The Polar key `polar|msg_polar_dup_1|grant_credit` exists once.
- The rollback file is the part a chat answer skips. It is a different fixture (`evt_mid_1`, Polar `msg_polar_mid_1`). The `grant_credit` invocation commits, then the drain throws before `completed_at`. A second drain leaves that invocation count at 1.
- Same event four times → one grant. Owned outbox. Stripe and Polar.

## If it does not fit

`npm run demo:60s` is the whole take, and only after migrate has already finished. If that command cannot finish inside the minute, the take fails the kill criterion. Do not swap in a diagram. Do not cut the rollback tests out of the approved recording. Do not add a chaos file to make the story shorter.

`npm test` remains the ship gate (all five files). The 60-second cut is not a smaller product.

## Not in this file

No recording. No live keys. No Polar checkout. Listing stays dark until the founder approves a film of this script.
