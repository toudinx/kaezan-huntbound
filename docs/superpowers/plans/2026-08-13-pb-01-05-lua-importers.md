# PB-01-05 Lua Importers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Parse curated Canary creature and Berserk Lua sources as a strict, located AST projection without executing Lua.

**Architecture:** A shared luaparse wrapper and static-value visitor enforce the closed AST whitelist. Creature and spell mappers consume validated structures and own source-specific mappings. No adapter module reads files or imports Node APIs.

**Tech Stack:** TypeScript 7, luaparse 0.3.1, @types/luaparse 0.2.13, Vitest 4, @huntbound/contracts.

## Global Constraints

- luaparse uses locations: true, ranges: true, comments: false, luaVersion: '5.3'.
- Lua is analyzed statically by AST and never executed.
- The adapter receives source text and does not access filesystem, SQLite, Node, VM, subprocess, Phaser, or gameplay rules.
- Action chances use chanceBasisPoints (10_000 = 100%); loot retains Canary's chancePerHundredThousand scale (100_000 = 100%).
- Damage and healing are non-negative magnitudes; negative Canary damage is normalized by the adapter.
- Intervals/cooldowns are integer milliseconds; ranges/radii are integer tiles.
- raceId is the creature source identity; knight and elite knight remain raw vocation references.
- Unknown statements, calls, fields, operators, computed indexes, and unexpected functions are blocking diagnostics.
- Lua adapters remain outside the runtime entrypoint.

---

## File Map

- Create packages/content/src/importers/canary/lua/luaTypes.ts: public DTOs and internal references.
- Create packages/content/src/importers/canary/lua/luaDiagnostics.ts: location-aware lua.* diagnostics.
- Create packages/content/src/importers/canary/lua/luaAst.ts: located luaparse wrapper and statement guards.
- Create packages/content/src/importers/canary/lua/staticValues.ts: allowlisted literals, tables, constants, and literal arithmetic.
- Create packages/content/src/importers/canary/lua/parseMonsterLua.ts: creature declaration visitor.
- Create packages/content/src/importers/canary/lua/parseSpellLua.ts: spell declaration visitor and formula mapper.
- Create packages/content/src/importers/canary/lua/luaAst.test.ts: parser, locations, expressions, and forbidden AST forms.
- Create packages/content/src/importers/canary/lua/parseMonsterLua.test.ts: creature fixtures and normalization.
- Create packages/content/src/importers/canary/lua/parseSpellLua.test.ts: Berserk metadata and formula.
- Create docs/content/CANARY_LUA_MAPPING.md: field mapping, whitelist, ignored fields, and non-execution policy.
- Modify docs/playbooks/PB-01/STATE.md: final handoff and next task.

### Public interfaces

luaTypes.ts must export these shapes and parser signatures:

~~~ts
export interface CanaryAttackDto {
  readonly name: string;
  readonly kind: 'melee' | 'ranged' | 'area';
  readonly intervalMs: number;
  readonly chanceBasisPoints: number;
  readonly damageType: string;
  readonly minDamage: number;
  readonly maxDamage: number;
  readonly rangeTiles?: number;
  readonly projectile?: string;
  readonly radiusTiles?: number;
}

export interface CanaryDefenseDto {
  readonly kind: 'heal';
  readonly intervalMs: number;
  readonly chanceBasisPoints: number;
  readonly minAmount: number;
  readonly maxAmount: number;
}

export interface CanaryConditionDto {
  readonly kind: 'poison';
  readonly totalDamage: number;
  readonly intervalMs: number;
}

export interface CanarySummonDto {
  readonly creatureRef:
    | { readonly sourceId: string }
    | { readonly sourceName: string };
  readonly count: number;
  readonly chanceBasisPoints: number;
}

export interface CanaryCreatureDto {
  readonly sourceId: string;
  readonly displayName: string;
  readonly stats: { readonly health: number; readonly experience: number; readonly speed: number };
  readonly lookType: number;
  readonly attacks: readonly CanaryAttackDto[];
  readonly defenses: readonly CanaryDefenseDto[];
  readonly conditions: readonly CanaryConditionDto[];
  readonly summons: readonly CanarySummonDto[];
  readonly lootRefs: readonly ({ readonly sourceId: string } | { readonly sourceName: string })[];
  readonly elements: Readonly<Record<string, number>>;
  readonly immunities: readonly string[];
}

