# Huntbound deterministic asset packer

PB-02-03 materializes a validated Arena Fable PNG/JSON selection into a canonical Huntbound pack.
The tool reads the source export without modifying it, copies PNG bytes without decoding or
re-encoding them, and publishes a complete pack through a sibling-directory transaction.

## Commands

```text
node tools/asset-packer/cli.ts build [--check] --selection <path> --source-lock <path> [--source-root <path>] --output <path>
node tools/asset-packer/cli.ts verify-pack --pack-root <path>
node tools/asset-packer/cli.ts source verify --source-lock <path> [--source-root <path>]
```

`--source-root` falls back to `HUNTBOUND_PERSONAL_ASSET_SOURCE`. The CLI writes one JSON summary to
stdout on success and structured diagnostics to stderr on failure. Exit codes are stable:

- `0`: success;
- `1`: source validation, build, verification, or `--check` mismatch;
- `2`: invalid CLI usage.

`build --check` materializes into an external temporary directory, compares every relative file by
byte length and SHA-256, removes the temporary tree, and never modifies `--output`.

## Validation and transformation

Before creating a destination parent or staging directory, `build` verifies:

1. the selection and source-lock schemas;
2. the historical manifest hash, byte length, and schema;
3. every selected key, category, numeric identity, source path, media size, and media hash;
4. source-group and source-snapshot agreement;
5. animation and atlas consistency.

The historical `count` field is the total atlas sprite count for a group. It is preserved as
`frameCount`; `phases` is preserved as `phaseDurationsMs`. Consistency is checked with:

```text
frameCount = max(patternX, 1)
           * max(patternY, 1)
           * max(patternZ, 1)
           * layers
           * max(phaseDurationsMs.length, 1)
```

An empty phase list means the source supplied no timing for a static group. The packer does not
invent a duration. `atlasFrameCount` is the largest `startFrame + frameCount` in the entry.

Entries are ordered by stable key and source groups by group ID. Presentation values come directly
from the selection. Object keys use Unicode ordinal order in canonical JSON; arrays retain their
semantic order. `pack.json` is compact UTF-8 JSON with LF and one final newline.

## Pack tree

```text
<pack-root>/
  pack.json
  pack.sha256
  media/
    <source-media-sha256>.png
```

`pack.sha256` contains the lowercase SHA-256 of the exact `pack.json` bytes plus a newline. Media is
deduplicated by hash. Verification rechecks canonical manifest bytes, the pack hash, every unique
media file, its byte length, and its content hash.

## Transaction and filesystem safety

All source files are resolved through `realpath` and must remain inside the source root. A build
rejects drive roots, home/workspace roots, globs, symbolic-link transaction targets, and existing
destinations that are not directories. An existing destination must also verify as a complete pack
with the same `packId` and an exact tree containing no unreferenced files; unrelated, augmented, or
corrupt directories are never replaced. Destination, staging, and backup are validated direct
children of one resolved parent.

The pack is written to `.staging-<safe-pack-id>-<pid>`, reverified there, and then promoted with a
same-volume rename. An existing destination is first renamed to a sibling backup. Write failure
leaves the destination untouched; promotion failure renames the backup back into place. Staging and
backup trees are removed only after their resolved targets pass the safety checks.

## Reproducible fixture

The tracked PB-02 fixture produces three files and one deduplicated 68-byte PNG:

```text
pack.json SHA-256: 775d56f87b156349d9e81410d1703bac1499e1d332a2c1064dce498d18d97af5
media SHA-256:     431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460
tree bytes:        3471
```

Rebuild and compare it with:

```text
node tools/asset-packer/cli.ts build --selection packages/test-fixtures/assets/pb02/selection.json --source-lock packages/test-fixtures/assets/pb02/source-lock.json --source-root packages/test-fixtures/assets/pb02/source --output packages/test-fixtures/assets/pb02/expected/test/packs/pb-02-contract-coverage
node tools/asset-packer/cli.ts build --check --selection packages/test-fixtures/assets/pb02/selection.json --source-lock packages/test-fixtures/assets/pb02/source-lock.json --source-root packages/test-fixtures/assets/pb02/source --output packages/test-fixtures/assets/pb02/expected/test/packs/pb-02-contract-coverage
```

## Personal local pack

The personal export is never copied into tracked paths. Set `HUNTBOUND_PERSONAL_ASSET_SOURCE`, use
the selection and source lock under `packages/assets/catalog/`, and write only below
`apps/game/public/assets/personal/`. That directory is explicitly ignored. The frozen five-entry
personal pack verifies as seven files, five unique media files, and 241948 total bytes; its current
canonical `pack.json` SHA-256 is
`a711c757874783d25da4242102abd681f6d07528bc2481af0139126a877dff9c`.
