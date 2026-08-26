# PB-04 hunt replay hashes

Generated from `hunt:tibia:venore-rotworm-cave`, scenario revision `2`, seed
`1a2b3c4d5e6f7a8b`. This table is the published source of the four digests;
`check-hashes` compares each row to the file bytes and to the sidecar `.sha256`.

| Artifact | SHA-256 |
|---|---|
| `scenario.json` | `c046c26d8321b39ecaaa3f059a6cbc75e4ea660ce3607a5fce963731f2507cf8` |
| `commands.jsonl` | `b7ceec01b745015695dd239113c667bcd6a4055161fcdde10cf6a50690ff76f0` |
| `snapshot.golden.json` | `7522764abeba9805aa32823e180b3a13e1f1fe7bae2d2a1e8cc4142af322ebdd` |
| `events.golden.jsonl` | `3cb8451acf549c618a630afd95463bbff0c7010006cee3bdf55ee3258ca884b6` |

The frozen session runs for `600` ticks and emits `1663` events. Its player-only
route covers `14` accepted moves, two directed floor transitions, terrain and
occupied blocking, the boot-time `spawn/deferred` cap path, and one rejected
unknown-entity command. The step at tick `60` walks deliberately into the cell
entity `2` is standing on, which is what proves the `occupied` refusal.

Commands are spaced twenty ticks apart: twice the player's ten-tick step
cooldown, so every step is answered rather than refused for cooldown. The
spacing is derived from that cooldown, so retuning the hunt's pace means
re-timing this log and regenerating the goldens.