export interface CanarySpellDto {
  readonly sourceId: string;
  readonly displayName: string;
  readonly words: string;
  readonly level: number;
  readonly mana: number;
  readonly cooldownMs: number;
  readonly groupCooldownMs: number;
  readonly vocationNames: readonly string[];
  readonly damageType: string;
  readonly area: { readonly shape: 'square'; readonly radius: number };
  readonly formula: {
    readonly kind: 'skillAttack';
    readonly levelFactor: number;
    readonly minSkillAttackFactor: number;
    readonly maxSkillAttackFactor: number;
    readonly finalMultiplier: number;
  };
}

export function parseCanaryMonsterLua(lua: string): CanaryParseResult<CanaryCreatureDto>;
export function parseCanarySpellLua(lua: string): CanaryParseResult<CanarySpellDto>;
~~~

## Task 1: Build the located static AST boundary

**Files:**
- Create: packages/content/src/importers/canary/lua/luaTypes.ts
- Create: packages/content/src/importers/canary/lua/luaDiagnostics.ts
- Create: packages/content/src/importers/canary/lua/luaAst.ts
- Create: packages/content/src/importers/canary/lua/staticValues.ts
- Test: packages/content/src/importers/canary/lua/luaAst.test.ts

**Interfaces:**
- Consumes: CanaryParseResult from ../sourceTypes and ContentDiagnostic from @huntbound/contracts.
- Produces: parseLuaChunk(lua: string), diagnosticAt(node, code, message), and static-value helpers used by both mappers.

- [ ] **Step 1: Write failing syntax/location tests.**

~~~ts
it('reports malformed Lua with a syntax diagnostic', () => {
  const result = parseLuaChunk('local broken = {');
  expect(result.ok).toBe(false);
  expect(result.ok ? [] : result.diagnostics).toEqual(
    expect.arrayContaining([expect.objectContaining({ code: 'lua.syntax' })]),
  );
});

it('attaches line and column to a whitelist diagnostic', () => {
  const result = parseLuaChunk('local value = dofile("x")');
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(diagnosticAt(result.value.body[0], 'lua.unsupported-call', 'blocked')).toEqual(
    expect.objectContaining({ code: 'lua.unsupported-call', line: 1, column: 1 }),
  );
});
~~~

- [ ] **Step 2: Add AST guard tests and run them RED.** Cover dofile, require, unknown calls,
  while, for, if, local value = object[key], assignment to object[key], an unexpected function,
  and an unsupported binary operator. Run:
  corepack pnpm --filter @huntbound/content test -- src/importers/canary/lua/luaAst.test.ts
  Expected: FAIL because the Lua modules and parser exports do not exist.

- [ ] **Step 3: Implement the located parser.** Call luaparse.parse(lua, { comments: false,
  locations: true, ranges: true, luaVersion: '5.3' }). Catch parser exceptions and return lua.syntax
  with loc.start.line/loc.start.column when available. diagnosticAt must not execute or stringify an
  arbitrary AST by calling user code.

- [ ] **Step 4: Implement static values.** Accept only StringLiteral, NumericLiteral, BooleanLiteral,
  NilLiteral, TableConstructorExpression with TableKeyString/TableValue, identifiers from a fixed
  constant map, and +, -, *, / over finite numeric literals where the caller explicitly requests
  arithmetic. Reject every other expression and all IndexExpression nodes with lua.computed-index or
  lua.unsupported-expression.

- [ ] **Step 5: Run shared tests GREEN and typecheck.**

~~~powershell
corepack pnpm --filter @huntbound/content test -- src/importers/canary/lua/luaAst.test.ts
corepack pnpm --filter @huntbound/content typecheck
~~~

Expected: AST tests pass and typecheck exits 0.

- [ ] **Step 6: Commit the shared boundary.**

~~~powershell
git add packages/content/src/importers/canary/lua
git commit -m "feat: add strict Lua AST boundary"
~~~

## Task 2: Map creature declarations

**Files:**
- Create: packages/content/src/importers/canary/lua/parseMonsterLua.ts
- Test: packages/content/src/importers/canary/lua/parseMonsterLua.test.ts

**Interfaces:**
- Consumes: parseLuaChunk, static tables/constants, and DTOs from Task 1.
- Produces: parseCanaryMonsterLua(lua: string): CanaryParseResult<CanaryCreatureDto>.

- [ ] **Step 1: Write failing creature tests.** Use the existing synthetic files from
  packages/test-fixtures/canary/pb01 as test inputs and cover Rotworm stats/look/loot, Amazon
  melee+ranged, Orc area+heal+summon+elements+immunities, and Snake poison.

