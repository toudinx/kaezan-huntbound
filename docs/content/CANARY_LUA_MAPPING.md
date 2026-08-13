# Canary Lua mapping

This document defines the static Lua projection used by PB-01-05. The adapter receives Lua source
text and returns DTOs; it never reads a file, starts a process, loads a VM, calls a Canary API, or
executes a callback. Canary files remain outside Git and the future composition boundary will provide
their text.

## AST boundary and whitelist

The parser is `luaparse@0.3.1` configured with `comments: false`, `locations: true`, `ranges: true`,
`luaVersion: '5.3'`, and `encodingMode: 'pseudo-latin1'`. The encoding mode is explicit because
luaparse's default `none` mode discards decoded string values. Locations are retained so every
blocking diagnostic can identify a line and one-based column.

Allowlisted forms are:

- one local `mType = Game.createMonsterType(<string>)` and one empty local `monster = {}`;
- one local `combat = Combat()` and one local `spell = Spell("instant")`;
- point member assignments to `monster` only;
- literal tables with named fields or sequential values;
- allowlisted symbolic constants and finite literal arithmetic for numeric configuration;
- the exact configuration calls documented below;
- the exact `onGetFormulaValues` AST shape and the exact source-only `spell.onCastSpell` callback shape.

Loops, conditionals, computed indexes, arbitrary functions, dynamic mutation, unknown identifiers,
unknown calls, string/table-call sugar, and unsupported operators are blocking diagnostics. No generic
metadata bag is created for an unknown field.

## Creature mapping

Source form: `Game.createMonsterType` followed by assignments to `monster`, ending in
`mType:register(monster)`.

| Lua field/form | DTO destination | Normalization and unit | Consumer/reason |
| --- | --- | --- | --- |
| `Game.createMonsterType("name")` | `displayName` | Non-empty string preserved | Creature identity label |
| `monster.raceId` | `sourceId` | Safe non-negative integer rendered as a string; required | Stable Canary identity |
| `monster.health` | `stats.health` | Non-negative integer | Creature stats |
| `monster.experience` | `stats.experience` | Non-negative integer | Progression/combat contract |
| `monster.speed` | `stats.speed` | Non-negative integer in source speed units | Creature stats |
| `monster.outfit.lookType` | `lookType` | Non-negative integer; other look fields ignored | Appearance facet |
| `monster.attacks[]` | `attacks[]` | Source order preserved | Combat action contract |
| `attack.interval` | `intervalMs` | Non-negative integer milliseconds | Action timing |
| `attack.chance` | `chanceBasisPoints` | Integer percentage `0..100` multiplied by 100; `10_000 = 100%` | Action probability |
| `attack.minDamage/maxDamage` | `minDamage/maxDamage` | Absolute magnitudes, then ordered | Damage contract has no negative values |
| absent `range` and `radius` | `kind: melee` | Defaults damage type to `physical` | Melee action |
| `range` plus `shootEffect` | `kind: ranged`, `rangeTiles`, `projectile` | Integer tiles; known `CONST_ANI_*` names normalized | Ranged action |
| `radius` | `kind: area`, `radiusTiles` | Integer tiles; `radius` wins when source also has `range` | Area action |
| `attack.type` | `damageType` | `COMBAT_*` constant mapped to contract vocabulary | Damage type |
| `attack.condition` with `CONDITION_POISON` | `conditions[]` | `totalDamage >= 0`, positive `intervalMs` | Declarative condition |
| healing entry in `monster.defenses` | `defenses[]` | `minDamage/maxDamage` become non-negative `minAmount/maxAmount`; chance/interval normalized as actions | Healing action |
| `monster.summon.summons[]` | `summons[]` | ID or name reference, positive count, chance in basis points | Reachable creature dependency |
| `monster.loot[]` ID/name | `lootRefs[]` | One explicit `{sourceId}` or `{sourceName}` per entry; source order preserved | Later item resolution |
| `loot.chance` and count fields | validation-only at this DTO boundary | Chance must remain integer `0..100000`; `100000 = 100%`; counts must be positive and ordered | Prevent invalid loot data without widening the public ref DTO |
| `monster.elements[]` | `elements` | Keys normalized from combat constants; source percent divided by 100 (`50 -> 0.5`) | Resistance projection |
| `monster.immunities[]` | `immunities[]` | Only entries with boolean `condition = true`; source type preserved | Condition immunity projection |

