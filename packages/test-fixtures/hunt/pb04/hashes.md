# PB-04 hunt replay hashes

Generated from `hunt:tibia:venore-rotworm-cave`, scenario revision `2`, seed
`1a2b3c4d5e6f7a8b`.

| Artifact | SHA-256 |
|---|---|
| `scenario.json` | `f8ecff35694c0ba8557546f40d0f7ad384746a0027f0bc3a5c51b2777f88c6e0` |
| `commands.jsonl` | `8c88860bd1dd355b37ac2e16dc2e989aaa2c324ad55637058bb51d33634c7e67` |
| `snapshot.golden.json` | `2e546b17a6905f5be29393b388df0c7dc37919fa75d09d8bcbb776bd75756816` |
| `events.golden.jsonl` | `6e1206eb2ce7ed7647e9923b6d29a3f08f30ca7ec9ddf01b539d6310818d42e1` |

The frozen session runs for `600` ticks and emits `1663` events. Its player-only
route covers `14` accepted moves, two directed floor transitions, terrain and
occupied blocking, the boot-time `spawn/deferred` cap path, and one rejected
unknown-entity command. The step at tick `60` walks deliberately into the cell
entity `2` is standing on, which is what proves the `occupied` refusal.

Commands are spaced twenty ticks apart: twice the player's ten-tick step
cooldown, so every step is answered rather than refused for cooldown. The
spacing is derived from that cooldown, so retuning the hunt's pace means
re-timing this log and regenerating the goldens.
