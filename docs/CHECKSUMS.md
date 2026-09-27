# Checksums

SHA-256 of the release zip. This file is not inside the zip. A hash stored inside the hashed bytes would change the hash.

| File | SHA-256 |
| --- | --- |
| `hooksteel-0.1.1.zip` | `c2b224921d9e47b62beb2c7378b274f0d4f6b5c4dff421b8a48f1b2c104c4083` |

- Version: `0.1.1` (`package.json`)
- Repo path: `release/hooksteel-0.1.1.zip`
- Archive mtime pin: `2026-09-26T00:00:00Z` (`git archive --mtime`)
- Zip comment: `hooksteel-0.1.1` (replaces the git commit id `git archive` writes)
- Omitted: `node_modules/`, `.env` and `.env.local` (`.env.example` stays), `.git/`, database dumps (`*.dump`, `*.backup`, `*.sql.gz`, `pg_dump*`), `release/`, and this file
- Schema SQL under `migrations/` is included. It is not a database dump.

## Sealed prior artifact

`npm run pack:release` does not rebuild this file. Do not reseal it. Do not move tag `v0.1.0`.

| File | SHA-256 |
| --- | --- |
| `hooksteel-0.1.0.zip` | `dddcfe5dca204cd92b2c1b2a10adbb99515d0552a4a5947693aff34a29573a65` |

Verify:

```bash
sha256sum release/hooksteel-0.1.1.zip
```

The first field must equal the table. CoS copies that hex into the GitHub Release notes and the Polar file description. Steps: `docs/POLAR_DELIVERABLES.md`.

`npm run pack:release` rebuilds from `git archive` of `HEAD`. If the only differences since the last pack are this file and `release/`, the digest stays the same. Commit other edits before packing. The script refuses a dirty tree outside those two paths.
