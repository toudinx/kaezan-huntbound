# PB-04 hunt replay hashes

Generated from `hunt:tibia:venore-rotworm-cave`, scenario revision `2`, seed
`1a2b3c4d5e6f7a8b`. This table is the published source of the four digests;
`check-hashes` compares each row to the file bytes and to the sidecar `.sha256`.

| Artifact | SHA-256 |
|---|---|
| `scenario.json` | `2d56f2848eec061821d48e19bd23bf6bfdec3b00aa0a10007eb1fd04aa88b758` |
| `commands.jsonl` | `d18c520a5d90614f30ceb4c8989de67578c736e3a2d59516f0b04dc92d9e3636` |
| `snapshot.golden.json` | `56f68258d004c869c47a4f46e84c8a9f7289da9d0dffb7f133cae9c6fac42bca` |
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
