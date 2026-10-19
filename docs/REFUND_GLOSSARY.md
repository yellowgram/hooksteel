# Refund glossary

Two different things that both sound like "refund". Mixing them up causes support confusion.

## Replay CLI

Operator command on your Postgres. It is not a refund.

```bash
npm run replay:list
npm run replay:dry-run -- <dead_letter_id>
npm run replay:execute -- <dead_letter_id>
npm run outbox:drain -- --once
```

Replay re-opens one dead-lettered outbox row so the drain can run that adapter again. It does not move money. It does not call Polar or Stripe.

## Provider `order.refunded`

A Polar **webhook type** about your own customer's order.

v0.1 stores `order.refunded` as `ignored` (empty adapter map). It does not claw back credit. It does not invoke the replay CLI.

`order.paid` and `order.refunded` are different events. They do not share a `webhook-id`.

## Which one is this?

| What the person said | What it is |
| --- | --- |
| "Replay this dead letter" / `npm run replay:execute` | Replay CLI. No money moves. |
| "The customer's order was refunded" / Polar sends `order.refunded` | Provider webhook. Ignored in v0.1. No credit clawback. |
