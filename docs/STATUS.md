# HookSteel — STATUS

**Product:** HookSteel — billing event reliability for Stripe and Polar webhooks
**Owner:** yellowgram · hello@yellowgram.dev · https://www.yellowgram.dev/oss
**Repo:** https://github.com/yellowgram/hooksteel
**Updated:** 2026-10-19

## Phase

Open source (MIT) from 0.2.0. No longer sold. Releases `v0.1.0` and `v0.1.1` (zips in `release/`, SHA-256 in `docs/CHECKSUMS.md`) were published under the previous license and are kept unchanged as historical artifacts.

- Stripe path, Polar path (`handle` / `handlePolar`), migrations, drain, five chaos tests, and the replay CLI are on `main`.
- RD1 and RD2 are README known limits. Do not edit `src/outbox/replay.ts` to "fix" them.
- Earlier design passes, code reviews, and go-live notes are in the git history.
