# Polar webhook path

Next slice. This directory intentionally has no verifier and no Polar SDK import.

`billing_events.provider` already allows `'polar'`. A later slice can insert Polar events with the same outbox transaction without rewriting these migrations.
