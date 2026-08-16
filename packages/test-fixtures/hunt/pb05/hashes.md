# PB-05 combat replay hashes

Generated from `hunt:tibia:venore-rotworm-cave`, scenario revision `2`, seed
`2c3d4e5f60718293`. This table is the published source of the four digests;
`check-hashes` compares each row to the file bytes and to the sidecar `.sha256`.

| Artifact | SHA-256 |
|---|---|
| `scenario.json` | `c34813d1e1a278c9e6fd0b7869e5e55f06cf0c5c8e4b530b04b332f38b1cb8cf` |
| `commands.jsonl` | `356eee11220f96aea4d3f5cc0f0673deb614cd893c1d7f2060414a4fbc7a1e7b` |
| `snapshot.golden.json` | `44c1812203282bbad6797ede4961c971ff868d7d23905287edcaaf241eb7416a` |
| `events.golden.jsonl` | `92515975046756dc2aeafb53d811cb016903ff653f08d9a89e9be2ec8d361394` |

The frozen session runs for `2700` ticks and emits `2240` events. Tick count is
`2700` so a creature death plus every slot's `respawnTicks` `1800` still fits
(B6). Rotworm `aggroRadius` is Canary `targetDistance` `1` via
`buildHuntScenario`. The command log is player-only; hunter decisions come from
the seed.

Coverage includes melee, the three kit abilities, a combat command rejection,
player-received damage, Wound Cleansing, creature death at tick `203`, loot,
seat respawn of entity `14` at tick `2003` on the death cell, and
`combat/target-changed`. The player dies at tick `351`; the kernel does not
respawn them.
