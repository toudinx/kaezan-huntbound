# Canary XML mapping

This document describes the narrow XML projection used by PB-01-04. The adapters receive XML text,
never read files, and return only explicitly selected DTOs. Canary source files remain outside Git and
are read by a future Node composition boundary, not by `@huntbound/content` runtime code.

## Vocation mapping

Source: `data/XML/vocations.xml`.

| XML field | DTO destination | Normalization and unit | Consumer/rationale |
| --- | --- | --- | --- |
| `vocation/@id` | `CanaryVocationDto.sourceId` | Trimmed canonical decimal string; selection is by this ID | Stable source identity; Knight is ID `4` |
| `vocation/@name` | `displayName` | Display text preserved; must be non-empty | Catalog display label |
| `vocation/@gainhp` | `gainHp` | Finite non-negative number | Progression contract |
| `vocation/@gainmana` | `gainMana` | Finite non-negative number | Progression contract |
| `vocation/@gaincap` | `gainCapacity` | Finite non-negative number | Progression contract |
| `vocation/@basespeed` | `baseSpeed` | Non-negative integer in Canary speed units | Progression contract |
| `vocation/@attackspeed` | `attackSpeedMs` | Non-negative integer milliseconds | Progression contract |
| `vocation/@manamultiplier` | `manaMultiplier` | Finite positive multiplier | Progression contract |
| `skill/@id` | key in `skillMultipliers` | Non-negative integer rendered as `skill:<id>` | Deterministic skill multiplier identity |
| `skill/@multiplier` | `skillMultipliers[skill:<id>]` | Finite non-negative multiplier | Progression contract |

Knight is selected exclusively by source ID `4`; the adapter never searches for a vocation by display
name. DTOs are sorted by `sourceId`.

### Vocation fields intentionally ignored

The following source-only fields are syntactically recognized so the curated Knight record can be
parsed, but they have no PB-01-04 consumer and are not copied to generic metadata:

- Vocation attributes: `clientid`, `baseid`, `description`, `magicshield`, `gainhpticks`,
  `gainhpamount`, `gainmanaticks`, `gainmanaamount`, `soulmax`, `gainsoulticks`, `fromvoc` and
  `avatarlooktype`.
- Child elements: `formula`, `mitigation`, `pvp` and `gem`.
- Their recognized attributes: `formula` uses `meleeDamage`, `distDamage`, `defense` and `armor`;
  `mitigation` uses `multiplier`, `primaryShield` and `secondaryShield`; `pvp` uses
  `damageReceivedMultiplier` and `damageDealtMultiplier`; `gem` uses `quality` and `name`.

Unknown attributes or child elements on a selected vocation are blocking diagnostics. Ignored fields
are an explicit allowlist, not an open-ended metadata bag.

## Item mapping

Source: `data/items/items.xml`.

| XML field | DTO destination | Normalization and unit | Consumer/rationale |
| --- | --- | --- | --- |
| `item/@id` | `CanaryItemDto.sourceId` | Trimmed non-negative decimal string | Direct item selection |
| `item/@fromid` + `item/@toid` | `sourceId` for one requested ID | Range is retained as an interval; only a requested concrete ID is resolved | Prevents catalog-wide range expansion |
| `item/@name` | `displayName` | Display text preserved; normalized with Unicode NFKC, trim, lowercase and collapsed whitespace only for lookup | Loot name resolution |
| `item/@article` | `attributes.article` | String preserved | Source metadata available to catalog mapping |
| `item/@plural` | `attributes.plural` | String preserved | Source metadata available to catalog mapping |
| `item/@weight` | `attributes.weight` | Finite non-negative numeric source weight; no unit conversion in this adapter | Item definition mapping |
| `attribute[key="weight"]/@value` | `attributes.weight` | Finite non-negative numeric source weight; child form has precedence when both forms exist | Item definition mapping |
| `item/@stackable` or `attribute[key="stackable"]/@value` | `attributes.stackable` | Primitive boolean/number conversion | Optional item contract field |
| `item/@maxStackSize` or `attribute[key="maxStackSize"]/@value` | `attributes.maxStackSize` | Primitive numeric conversion | Optional item contract field |

An ID request selects one concrete item. If the ID is inside a range, the returned `sourceId` is the
requested concrete ID and the range is not expanded. A name must identify exactly one concrete ID;
names shared by two IDs or by a multi-ID range produce an ambiguity diagnostic. DTOs are unique and
sorted by `sourceId`.

### Item fields intentionally ignored

The adapter recognizes the following nested item attribute keys used by the curated item slice but
does not copy them because PB-01-04 has no consumer for them:

`primarytype`, `weaponType`, `shootType`, `maxhitchance`, `range`, `attack`, `defense`, `extradef`,
`armor`, `description`, `showCount`, `writeable`, `maxtextlen`, `stopduration`, `decayTo`,
`duration`, `containersize`, `count`, `imbuementslot`, `slot`, `slotType`, `showCharges`,
`showduration`, `showattributes`, `walkstack`, `perfectshotrange` and nested `script` metadata.

Unknown attributes on selected item records are blocking diagnostics and are never copied into
`attributes`. Unknown fields on unselected records do not cause those records to be returned. No
global cache or index survives a parser call.

## Diagnostics

Blocking diagnostics are deterministic and actionable. The adapters use these categories:

- `xml.malformed` — XML validation or parsing failed;
- `xml.invalid-root` — the expected `vocations` or `items` root was not found;
- `xml.missing-attribute` — a selected entity lacks a required field;
- `xml.invalid-number` / `xml.invalid-id` — a numeric field or requested ID is invalid;
- `xml.duplicate-id` / `xml.duplicate-range` — source identity is repeated;
- `xml.invalid-range` — `fromid` is greater than `toid`;
- `xml.entity-not-found` — a requested ID or name is absent;
- `xml.ambiguous-name` / `xml.ambiguous-id` — selection does not identify one entity;
- `xml.unsupported-attribute` / `xml.unsupported-element` — a selected semantic field is outside the
  explicit allowlist.

The parser returns `CanaryParseResult`: a successful result contains only selected, source-ID-sorted
DTOs; any blocking diagnostic returns `ok: false` and no partial DTO value.
