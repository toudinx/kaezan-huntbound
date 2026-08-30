import { describe, expect, it } from 'vitest';

import * as runtimeContent from '../../../index';
import { parseCanaryMonsterLua } from './parseMonsterLua';

const rotwormFixture = `local mType = Game.createMonsterType("Fixture Rotbeast")
local monster = {}
monster.description = "a fixture rotbeast"
monster.experience = 61
monster.outfit = { lookType = 9026 }
monster.raceId = 9026
monster.corpse = 5967
monster.health = 140
monster.speed = 83
monster.flags = { summonable = false, attackable = true, hostile = true }
monster.loot = {
  { id = 9301, chance = 42000, maxCount = 3 },
  { name = "fixture tonic", chance = 18000 },
}
monster.attacks = {
  { name = "melee", interval = 2100, chance = 100, minDamage = 0, maxDamage = -19 },
}
monster.defenses = { defense = 8, armor = 3 }
mType:register(monster)`;

const amazonFixture = `local mType = Game.createMonsterType("Fixture Archer")
local monster = {}
monster.experience = 74
monster.outfit = { lookType = 9077 }
monster.raceId = 9077
monster.health = 175
monster.speed = 96
monster.loot = { { id = 9302, chance = 26000, maxCount = 2 } }
monster.attacks = {
  { name = "melee", interval = 1900, chance = 100, minDamage = 0, maxDamage = -13 },
  { name = "ranged", interval = 2700, chance = 24, type = COMBAT_PHYSICALDAMAGE, minDamage = 0, maxDamage = -22, range = 6, shootEffect = CONST_ANI_ARROW, target = false },
}
mType:register(monster)`;

const orcShamanFixture = `local mType = Game.createMonsterType("Fixture Ember Sage")
local monster = {}
monster.experience = 89
monster.outfit = { lookType = 9006 }
monster.raceId = 9006
monster.health = 230
monster.speed = 71
monster.summon = {
  maxSummons = 2,
  summons = { { name = "Fixture Serpent", chance = 22, interval = 2300, count = 1 } },
}
monster.loot = { { id = 9301, chance = 31000, maxCount = 4 } }
monster.attacks = {
  { name = "melee", interval = 2200, chance = 100, minDamage = 0, maxDamage = -11 },
  { name = "bolt", interval = 2800, chance = 18, type = COMBAT_ENERGYDAMAGE, minDamage = -7, maxDamage = -29, range = 7, shootEffect = CONST_ANI_ENERGYBALL, target = false },
  { name = "burst", interval = 3300, chance = 9, type = COMBAT_FIREDAMAGE, minDamage = -4, maxDamage = -26, range = 7, radius = 1, shootEffect = CONST_ANI_FIRE, target = true },
}
monster.defenses = {
  defense = 8,
  { name = "restore", interval = 4100, chance = 33, type = COMBAT_HEALING, minDamage = 12, maxDamage = 25, effect = CONST_ME_MAGIC_BLUE, target = false },
}
monster.elements = {
  { type = COMBAT_PHYSICALDAMAGE, percent = 0 },
  { type = COMBAT_ENERGYDAMAGE, percent = 50 },
  { type = COMBAT_EARTHDAMAGE, percent = -10 },
  { type = COMBAT_HOLYDAMAGE, percent = 10 },
  { type = COMBAT_DEATHDAMAGE, percent = -5 },
}
monster.immunities = {
  { type = "invisible", condition = false },
}
mType:register(monster)`;

const snakeFixture = `local mType = Game.createMonsterType("Fixture Serpent")
local monster = {}
monster.experience = 21
monster.outfit = { lookType = 9028 }
monster.raceId = 9028
monster.health = 48
monster.speed = 108
monster.attacks = {
  { name = "melee", interval = 2000, chance = 100, minDamage = 0, maxDamage = -9, condition = { type = CONDITION_POISON, totalDamage = 18, interval = 3000 } },
}
mType:register(monster)`;

function diagnosticsOf<T>(result: {
  readonly ok: boolean;
  readonly diagnostics?: readonly T[];
}) {
  return result.ok ? [] : (result.diagnostics ?? []);
}

