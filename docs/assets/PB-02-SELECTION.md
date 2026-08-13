# PB-02 contract-coverage selection

PB-02-02 freezes the five visual identities used by the browser contract fixture. The selection
contains no media paths; the historical Arena Fable manifest resolves each identity to a relative
source path, and the source lock records only logical source facts, sizes, and SHA-256 values.

## Frozen identities

| Stable key | Category | Source identity | Real source path |
| --- | --- | --- | --- |
| `outfit:tibia:knight` | outfit | `lookType:131` | `outfits/131.png` |
| `creature:tibia:rotworm` | creature | `lookType:26` | `outfits/26.png` |
| `item:tibia:gold-coin` | object | `clientId:3031` | `objects/3031.png` |
| `effect:tibia:energy-hit` | effect | `effectId:12` | `effects/12.png` |
| `missile:tibia:energy-ball` | missile | `missileId:36` | `missiles/36.png` |

The source map is fixed: `lookType` reads `outfits`, `clientId` reads `objects`, `effectId` reads
`effects`, and `missileId` reads `missiles`. A missing identity is an error; the resolver never
searches another category map as a fallback.

## Personal source lock

The real group is `arena-fable-tibia` / `arena-fable-tibia-export`, snapshot
`1b14dee3b22f6970333bef76031b473c7bcf917e`, license `cipsoft-personal`, profile `personal`.

| Locked path | Bytes | SHA-256 |
| --- | ---: | --- |
| `manifest.json` | 808964 | `edf07a6edfc7c68128d8d0c712fbf0f2f66839e17399da62d9531598b3a05a94` |
| `outfits/131.png` | 196361 | `7b131fd5e524a72f0196e2c1b44bad6b8c929d4ca63b334fbe102cc1fb038cd6` |
| `outfits/26.png` | 23500 | `50693364cc059e397bad267c8f443f248d387ef38f0417e87351f1f253ed3f4b` |
| `objects/3031.png` | 1301 | `cc44391cf4b0a8ec1573737d954d95e6352b5c942559ad3b91d87c59fc33faf1` |
| `effects/12.png` | 3967 | `6840bf0e4fb9dfbcf7869705d81e8b61a2f12f2b08fb3427b0d43a4521c35bdb` |
| `missiles/36.png` | 12974 | `0a2438152e493b8dfcfdf8131416aa609dd5161bbbf9d0f0a50efc93cc237a96` |

The external root is supplied at execution time with `--source-root` or
`HUNTBOUND_PERSONAL_ASSET_SOURCE`. It is not written to the selection, source lock, documentation,
or diagnostics. The personal PNGs remain outside this repository and are never copied into it.

## Synthetic fixture

The versioned fixture uses the same five keys, categories, source identities, and presentation
values under group `huntbound-test` / `huntbound-synthetic-fixture`, snapshot `pb02-synthetic-v1`,
license `huntbound-test`, and profiles `test` and `product`.

Its five paths remain distinct, but each file contains the same transparent 1×1 PNG:

```text
bytes: 68
sha256: 431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460
```

`node tools/asset-packer/testing/createPb02SyntheticSource.ts --check` verifies the manifest and
all five bytes without rewriting them. The fixture source lock is generated with the same
`createAssetSourceLock` implementation used for the real source.

## PB-01 links and scope boundary

- PB-01 Rotworm declares `lookType: 26`.
- PB-01 gold coin uses `sourceId: 3031`.
- PB-01 Orc Shaman uses projectile `energyball`, represented here by `missileId: 36`.
- This fixture proves asset identity and source-lock contracts; it is not a hunt and does not
  introduce pack materialization, provider/runtime code, profile catalogs, or app assets.