~~~ts
it('maps Rotworm signed damage and mixed loot references', () => {
  const result = parseCanaryMonsterLua(rotwormFixture);
  expect(result).toEqual({
    ok: true,
    value: expect.objectContaining({
      sourceId: '9026',
      displayName: 'Fixture Rotbeast',
      stats: { health: 140, experience: 61, speed: 83 },
      lookType: 9026,
      attacks: [expect.objectContaining({
        kind: 'melee', chanceBasisPoints: 10_000, minDamage: 0, maxDamage: 19,
      })],
      lootRefs: [{ sourceId: '9301' }, { sourceName: 'fixture tonic' }],
    }),
  });
});

it('maps Snake poison as a declarative condition', () => {
  const result = parseCanaryMonsterLua(snakeFixture);
  expect(result.ok ? result.value.conditions : []).toEqual([
    { kind: 'poison', totalDamage: 18, intervalMs: 3000 },
  ]);
});
~~~

Also add negative tests for missing raceId, an unknown monster field, a computed index, a loop,
an unexpected function, invalid action chance, and malformed Lua. Each expects ok: false and a
diagnostic with a location.

- [ ] **Step 2: Run creature tests RED.** Run:
  corepack pnpm --filter @huntbound/content test -- src/importers/canary/lua/parseMonsterLua.test.ts
  Expected: FAIL because parseMonsterLua.ts is absent.

- [ ] **Step 3: Implement declaration collection.** Accept only local mType = Game.createMonsterType(string),
  local monster = {}, point assignments to monster, the explicit source-only fields from the mapping,
  and mType:register(monster). Reject every other top-level statement. Require non-empty monster.raceId,
  experience, health, speed, and outfit.lookType.

- [ ] **Step 4: Implement action/reference mappings.** Map attacks in source order: no range/radius is
  melee, range is ranged, and radius is area. Normalize CONST_ANI_ARROW to arrow,
  CONST_ANI_THROWINGKNIFE to throwingknife, CONST_ANI_ENERGYBALL to energyball, and CONST_ANI_FIRE
  to fire. Map monster.defenses only for COMBAT_HEALING action entries; ignore scalar defense/armor/
  mitigation. Convert poison conditions, summon names/IDs, and loot references. Validate loot chance/count
  values in Canary's 0..100000 scale even though the public DTO exposes only source ID/name.

- [ ] **Step 5: Implement elements/immunities and validation.** Map the ten known combat element
  constants to stable resistance keys, retain numeric percentages as fractional values
  (50 -> 0.5, -10 -> -0.1), and emit only immunity entries whose condition is true. Unknown semantic
  fields and invalid finite/integer/range/chance values return no partial DTO.

- [ ] **Step 6: Run creature tests GREEN and typecheck.**

~~~powershell
corepack pnpm --filter @huntbound/content test -- src/importers/canary/lua/parseMonsterLua.test.ts
corepack pnpm --filter @huntbound/content typecheck
~~~

Expected: creature tests pass and typecheck exits 0.

- [ ] **Step 7: Commit the creature mapper.**

~~~powershell
git add packages/content/src/importers/canary/lua/parseMonsterLua.ts packages/content/src/importers/canary/lua/parseMonsterLua.test.ts
git commit -m "feat: parse curated Canary creatures"
~~~

## Task 3: Map Berserk and the declarative formula

**Files:**
- Create: packages/content/src/importers/canary/lua/parseSpellLua.ts
- Test: packages/content/src/importers/canary/lua/parseSpellLua.test.ts

**Interfaces:**
- Consumes: shared AST/static-value modules and CanarySpellDto from Task 1.
- Produces: parseCanarySpellLua(lua: string): CanaryParseResult<CanarySpellDto>.

- [ ] **Step 1: Write failing spell tests.** Assert the synthetic Berserk fixture maps to:

~~~ts
expect(result).toEqual({
  ok: true,
  value: {
    sourceId: '9080',
    displayName: 'Fixture Berserk',
    words: 'fixture exori',
    level: 27,
    mana: 83,
    cooldownMs: 5000,
    groupCooldownMs: 3000,
    vocationNames: ['knight', 'elite knight'],
    damageType: 'physical',
    area: { shape: 'square', radius: 1 },
    formula: {
      kind: 'skillAttack',
      levelFactor: 1 / 6,
      minSkillAttackFactor: 0.4,
      maxSkillAttackFactor: 0.9,
      finalMultiplier: 1.2,
    },
  },
});
~~~

Add a real-like spell:id(80) test with spell:cooldown(4 * 1000), a test that changes the formula
return operator and expects lua.invalid-formula, and tests rejecting missing spell ID, unknown spell method,
arbitrary callback body, and dofile/require.

- [ ] **Step 2: Run spell tests RED.** Run:
  corepack pnpm --filter @huntbound/content test -- src/importers/canary/lua/parseSpellLua.test.ts
  Expected: FAIL because parseSpellLua.ts is absent.

