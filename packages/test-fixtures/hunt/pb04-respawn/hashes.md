# PB-04 real respawn replay hashes

This supplementary fixture uses the same generated scenario and seed as the
600-tick browser session, but runs for `1805` ticks. The cap-aware route
despawns entity `2` at tick `1` and entity `3` at tick `2`, leaving a live slot
available for the real `1800`-tick respawn proof. This table is the published
source of the four digests; `check-hashes` compares each row to the file bytes
and to the sidecar `.sha256`.

| Artifact | SHA-256 |
|---|---|
| `scenario.json` | `f8ecff35694c0ba8557546f40d0f7ad384746a0027f0bc3a5c51b2777f88c6e0` |
| `commands.jsonl` | `01e139f9d8fd41fd7c53fc70dcf15286bb49c08ac874da7f43a82d2c22bc1efa` |
| `snapshot.golden.json` | `2e968f79b850725dd2942ffc2421108b9f4cc09a82b13bda19995fad43e993d3` |
| `events.golden.jsonl` | `613079d592335829a8e9e7565877c046cee9e21f0f4478b38af4050b7334ba30` |

Entity `2` is despawned at tick `1`; its slot becomes ready at tick `1801`
and emits `actor/spawned` for entity `14` at that tick. The command log is
independent of the step cooldown, so only the scenario and the goldens move
when the hunt's pace is retuned.
