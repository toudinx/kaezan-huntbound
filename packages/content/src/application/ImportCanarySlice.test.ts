import type { ContentSliceDefinition } from '@huntbound/contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { importCanarySlice } from './ImportCanarySlice';
import type { CuratedCatalogWriter } from './internal/CuratedCatalogWriter';

const snapshot = '157e6f9e21318bd3033eea553fe9275b429faf72';
const paths = {
  vocation: 'data/XML/vocations.xml',
  items: 'data/items/items.xml',
  spell: 'data/scripts/spells/attack/berserk.lua',
  rotworm: 'data-otservbr-global/monster/vermins/rotworm.lua',
  amazon: 'data-otservbr-global/monster/humans/amazon.lua',
  orc: 'data-otservbr-global/monster/humanoids/orc_shaman.lua',
  snake: 'data-otservbr-global/monster/reptiles/snake.lua',
} as const;

const sources: Readonly<Record<string, string>> = {
  [paths.vocation]: `<vocations><vocation id="4" name="Knight" gaincap="25" gainhp="15" gainmana="5" manamultiplier="3" attackspeed="2000" basespeed="110"><skill id="4" multiplier="1.4" /></vocation></vocations>`,
  [paths.items]: `<items><item id="100" name="gold coin" weight="1" stackable="1" /></items>`,
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
  [paths.rotworm]: monster('Rotworm', 26, 'gold coin'),
  [paths.amazon]: monster('Amazon', 77, 'gold coin'),
  [paths.orc]: monster('Orc Shaman', 6, 'gold coin', true),
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
      'creature:tibia:rotworm',
      'creature:tibia:amazon',
      'creature:tibia:orc-shaman',
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
      ...['rotworm', 'amazon', 'orc-shaman'].map((name) => ({
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
      spell: ['80'],
      creature: ['26', '77', '6'],
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
            : relativePath === paths.spell
              ? ('spell' as const)
              : ('creature' as const),
    })),
  };
}

describe('importCanarySlice', () => {
  const cleanups: Array<() => void> = [];

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

    expect(result.diagnostics).toEqual([]);
    expect(result.bundle.slice.roots).toEqual(selection().roots);
    expect(
      result.bundle.creatures.map((creature) => creature.stableKey),
    ).toEqual([
      'creature:tibia:amazon',
      'creature:tibia:orc-shaman',
      'creature:tibia:rotworm',
      'creature:tibia:snake',
    ]);
    expect(result.bundle.items.map((item) => item.displayName)).toEqual([
      'gold coin',
    ]);
    expect(
      result.bundle.creatures.find((creature) =>
        creature.stableKey.endsWith(':snake'),
      )?.loot,
    ).toEqual([]);
    expect(result.bundle.slice.dependencies).toEqual([
      'creature:tibia:snake',
      'item:tibia:gold-coin',
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