- [ ] **Step 3: Implement allowlisted combat/spell collection.** Accept Combat(), Spell('instant'),
  combat:setParameter, combat:setArea(createCombatArea(AREA_SQUARE1X1)), exact callback registration,
  configured methods id, name, words, level, mana, cooldown, groupCooldown, vocation, and explicit
  source-only methods group, castSound, isPremium, needWeapon. Ignore only registered spell.onCastSpell
  after validating its explicitly ignored callback form.

- [ ] **Step 4: Implement exact formula recognition without execution.** Require parameters
  player, skill, attack, factor; allow player:getLevel(), two assignments matching
  level / <number> + (skill + attack) * <number>, and returns matching -min * <number>, -max * <number>.
  Extract the four numeric coefficients from AST nodes. Reject changed operators, extra statements,
  calls, identifiers, or arbitrary function bodies.

- [ ] **Step 5: Validate required values and map the DTO.** Require source ID, display name, words,
  non-negative level/mana/cooldowns, a known damage type, area, both vocation names, and formula.
  Preserve vocation order and raw spelling after trimming the ;true suffix.

- [ ] **Step 6: Run spell tests GREEN and all Lua tests.**

~~~powershell
corepack pnpm --filter @huntbound/content test -- src/importers/canary/lua
corepack pnpm --filter @huntbound/content typecheck
~~~

Expected: all Lua tests pass and typecheck exits 0.

- [ ] **Step 7: Commit the spell mapper.**

~~~powershell
git add packages/content/src/importers/canary/lua/parseSpellLua.ts packages/content/src/importers/canary/lua/parseSpellLua.test.ts
git commit -m "feat: parse curated Canary Berserk spell"
~~~

## Task 4: Document the whitelist and prove the negative boundary

**Files:**
- Create: docs/content/CANARY_LUA_MAPPING.md
- Verify: all production files under packages/content/src/importers/canary/lua

- [ ] **Step 1: Document every consumed field.** For creature and spell fields, record source AST form,
  DTO destination, unit/normalization, consumer, and failure behavior. Include explicit tables for
  ignored description, Bestiary, locations, voices, sounds, combat effects, source flags, and callbacks.
  State that Lua is never executed and the adapter receives text only.

- [ ] **Step 2: Run the negative source scan.**

~~~powershell
rg -n "eval\\(|new Function|child_process|node:fs|node:vm|lua-vm|fengari|dofile\\(|require\\(" packages/content/src/importers/canary/lua -g '*.ts'
~~~

Expected: no output from production adapter files. dofile/require may appear only as string input inside
tests that prove rejection; production code must not import or invoke them.

- [ ] **Step 3: Run focused formatting/lint checks.**

~~~powershell
corepack pnpm exec biome check packages/content/src/importers/canary/lua docs/content/CANARY_LUA_MAPPING.md
corepack pnpm format:check
git diff --check
~~~

Expected: exit 0 for every command.

- [ ] **Step 4: Commit the mapping.**

~~~powershell
git add docs/content/CANARY_LUA_MAPPING.md
git commit -m "docs: document Canary Lua mapping"
~~~

## Task 5: Run task gates and update the PB-01 handoff

**Files:**
- Modify: docs/playbooks/PB-01/STATE.md

- [ ] **Step 1: Run the complete task gate.**

~~~powershell
corepack pnpm --filter @huntbound/content test -- src/importers/canary/lua
corepack pnpm --filter @huntbound/content typecheck
corepack pnpm architecture:check
corepack pnpm exec biome check packages/content docs/content/CANARY_LUA_MAPPING.md
corepack pnpm format:check
git diff --check
~~~

Expected: the Lua suite passes with its final test count; all other commands exit 0. Read every exit code
and test count before claiming completion.

- [ ] **Step 2: Update STATE.md.** Mark PB-01-05 done, record branch codex/pb01-05-lua-importers,
  final feature commit, fresh test/gate outputs, RED/GREEN cycle, whitelist/non-execution decision,
  and PB-01-06 as the next eligible task. Preserve the existing PB-01-04 handoff.

- [ ] **Step 3: Commit the handoff.**

~~~powershell
git add docs/playbooks/PB-01/STATE.md
git commit -m "docs: record PB-01-05 completion"
~~~

- [ ] **Step 4: Verify the worktree is clean and integrate serially.** Read git status --short, then on
  C:\Kaezan\kaezan-huntbound switch to main and fast-forward merge the feature branch. Re-run the Lua
  test suite and content typecheck on main, then remove the worktree, prune, and delete the feature branch
  as prescribed by the task card.
