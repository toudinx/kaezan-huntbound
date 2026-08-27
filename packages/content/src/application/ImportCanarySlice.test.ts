import type { ContentSliceDefinition } from '@huntbound/contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { importCanarySlice } from './ImportCanarySlice';
import type { CuratedCatalogWriter } from './internal/CuratedCatalogWriter';

const snapshot = '157e6f9e21318bd3033eea553fe9275b429faf72';
const paths = {
  vocation: 'data/XML/vocations.xml',
  items: 'data/items/items.xml',
  spell: 'data/scripts/spells/attack/berserk.lua',
  brutalStrike: 'data/scripts/spells/attack/brutal_strike.lua',
  woundCleansing: 'data/scripts/spells/healing/wound_cleansing.lua',
  groundshaker: 'data/scripts/spells/attack/groundshaker.lua',
  whirlwindThrow: 'data/scripts/spells/attack/whirlwind_throw.lua',
  rotworm: 'data-otservbr-global/monster/vermins/rotworm.lua',
  cyclops: 'data-otservbr-global/monster/giants/cyclops.lua',
  amazon: 'data-otservbr-global/monster/humans/amazon.lua',
  orc: 'data-otservbr-global/monster/humanoids/orc_shaman.lua',
  hero: 'data-otservbr-global/monster/humans/hero.lua',
  snake: 'data-otservbr-global/monster/reptiles/snake.lua',
} as const;

