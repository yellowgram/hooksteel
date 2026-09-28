# Refund glossary

Three different words. Mixing them up is a support fire.

The purchase-refund window is **14 days** (founder lock 2026-09-26). The Polar listing is live and the refund window stays 14 days. Do not change it. Do not copy a different rail default over 14 days. This page is not a checkout URL.

Support length is a separate clock: GitHub Issues for 60 days from purchase (`SUPPORT.md`). That is not a money-back window.

## Polar purchase refund

Money returned for buying the HookSteel kit on Polar (Polar organization dashboard **Suthirth solutions**; not renamed this week). The Polar listing is live.

- It is a Polar dashboard action on the **kit order**.
- The window is **14 days**. Do not change it.
- It does not run the replay CLI.
- It does not delete `billing_events` rows in the buyer's database.

## Replay CLI

Operator command on the buyer's Postgres. It is not a refund.

```bash
npm run replay:list
npm run replay:dry-run -- <dead_letter_id>
npm run replay:execute -- <dead_letter_id>
npm run outbox:drain -- --once
```

Replay re-opens one dead-lettered outbox row so the drain can run that adapter again. It does not move money. It does not call Polar. Yellowgram is not on-call for the buyer's dead-letter queue.

## Provider `order.refunded`

A Polar **webhook type** about the buyer's own customer order.

v0.1 stores `order.refunded` as `ignored` (empty adapter map). It does not claw back credit. It does not invoke the replay CLI. It is not a refund of the HookSteel kit purchase.

`order.paid` and `order.refunded` are different events. They do not share a `webhook-id`.

## Which one is this?

| What the person said | What it is |
| --- | --- |
| "Refund my $89" / "I want my money back for the kit" | Polar purchase refund. Window is 14 days. Not an Issue, and not the CLI. |
| "Replay this dead letter" / `npm run replay:execute` | Replay CLI. No money moves. |
| "The customer's order was refunded" / Polar sends `order.refunded` | Provider webhook. Ignored in v0.1. No credit clawback. |
