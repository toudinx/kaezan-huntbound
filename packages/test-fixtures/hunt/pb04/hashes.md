# PB-04 hunt replay hashes

Generated from `hunt:tibia:venore-rotworm-cave`, scenario revision `2`, seed
`1a2b3c4d5e6f7a8b`. This table is the published source of the four digests;
`check-hashes` compares each row to the file bytes and to the sidecar `.sha256`.

| Artifact | SHA-256 |
|---|---|
| `scenario.json` | `4e898d3d1a29f16cc6005563067e29f6f21552d5a2ff613448205fd605d3f698` |
| `commands.jsonl` | `ebf92677598e793d19c8f06991f961a0388924a1d102e7313c046404ed8b3090` |
| `snapshot.golden.json` | `d8a0932c7dcc526fa766bac80734c9d53d91a125550a05d11e8abfe32a6e6f2e` |
| `events.golden.jsonl` | `16711d4b9c9c23634653e3483ee54d0ae27e961e66869e3a47bd9cc60e079aab` |

The frozen session runs for `600` ticks and emits `1569` events. Its player-only
route covers `17` accepted moves, one directed floor transition, terrain and
occupied blocking, the boot-time `spawn/deferred` cap path, and one rejected
unknown-entity command. The step at tick `210` walks deliberately into an
occupied cell, which is what proves the `occupied` refusal.

Ten seats and `maxLiveActors` of ten is what keeps the cap path alive: the
player holds one of the ten live slots, so nine rotworms are seated and the
tenth is deferred and reported for all `600` ticks. The scenario carried twelve
seats and a cap of twelve until the region's border ring went out of play and
took the seats at `(9, 0, 9)` and `(0, 16, 9)` with it; the cap came down with
them so the margin of one survived.

After the initial rejected command and the first movement at tick `0`, commands
are spaced twenty ticks apart: twice the player's ten-tick step cooldown, so
every step is answered rather than refused for cooldown. The spacing is derived
from that cooldown, so retuning the hunt's pace means re-timing this log and
regenerating the goldens.
