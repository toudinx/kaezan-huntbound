# Huntbound content identity policy

This policy defines the durable identity used by `@huntbound/contracts`. It is intentionally
independent from display text, source paths, snapshots, import adapters, SQLite, and runtime
objects.

## GUIDs

Huntbound content uses this UUID namespace:

```text
471cdc3d-d99e-4bed-9782-9923d845f3d7
```

For an entity with kind `vocation`, `creature`, `item`, or `spell`, and a Tibia source ID, UUIDv5
uses exactly this canonical name:

```text
tibia/<entityKind>/<sourceId>
```

The source ID is a string so numeric IDs remain lossless. Display names, aliases, source paths,
snapshot commits, and file hashes never participate in the GUID. Renaming `Rotworm` to `Cave
Rotworm`, or moving its source file, therefore preserves its GUID.

Examples:

| Kind | Source ID | Canonical name | GUID |
| --- | --- | --- | --- |
| creature | `26` | `tibia/creature/26` | `9a8dd398-e67b-5a98-be03-3406bd581cf9` |
| item | `3031` | `tibia/item/3031` | `78974d81-ae2d-5ba6-855e-04d1909ab11a` |
| spell | `80` | `tibia/spell/80` | `48bec9e6-c6e6-5fd4-9d59-cc29a6478a4c` |
| vocation | `4` | `tibia/vocation/4` | `e3823a68-9f12-51e1-9b83-fde613163995` |

## Stable keys

Stable keys are immutable semantic identifiers in lowercase kebab-case:

```text
<kind>:tibia:<slug>
```

Examples include `creature:tibia:rotworm`, `item:tibia:gold-coin`,
`spell:tibia:berserk`, and `vocation:tibia:knight`. Uppercase letters, underscores, spaces, empty
slugs, and trailing hyphens are invalid. A display-name correction is handled as a display-name
change; it is never a stable-key rename after the key has been accepted.

Vocation families are internal Huntbound identities and use a separate namespace:

```text
vocation-family:huntbound:knight
```

The family is distinct from `vocation:tibia:knight`. Raw source references such as `knight` and
`elite knight` are projection-audit records, not aliases of the Knight entity.

## Source IDs and provenance

`sourceId` is required in the catalog provenance envelope and is always paired with `system`,
`snapshot`, `sourcePath`, and `sourceSha256`. Provenance explains where an accepted catalog fact
came from; it is not part of a runtime content definition.

## Aliases

An alias is an explicitly accepted import lookup value for an existing content key. Aliases live
only on catalog entities and include their source system and target `entityKey`. They are not
runtime identity and cannot replace a GUID or stable key.

Raw references that are being projected into a relation, especially vocation names used by a
spell, must be stored in `ImportProjectionAudit`. They must not be added as aliases merely because
they resemble an entity name.
