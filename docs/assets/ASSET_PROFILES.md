# Huntbound asset build profiles

PB-02 profile trees are the filesystem boundary between generated packs and the browser build. A
profile root contains one canonical `catalog.json` plus the pack trees referenced by that catalog:

```
assets/<profile>/
  catalog.json
  packs/pb-02-contract-coverage/
    pack.json
    pack.sha256
    media/<sha256>.png
```

The supported profiles are:

| Profile | Purpose | Allowed source classes |
| --- | --- | --- |
| `test` | reproducible repository fixture and default build | `huntbound-test`, `huntbound-owned` |
| `personal` | local-only export validation | `cipsoft-personal`, `huntbound-owned` |
| `product` | distributable build gate | `huntbound-owned`, `huntbound-test` |

`buildProfiles` on every pack group and the profile license policy are independent checks. A group
must list the requested profile, and `product` rejects every `cipsoft-personal` group with
`ASSET_LICENSE_FORBIDDEN`, including transitive groups discovered through every catalog pack.

## Deterministic and local commands

The reproducible path does not require the external Arena Fable export:

```
corepack pnpm assets:check
corepack pnpm assets:stage:test
corepack pnpm assets:stage:product
corepack pnpm assets:product:check
corepack pnpm build
```

`assets:check` regenerates the synthetic pack in a temporary tree and compares it with the golden
pack, then validates the tracked `test` catalog transitively. Staging validates the source catalog
first, applies the target profile policy to every selected pack, copies pack/media bytes unchanged,
rewrites only the destination catalog profile, validates the staged tree, and promotes it as a
complete sibling transaction. The generated `apps/game/public/assets/test`,
`apps/game/public/assets/product`, and `apps/game/public/assets/personal` trees are ignored.

The personal path is intentionally explicit and local:

```
$env:HUNTBOUND_PERSONAL_ASSET_SOURCE = 'C:\path\to\arena-fable\tibia'
corepack pnpm assets:personal:generate
corepack pnpm assets:personal:check
```

The Venore hunt uses the same env var and a dedicated pair:

```
corepack pnpm assets:pb04:personal:generate
corepack pnpm assets:pb04:personal:check
```

`assets:pb04:personal:check` is the step that detects a stale personal pack: it rebuilds the
source lock against the private export, materializes the pack, and runs `checkHuntPack` so a
declared hunt key that the export cannot resolve fails with `HUNT_ASSET_KEY_MISSING`. It is not
part of `check` or `verify` because it depends on art that is not in Git and would fail on a
clean clone.

`build-profile` accepts only `HUNTBOUND_PERSONAL_ASSET_SOURCE` through `--source-root-env`, requires
an absolute existing directory, verifies the frozen source lock, never serializes the source root,
and never copies personal media into a tracked path. `assets:personal:check` is not part of the
reproducible `check` or `verify` gates.

## Vite guard and browser boundary

The game build scripts select the profile explicitly:

```
build          -> vite build --mode test
build:personal -> vite build --mode personal
build:product  -> vite build --mode product
```

`apps/game/vite.config.ts` rejects any other mode and installs the profile guard as a `pre`
`buildStart` plugin. The guard validates `public/assets/<mode>/catalog.json`, all referenced packs,
all content-addressed media, preload keys, source-group profiles, and product licenses before Vite
transforms application modules. It does not know pack IDs or media paths in consumer code.

The architecture gate scans TypeScript source with the TypeScript token scanner. It rejects asset
imports from simulation, Node/filesystem/Phaser imports from the browser asset package, media-file
literals and pack/media/catalog paths in consumers, and personal paths outside approved boundaries.
It does not scan `dist`, generated `public`, `node_modules`, Git internals, documentation, or
snapshots. Manifest code, catalog data, fixture assets, asset-packer tooling, and the profile
composition boundary are explicit allowlists.

The next task, PB-02-06, owns the app composition root, provider preload, stable-key browser probe,
and browser QA. PB-02-05 does not put provider usage or hardcoded asset paths into `apps/game/src`.