Known combat keys include `physical`, `energy`, `earth`, `fire`, `lifeDrain`, `manaDrain`, `drown`,
`ice`, `holy`, `death`, `healing`, and `poison`. A melee attack without a type is physical. Area attacks
may contain both `range` and `radius` in the source; the DTO emits only the area radius.
Bestiary race constants (`BESTY_RACE_HUMAN`, `BESTY_RACE_HUMANOID`, `BESTY_RACE_REPTILE`, and
`BESTY_RACE_VERMIN`) are accepted only inside the ignored Bestiary projection.

### Creature fields intentionally ignored

These forms are recognized and statically validated but are not copied into metadata:

- `description`, `maxHealth`, `race`, `corpse`, and `manaCost`;
- `Bestiary`, including class, race, unlock values, stars, and textual `Locations`;
- `changeTarget`, `strategiesTarget`, `flags`, `light`, and `voices`;
- scalar `defense`, `armor`, and `mitigation` entries in `monster.defenses`;
- attack `effect` and `target`, summon `interval` and `maxSummons`, and loot count/chance after
  validation.

An unknown top-level monster field or nested semantic field is an error, not an ignored extension.

## Spell mapping

Source form: `Combat()` configuration, exact formula callback, `Spell("instant")` configuration, and
`spell:register()`.

| Lua field/form | DTO destination | Normalization and unit | Consumer/reason |
| --- | --- | --- | --- |
| `spell:id(number)` | `sourceId` | Safe non-negative integer rendered as string; required | Stable spell identity |
| `spell:name(string)` | `displayName` | Non-empty string preserved | Spell label |
| `spell:words(string)` | `words` | Non-empty string preserved | Spell command |
| `spell:level(number)` | `level` | Non-negative integer | Progression contract |
| `spell:mana(number)` | `mana` | Non-negative integer | Cost contract |
| `spell:cooldown(expr)` | `cooldownMs` | Non-negative integer milliseconds; literal arithmetic only | Spell timing |
| `spell:groupCooldown(expr)` | `groupCooldownMs` | Non-negative integer milliseconds; literal arithmetic only | Shared timing |
| `spell:vocation("name;true", ...)` | `vocationNames[]` | Semicolon suffix removed; order and raw names preserved | PB-01-06 family projection |
| `combat:setParameter(COMBAT_PARAM_TYPE, type)` | `damageType` | Known combat constant mapped to vocabulary | Spell damage |
| `combat:setArea(createCombatArea(AREA_SQUARE1X1))` | `area` | `{shape: "square", radius: 1}` | Area contract |
| exact `onGetFormulaValues` | `formula` | Function becomes four numeric coefficients; no function is returned | Declarative skill attack |

The exact formula is:

```lua
local level = player:getLevel()
local min = (level / <level-denominator>) + (skill + attack) * <min-factor>
local max = (level / <level-denominator>) + (skill + attack) * <max-factor>
return -min * <final-multiplier>, -max * <final-multiplier>
```

The DTO stores `levelFactor` as the reciprocal of the denominator and stores the two skill/attack
factors and final multiplier as finite numbers. Any changed operator, extra statement, extra call,
different identifier, or different return shape produces `lua.invalid-formula`.

### Spell forms intentionally ignored

The following are explicit source-only allowlist entries and have no DTO consumer:

- `combat:setParameter` for effect, block-armor, and use-charges parameters;
- `spell:group`, `spell:castSound`, `spell:isPremium`, and `spell:needWeapon`;
- the exact `spell.onCastSpell(creature, var)` callback that returns
  `combat:execute(creature, var)`.

The callback is recognized by AST shape and never invoked. An arbitrary callback body is rejected.

## Diagnostics

All diagnostics are blocking and returned without a partial DTO. Stable categories are:

- `lua.syntax` for malformed input;
- `lua.unsupported-statement` for loops, conditionals, unexpected locals/functions, or other statements;
- `lua.unsupported-call` for non-allowlisted calls;
- `lua.unsupported-field` / `lua.duplicate-field` for semantic table fields;
- `lua.computed-index` for dynamic table access or mutation;
- `lua.unsupported-expression` / `lua.unknown-identifier` for expressions outside the value whitelist;
- `lua.invalid-value` for wrong types, units, ranges, or numeric values;
- `lua.missing-field` for required source declarations or fields;
- `lua.invalid-formula` for a function that is not the frozen declarative formula shape.

Diagnostics include a source line and one-based column whenever the source node exists. Missing fields
use the nearest declaration anchor so they remain actionable.

## Non-execution guarantee

The implementation imports only `luaparse`, `@huntbound/contracts`, and local pure modules. It does
not import filesystem, child-process, VM, or runtime Lua packages. It never calls `eval`, `Function`,
Lua VM APIs, Canary APIs, or callbacks. The only output is normalized data and diagnostics.
