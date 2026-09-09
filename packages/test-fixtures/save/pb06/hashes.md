# PB-06 save session hashes

Generated from `pb-05-hunt-combat` (same scenario, command log and seed),
checkpoint tick `1400`, final tick `2700`. This table is the published source
of the four digests; `check-hashes` compares each row to the file bytes and to
the sidecar `.sha256`.

| Artifact | SHA-256 |
|---|---|
| `checkpoint.golden.json` | `6ada09fc126bd5c1ecb6d2475afcc9b4a9c468416bfafeeb88ea4bf705441500` |
| `export.golden.txt` | `6ada09fc126bd5c1ecb6d2475afcc9b4a9c468416bfafeeb88ea4bf705441500` |
| `legacy.json` | `07eef04155d2f1dd57ef074c12ba4310ac7a15584980d1a9e8dec2a9206ead7f` |
| `migrated.golden.json` | `b8caf4e935628962af9a0c1555bd7d0487da5af7963c6371419f548a84a7b328` |

The gate proves that persisting the run cannot change the simulation: a kernel
resumed from the imported checkpoint snapshot and advanced to tick `2700`
reproduces `packages/test-fixtures/hunt/pb05/snapshot.golden.json` byte for byte.
