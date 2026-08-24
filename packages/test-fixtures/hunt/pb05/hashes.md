# PB-05 combat replay hashes

Generated from `hunt:tibia:venore-rotworm-cave`, scenario revision `2`, seed
`2c3d4e5f60718293`. This table is the published source of the four digests;
`check-hashes` compares each row to the file bytes and to the sidecar `.sha256`.

| Artifact | SHA-256 |
|---|---|
| `scenario.json` | `44867deeba27b7fe2817c62e933c750fbaa9025d970ba9a3b0982803b214dfce` |
| `commands.jsonl` | `689cc3a8d44e46c6f25b609496dd7094e7f86304f1054a553014078b9bb734d3` |
| `snapshot.golden.json` | `3c3fdefcd997b16f8b242a66c709638baacbaea1bcc5893cc7f51417eada8d0f` |
| `events.golden.jsonl` | `75bd96c37a7a0c097532c8a5e201e15bbc405c677d39aca00fa327dea816ac72` |

The frozen session runs for `2700` ticks and emits `2246` events. Tick count is
`2700` so a creature death plus every slot's `respawnTicks` `1800` still fits
(B6). Rotworm `aggroRadius` is Canary `targetDistance` `1` via
`buildHuntScenario`. The command log is player-only; hunter decisions come from
the seed.

Coverage includes melee, the five-action kit (three casts in this session), a
combat command rejection, player-received damage, Wound Cleansing, creature death at tick `203`, loot,
seat respawn of entity `14` at tick `2003` on the death cell, and
`combat/target-changed`. The player dies at tick `351`; the kernel does not
respawn them. PB-07-04 added `combat/leeched` (4) and `combat/regenerated` (2);
`commands.jsonl` is unchanged.
