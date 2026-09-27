#!/usr/bin/env bash
# Build release/hooksteel-<version>.zip from git archive of HEAD and write
# docs/CHECKSUMS.md. The checksum file and the release/ directory are not
# inside the zip. git archive stamps the commit id into the zip comment;
# this script replaces that comment with hooksteel-<version> so committing
# the checksum and the zip does not change the digest.
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

version="$(python3 -c 'import json; print(json.load(open("package.json"))["version"])')"
if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "refusing: package.json version is not numeric semver: $version" >&2
  exit 1
fi

name="hooksteel-${version}.zip"
mtime="2026-09-26T00:00:00Z"

while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  if [[ "$line" == R* ]] || [[ "$line" == *" -> "* ]]; then
    echo "refusing: unexpected git status line: $line" >&2
    exit 1
  fi
  path="${line:3}"
  case "$path" in
    docs/CHECKSUMS.md|release/hooksteel-*.zip) ;;
    *)
      echo "refusing: commit or stash before packing (zip is git archive of HEAD): $path" >&2
      exit 1
      ;;
  esac
done < <(git status --porcelain=v1)

mkdir -p "$root/release"
zip_path="$root/release/$name"

git archive \
  --format=zip \
  --mtime="$mtime" \
  --prefix="hooksteel-${version}/" \
  --output="$zip_path" \
  HEAD \
  -- . \
  ':(exclude)docs/CHECKSUMS.md' \
  ':(exclude)release' \
  ':(exclude)release/**'

python3 - "$zip_path" "$version" "$name" "$mtime" <<'PY'
import hashlib
import sys
import zipfile
from pathlib import Path

zip_path, version, name, mtime = sys.argv[1:]
prefix = f"hooksteel-{version}/"
comment = f"hooksteel-{version}".encode()
with zipfile.ZipFile(zip_path, "a") as zf:
    zf.comment = comment
blob = Path(zip_path).read_bytes()
digest = hashlib.sha256(blob).hexdigest()

with zipfile.ZipFile(zip_path) as zf:
    names = zf.namelist()
    if zf.comment != comment:
        print("zip comment was not pinned", file=sys.stderr)
        Path(zip_path).unlink(missing_ok=True)
        sys.exit(1)
    payloads = {path: zf.read(path) for path in names if not path.endswith("/")}

def base(path: str) -> str:
    return path.rstrip("/").split("/")[-1]

bad: list[tuple[str, str]] = []
for path in names:
    parts = [part for part in path.split("/") if part]
    b = base(path)
    if "node_modules" in parts:
        bad.append(("node_modules", path))
    if ".git" in parts:
        bad.append((".git", path))
    if b != ".env.example" and (
        b in {".env", ".env.local"} or (b.startswith(".env.") and "example" not in b)
    ):
        bad.append(("env", path))
    if b.endswith((".dump", ".backup", ".sql.gz")) or "pg_dump" in b:
        bad.append(("dump", path))
    if b == "CHECKSUMS.md":
        bad.append(("checksum-inside-zip", path))
    if b.endswith(".zip"):
        bad.append(("nested-zip", path))
    if not path.endswith("/"):
        data = payloads[path]
        checkout_host = b"buy" + b".polar.sh"
        checkout_id = b"polar" + b"_cl_"
        if checkout_host in data or checkout_id in data:
            bad.append(("checkout-url", path))

required = [
    f"{prefix}.env.example",
    f"{prefix}examples/next/.env.example",
    f"{prefix}LICENSE",
    f"{prefix}package.json",
    f"{prefix}package-lock.json",
    f"{prefix}SUPPORT.md",
    f"{prefix}BUYER_START_HERE.md",
    f"{prefix}CHANGELOG.md",
    f"{prefix}migrations/001_billing_events.sql",
    f"{prefix}docs/DEMO_60S.md",
    f"{prefix}docs/POLAR_DELIVERABLES.md",
    f"{prefix}docs/REFUND_GLOSSARY.md",
    f"{prefix}docs/LANDING.md",
    f"{prefix}docs/COMMERCIAL_GRANT.md",
    f"{prefix}docs/COMMERCIAL_LOCK.md",
    f"{prefix}tests/chaos/01-duplicate-delivery.test.ts",
    f"{prefix}tests/chaos/02-out-of-order.test.ts",
    f"{prefix}tests/chaos/03-signature-fail.test.ts",
    f"{prefix}tests/chaos/04-handler-timeout.test.ts",
    f"{prefix}tests/chaos/05-db-rollback-mid-fulfillment.test.ts",
]
missing = [item for item in required if item not in names]
chaos = [path for path in names if path.startswith(f"{prefix}tests/chaos/") and path.endswith(".test.ts")]
if len(chaos) != 5:
    missing.append(f"exactly 5 chaos files, found {len(chaos)}: {chaos}")

if bad or missing:
    print("zip contract failed", file=sys.stderr)
    for kind, path in bad:
        print(f" forbidden {kind}: {path}", file=sys.stderr)
    for item in missing:
        print(f" missing: {item}", file=sys.stderr)
    Path(zip_path).unlink(missing_ok=True)
    sys.exit(1)

text = f"""# Checksums

SHA-256 of the release zip. This file is not inside the zip. A hash stored inside the hashed bytes would change the hash.

| File | SHA-256 |
| --- | --- |
| `{name}` | `{digest}` |

- Version: `{version}` (`package.json`)
- Repo path: `release/{name}`
- Archive mtime pin: `{mtime}` (`git archive --mtime`)
- Zip comment: `hooksteel-{version}` (replaces the git commit id `git archive` writes)
- Omitted: `node_modules/`, `.env` and `.env.local` (`.env.example` stays), `.git/`, database dumps (`*.dump`, `*.backup`, `*.sql.gz`, `pg_dump*`), `release/`, and this file
- Schema SQL under `migrations/` is included. It is not a database dump.

## Sealed prior artifact

`npm run pack:release` does not rebuild this file. Do not reseal it. Do not move tag `v0.1.0`.

| File | SHA-256 |
| --- | --- |
| `hooksteel-0.1.0.zip` | `dddcfe5dca204cd92b2c1b2a10adbb99515d0552a4a5947693aff34a29573a65` |

Verify:

```bash
sha256sum release/{name}
```

The first field must equal the table. CoS copies that hex into the GitHub Release notes and the Polar file description. Steps: `docs/POLAR_DELIVERABLES.md`.

`npm run pack:release` rebuilds from `git archive` of `HEAD`. If the only differences since the last pack are this file and `release/`, the digest stays the same. Commit other edits before packing. The script refuses a dirty tree outside those two paths.
"""
Path("docs/CHECKSUMS.md").write_text(text)
print(digest)
PY