const sources: Readonly<Record<string, string>> = {
  [paths.vocation]: `<vocations><vocation id="4" name="Knight" gaincap="25" gainhp="15" gainmana="5" manamultiplier="3" attackspeed="2000" basespeed="110"><skill id="4" multiplier="1.4" /></vocation></vocations>`,
  [paths.items]: `<items><item id="100" name="gold coin" weight="1" stackable="1" /><item id="3264" name="sword" /><item id="3265" name="two handed sword" /></items>`,
  [paths.spell]: `local combat = Combat()
combat:setParameter(COMBAT_PARAM_TYPE, COMBAT_PHYSICALDAMAGE)
combat:setArea(createCombatArea(AREA_SQUARE1X1))
function onGetFormulaValues(player, skill, attack, factor)
  local level = player:getLevel()
  local min = (level / 5) + (skill + attack) * 0.5
  local max = (level / 5) + (skill + attack) * 1.5
  return -min * 1.1, -max * 1.1
end
combat:setCallback(CALLBACK_PARAM_SKILLVALUE, "onGetFormulaValues")
local spell = Spell("instant")
spell:id(80)
spell:name("Berserk")
spell:words("exori")
spell:level(35)
spell:mana(115)
spell:cooldown(4000)
spell:groupCooldown(2000)
spell:vocation("knight;true", "elite knight;true")
spell:register()`,
  [paths.brutalStrike]: `local combat = Combat()
combat:setParameter(COMBAT_PARAM_TYPE, COMBAT_PHYSICALDAMAGE)
combat:setParameter(COMBAT_PARAM_EFFECT, CONST_ME_HITAREA)
combat:setParameter(COMBAT_PARAM_DISTANCEEFFECT, CONST_ANI_WEAPONTYPE)
combat:setParameter(COMBAT_PARAM_BLOCKARMOR, 1)
combat:setParameter(COMBAT_PARAM_USECHARGES, 1)
function onGetFormulaValues(player, skill, attack, factor)
	local skillTotal = skill * attack
	local levelTotal = player:getLevel() / 5
	return -(((skillTotal * 0.02) + 4) + levelTotal) * 1.28, -(((skillTotal * 0.04) + 9) + levelTotal) * 1.28
end
combat:setCallback(CALLBACK_PARAM_SKILLVALUE, "onGetFormulaValues")
local spell = Spell("instant")
function spell.onCastSpell(creature, var)
	return combat:execute(creature, var)
end
spell:group("attack")
spell:id(61)
spell:name("Brutal Strike")
spell:words("exori ico")
spell:castSound(SOUND_EFFECT_TYPE_SPELL_BRUTAL_STRIKE)
spell:level(16)
spell:mana(30)
spell:isPremium(false)
spell:range(1)
spell:needTarget(true)
spell:blockWalls(true)
spell:needWeapon(true)
spell:cooldown(6 * 1000)
spell:groupCooldown(2 * 1000)
spell:vocation("knight;true", "elite knight;true")
spell:register()`,
  [paths.woundCleansing]: `local combat = Combat()
combat:setParameter(COMBAT_PARAM_TYPE, COMBAT_HEALING)
combat:setParameter(COMBAT_PARAM_EFFECT, CONST_ME_MAGIC_BLUE)
combat:setParameter(COMBAT_PARAM_DISPEL, CONDITION_PARALYZE)
combat:setParameter(COMBAT_PARAM_AGGRESSIVE, false)
function onGetFormulaValues(player, level, magicLevel)
	local min = (level * 0.2 + magicLevel * 4) + 25
	local max = (level * 0.2 + magicLevel * 7.95) + 51
	return min, max
end
combat:setCallback(CALLBACK_PARAM_LEVELMAGICVALUE, "onGetFormulaValues")
local spell = Spell("instant")
function spell.onCastSpell(creature, variant)
	return combat:execute(creature, variant)
end
spell:name("Wound Cleansing")
spell:words("exura ico")
spell:group("healing")
spell:vocation("knight;true", "elite knight;true")
spell:castSound(SOUND_EFFECT_TYPE_SPELL_WOUND_CLEANSING)
spell:id(123)
spell:cooldown(1 * 1000)
spell:groupCooldown(1 * 1000)
spell:level(8)
spell:mana(40)
spell:isSelfTarget(true)
spell:isAggressive(false)
spell:register()`,
  [paths.groundshaker]: `local combat = Combat()
combat:setParameter(COMBAT_PARAM_TYPE, COMBAT_PHYSICALDAMAGE)
combat:setParameter(COMBAT_PARAM_EFFECT, CONST_ME_GROUNDSHAKER)
combat:setArea(createCombatArea(AREA_CIRCLE3X3))
function onGetFormulaValues(player, skill, attack, factor)
  local level = player:getLevel()
  local min = (level / 5) + (skill + attack) * 0.5
  local max = (level / 5) + (skill + attack) * 1.1
  return -min * 1.28, -max * 1.28
end
combat:setCallback(CALLBACK_PARAM_SKILLVALUE, "onGetFormulaValues")
local spell = Spell("instant")
spell:id(106)
spell:name("Groundshaker")
spell:words("exori mas")
spell:level(33)
spell:mana(160)
spell:cooldown(8000)
spell:groupCooldown(2000)
spell:vocation("knight;true", "elite knight;true")
spell:register()`,
  [paths.whirlwindThrow]: `local combat = Combat()
combat:setParameter(COMBAT_PARAM_TYPE, COMBAT_PHYSICALDAMAGE)
combat:setParameter(COMBAT_PARAM_EFFECT, CONST_ME_HITAREA)
combat:setParameter(COMBAT_PARAM_DISTANCEEFFECT, CONST_ANI_WEAPONTYPE)
function onGetFormulaValues(player, skill, attack, factor)
  local level = player:getLevel()
  local min = (level / 5) + (skill + attack) / 3
  local max = (level / 5) + skill + attack
  return -min * 1.28, -max * 1.28
end
combat:setCallback(CALLBACK_PARAM_SKILLVALUE, "onGetFormulaValues")
local spell = Spell("instant")
spell:id(107)
spell:name("Whirlwind Throw")
spell:words("exori hur")
spell:level(28)
spell:mana(40)
spell:range(5)
spell:needTarget(true)
spell:cooldown(6000)
spell:groupCooldown(2000)
spell:vocation("knight;true", "elite knight;true")
spell:register()`,
  [paths.rotworm]: monster('Rotworm', 26, 'gold coin'),
  [paths.cyclops]: monster('Cyclops', 22, 'gold coin'),
  [paths.amazon]: monster('Amazon', 77, 'gold coin'),
  [paths.orc]: monster('Orc Shaman', 6, 'gold coin', true),
  [paths.hero]: monster('Hero', 73, 'gold coin'),
  [paths.snake]: monster('Snake', 28, undefined, false, true),
};

function monster(
  displayName: string,
  sourceId: number,
  lootName?: string,
  summonSnake = false,
  poison = false,
): string {
  return `local mType = Game.createMonsterType("${displayName}")
local monster = {}
monster.description = "a ${displayName.toLowerCase()}"
monster.experience = 10
monster.outfit = { lookType = ${sourceId} }
monster.raceId = ${sourceId}
monster.health = 20
monster.speed = 60
${summonSnake ? 'monster.summon = { summons = { { name = "Snake", chance = 20, interval = 2000, count = 1 } } }' : ''}
monster.loot = {${lootName === undefined ? '' : `{ name = "${lootName}", chance = 1000 }`}}
monster.attacks = { { name = "melee", interval = 2000, chance = 100, minDamage = 0, maxDamage = -8${poison ? ', condition = { type = CONDITION_POISON, totalDamage = 15, interval = 4000 }' : ''} } }
monster.elements = { { type = COMBAT_PHYSICALDAMAGE, percent = 0 } }
monster.immunities = { { type = "paralyze", condition = false } }
mType:register(monster)`;
}

