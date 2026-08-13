# PB-01-05 Lua Importers Design

## Goal

Parse the curated Canary monster and Berserk Lua files as declarative data without executing Lua,
and return Huntbound-owned DTOs with explicit units, normalized damage/chances, and actionable
source locations.

## Scope

The adapter accepts Lua source text and supports only the frozen PB-01-05 subset required by Rotworm,
Amazon, Orc Shaman, Snake, and Berserk. It has no filesystem, SQLite, Node runtime, VM, subprocess,
Phaser, or gameplay dependency. Source files remain at the composition boundary for a later task.

## Architecture

The implementation is split into a shared strict AST layer and two source-specific mappers:

- `lua/ast.ts` parses with `luaparse` using `locations: true`, `ranges: true`, `comments: false`, and
  `luaVersion: '5.3'`.
- `lua/diagnostics.ts` turns syntax and whitelist failures into `ContentDiagnostic` values carrying
  a `lua.*` code, contextual message, and line/column when available.
- `lua/staticValues.ts` visits only literals, allowlisted tables, symbolic constants, and the exact
  arithmetic needed for cooldowns and the Berserk formula. It never evaluates arbitrary Lua.
- `lua/parseMonsterLua.ts` maps the allowlisted `Game.createMonsterType`/`monster` declaration into
  creature DTOs.
- `lua/parseSpellLua.ts` maps allowlisted `Combat`/`Spell` declarations and recognizes
  `onGetFormulaValues` by AST shape, returning coefficients instead of a function.
- `lua/luaTypes.ts` owns public DTOs and the internal reference/value types shared by both mappers.

The shared visitor rejects loops, conditionals, dynamic mutation, computed indexes, unexpected
functions, unknown identifiers, unsupported operators, string/table call sugar, and calls outside
the explicit allowlist. Source-only fields and callbacks are ignored only when named in the mapping
document; unknown semantic fields are blocking errors.

## Data Flow and Normalization

1. Parse the input string into a located AST; syntax errors return a failure result.
2. Walk every top-level statement and either record an allowlisted declaration/configuration or emit
   a blocking diagnostic. No statement is skipped implicitly.
3. Resolve creature/spell declarations into internal records and validate required source identity.
4. Map records to DTOs, preserving source order where attacks, summons, and loot are semantically
   ordered.
5. Return no partial value when any blocking diagnostic exists.

Creature damage is converted from Canary's signed values to non-negative magnitudes and min/max are
ordered. Action chances are converted from percentage points to basis points by multiplying by 100;
loot chances retain Canary's `0..100000` scale. Intervals and cooldowns are integer milliseconds;
ranges/radii are integer tiles. Combat constants map to the contract vocabulary. Element percentages
become resistance entries, and only immunity entries with `condition = true` are emitted. Poison is
retained as a declarative condition with `totalDamage` and `intervalMs`.

The source `raceId` is the creature `sourceId` and is required. `Game.createMonsterType` supplies the
display name. `knight` and `elite knight` remain raw spell vocation references. `AREA_SQUARE1X1`
maps to a square radius of one tile. Loot DTOs retain only the explicitly required source ID/name
reference shape; loot scale is documented for the future catalog mapping boundary.

## Error Handling

Diagnostics use stable categories including `lua.syntax`, `lua.unsupported-statement`,
`lua.unsupported-expression`, `lua.unsupported-call`, `lua.computed-index`, `lua.missing-field`,
`lua.invalid-value`, and `lua.invalid-formula`. Messages identify the relevant field or AST form.
Every diagnostic produced from a source node includes that node's line and column.

## Testing

Tests are written before each implementation slice and observed failing for the missing adapter. The
suite covers positive creature forms, Berserk metadata and formula coefficients, poison, elements,
immunities, summon and loot references, malformed Lua, all forbidden AST forms, source locations,
operator mutation in the formula, and the guarantee that the runtime entrypoint does not export the
adapter. A negative source scan verifies the adapter contains no `eval`, `new Function`, Lua VM,
`child_process`, or filesystem import.

## Verification

The task gates are the focused Lua tests, content typecheck, architecture check, restricted Biome
check, format check, and `git diff --check`. The handoff records fresh outputs, the commit, and the
next eligible PB-01-06 task.
