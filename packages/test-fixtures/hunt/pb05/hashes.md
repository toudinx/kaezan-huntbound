# PB-05 combat replay hashes

Generated from `hunt:tibia:venore-rotworm-cave`, scenario revision `2`, seed
`2c3d4e5f60718293`. This table is the published source of the four digests;
`check-hashes` compares each row to the file bytes and to the sidecar `.sha256`.

| Artifact | SHA-256 |
|---|---|
| `scenario.json` | `a084d7c2129cec7801ca4182a057c5ae5a7048c943bf33396c1d622aeff28cc7` |
| `commands.jsonl` | `f8ec4cf67d01124eb25714c3d107f7c41be33be50fbe844ae6e5fc4ce47fa3bd` |
| `snapshot.golden.json` | `3f7d44a40a39aaba2f3b0b46ef3d2eec1bb8eb367bf59726b33179c0f9cd8989` |
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