function selection(): ContentSliceDefinition {
  return {
    key: 'fixture:pb-01-contract-coverage',
    snapshot,
    objective: 'Test the materialized slice',
    consumer: 'application tests',
    roots: [
      'vocation:tibia:knight',
      'spell:tibia:berserk',
      'spell:tibia:brutal-strike',
      'spell:tibia:wound-cleansing',
      'spell:tibia:groundshaker',
      'spell:tibia:whirlwind-throw',
      'creature:tibia:rotworm',
      'creature:tibia:cyclops',
      'creature:tibia:amazon',
      'creature:tibia:orc-shaman',
      'creature:tibia:hero',
    ],
    dependencies: ['creature:tibia:snake'],
    projections: [
      {
        entityKey: 'vocation:tibia:knight',
        facets: ['identity', 'progression'],
        consumer: 'progression tests',
        rationale: 'Knight progression is covered',
      },
      {
        entityKey: 'spell:tibia:berserk',
        facets: ['identity', 'spell'],
        consumer: 'spell tests',
        rationale: 'Berserk spell is covered',
      },
      {
        entityKey: 'spell:tibia:brutal-strike',
        facets: ['identity', 'spell'],
        consumer: 'spell tests',
        rationale: 'Brutal Strike spell is covered',
      },
      {
        entityKey: 'spell:tibia:wound-cleansing',
        facets: ['identity', 'spell'],
        consumer: 'spell tests',
        rationale: 'Wound Cleansing spell is covered',
      },
      {
        entityKey: 'spell:tibia:groundshaker',
        facets: ['identity', 'spell'],
        consumer: 'spell tests',
        rationale: 'Groundshaker spell is covered',
      },
      {
        entityKey: 'spell:tibia:whirlwind-throw',
        facets: ['identity', 'spell'],
        consumer: 'spell tests',
        rationale: 'Whirlwind Throw spell is covered',
      },
      ...['rotworm', 'cyclops', 'amazon', 'orc-shaman', 'hero'].map((name) => ({
        entityKey: `creature:tibia:${name}`,
        facets: ['identity', 'stats', 'appearance', 'combat', 'loot'],
        consumer: 'creature tests',
        rationale: `${name} combat and loot are covered`,
      })),
      {
        entityKey: 'creature:tibia:snake',
        facets: ['identity', 'stats', 'appearance', 'combat', 'conditions'],
        consumer: 'summon tests',
        rationale: 'Snake summon and poison are covered',
      },
    ],
    dependencyMode: 'reachable-only' as const,
    curationState: 'accepted' as const,
    exportVersion: '1',
    sourceFiles: Object.values(paths),
    rootSourceIds: {
      vocation: ['4'],
      spell: ['80', '61', '123', '106', '107'],
      creature: ['26', '22', '77', '6', '73'],
    },
    dependencySourceIds: { creature: ['28'] },
    projectionPolicy: {
      vocationFamilyKey: 'vocation-family:huntbound:knight',
      rawReferenceMappings: [
        {
          rawReference: 'knight',
          targetFamilyKey: 'vocation-family:huntbound:knight',
        },
        {
          rawReference: 'elite knight',
          targetFamilyKey: 'vocation-family:huntbound:knight',
        },
      ],
      aliases: [],
    },
    characters: [
      {
        stableKey: 'character:huntbound:knight-venore-rotworm-cave',
        vocationKey: 'vocation:tibia:knight',
        level: 35,
        skills: { sword: 60, magic: 0 },
        weaponItemKey: 'item:tibia:sword',
        weaponSourceId: '3264',
        weaponAttack: 14,
        maxHealth: 590,
        maxMana: 185,
        spellKeys: [
          'spell:tibia:berserk',
          'spell:tibia:brutal-strike',
          'spell:tibia:wound-cleansing',
          'spell:tibia:groundshaker',
          'spell:tibia:whirlwind-throw',
        ],
      },
      {
        stableKey: 'character:huntbound:knight-cyclopolis',
        vocationKey: 'vocation:tibia:knight',
        level: 45,
        skills: { sword: 60, magic: 0 },
        weaponItemKey: 'item:tibia:sword',
        weaponSourceId: '3264',
        weaponAttack: 14,
        maxHealth: 740,
        maxMana: 185,
        spellKeys: [
          'spell:tibia:berserk',
          'spell:tibia:brutal-strike',
          'spell:tibia:wound-cleansing',
          'spell:tibia:groundshaker',
          'spell:tibia:whirlwind-throw',
        ],
      },
      {
        stableKey: 'character:huntbound:knight-hero-cave',
        vocationKey: 'vocation:tibia:knight',
        level: 130,
        skills: { sword: 90, magic: 0 },
        weaponItemKey: 'item:tibia:two-handed-sword',
        weaponSourceId: '3265',
        weaponAttack: 30,
        maxHealth: 2015,
        maxMana: 645,
        spellKeys: [
          'spell:tibia:berserk',
          'spell:tibia:brutal-strike',
          'spell:tibia:wound-cleansing',
          'spell:tibia:groundshaker',
          'spell:tibia:whirlwind-throw',
        ],
      },
    ],
  } as unknown as ContentSliceDefinition;
}

