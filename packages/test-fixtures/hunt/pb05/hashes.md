# PB-05 combat replay hashes

Generated from `hunt:tibia:venore-rotworm-cave`, scenario revision `2`, seed
`2c3d4e5f60718293`. This table is the published source of the four digests;
`check-hashes` compares each row to the file bytes and to the sidecar `.sha256`.

| Artifact | SHA-256 |
|---|---|
| `scenario.json` | `91f4e1144457253c6b21654fb19c92dd7e32535b24afd41787c072e0c17195a4` |
| `commands.jsonl` | `f8ec4cf67d01124eb25714c3d107f7c41be33be50fbe844ae6e5fc4ce47fa3bd` |
| `snapshot.golden.json` | `ed485307f2d2011b5b3c8bc4cd2194f46e0f2e238bb200bf1b0b942febc1cf1f` |
| `events.golden.jsonl` | `d4521f09d1186c45ed2932e0c057725553037fda36533f61b889b913086e7c26` |

The frozen session runs for `2700` ticks and emits `2246` events. Tick count is
`2700` so a creature death plus every slot's `respawnTicks` `1800` still fits
(B6). Rotworm `aggroRadius` is Canary `targetDistance` `1` via
`buildHuntScenario`. The command log is player-only; hunter decisions come from
the seed.

Coverage includes melee, the three kit abilities, a combat command rejection,
player-received damage, Wound Cleansing, creature death at tick `203`, loot,
seat respawn of entity `14` at tick `2003` on the death cell, and
`combat/target-changed`. The player dies at tick `351`; the kernel does not
respawn them. PB-07-04 added `combat/leeched` (4) and `combat/regenerated` (2);
`commands.jsonl` is unchanged.
