# PB-01-04 XML Importers Design

**Date:** 2026-08-12

**Status:** approved

## Goal

Implement pure, strict and selective XML adapters for the curated PB-01 slice. The adapters parse
Knight by vocation source ID `4` and only the requested item IDs or normalized names, producing
internal DTOs with explicit units and actionable diagnostics.

## Scope

The implementation is limited to `packages/content/src/importers/canary/xml/`, its tests, the XML
mapping documentation and the PB-01 operational state. It does not add filesystem access, SQLite,
CLI code, runtime exports, Lua parsing, creature parsing, loot resolution or gameplay behavior.

## Approach

Use `fast-xml-parser@5.10.1` directly in two focused adapters. Avoid a generic XML abstraction until
there is a third consumer. Each parser receives an XML string, validates the expected root and
selected structure, indexes entities only during that call, resolves the explicit selection, and
returns a deterministic `CanaryParseResult`.

The vocation parser receives `sourceIds` and maps only the requested entries. The item parser receives
explicit ID and name selections. A range (`fromid`/`toid`) is treated as a lookup container: it can
resolve one requested concrete ID but never expands into every ID in the range.

## Components

### Shared XML diagnostics

`xmlDiagnostics.ts` will contain small helpers for diagnostic construction, source location
normalization, name normalization and strict numeric conversion. Diagnostics use the existing
`ContentDiagnostic` and `CanaryParseResult` types. Failure returns `ok: false`; parsers do not throw
for malformed or invalid content selections.

### Vocation adapter

`parseVocationsXml.ts` will:

1. parse and validate the `<vocations>` root;
2. validate and index `<vocation>` entries by unique `id`;
3. reject duplicate IDs and invalid required numeric attributes;
4. select only the requested IDs, including Knight only when `4` is requested;
5. map the allowlisted progression fields to `CanaryVocationDto`;
6. map each allowlisted `<skill id multiplier>` to a deterministic `skill:<id>` key;
7. sort the resulting DTOs by `sourceId`.

Unknown attributes that could change the meaning of the selected DTO are blocking diagnostics.
Attributes explicitly documented as irrelevant may be ignored only through a tested allowlist.

### Item adapter

`parseItemsXml.ts` will:

1. parse and validate the `<items>` root;
2. validate item entries with either `id` or `fromid`/`toid`;
3. reject duplicate concrete IDs, malformed IDs and reversed ranges;
4. resolve each requested ID against a concrete item or a containing range;
5. resolve each requested normalized name only when it maps to one concrete ID;
6. reject missing IDs/names and ambiguous names without fallback;
7. map only documented item attributes to `CanaryItemDto.attributes`;
8. return unique DTOs sorted by `sourceId`.

The implementation will not maintain a global index or cache and will not import unrequested items.

## Data flow

```text
XML string
  -> fast-xml-parser
  -> root and entry validation
  -> local selection index
  -> explicit ID/name resolution
  -> DTO mapping with units
  -> deterministic sorted CanaryParseResult
```

The adapter never reads files or imports the runtime entrypoint. `packages/content/src/index.ts` will
not re-export the XML adapter.

## Diagnostics

Tests and documentation will establish stable diagnostic categories for:

- malformed XML or unexpected root;
- missing, duplicate or invalid IDs;
- missing requested entities;
- invalid required numbers;
- reversed ranges;
- ambiguous names;
- unknown required attributes;
- unsupported semantic fields.

Each blocking diagnostic includes an actionable message and, when available from the XML parser, a
line and column. The order of diagnostics is deterministic.

## Testing

Tests in `packages/content/src/importers/canary/xml/` will follow RED/GREEN and use the existing
synthetic fixtures plus minimal inline XML for negative cases.

Vocation coverage includes selected Knight, ignored unselected vocation, missing ID, duplicate ID,
invalid required number, unsupported semantic field and deterministic ordering. Item coverage includes
ID selection, normalized-name selection, one concrete ID inside a range, no range expansion, ambiguous
name, missing item, invalid range, exclusion of unrequested items and allowlisted attribute mapping.

The final verification runs:

```text
corepack pnpm --filter @huntbound/content test -- src/importers/canary/xml
corepack pnpm --filter @huntbound/content typecheck
corepack pnpm architecture:check
corepack pnpm exec biome check packages/content docs/content/CANARY_XML_MAPPING.md
corepack pnpm format:check
git diff --check
```

## Documentation

`docs/content/CANARY_XML_MAPPING.md` will document every consumed XML field with source path,
normalization, unit, DTO destination and consumer rationale. Ignored allowlisted fields will be listed
separately. No Canary source file will be copied or tracked.
