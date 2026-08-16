# PB-04 real respawn replay hashes

This supplementary fixture uses the same generated scenario and seed as the
600-tick browser session, but runs for `1805` ticks. The cap-aware route
despawns entity `2` at tick `1` and entity `3` at tick `2`, leaving a live slot
available for the real `1800`-tick respawn proof. This table is the published
source of the four digests; `check-hashes` compares each row to the file bytes
and to the sidecar `.sha256`.

| Artifact | SHA-256 |
|---|---|
| `scenario.json` | `2d56f2848eec061821d48e19bd23bf6bfdec3b00aa0a10007eb1fd04aa88b758` |
| `commands.jsonl` | `14df54ca5ee4d2731fba85368e1d8df055e2f5ea0b47b1dfcc69fa7c5f00abf5` |
| `snapshot.golden.json` | `93cbf723d7e8e7b795d6b25a60e678a804f707861f58efcf97e7e19fabea28bf` |
| `events.golden.jsonl` | `613079d592335829a8e9e7565877c046cee9e21f0f4478b38af4050b7334ba30` |

Entity `2` is despawned at tick `1`; its slot becomes ready at tick `1801`
and emits `actor/spawned` for entity `14` at that tick. The command log is
independent of the step cooldown, so only the scenario and the goldens move
when the hunt's pace is retuned.
