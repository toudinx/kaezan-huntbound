# PB-04 real respawn replay hashes

This supplementary fixture uses the same generated scenario and seed as the
600-tick browser session, but runs for `1805` ticks. The cap-aware route
despawns entity `2` at tick `1` and entity `3` at tick `2`, leaving a live slot
available for the real `1800`-tick respawn proof. This table is the published
source of the four digests; `check-hashes` compares each row to the file bytes
and to the sidecar `.sha256`.

| Artifact | SHA-256 |
|---|---|
| `scenario.json` | `c046c26d8321b39ecaaa3f059a6cbc75e4ea660ce3607a5fce963731f2507cf8` |
| `commands.jsonl` | `89a6c698de54912b2b11172d7bd5867460eb2a84864d906a8c5f104f7477f2d4` |
| `snapshot.golden.json` | `2ea5c739fc3f25483de166aa062b37635fb37c4dea4b09c9d53bd6db413a9d60` |
| `events.golden.jsonl` | `686663d5bc8b3674c04a8cf52e59bbd87324488d8cbf6e38fe003e2c6ee5414e` |

Entity `2` is despawned at tick `1`; its slot becomes ready at tick `1801`
and emits `actor/spawned` for entity `14` at that tick. The command log is
independent of the step cooldown, so only the scenario and the goldens move
when the hunt's pace is retuned.