function lock() {
  return {
    sourceSystem: 'canary' as const,
    commit: snapshot,
    license: 'GPL-2.0-only' as const,
    licensePath: 'LICENSE' as const,
    licenseSha256: 'a'.repeat(64),
    files: Object.values(paths).map((relativePath) => ({
      relativePath,
      sha256: 'a'.repeat(64),
      purpose:
        relativePath === paths.vocation
          ? ('vocations' as const)
          : relativePath === paths.items
            ? ('items' as const)
            : relativePath.includes('/spells/')
              ? ('spell' as const)
              : ('creature' as const),
    })),
  };
}

describe('importCanarySlice', () => {
  const cleanups: Array<() => void> = [];

  /** The slice only ever reads the catalog purposes. */
  function importWith(lockValue: Parameters<typeof importCanarySlice>[1]) {
    const writer = {
      transaction(
        operation: (tx: {
          replaceCatalogBundle(bundle: unknown): void;
          listOrphanEntities(): readonly string[];
        }) => unknown,
      ) {
        return operation({
          replaceCatalogBundle: () => undefined,
          listOrphanEntities: () => [],
        });
      },
    } as unknown as CuratedCatalogWriter;
    return importCanarySlice(selection(), lockValue, {
      readSource: (path) => sources[path] ?? '',
      writer,
    });
  }

  it('ignores locked appearances, map and spawn files, which the slice never imports', () => {
    const base = lock();
    const withHuntSources = {
      ...base,
      files: [
        ...base.files,
        {
          relativePath: 'data/items/appearances.dat',
          sha256: 'e'.repeat(64),
          purpose: 'appearances' as const,
        },
        {
          relativePath: 'data-canary/world/canary.otbm',
          sha256: 'b'.repeat(64),
          purpose: 'map' as const,
        },
        {
          relativePath: 'data-otservbr-global/world/otservbr-monster.xml',
          sha256: 'c'.repeat(64),
          purpose: 'spawn' as const,
        },
      ],
    };

    expect(importWith(withHuntSources).diagnostics).toEqual([]);
  });

  it('still rejects a catalog file that the selection does not declare', () => {
    const base = lock();
    const withStray = {
      ...base,
      files: [
        ...base.files,
        {
          relativePath: 'data-otservbr-global/monster/vermins/worm.lua',
          sha256: 'd'.repeat(64),
          purpose: 'creature' as const,
        },
      ],
    };

    expect(() => importWith(withStray)).toThrow(/invalid frozen slice/);
  });

  afterEach(() => {
    while (cleanups.length > 0) cleanups.pop()?.();
  });

  it('closes only roots, Snake, and loot items with facet-backed fields', () => {
    const written: unknown[] = [];
    const writer = {
      transaction(
        operation: (tx: {
          replaceCatalogBundle(bundle: unknown): void;
          listOrphanEntities(): readonly string[];
        }) => unknown,
      ) {
        return operation({
          replaceCatalogBundle: (bundle) => written.push(bundle),
          listOrphanEntities: () => [],
        });
      },
    } as unknown as CuratedCatalogWriter;

    const result = importCanarySlice(selection(), lock(), {
      readSource: (path) => sources[path] ?? '',
      writer,
    });

    expect(result.bundle.spells.map((spell) => spell.stableKey)).toEqual([
      'spell:tibia:berserk',
      'spell:tibia:brutal-strike',
      'spell:tibia:groundshaker',
      'spell:tibia:whirlwind-throw',
      'spell:tibia:wound-cleansing',
    ]);
    expect(result.bundle.characters).toEqual([
      {
        stableKey: 'character:huntbound:knight-cyclopolis',
        vocationKey: 'vocation:tibia:knight',
        level: 45,
        skills: { sword: 60, magic: 0 },
        weaponItemKey: 'item:tibia:sword',
        weaponAttack: 14,
        maxHealth: 740,
        maxMana: 185,
        spellKeys: [
          'spell:tibia:berserk',
          'spell:tibia:brutal-strike',
          'spell:tibia:wound-cleansing',
          'spell:tibia:groundshaker',
          'spell:tibia:whirlwind-throw',
        ],
      },
      {
        stableKey: 'character:huntbound:knight-hero-cave',
        vocationKey: 'vocation:tibia:knight',
        level: 130,
        skills: { sword: 90, magic: 0 },
        weaponItemKey: 'item:tibia:two-handed-sword',
        weaponAttack: 30,
        maxHealth: 2015,
        maxMana: 645,
        spellKeys: [
          'spell:tibia:berserk',
          'spell:tibia:brutal-strike',
          'spell:tibia:wound-cleansing',
          'spell:tibia:groundshaker',
          'spell:tibia:whirlwind-throw',
        ],
      },
      {
        stableKey: 'character:huntbound:knight-venore-rotworm-cave',
        vocationKey: 'vocation:tibia:knight',
        level: 35,
        skills: { sword: 60, magic: 0 },
        weaponItemKey: 'item:tibia:sword',
        weaponAttack: 14,
        maxHealth: 590,
        maxMana: 185,
        spellKeys: [
          'spell:tibia:berserk',
          'spell:tibia:brutal-strike',
          'spell:tibia:wound-cleansing',
          'spell:tibia:groundshaker',
          'spell:tibia:whirlwind-throw',
        ],
      },
    ]);
    expect(
      result.bundle.creatures.map((creature) => creature.stableKey),
    ).toEqual([
      'creature:tibia:amazon',
      'creature:tibia:cyclops',
      'creature:tibia:hero',
      'creature:tibia:orc-shaman',
      'creature:tibia:rotworm',
      'creature:tibia:snake',
    ]);
    expect(result.bundle.items.map((item) => item.displayName)).toEqual([
      'gold coin',
      'sword',
      'two handed sword',
    ]);
    expect(
      result.bundle.creatures.find((creature) =>
        creature.stableKey.endsWith(':snake'),
      )?.loot,
    ).toEqual([]);
    expect(result.bundle.slice.dependencies).toEqual([
      'creature:tibia:snake',
      'item:tibia:gold-coin',
      'item:tibia:sword',
      'item:tibia:two-handed-sword',
    ]);
    expect(
      result.bundle.slice.projections.find(
        (projection) => projection.entityKey === 'item:tibia:gold-coin',
      ),
    ).toMatchObject({
      facets: ['identity', 'item'],
      consumer: expect.any(String),
      rationale: expect.any(String),
    });
    expect(written).toHaveLength(1);
  });

  it('keeps raw Knight and Elite Knight refs as audits and maps both to one family', () => {
    const writer = {
      transaction(
        operation: (tx: {
          replaceCatalogBundle(bundle: unknown): void;
          listOrphanEntities(): readonly string[];
        }) => unknown,
      ) {
        return operation({
          replaceCatalogBundle: () => undefined,
          listOrphanEntities: () => [],
        });
      },
    } as unknown as CuratedCatalogWriter;

    const { bundle } = importCanarySlice(selection(), lock(), {
      readSource: (path) => sources[path] ?? '',
      writer,
    });

    expect(bundle.projectionAudits.map((audit) => audit.rawReference)).toEqual([
      'knight',
      'elite knight',
      'knight',
      'elite knight',
      'knight',
      'elite knight',
      'knight',
      'elite knight',
      'knight',
      'elite knight',
    ]);
    expect(bundle.vocations).toHaveLength(1);
    expect(bundle.vocationFamilies[0]?.vocationKeys).toEqual([
      'vocation:tibia:knight',
    ]);
    expect(bundle.spells[0]?.allowedVocationFamilies).toEqual([
      'vocation-family:huntbound:knight',
    ]);
  });
});
