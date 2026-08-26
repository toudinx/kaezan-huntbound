# PB-05 combat replay hashes

Generated from `hunt:tibia:venore-rotworm-cave`, scenario revision `2`, seed
`2c3d4e5f60718293`. This table is the published source of the four digests;
`check-hashes` compares each row to the file bytes and to the sidecar `.sha256`.

| Artifact | SHA-256 |
|---|---|
| `scenario.json` | `143e025b0f530487cb5d6a55a01c68aaf775da0e3292d217f081751cac1a9b2e` |
| `commands.jsonl` | `689cc3a8d44e46c6f25b609496dd7094e7f86304f1054a553014078b9bb734d3` |
| `snapshot.golden.json` | `d9f48d46caa2284667c12a6d5d3faee5e0431c22be7d2020fa69ddcb3afac4aa` |
| `events.golden.jsonl` | `9c0a4400591d12c5679da6b4eed908e86d56a92cbeeeefaa8397ee1fafc7d9f5` |

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

PB-08-06 added Challenge at ability index 7 (`forcedTargetDurationTicks` 40,
support `primaryCooldownGroup` 1). `commands.jsonl`, `snapshot.golden.json` and
`events.golden.jsonl` stay the previous digests: the session never casts
Challenge, idle forced-target fields are omitted from snapshots, and untaunted
hunter acquisition is unchanged. `scenario.json` is the only moved artifact.

PB-08-07 added Haste at ability index 8 (`speedPermille` 600, `durationTicks`
600, step 11→6). The session never casts Haste, so `commands.jsonl`,
`snapshot.golden.json` and `events.golden.jsonl` keep the previous digests —
proof that the shorter step did not leak to actors without the condition.
`scenario.json` is again the only moved artifact: one ability, one condition,
player `abilityIndices` `[0..8]`, and the playtest retune of Canary 191/9.
