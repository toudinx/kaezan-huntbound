# PB-04 hunt replay hashes

Generated from `hunt:tibia:venore-rotworm-cave`, scenario revision `2`, seed
`1a2b3c4d5e6f7a8b`. This table is the published source of the four digests;
`check-hashes` compares each row to the file bytes and to the sidecar `.sha256`.

| Artifact | SHA-256 |
|---|---|
| `scenario.json` | `9e7a9dc9468a1a5344547bd65bce3c5a7441f9d9e86504ac4ebb8d584eb68876` |
| `commands.jsonl` | `b7ceec01b745015695dd239113c667bcd6a4055161fcdde10cf6a50690ff76f0` |
| `snapshot.golden.json` | `32738acc4ed9d89adbe8f3abff64aed3ff8dd60d6d21fb6925bf5fd2beaf041c` |
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
