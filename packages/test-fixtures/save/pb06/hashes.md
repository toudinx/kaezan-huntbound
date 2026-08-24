# PB-06 save session hashes

Generated from `pb-05-hunt-combat` (same scenario, command log and seed),
checkpoint tick `1400`, final tick `2700`. This table is the published source
of the four digests; `check-hashes` compares each row to the file bytes and to
the sidecar `.sha256`.

| Artifact | SHA-256 |
|---|---|
| `checkpoint.golden.json` | `c8398437375bf087f07697c67c0a9d4819115f4ff2b65b732431428c5de75669` |
| `export.golden.txt` | `c8398437375bf087f07697c67c0a9d4819115f4ff2b65b732431428c5de75669` |
| `legacy.json` | `07eef04155d2f1dd57ef074c12ba4310ac7a15584980d1a9e8dec2a9206ead7f` |
| `migrated.golden.json` | `4adf164efa1c9795330d79af53daae10ce6fefd95f66a3e803aabbeb7ef07bc7` |

The gate proves that persisting the run cannot change the simulation: a kernel
resumed from the imported checkpoint snapshot and advanced to tick `2700`
reproduces `packages/test-fixtures/hunt/pb05/snapshot.golden.json` byte for byte.
