# Checksums

SHA-256 of the release zip. This file is not inside the zip. A hash stored inside the hashed bytes would change the hash.

| File | SHA-256 |
| --- | --- |
| `hooksteel-0.1.0.zip` | `c229b2c6dbeabf2acc3f66543adb99cca2ccee9a4325bbc9f757591dcf5cdf91` |

- Version: `0.1.0` (`package.json`)
- Repo path: `release/hooksteel-0.1.0.zip`
- Archive mtime pin: `2026-09-26T00:00:00Z` (`git archive --mtime`)
- Zip comment: `hooksteel-0.1.0` (replaces the git commit id `git archive` writes)
- Omitted: `node_modules/`, `.env` and `.env.local` (`.env.example` stays), `.git/`, database dumps (`*.dump`, `*.backup`, `*.sql.gz`, `pg_dump*`), `release/`, and this file
- Schema SQL under `migrations/` is included. It is not a database dump.

Verify:

```bash
sha256sum release/hooksteel-0.1.0.zip
```

The first field must equal the table. CoS copies that hex into the GitHub Release notes and the Polar file description. Steps: `docs/POLAR_DELIVERABLES.md`.

`npm run pack:release` rebuilds from `git archive` of `HEAD`. If the only differences since the last pack are this file and `release/`, the digest stays the same. Commit other edits before packing. The script refuses a dirty tree outside those two paths.
