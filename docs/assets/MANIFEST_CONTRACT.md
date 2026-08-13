# Huntbound asset manifest contract

PB-02 asset manifests are the browser-safe boundary between asset authoring and presentation. The
runtime consumes stable keys and validated metadata; it does not consume client filenames, source
roots, or numeric IDs directly.

## Stable keys and numeric identities

An `AssetKey` has exactly three lowercase kebab-case segments:

```text
<kind>:<source-namespace>:<slug>
```

The supported kinds are `outfit`, `creature`, `item`, `effect`, and `missile`. The `item` key kind
represents the `object` visual category. Uppercase characters, underscores, empty segments, path
separators, parent traversal, and extra segments are invalid.

Numeric source identities are positive finite integers, branded by namespace:

| Namespace | Type | Adapter method | Allowed category |
| --- | --- | --- | --- |
| `lookType` | `LookTypeId` | `resolveLookType` | `outfit`, `creature` |
| `clientId` | `ClientId` | `resolveClientId` | `object` |
| `effectId` | `EffectId` | `resolveEffectId` | `effect` |
| `missileId` | `MissileId` | `resolveMissileId` | `missile` |

The same number may occur in different namespaces. For example, `lookType:12` and `effectId:12`
are distinct identities and must never share an index or adapter method.

The PB-02 contract-coverage selection uses exactly these keys:

```text
outfit:tibia:knight       → lookType 131
creature:tibia:rotworm   → lookType 26
item:tibia:gold-coin     → clientId 3031
effect:tibia:energy-hit  → effectId 12
missile:tibia:energy-ball → missileId 36
```

## Profiles, licenses, paths, and hashes

Build profiles are `personal`, `product`, and `test`. License classes are:

- `cipsoft-personal` — local personal export; never allowed in `product`;
- `huntbound-owned` — Huntbound-owned replacement material;
- `huntbound-test` — synthetic repository fixture.

Every source group declares `source`, `sourceSnapshot`, `licenseClass`, and `buildProfiles`. The
`product` profile is invalid whenever a `cipsoft-personal` group is selected or declares that
profile. Profile eligibility and license policy are independent checks.

Manifest paths are POSIX-relative. They must not contain `..` segments or backslashes, begin with a
slash, use a URL scheme, or use a Windows drive letter. A media path in a pack is content-addressed:

```text
media/<lowercase-sha256>.png
```

SHA-256 values are exactly 64 lowercase hexadecimal characters. Byte lengths are finite,
non-negative integers and media MIME type is `image/png`.

## Manifest shapes

All object schemas are strict. Unknown fields are rejected before a validator returns a typed value.

### Selection manifest

Selection says what to select and why; it contains no media paths.

```json
{
  "schemaVersion": "1",
  "selectionId": "fixture:pb-02-contract-coverage",
  "packId": "asset-pack:fixture:pb-02-contract-coverage",
  "contentVersion": "pb-02-contract-coverage@1",
  "buildProfiles": ["test", "product"],
  "groups": [{
    "groupId": "huntbound-test",
    "source": "huntbound-synthetic-fixture",
    "sourceSnapshot": "pb02-synthetic-v1",
    "licenseClass": "huntbound-test",
    "buildProfiles": ["test", "product"]
  }],
  "entries": [{
    "key": "outfit:tibia:knight",
    "category": "outfit",
    "sourceIdentity": {"kind": "lookType", "id": 131},
    "sourceGroupId": "huntbound-test",
    "consumer": "PB-02 browser contract fixture",
    "rationale": "Covers a player outfit.",
    "presentation": {
      "pivot": {"x": 0.5, "y": 1},
      "scale": 1,
      "filtering": "nearest"
    }
  }]
}
```

Keys and `(kind, id)` identities are unique within a selection. Each entry must reference an
existing group and use a category compatible with its identity.

### Source lock

The source lock records logical source facts and selected files without persisting the operator's
source root.

```json
{
  "schemaVersion": "1",
  "source": "huntbound-synthetic-fixture",
  "sourceSnapshot": "pb02-synthetic-v1",
  "manifest": {
    "path": "manifest.json",
    "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "byteLength": 808964
  },
  "files": [{
    "key": "outfit:tibia:knight",
    "category": "outfit",
    "sourceIdentity": {"kind": "lookType", "id": 131},
    "path": "outfits/131.png",
    "sha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "byteLength": 1
  }]
}
```

The lock is metadata only. Filesystem inspection, hashing, and source-root resolution belong to the
future Node packer, not this browser-safe package.

### Pack manifest

The pack manifest is the runtime boundary. Its entries add media and atlas metadata to the stable
selection identity.

```json
{
  "schemaVersion": "1",
  "packId": "asset-pack:fixture:pb-02-contract-coverage",
  "contentVersion": "pb-02-contract-coverage@1",
  "groups": [{
    "groupId": "huntbound-test",
    "source": "huntbound-synthetic-fixture",
    "sourceSnapshot": "pb02-synthetic-v1",
    "licenseClass": "huntbound-test",
    "buildProfiles": ["test", "product"]
  }],
  "entries": [{
    "key": "outfit:tibia:knight",
    "category": "outfit",
    "sourceIdentity": {"kind": "lookType", "id": 131},
    "sourceGroupId": "huntbound-test",
    "media": {
      "path": "media/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png",
      "sha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "byteLength": 1,
      "mimeType": "image/png"
    },
    "cellWidth": 1,
    "cellHeight": 1,
    "columns": 1,
    "atlasFrameCount": 1,
    "animations": [{
      "kind": "default",
      "patternX": 0,
      "patternY": 0,
      "patternZ": 0,
      "layers": 1,
      "startFrame": 0,
      "frameCount": 1,
      "phaseDurationsMs": [[100, 100]]
    }],
    "pivot": {"x": 0.5, "y": 0.5},
    "scale": 1,
    "filtering": "nearest"
  }]
}
```

Animation timing is preserved as `[minMs, maxMs]` ranges. There must be one duration range per
frame, and the frame window must fit inside `atlasFrameCount`; the contract does not invent timing.

### Profile catalog

The catalog is the only profile bootstrap input to the future provider. Its manifest paths are
relative to the catalog directory.

```json
{
  "schemaVersion": "1",
  "profile": "test",
  "packs": [{
    "packId": "asset-pack:fixture:pb-02-contract-coverage",
    "manifestPath": "packs/pb-02-contract-coverage/pack.json"
  }],
  "preloads": [{
    "packId": "asset-pack:fixture:pb-02-contract-coverage",
    "requiredKeys": ["outfit:tibia:knight"]
  }]
}
```

Pack IDs are unique. Each preload must reference an existing pack and must not repeat a required
key.

## Validation and diagnostics

Use one of the public validators instead of persisting an unchecked parse:

```ts
validateAssetSelectionManifest(input);
validateAssetSourceLock(input);
validateAssetPackManifest(input);
validateAssetPackCatalog(input);
```

Each returns either `{ ok: true, value }` or `{ ok: false, diagnostics }`. Diagnostics contain a
stable code, severity, logical path, and optional stable key/pack ID. Diagnostics are sorted by path
and code, so the same invalid document produces deterministic output. The contract reports schema,
path, duplicate key/ID, category, reference, animation, profile/license, and pack-conflict errors;
media existence, byte-size, and content-hash checks remain for the packer/provider layers.

This package is browser-safe and renderer-agnostic. It must not import Node built-ins, filesystem,
fetch, Web Crypto, Blob, Phaser, or any client extraction format.