describe('parseCanaryMonsterLua', () => {
  it('maps Rotworm stats, lookType, melee and mixed loot references', () => {
    const result = parseCanaryMonsterLua(rotwormFixture);

    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        sourceId: '9026',
        displayName: 'Fixture Rotbeast',
        stats: { health: 140, experience: 61, speed: 83 },
        lookType: 9026,
        corpseItemId: 5967,
        attacks: [
          expect.objectContaining({
            kind: 'melee',
            chanceBasisPoints: 10_000,
            minDamage: 0,
            maxDamage: 19,
          }),
        ],
        lootRefs: [{ sourceId: '9301' }, { sourceName: 'fixture tonic' }],
      }),
    });
  });

  it('accepts source-only monster events without projecting them to runtime', () => {
    const result = parseCanaryMonsterLua(
      rotwormFixture.replace(
        'monster.description = "a fixture rotbeast"',
        'monster.description = "a fixture rotbeast"\nmonster.events = { "FixtureEvent" }',
      ),
    );

    expect(result.ok).toBe(true);
    expect(result.ok ? result.value : undefined).not.toHaveProperty('events');
  });

  it('maps a ranged physical attack and projectile', () => {
    const result = parseCanaryMonsterLua(amazonFixture);

    expect(result.ok ? result.value.attacks : []).toEqual([
      expect.objectContaining({ kind: 'melee', maxDamage: 13 }),
      expect.objectContaining({
        kind: 'ranged',
        damageType: 'physical',
        chanceBasisPoints: 2400,
        rangeTiles: 6,
        projectile: 'arrow',
        maxDamage: 22,
      }),
    ]);
  });

  it('maps the Canary spear projectile used by Orc Spearman', () => {
    const result = parseCanaryMonsterLua(
      amazonFixture.replace('CONST_ANI_ARROW', 'CONST_ANI_SPEAR'),
    );

    expect(result.ok ? result.value.attacks : []).toEqual([
      expect.objectContaining({ kind: 'melee' }),
      expect.objectContaining({ kind: 'ranged', projectile: 'spear' }),
    ]);
  });

  it('maps area damage, healing defense, summon, elements and immunities', () => {
    const result = parseCanaryMonsterLua(orcShamanFixture);

    expect(result.ok ? result.value : undefined).toEqual(
      expect.objectContaining({
        attacks: [
          expect.objectContaining({ kind: 'melee' }),
          expect.objectContaining({ kind: 'ranged', damageType: 'energy' }),
          {
            name: 'burst',
            kind: 'area',
            intervalMs: 3300,
            chanceBasisPoints: 900,
            damageType: 'fire',
            minDamage: 4,
            maxDamage: 26,
            radiusTiles: 1,
          },
        ],
        defenses: [
          expect.objectContaining({
            kind: 'heal',
            chanceBasisPoints: 3300,
            minAmount: 12,
            maxAmount: 25,
          }),
        ],
        summons: [
          {
            creatureRef: { sourceName: 'Fixture Serpent' },
            count: 1,
            chanceBasisPoints: 2200,
          },
        ],
        elements: {
          physical: 0,
          energy: 0.5,
          earth: -0.1,
          holy: 0.1,
          death: -0.05,
        },
        immunities: [],
      }),
    );
  });

  it('validates but omits wave attacks until the contract supports their shape', () => {
    const result = parseCanaryMonsterLua(
      orcShamanFixture.replace(
        '  { name = "burst", interval = 3300, chance = 9, type = COMBAT_FIREDAMAGE, minDamage = -4, maxDamage = -26, range = 7, radius = 1, shootEffect = CONST_ANI_FIRE, target = true },',
        '  { name = "burst", interval = 3300, chance = 9, type = COMBAT_FIREDAMAGE, minDamage = -4, maxDamage = -26, range = 7, radius = 1, shootEffect = CONST_ANI_FIRE, target = true },\n  { name = "wave", interval = 3300, chance = 10, type = COMBAT_FIREDAMAGE, minDamage = -100, maxDamage = -170, length = 8, spread = 3, effect = CONST_ME_FIREAREA, target = false },',
      ),
    );

    expect(result.ok).toBe(true);
    expect(result.ok ? result.value.attacks : []).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'wave' })]),
    );
  });

  it('retains poison as a declarative condition', () => {
    const result = parseCanaryMonsterLua(snakeFixture);

    expect(result.ok ? result.value.conditions : []).toEqual([
      { kind: 'poison', totalDamage: 18, intervalMs: 3000 },
    ]);
  });

  it('rejects an immunity without its condition flag', () => {
    const result = parseCanaryMonsterLua(
      orcShamanFixture.replace(
        '{ type = "invisible", condition = false }',
        '{ type = "invisible" }',
      ),
    );

    expect(result.ok).toBe(false);
    expect(diagnosticsOf(result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'lua.missing-field' }),
      ]),
    );
  });

  it('rejects a creature without raceId', () => {
    const result = parseCanaryMonsterLua(
      rotwormFixture.replace('monster.raceId = 9026\n', ''),
    );

    expect(diagnosticsOf(result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'lua.missing-field', line: 2 }),
      ]),
    );
  });

  it('rejects an unknown semantic field', () => {
    const result = parseCanaryMonsterLua(
      rotwormFixture.replace(
        'monster.speed = 83',
        'monster.speed = 83\nmonster.unknownField = 1',
      ),
    );

    expect(diagnosticsOf(result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'lua.unsupported-field' }),
      ]),
    );
  });

  it('rejects computed mutation, loops and unexpected functions', () => {
    for (const source of [
      `${rotwormFixture}\nmonster["health"] = 1`,
      `${rotwormFixture}\nwhile true do break end`,
      `${rotwormFixture}\nfunction unexpected() end`,
    ]) {
      const result = parseCanaryMonsterLua(source);
      expect(result.ok).toBe(false);
      expect(diagnosticsOf(result)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            line: expect.any(Number),
            column: expect.any(Number),
          }),
        ]),
      );
    }
  });

  it('rejects an action chance outside percentage units', () => {
    const result = parseCanaryMonsterLua(
      rotwormFixture.replace('chance = 100', 'chance = 101'),
    );

    expect(diagnosticsOf(result)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'lua.invalid-value' }),
      ]),
    );
  });

  it('reports malformed Lua', () => {
    const result = parseCanaryMonsterLua('local broken = {');

    expect(diagnosticsOf(result)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'lua.syntax' })]),
    );
  });

  it('keeps Lua adapters outside the runtime entrypoint', () => {
    expect(runtimeContent).not.toHaveProperty('parseCanaryMonsterLua');
  });
});
