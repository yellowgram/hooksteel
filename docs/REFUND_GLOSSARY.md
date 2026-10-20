# Refund glossary

Two different things that both sound like "refund". Mixing them up causes support confusion.

## Replay CLI

Operator command on your Postgres. It is not a refund.

```bash
npx hooksteel replay list
npx hooksteel replay dry-run <dead_letter_id>
npx hooksteel replay execute <dead_letter_id>
npx hooksteel drain --once
```

Replay re-opens one dead-lettered outbox row so the drain can run that adapter again. It does not move money. It does not call Polar or Stripe.

## Provider `order.refunded`

A Polar **webhook type** about your own customer's order.

HookSteel stores `order.refunded` as `ignored` (empty adapter map). It does not claw back credit. It does not invoke the replay CLI.

`order.paid` and `order.refunded` are different events. They do not share a `webhook-id`.

## Which one is this?

| What the person said | What it is |
| --- | --- |
| "Replay this dead letter" / `hooksteel replay execute` | Replay CLI. No money moves. |
| "The customer's order was refunded" / Polar sends `order.refunded` | Provider webhook. Ignored by default. No credit clawback. |
