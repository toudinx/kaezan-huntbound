# PB-04 real respawn replay hashes

This supplementary fixture uses the same generated scenario and seed as the
600-tick browser session, but runs for `1805` ticks. The cap-aware route
despawns entity `2` at tick `1` and entity `3` at tick `2`, leaving a live slot
available for the real `1800`-tick respawn proof. This table is the published
source of the four digests; `check-hashes` compares each row to the file bytes
and to the sidecar `.sha256`.

| Artifact | SHA-256 |
|---|---|
| `scenario.json` | `2b08575f7723e578ee6a7c7fa74d7e21723f3b99aa88e2dbc842bb1c7e9b477b` |
| `commands.jsonl` | `89a6c698de54912b2b11172d7bd5867460eb2a84864d906a8c5f104f7477f2d4` |
| `snapshot.golden.json` | `5b5aa10d81dead22a767ce85d89b368061acb3f94295a225646773e490303258` |
| `events.golden.jsonl` | `707cf753040ed325e444d9b8d44827b76d92a79da41a27202cbc3474d0278b18` |

Entity `2` is despawned at tick `1`; its slot becomes ready at tick `1801`
and emits `actor/spawned` for entity `14` at that tick. The command log is
independent of the step cooldown, so only the scenario and the goldens move
when the hunt's pace is retuned.
