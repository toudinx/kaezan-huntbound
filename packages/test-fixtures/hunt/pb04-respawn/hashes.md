# PB-04 real respawn replay hashes

This supplementary fixture uses the same generated scenario and seed as the
600-tick browser session, but runs for `1805` ticks. The cap-aware route
despawns entity `2` at tick `1` and entity `3` at tick `2`, leaving a live slot
available for the real `1800`-tick respawn proof. This table is the published
source of the four digests; `check-hashes` compares each row to the file bytes
and to the sidecar `.sha256`.

| Artifact | SHA-256 |
|---|---|
| `scenario.json` | `9e7a9dc9468a1a5344547bd65bce3c5a7441f9d9e86504ac4ebb8d584eb68876` |
| `commands.jsonl` | `89a6c698de54912b2b11172d7bd5867460eb2a84864d906a8c5f104f7477f2d4` |
| `snapshot.golden.json` | `286fc9c3930e96f2d9f9fcd6af52c0edd8056384c46f4a99377d72d46c1d0233` |
| `events.golden.jsonl` | `613079d592335829a8e9e7565877c046cee9e21f0f4478b38af4050b7334ba30` |

Entity `2` is despawned at tick `1`; its slot becomes ready at tick `1801`
and emits `actor/spawned` for entity `14` at that tick. The command log is
independent of the step cooldown, so only the scenario and the goldens move
when the hunt's pace is retuned.
