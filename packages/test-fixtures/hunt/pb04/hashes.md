# PB-04 hunt replay hashes

Generated from `hunt:tibia:venore-rotworm-cave`, scenario revision `2`, seed
`1a2b3c4d5e6f7a8b`. This table is the published source of the four digests;
`check-hashes` compares each row to the file bytes and to the sidecar `.sha256`.

| Artifact | SHA-256 |
|---|---|
| `scenario.json` | `2b08575f7723e578ee6a7c7fa74d7e21723f3b99aa88e2dbc842bb1c7e9b477b` |
| `commands.jsonl` | `cbf3bca53a7e49f49ed34734c657b627d5b561fb82a76be887aa2a1eea3c1217` |
| `snapshot.golden.json` | `94f3198dd66f0066e01e560738959d52d56979288a3d59b78d6ac209497146a8` |
| `events.golden.jsonl` | `e487a2c52668671172869b3157f4734c374faeb2c36634f2b65f978793f9f2d4` |

The frozen session runs for `600` ticks and emits `1635` events. Its player-only
route covers `17` accepted moves, one directed floor transition, terrain and
occupied blocking, the boot-time `spawn/deferred` cap path, and one rejected
unknown-entity command. The step at tick `40` walks deliberately into an
occupied cell, which is what proves the `occupied` refusal.

After the initial rejected command and the first movement at tick `0`, commands
are spaced twenty ticks apart: twice the player's ten-tick step cooldown, so
every step is answered rather than refused for cooldown. The spacing is derived
from that cooldown, so retuning the hunt's pace means re-timing this log and
regenerating the goldens.
