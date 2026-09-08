import {
  type CharacterDefinition,
  type ContentKey,
  type CreatureDefinition,
  characterSpellKeysAtLevel,
  createContentGuid,
  createSeed,
  HUNT_SCHEMA_VERSION,
  type HuntDefinition,
  type ItemDefinition,
  type RuntimeContentBundle,
  type Seed,
  SIMULATION_SCHEMA_VERSION,
  type SimulationValidationResult,
  type SpellDefinition,
  type VocationDefinition,
  type VocationFamilyDefinition,
  type VocationFamilyKey,
  validateKernelScenario,
} from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import {
  CanonicalJsonError,
  encodeCanonicalJson,
} from '../../../simulation/src/state/canonicalJson.ts';
import {
  type ContentRegistry,
  createContentRegistry,
} from '../runtime/contentRegistry.ts';
import {
  buildHuntScenario,
  type HuntScenarioBuild,
} from './buildHuntScenario.ts';
import { loadHuntDefinition } from './loadHuntDefinition.ts';

const seed = createSeed('1a2b3c4d5e6f7a8b');
const knightFamily = 'vocation-family:huntbound:knight' as VocationFamilyKey;
const sorcererFamily =
  'vocation-family:huntbound:sorcerer' as VocationFamilyKey;

const character: CharacterDefinition = {
  stableKey: 'character:huntbound:knight-venore-rotworm-cave',
  vocationKey: 'vocation:tibia:knight' as ContentKey,
  level: 8,
  skills: { sword: 10, magic: 0 },
  weaponItemKey: 'item:tibia:sword' as ContentKey,
  weaponAttack: 14,
  maxHealth: 185,
  maxMana: 185,
  spellKeys: [
    'spell:tibia:berserk' as ContentKey,
    'spell:tibia:brutal-strike' as ContentKey,
    'spell:tibia:wound-cleansing' as ContentKey,
  ],
};

const knightRotationCharacter: CharacterDefinition = {
  ...character,
  level: 35,
  skills: { sword: 60, magic: 0 },
  maxHealth: 590,
  maxMana: 185,
  spellKeys: [
    'spell:tibia:berserk' as ContentKey,
    'spell:tibia:brutal-strike' as ContentKey,
    'spell:tibia:wound-cleansing' as ContentKey,
    'spell:tibia:groundshaker' as ContentKey,
    'spell:tibia:whirlwind-throw' as ContentKey,
  ],
};

const rawKnightPostures = [
  {
    abilityId: 'blood-rage',
    conditionId: 'blood-rage',
    displayName: 'Blood Rage',
    level: 20,
    mana: 20,
    skillIndex: 2,
    skillModifierPermille: 250,
    damageReceivedPermille: 150,
    damageDealtPermille: 0,
    shieldingPermille: 0,
    source: {
      provider: 'TibiaWiki',
      version: '15.25.3a4a52',
      divergence:
        'Uses the 2026 stance values because the Canary snapshot predates toggle stances.',
    },
  },
  {
    abilityId: 'protector',
    conditionId: 'protector',
    displayName: 'Protector',
    level: 20,
    mana: 20,
    skillIndex: null,
    skillModifierPermille: 0,
    damageReceivedPermille: -150,
    damageDealtPermille: -150,
    shieldingPermille: 300,
    source: {
      provider: 'TibiaWiki',
      version: '15.25.3a4a52',
      divergence:
        'Shielding stays declarative until PB-11 adds armor and shielding resolution.',
    },
  },
] as const;

function identity(
  kind: 'vocation' | 'creature' | 'item' | 'spell',
  slug: string,
  facets: CreatureDefinition['includedFacets'],
) {
  return {
    guid: createContentGuid(kind, 'tibia', slug),
    stableKey: `${kind}:tibia:${slug}` as ContentKey,
    displayName: slug,
    includedFacets: facets,
  };
}

function knightFamilyDef(): VocationFamilyDefinition {
  return {
    key: knightFamily,
    displayName: 'Knight',
    vocationKeys: ['vocation:tibia:knight' as ContentKey],
  };
}

function sorcererFamilyDef(): VocationFamilyDefinition {
  return {
    key: sorcererFamily,
    displayName: 'Sorcerer',
    vocationKeys: [],
  };
}

function knightVocation(): VocationDefinition {
  return {
    ...identity('vocation', 'knight', ['identity', 'progression']),
    familyKey: knightFamily,
    gainHp: 15,
    gainMana: 5,
    gainCapacity: 25,
    baseSpeed: 110,
    attackSpeedMs: 2000,
    manaMultiplier: 3,
    skillMultipliers: { 'skill:4': 1.4 },
  };
}

function meleeCreature(
  slug: string,
  stats: CreatureDefinition['stats'],
  intervalMs: number,
  minDamage: number,
  maxDamage: number,
  loot: CreatureDefinition['loot'] = [],
): CreatureDefinition {
  const facets =
    loot.length > 0
      ? (['identity', 'stats', 'appearance', 'combat', 'loot'] as const)
      : (['identity', 'stats', 'appearance', 'combat'] as const);
  return {
    ...identity('creature', slug, [...facets]),
    stats,
    lookType: 26,
    attacks: [
      {
        kind: 'melee',
        name: 'melee',
        intervalMs,
        chanceBasisPoints: 10_000,
        damageType: 'physical',
        minDamage,
        maxDamage,
      },
    ],
    defenses: [],
    conditions: [],
    summons: [],
    resistances: {},
    immunities: [],
    loot,
  };
}

function wanderCreature(slug: string, speed: number): CreatureDefinition {
  return {
    ...identity('creature', slug, ['identity', 'stats', 'appearance']),
    stats: { health: 15, experience: 10, speed },
    lookType: 28,
    attacks: [],
    defenses: [],
    conditions: [],
    summons: [],
    resistances: {},
    immunities: [],
    loot: [],
  };
}

function item(slug: string): ItemDefinition {
  return identity('item', slug, ['identity']);
}

function lootEntry(
  slug: string,
  chancePerHundredThousand: number,
  minCount = 1,
  maxCount = 1,
) {
  return {
    itemKey: `item:tibia:${slug}` as ContentKey,
    chancePerHundredThousand,
    minCount,
    maxCount,
  };
}

function knightSpell(
  slug: string,
  words: string,
  mana: number,
  cooldownMs: number,
  groupCooldownMs: number,
  formula: SpellDefinition['formula'],
  area?: SpellDefinition['area'],
  damageType: SpellDefinition['damageType'] = 'physical',
): SpellDefinition {
  return {
    ...identity('spell', slug, ['identity', 'spell']),
    words,
    level: 8,
    mana,
    cooldownMs,
    groupCooldownMs,
    damageType,
    ...(area === undefined ? {} : { area }),
    allowedVocationFamilies: [knightFamily],
    formula,
  };
}

function flameStrike(): SpellDefinition {
  return {
    ...identity('spell', 'flame-strike', ['identity', 'spell']),
    words: 'exori flam',
    level: 12,
    mana: 20,
    cooldownMs: 2000,
    groupCooldownMs: 2000,
    damageType: 'fire',
    allowedVocationFamilies: [sorcererFamily],
    formula: {
      kind: 'levelMagic',
      levelFactor: 0.2,
      minMagicFactor: 1,
      maxMagicFactor: 2,
      minAddend: 1,
      maxAddend: 2,
    },
  };
}

function groundshakerSpell(): SpellDefinition {
  return knightSpell(
    'groundshaker',
    'exori mas',
    160,
    8000,
    2000,
    {
      kind: 'skillAttack',
      levelFactor: 0.2,
      minSkillAttackFactor: 0.6,
      maxSkillAttackFactor: 1.2,
      finalMultiplier: 1.05,
    },
    { shape: 'square', radiusTiles: 3 },
  );
}

function whirlwindThrowSpell(): SpellDefinition {
  return {
    ...identity('spell', 'whirlwind-throw', ['identity', 'spell']),
    words: 'exori hur',
    level: 28,
    mana: 40,
    cooldownMs: 6000,
    groupCooldownMs: 2000,
    damageType: 'physical',
    rangeTiles: 5,
    allowedVocationFamilies: [knightFamily],
    formula: {
      kind: 'skillAttack',
      levelFactor: 0.2,
      minSkillAttackFactor: 0.5,
      maxSkillAttackFactor: 1.1,
      finalMultiplier: 1,
    },
  };
}

const rotwormLoot = [
  lootEntry('gold-coin', 71_760, 1, 17),
  lootEntry('sword', 3000),
  lootEntry('mace', 4500),
  lootEntry('meat', 20_000),
  lootEntry('ham', 20_120),
  lootEntry('worm', 3000, 1, 3),
  lootEntry('lump-of-dirt', 10_000),
  lootEntry('legion-helmet', 1890),
] as const;

function rotwormCreature(intervalMs = 2000): CreatureDefinition {
  return meleeCreature(
    'rotworm',
    { health: 65, experience: 40, speed: 58 },
    intervalMs,
    0,
    40,
    [...rotwormLoot],
  );
}

/** Combat numbers copied from `packages/content/src/generated/pb-01-contract-coverage.json`. */
function orcShamanCreature(): CreatureDefinition {
  return {
    ...identity('creature', 'orc-shaman', [
      'identity',
      'stats',
      'appearance',
      'combat',
    ]),
    stats: { health: 115, experience: 110, speed: 70 },
    lookType: 6,
    attacks: [
      {
        kind: 'melee',
        name: 'melee',
        intervalMs: 2000,
        chanceBasisPoints: 10_000,
        damageType: 'physical',
        minDamage: 0,
        maxDamage: 15,
      },
      {
        kind: 'ranged',
        name: 'combat',
        intervalMs: 2000,
        chanceBasisPoints: 1500,
        damageType: 'energy',
        minDamage: 20,
        maxDamage: 31,
        projectile: 'energyball',
        rangeTiles: 7,
      },
      {
        kind: 'area',
        name: 'combat',
        intervalMs: 2000,
        chanceBasisPoints: 500,
        damageType: 'fire',
        minDamage: 5,
        maxDamage: 43,
        shape: 'square',
        radiusTiles: 1,
      },
    ],
    defenses: [
      {
        kind: 'heal',
        intervalMs: 2000,
        chanceBasisPoints: 6000,
        minAmount: 27,
        maxAmount: 43,
      },
    ],
    conditions: [],
    summons: [
      {
        creatureKey: 'creature:tibia:snake' as ContentKey,
        count: 3,
        chanceBasisPoints: 2000,
      },
    ],
    resistances: {},
    immunities: [],
    loot: [],
  };
}

function defaultSpells(): readonly SpellDefinition[] {
  return [
    knightSpell(
      'berserk',
      'exori',
      115,
      4000,
      2000,
      {
        kind: 'skillAttack',
        levelFactor: 0.2,
        minSkillAttackFactor: 0.5,
        maxSkillAttackFactor: 1.5,
        finalMultiplier: 1.1,
      },
      { shape: 'square', radiusTiles: 1 },
    ),
    knightSpell('brutal-strike', 'exori ico', 30, 6000, 2000, {
      kind: 'skillAttackProduct',
      levelFactor: 0.2,
      minSkillAttackFactor: 0.02,
      maxSkillAttackFactor: 0.04,
      minAddend: 4,
      maxAddend: 9,
      finalMultiplier: 1.28,
    }),
    knightSpell(
      'wound-cleansing',
      'exura ico',
      40,
      1000,
      1000,
      {
        kind: 'levelMagic',
        levelFactor: 0.2,
        minMagicFactor: 4,
        maxMagicFactor: 7.95,
        minAddend: 25,
        maxAddend: 51,
      },
      undefined,
      'healing',
    ),
  ];
}

function knightRotationSpells(): readonly SpellDefinition[] {
  return [...defaultSpells(), groundshakerSpell(), whirlwindThrowSpell()];
}

function runtimeBundle(
  overrides: {
    readonly creatures?: readonly CreatureDefinition[];
    readonly items?: readonly ItemDefinition[];
    readonly spells?: readonly SpellDefinition[];
    readonly characters?: readonly CharacterDefinition[];
  } = {},
): RuntimeContentBundle {
  const creatures = overrides.creatures ?? [
    rotwormCreature(),
    wanderCreature('snake', 60),
  ];
  const items = overrides.items ?? [
    item('gold-coin'),
    item('sword'),
    item('mace'),
    item('meat'),
    item('ham'),
    item('worm'),
    item('lump-of-dirt'),
    item('legion-helmet'),
  ];
  const spells = overrides.spells ?? [...defaultSpells(), flameStrike()];
  const roots: ContentKey[] = [
    ...creatures.map((entry) => entry.stableKey),
    ...spells.map((entry) => entry.stableKey),
    'vocation:tibia:knight' as ContentKey,
  ];
  return {
    schemaVersion: '1',
    contentVersion: 'test-v1',
    slice: {
      key: 'slice:huntbound:combat-test',
      objective: 'combat composition tests',
      consumer: 'buildHuntScenario tests',
      roots,
      dependencies: [],
      projections: roots.map((entityKey) => ({
        entityKey,
        facets: ['identity'] as const,
        consumer: 'tests',
        rationale: 'fixture root',
      })),
      dependencyMode: 'reachable-only',
      curationState: 'accepted',
      exportVersion: '1',
    },
    vocationFamilies: [knightFamilyDef(), sorcererFamilyDef()],
    vocations: [knightVocation()],
    creatures,
    items,
    spells,
    characters: overrides.characters ?? [character],
  };
}

function registry(
  overrides?: Parameters<typeof runtimeBundle>[0],
): ContentRegistry {
  return createContentRegistry(runtimeBundle(overrides));
}

function combatNeutral(
  blueprintId: string,
  stepCooldownTicks: number,
  behavior: 'inert' | 'wander',
) {
  return {
    blueprintId,
    stepCooldownTicks,
    behavior,
    factionId: 0,
    maxHealth: 1,
    maxResource: 0,
    healthRegenTicks: 0,
    healthRegenAmount: 0,
    resourceRegenTicks: 0,
    resourceRegenAmount: 0,
    attackCooldownTicks: 0,
    attackMinDamage: 0,
    attackMaxDamage: 0,
    attackRangeTiles: 1,
    aggroRadius: 0,
    lootTableIndex: null as number | null,
    abilityIndices: [] as number[],
    outOfCombatHealthRegenTicks: 0,
    outOfCombatHealthRegenAmount: 0,
    outOfCombatResourceRegenTicks: 0,
    outOfCombatResourceRegenAmount: 0,
    combatWindowTicks: 0,
    lifeLeechPermille: 0,
    manaLeechPermille: 0,
    attackElement: 'physical' as const,
    armor: 0,
    resistances: [] as const,
    immunities: [] as const,
  };
}

function syntheticHunt(
  extraBlueprints: HuntDefinition['blueprints'] = [],
): HuntDefinition {
  return {
    schemaVersion: HUNT_SCHEMA_VERSION,
    huntId: 'hunt:tibia:synthetic-cave' as HuntDefinition['huntId'],
    huntRevision: 4,
    region: {
      schemaVersion: HUNT_SCHEMA_VERSION,
      regionId:
        'region:tibia:synthetic-cave' as HuntDefinition['region']['regionId'],
      regionRevision: 2,
      origin: { x: 1000, y: 2000 },
      width: 4,
      height: 4,
      palette: [100, 200],
      floors: [
        {
          z: 7,
          ground: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          objectsBelow: [],
          objectsAbove: [],
          collision: [1, 14],
        },
        {
          z: 8,
          ground: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          objectsBelow: [],
          objectsAbove: [],
          collision: [8],
        },
      ],
    },
    transitions: {
      entries: [
        {
          from: { x: 1, y: 1, z: 7 },
          to: { x: 1, y: 1, z: 8 },
        },
        {
          from: { x: 1, y: 1, z: 8 },
          to: { x: 1, y: 1, z: 7 },
        },
      ],
      dropped: 0,
    },
    spawns: {
      groups: [
        {
          center: { x: 2, y: 2, z: 8 },
          radius: 2,
          slots: [
            {
              creatureKey: 'creature:tibia:rotworm',
              blueprintId: 'rotworm',
              offsetX: -1,
              offsetY: 0,
              offsetZ: 0,
              respawnTicks: 1800,
              source: { x: 1, y: 2, z: 8 },
            },
            {
              creatureKey: 'creature:tibia:rotworm',
              blueprintId: 'rotworm',
              offsetX: 0,
              offsetY: 1,
              offsetZ: 0,
              respawnTicks: 2000,
              source: { x: 2, y: 3, z: 8 },
            },
          ],
          sourceCenter: { x: 2, y: 2, z: 8 },
        },
      ],
      maxLiveActors: 64,
    },
    blueprints: [
      combatNeutral('player', 2, 'inert'),
      combatNeutral('rotworm', 3, 'wander'),
      ...extraBlueprints,
    ],
    playerStart: { x: 0, y: 0, z: 7 },
    playerBlueprintId: 'player',
  };
}

function unwrapSuccess<T>(result: SimulationValidationResult<T>): T {
  if (!result.ok) {
    throw new Error(`Expected a successful result: ${JSON.stringify(result)}`);
  }
  return result.value;
}

function build(
  hunt = syntheticHunt(),
  nextCharacter = character,
  nextRegistry = registry(),
) {
  return unwrapSuccess(
    buildHuntScenario(hunt, nextCharacter, nextRegistry, seed),
  );
}

function buildWithOptions(
  options: { readonly postures?: readonly unknown[] },
  hunt = syntheticHunt(),
  nextCharacter = knightRotationCharacter,
  nextRegistry = registry({ spells: knightRotationSpells() }),
) {
  const buildWithPostures = buildHuntScenario as unknown as (
    hunt: HuntDefinition,
    character: CharacterDefinition,
    registry: ContentRegistry,
    seed: Seed,
    options: { readonly postures?: readonly unknown[] },
  ) => SimulationValidationResult<HuntScenarioBuild>;
  return unwrapSuccess(
    buildWithPostures(hunt, nextCharacter, nextRegistry, seed, options),
  );
}

function stubRegistry(
  creatures: ReadonlyMap<string, CreatureDefinition>,
  extraHas: ReadonlySet<string> = new Set(),
): ContentRegistry {
  const real = registry();
  return {
    getVocationFamily: (key) => real.getVocationFamily(key),
    getVocation: (key) => real.getVocation(key),
    getCreature(key) {
      const value = creatures.get(key);
      if (value === undefined) {
        throw new Error(`missing creature ${key}`);
      }
      return value;
    },
    getItem: (key) => real.getItem(key),
    getSpell: (key) => real.getSpell(key),
    has(key) {
      if (key.startsWith('item:')) {
        return extraHas.has(key);
      }
      return creatures.has(key) || extraHas.has(key) || real.has(key);
    },
  };
}

describe('buildHuntScenario', () => {
  it('projects floors, transitions, spawn slots and the player into KernelScenario v4', () => {
    const { scenario } = build();

    expect(scenario).toMatchObject({
      schemaVersion: SIMULATION_SCHEMA_VERSION,
      scenarioId: 'scenario:hunt:tibia:synthetic-cave',
      scenarioRevision: 4,
      width: 4,
      height: 4,
      floors: [
        {
          z: 7,
          blockedTiles: [
            [1, 0],
            [2, 3],
          ],
        },
        { z: 8, blockedTiles: [[0, 2]] },
      ],
      transitions: [
        {
          from: { x: 1, y: 1, z: 7 },
          to: { x: 1, y: 1, z: 8 },
        },
        {
          from: { x: 1, y: 1, z: 8 },
          to: { x: 1, y: 1, z: 7 },
        },
      ],
      spawnGroups: [
        {
          center: { x: 2, y: 2, z: 8 },
          radius: 2,
          slots: [
            {
              blueprintId: 'rotworm',
              position: { x: 1, y: 2, z: 8 },
              respawnTicks: 1800,
            },
            {
              blueprintId: 'rotworm',
              position: { x: 2, y: 3, z: 8 },
              respawnTicks: 2000,
            },
          ],
        },
      ],
      maxLiveActors: 64,
      initialActors: [
        {
          blueprintId: 'player',
          position: { x: 0, y: 0, z: 7 },
          facing: 's',
        },
      ],
    });
  });

  it('returns a scenario accepted by the kernel validator', () => {
    const { scenario } = build();

    expect(validateKernelScenario(scenario)).toEqual({
      ok: true,
      value: scenario,
    });
  });

  it('does not copy Tibia identities into the serialized scenario', () => {
    const { scenario } = build();
    const serialized = JSON.stringify(scenario);

    for (const forbidden of [
      'palette',
      'serverId',
      'clientId',
      'creatureKey',
      'regionId',
      'itemKey',
      'spellKey',
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('derives the same scenario id for repeated builds of the same hunt', () => {
    const first = build();
    const second = unwrapSuccess(
      buildHuntScenario(
        syntheticHunt(),
        character,
        registry(),
        createSeed('deadbeefcafebabe'),
      ),
    );

    expect(second.scenario.scenarioId).toBe(first.scenario.scenarioId);
    expect(second).toEqual(first);
  });

  it('returns the hunt diagnostic when a slot references a missing blueprint', () => {
    const source = syntheticHunt();
    const hunt: HuntDefinition = {
      ...source,
      spawns: {
        ...source.spawns,
        groups: source.spawns.groups.map((group, groupIndex) =>
          groupIndex === 0
            ? {
                ...group,
                slots: group.slots.map((slot, slotIndex) =>
                  slotIndex === 0 ? { ...slot, blueprintId: 'missing' } : slot,
                ),
              }
            : group,
        ),
      },
    };

    const result = buildHuntScenario(hunt, character, registry(), seed);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'HUNT_UNKNOWN_BLUEPRINT',
            path: ['spawns', 'groups', 0, 'slots', 0, 'blueprintId'],
          }),
        ]),
      );
    }
  });
});

describe('parseKnightPostures', () => {
  it('parses the frozen Blood Rage and Protector definitions', async () => {
    const hunts = await import('./index.ts');

    expect(hunts.parseKnightPostures).toBeTypeOf('function');
    const postures = hunts.parseKnightPostures?.(rawKnightPostures);

    expect(postures).toEqual(rawKnightPostures);
    expect(postures?.[1]?.source.divergence).toContain('PB-11');
  });

  it.each([
    {
      name: 'missing source provider',
      input: [
        {
          ...rawKnightPostures[0],
          source: {
            version: '15.25.3a4a52',
            divergence: rawKnightPostures[0].source.divergence,
          },
        },
        rawKnightPostures[1],
      ],
      message: /provider/i,
    },
    {
      name: 'missing source version',
      input: [
        {
          ...rawKnightPostures[0],
          source: {
            provider: 'TibiaWiki',
            divergence: rawKnightPostures[0].source.divergence,
          },
        },
        rawKnightPostures[1],
      ],
      message: /version/i,
    },
    {
      name: 'duplicate ids',
      input: [
        { ...rawKnightPostures[0] },
        {
          ...rawKnightPostures[1],
          abilityId: 'blood-rage',
          conditionId: 'blood-rage',
        },
      ],
      message: /unique|duplicate/i,
    },
    {
      name: 'negative mana',
      input: [{ ...rawKnightPostures[0], mana: -20 }, rawKnightPostures[1]],
      message: /mana/i,
    },
    {
      name: 'fractional permille',
      input: [
        { ...rawKnightPostures[0], skillModifierPermille: 250.5 },
        rawKnightPostures[1],
      ],
      message: /permille|integer/i,
    },
  ])('rejects $name', async ({ input, message }) => {
    const hunts = await import('./index.ts');

    expect(hunts.parseKnightPostures).toBeTypeOf('function');
    expect(() => hunts.parseKnightPostures?.(input)).toThrow(message);
  });
});

describe('buildHuntScenario combat blueprints', () => {
  it('derives rotworm health, melee damage, attack cooldown and step ticks', () => {
    const rotworm = build().scenario.blueprints.find(
      (blueprint) => blueprint.blueprintId === 'rotworm',
    );

    expect(rotworm).toMatchObject({
      maxHealth: 65,
      attackMinDamage: 0,
      attackMaxDamage: 40,
      attackCooldownTicks: 40,
      stepCooldownTicks: 21,
      behavior: 'hunter',
      attackRangeTiles: 1,
      aggroRadius: 11,
      abilityIndices: [],
    });
  });

  it('does not change composed rotworm combat when unused catalog creatures are listed first', () => {
    const extra = meleeCreature(
      'cyclops',
      { health: 260, experience: 150, speed: 190 },
      2000,
      0,
      105,
    );
    const baseline = build();
    const withUnusedFirst = build(
      syntheticHunt(),
      character,
      registry({
        creatures: [extra, rotwormCreature(), wanderCreature('snake', 60)],
      }),
    );

    expect(withUnusedFirst.scenario.blueprints).toEqual(
      baseline.scenario.blueprints,
    );
    expect(withUnusedFirst.scenario.abilities).toEqual(
      baseline.scenario.abilities,
    );
    expect(withUnusedFirst.scenario.lootTables).toEqual(
      baseline.scenario.lootTables,
    );
  });

  it('assigns creature ability indices by blueprint id, not hunt declaration order', () => {
    const shaman = combatNeutral('orc-shaman', 3, 'wander');
    const declaredLast = build(
      syntheticHunt([shaman]),
      character,
      registry({
        creatures: [
          rotwormCreature(),
          wanderCreature('snake', 60),
          orcShamanCreature(),
        ],
      }),
    );
    const declaredFirst = build(
      {
        ...syntheticHunt(),
        blueprints: [shaman, ...syntheticHunt().blueprints],
      },
      character,
      registry({
        creatures: [
          rotwormCreature(),
          wanderCreature('snake', 60),
          orcShamanCreature(),
        ],
      }),
    );

    expect(
      declaredFirst.scenario.abilities.map((ability) => ability.abilityId),
    ).toEqual(
      declaredLast.scenario.abilities.map((ability) => ability.abilityId),
    );
    expect(
      declaredFirst.scenario.blueprints.map(
        (blueprint) => blueprint.blueprintId,
      ),
    ).toEqual(
      declaredLast.scenario.blueprints.map(
        (blueprint) => blueprint.blueprintId,
      ),
    );
  });

  it('translates orc shaman ranged, area and heal from the catalog and ignores summons', () => {
    const { scenario, abilityKeys } = build(
      syntheticHunt([combatNeutral('orc-shaman', 3, 'wander')]),
      character,
      registry({
        creatures: [
          rotwormCreature(),
          wanderCreature('snake', 60),
          orcShamanCreature(),
        ],
      }),
    );
    const player = scenario.blueprints.find(
      (blueprint) => blueprint.blueprintId === 'player',
    );
    const rotworm = scenario.blueprints.find(
      (blueprint) => blueprint.blueprintId === 'rotworm',
    );
    const shaman = scenario.blueprints.find(
      (blueprint) => blueprint.blueprintId === 'orc-shaman',
    );
    const byId = new Map(
      scenario.abilities.map((ability) => [ability.abilityId, ability]),
    );

    expect(player?.abilityIndices).toEqual([0, 1, 2]);
    expect(rotworm?.abilityIndices).toEqual([]);
    expect(shaman?.abilityIndices).toEqual([3, 4, 5]);
    expect(abilityKeys).toEqual([
      'spell:tibia:berserk',
      'spell:tibia:brutal-strike',
      'spell:tibia:wound-cleansing',
    ]);
    expect(scenario.abilities.map((ability) => ability.abilityId)).toEqual([
      'berserk',
      'brutal-strike',
      'wound-cleansing',
      'orc-shaman-ranged',
      'orc-shaman-area',
      'orc-shaman-heal',
    ]);
    expect(byId.get('orc-shaman-ranged')).toMatchObject({
      effect: 'damage',
      shape: 'target',
      radius: 0,
      rangeTiles: 7,
      resourceCost: 0,
      cooldownTicks: 40,
      groupCooldownTicks: 0,
      minPower: 20,
      maxPower: 31,
      element: 'energy',
      chanceBasisPoints: 1500,
    });
    expect(byId.get('orc-shaman-area')).toMatchObject({
      effect: 'damage',
      shape: 'area',
      radius: 1,
      rangeTiles: 0,
      resourceCost: 0,
      cooldownTicks: 40,
      groupCooldownTicks: 0,
      minPower: 5,
      maxPower: 43,
      element: 'fire',
      chanceBasisPoints: 500,
    });
    expect(byId.get('orc-shaman-heal')).toMatchObject({
      effect: 'heal',
      shape: 'self',
      radius: 0,
      rangeTiles: 0,
      resourceCost: 0,
      cooldownTicks: 40,
      groupCooldownTicks: 0,
      minPower: 27,
      maxPower: 43,
      chanceBasisPoints: 6000,
    });
    expect(
      scenario.blueprints.map((blueprint) => blueprint.blueprintId),
    ).not.toContain('snake');
  });

  it('rejects an attack interval that is not divisible by 50', () => {
    const result = buildHuntScenario(
      syntheticHunt(),
      character,
      registry({
        creatures: [rotwormCreature(2001), wanderCreature('snake', 60)],
      }),
      seed,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'HUNT_INTERVAL_NOT_DIVISIBLE',
          }),
        ]),
      );
    }
  });

  it('keeps a creature without attacks as wander and the player as inert', () => {
    const hunt = syntheticHunt([combatNeutral('snake', 3, 'wander')]);
    const { scenario } = build(hunt);
    const player = scenario.blueprints.find(
      (blueprint) => blueprint.blueprintId === 'player',
    );
    const snake = scenario.blueprints.find(
      (blueprint) => blueprint.blueprintId === 'snake',
    );

    expect(player).toMatchObject({
      behavior: 'inert',
      maxHealth: 185,
      maxResource: 185,
      // `data/XML/vocations.xml` Knight: 1 HP and 2 mana every 6000 ms.
      healthRegenTicks: 120,
      healthRegenAmount: 1,
      resourceRegenTicks: 120,
      resourceRegenAmount: 2,
      outOfCombatHealthRegenTicks: 10,
      outOfCombatHealthRegenAmount: 1,
      outOfCombatResourceRegenTicks: 10,
      outOfCombatResourceRegenAmount: 2,
      combatWindowTicks: 80,
      lifeLeechPermille: 100,
      manaLeechPermille: 100,
      stepCooldownTicks: 11,
      attackCooldownTicks: 40,
      attackMinDamage: 1,
      attackMaxDamage: 13,
      lootTableIndex: null,
      aggroRadius: 0,
    });
    expect(snake).toMatchObject({
      behavior: 'wander',
      maxHealth: 15,
      attackMinDamage: 0,
      attackMaxDamage: 0,
      attackCooldownTicks: 0,
      aggroRadius: 0,
    });
    expect(player?.factionId).not.toBe(snake?.factionId);
    expect(player?.factionId).not.toBe(
      scenario.blueprints.find(
        (blueprint) => blueprint.blueprintId === 'rotworm',
      )?.factionId,
    );
  });
});

describe('buildHuntScenario abilities', () => {
  it('keeps the legacy scenario shape when postures are omitted, except for attackSkillIndex', () => {
    const { scenario, abilityKeys } = build();
    const player = scenario.blueprints.find(
      (blueprint) => blueprint.blueprintId === 'player',
    );

    expect(abilityKeys).toEqual([
      'spell:tibia:berserk',
      'spell:tibia:brutal-strike',
      'spell:tibia:wound-cleansing',
    ]);
    expect(scenario.abilities.map((ability) => ability.abilityId)).toEqual([
      'berserk',
      'brutal-strike',
      'wound-cleansing',
    ]);
    expect(scenario.conditions).toEqual([]);
    expect(player?.attackSkillIndex).toBe(2);
  });

  it('resolves a single kit band to the same scenario as legacy spellKeys', () => {
    const { spellKeys, ...characterWithoutLegacyKit } = character;
    const kitCharacter = {
      ...characterWithoutLegacyKit,
      kit: [{ minLevel: 1, maxLevel: null, spellKeys }],
    } as CharacterDefinition;

    expect(build(syntheticHunt(), kitCharacter, registry())).toEqual(
      build(syntheticHunt(), character, registry()),
    );
  });

  it('resolves the active kit band from character level', () => {
    const { spellKeys: _spellKeys, ...characterWithoutLegacyKit } = character;
    const kitCharacter = {
      ...characterWithoutLegacyKit,
      kit: [
        {
          minLevel: 1,
          maxLevel: 8,
          spellKeys: ['spell:tibia:wound-cleansing' as ContentKey],
        },
        {
          minLevel: 9,
          maxLevel: null,
          spellKeys: ['spell:tibia:berserk' as ContentKey],
        },
      ],
    } as CharacterDefinition;

    const lowLevel = build(
      syntheticHunt(),
      { ...kitCharacter, level: 8 },
      registry(),
    );
    const highLevel = build(
      syntheticHunt(),
      { ...kitCharacter, level: 35 },
      registry(),
    );

    expect(lowLevel.abilityKeys).toEqual(['spell:tibia:wound-cleansing']);
    expect(highLevel.abilityKeys).toEqual(['spell:tibia:berserk']);
  });

  it('resolves the three knight spells to frozen integer powers', () => {
    const { scenario, abilityKeys } = build();
    const byId = new Map(
      scenario.abilities.map((ability) => [ability.abilityId, ability]),
    );

    expect(abilityKeys).toEqual([
      'spell:tibia:berserk',
      'spell:tibia:brutal-strike',
      'spell:tibia:wound-cleansing',
    ]);
    expect(byId.get('berserk')).toMatchObject({
      effect: 'damage',
      shape: 'area',
      radius: 1,
      rangeTiles: 0,
      resourceCost: 115,
      cooldownTicks: 80,
      groupCooldownTicks: 40,
      minPower: 14,
      maxPower: 41,
    });
    expect(byId.get('brutal-strike')).toMatchObject({
      effect: 'damage',
      shape: 'target',
      radius: 0,
      rangeTiles: 1,
      resourceCost: 30,
      cooldownTicks: 120,
      groupCooldownTicks: 40,
      minPower: 10,
      maxPower: 20,
    });
    expect(byId.get('wound-cleansing')).toMatchObject({
      effect: 'heal',
      shape: 'self',
      radius: 0,
      rangeTiles: 0,
      resourceCost: 40,
      cooldownTicks: 20,
      groupCooldownTicks: 20,
      minPower: 26,
      maxPower: 52,
    });

    const player = scenario.blueprints.find(
      (blueprint) => blueprint.blueprintId === 'player',
    );
    expect(player?.abilityIndices).toEqual([0, 1, 2]);
  });

  it('appends Blood Rage and Protector after the five spell abilities', () => {
    const { scenario, abilityKeys } = buildWithOptions({
      postures: rawKnightPostures,
    });
    const player = scenario.blueprints.find(
      (blueprint) => blueprint.blueprintId === 'player',
    );

    expect(abilityKeys).toEqual([
      'spell:tibia:berserk',
      'spell:tibia:brutal-strike',
      'spell:tibia:wound-cleansing',
      'spell:tibia:groundshaker',
      'spell:tibia:whirlwind-throw',
    ]);
    expect(player?.abilityIndices).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(player?.attackSkillIndex).toBe(2);
    expect(scenario.abilities.map((ability) => ability.abilityId)).toEqual([
      'berserk',
      'brutal-strike',
      'wound-cleansing',
      'groundshaker',
      'whirlwind-throw',
      'blood-rage',
      'protector',
    ]);
    expect(scenario.abilities[5]).toMatchObject({
      abilityId: 'blood-rage',
      effect: 'heal',
      shape: 'self',
      radius: 0,
      rangeTiles: 0,
      resourceCost: 20,
      cooldownTicks: 0,
      groupCooldownTicks: 40,
      minPower: 0,
      maxPower: 0,
      primaryCooldownGroup: 1,
      secondaryCooldownGroup: 2,
      secondaryGroupCooldownTicks: 40,
      appliedConditionIndex: 0,
      rechargeKind: 'none',
      toggle: true,
    });
    expect(scenario.abilities[6]).toMatchObject({
      abilityId: 'protector',
      effect: 'heal',
      shape: 'self',
      radius: 0,
      rangeTiles: 0,
      resourceCost: 20,
      cooldownTicks: 0,
      groupCooldownTicks: 40,
      minPower: 0,
      maxPower: 0,
      primaryCooldownGroup: 1,
      secondaryCooldownGroup: 2,
      secondaryGroupCooldownTicks: 40,
      appliedConditionIndex: 1,
      rechargeKind: 'none',
      toggle: true,
    });
    expect(scenario.conditions).toEqual([
      {
        conditionId: 'blood-rage',
        exclusivityGroup: 1,
        durationTicks: 0,
        skillIndex: 2,
        skillModifierPermille: 250,
        damageDealtPermille: 0,
        damageReceivedPermille: 150,
        speedPermille: 0,
        manaShield: false,
        tickDamageAmount: 0,
        tickDamageIntervalTicks: 0,
        elementBonusPermille: 0,
        convertNextAbilityElement: false,
        bonusElement: null,
      },
      {
        conditionId: 'protector',
        exclusivityGroup: 1,
        durationTicks: 0,
        skillIndex: null,
        skillModifierPermille: 0,
        damageDealtPermille: -150,
        damageReceivedPermille: -150,
        speedPermille: 0,
        manaShield: false,
        tickDamageAmount: 0,
        tickDamageIntervalTicks: 0,
        elementBonusPermille: 0,
        convertNextAbilityElement: false,
        bonusElement: null,
      },
    ]);
  });

  it('appends Challenge after postures as a zero-damage support taunt', () => {
    const nextCharacter: CharacterDefinition = {
      ...knightRotationCharacter,
      spellKeys: [
        ...characterSpellKeysAtLevel(knightRotationCharacter),
        'spell:tibia:challenge' as ContentKey,
      ],
    };
    const { scenario, abilityKeys } = buildWithOptions(
      { postures: rawKnightPostures },
      syntheticHunt(),
      nextCharacter,
    );
    const player = scenario.blueprints.find(
      (blueprint) => blueprint.blueprintId === 'player',
    );

    expect(abilityKeys).toEqual([
      'spell:tibia:berserk',
      'spell:tibia:brutal-strike',
      'spell:tibia:wound-cleansing',
      'spell:tibia:groundshaker',
      'spell:tibia:whirlwind-throw',
      'spell:tibia:challenge',
    ]);
    expect(player?.abilityIndices).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(scenario.abilities.map((ability) => ability.abilityId)).toEqual([
      'berserk',
      'brutal-strike',
      'wound-cleansing',
      'groundshaker',
      'whirlwind-throw',
      'blood-rage',
      'protector',
      'challenge',
    ]);
    expect(scenario.abilities[7]).toMatchObject({
      abilityId: 'challenge',
      effect: 'damage',
      shape: 'area',
      radius: 1,
      rangeTiles: 0,
      resourceCost: 30,
      cooldownTicks: 40,
      groupCooldownTicks: 40,
      minPower: 0,
      maxPower: 0,
      primaryCooldownGroup: 1,
      secondaryCooldownGroup: null,
      forcedTargetDurationTicks: 40,
    });
  });

  it('appends Haste after Challenge with the converted speedPermille and 600-tick duration', () => {
    const nextCharacter: CharacterDefinition = {
      ...knightRotationCharacter,
      spellKeys: [
        ...characterSpellKeysAtLevel(knightRotationCharacter),
        'spell:tibia:challenge' as ContentKey,
        'spell:tibia:haste' as ContentKey,
      ],
    };
    const { scenario, abilityKeys } = buildWithOptions(
      { postures: rawKnightPostures },
      syntheticHunt(),
      nextCharacter,
    );
    const player = scenario.blueprints.find(
      (blueprint) => blueprint.blueprintId === 'player',
    );

    expect(abilityKeys).toEqual([
      'spell:tibia:berserk',
      'spell:tibia:brutal-strike',
      'spell:tibia:wound-cleansing',
      'spell:tibia:groundshaker',
      'spell:tibia:whirlwind-throw',
      'spell:tibia:challenge',
      'spell:tibia:haste',
    ]);
    expect(abilityKeys).not.toContain('spell:tibia:charge');
    expect(player?.abilityIndices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(scenario.abilities.map((ability) => ability.abilityId)).toEqual([
      'berserk',
      'brutal-strike',
      'wound-cleansing',
      'groundshaker',
      'whirlwind-throw',
      'blood-rage',
      'protector',
      'challenge',
      'haste',
    ]);
    expect(
      scenario.abilities.map((ability) => ability.abilityId),
    ).not.toContain('charge');
    expect(scenario.abilities[8]).toMatchObject({
      abilityId: 'haste',
      effect: 'heal',
      shape: 'self',
      radius: 0,
      rangeTiles: 0,
      resourceCost: 60,
      cooldownTicks: 40,
      groupCooldownTicks: 40,
      minPower: 0,
      maxPower: 0,
      primaryCooldownGroup: 1,
      secondaryCooldownGroup: null,
      appliedConditionIndex: 2,
      toggle: false,
      forcedTargetDurationTicks: 0,
    });
    expect(scenario.conditions[2]).toEqual({
      conditionId: 'haste',
      exclusivityGroup: null,
      durationTicks: 600,
      skillIndex: null,
      skillModifierPermille: 0,
      damageDealtPermille: 0,
      damageReceivedPermille: 0,
      speedPermille: 600,
      manaShield: false,
      tickDamageAmount: 0,
      tickDamageIntervalTicks: 0,
      elementBonusPermille: 0,
      convertNextAbilityElement: false,
      bonusElement: null,
    });
  });

  it('rejects a spell that the knight family cannot cast', () => {
    const result = buildHuntScenario(
      syntheticHunt(),
      {
        ...character,
        spellKeys: [
          ...characterSpellKeysAtLevel(character),
          'spell:tibia:flame-strike' as ContentKey,
        ],
      },
      registry(),
      seed,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'HUNT_SPELL_NOT_ALLOWED',
          }),
        ]),
      );
    }
  });
});

describe('buildHuntScenario loot tables', () => {
  it('preserves rotworm loot chance and counts with stable item indexes', () => {
    const { scenario, itemKeys } = build();
    const rotworm = scenario.blueprints.find(
      (blueprint) => blueprint.blueprintId === 'rotworm',
    );
    const player = scenario.blueprints.find(
      (blueprint) => blueprint.blueprintId === 'player',
    );

    expect(itemKeys).toEqual([
      'item:tibia:gold-coin',
      'item:tibia:ham',
      'item:tibia:legion-helmet',
      'item:tibia:lump-of-dirt',
      'item:tibia:mace',
      'item:tibia:meat',
      'item:tibia:sword',
      'item:tibia:worm',
    ]);
    expect(player?.lootTableIndex).toBeNull();
    expect(rotworm?.lootTableIndex).toBe(0);
    expect(scenario.lootTables[0]?.entries).toEqual(
      rotwormLoot.map((entry) => ({
        itemIndex: itemKeys.indexOf(entry.itemKey),
        chancePerHundredThousand: entry.chancePerHundredThousand,
        minCount: entry.minCount,
        maxCount: entry.maxCount,
      })),
    );
  });

  it('emits one diagnostic listing every loot item missing from the catalog', () => {
    const missingLoot = rotwormCreature();
    const result = buildHuntScenario(
      syntheticHunt(),
      character,
      stubRegistry(
        new Map([['creature:tibia:rotworm', missingLoot]]),
        new Set(['creature:tibia:rotworm']),
      ),
      seed,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.code).toBe('HUNT_UNKNOWN_ITEM');
      expect(result.diagnostics[0]?.message).toContain('item:tibia:gold-coin');
      expect(result.diagnostics[0]?.message).toContain(
        'item:tibia:legion-helmet',
      );
    }
  });
});

describe('buildHuntScenario integer boundary', () => {
  it('encodes the composed scenario without SIM_STATE_NOT_INTEGER', () => {
    const { scenario } = build();

    expect(() => encodeCanonicalJson(scenario)).not.toThrow();
  });

  it('would reject a leaked float with SIM_STATE_NOT_INTEGER', () => {
    try {
      encodeCanonicalJson({ minPower: 14.96 });
      throw new Error('encodeCanonicalJson did not reject the value');
    } catch (error) {
      expect(error).toBeInstanceOf(CanonicalJsonError);
      expect((error as CanonicalJsonError).code).toBe('SIM_STATE_NOT_INTEGER');
    }
  });
});

describe('loadHuntDefinition', () => {
  it('validates and returns an unknown JSON object as a HuntDefinition', () => {
    const result = loadHuntDefinition(
      JSON.parse(JSON.stringify(syntheticHunt())),
    );

    expect(result).toEqual({ ok: true, value: syntheticHunt() });
  });

  it('returns schema diagnostics instead of throwing for malformed input', () => {
    const result = loadHuntDefinition({ schemaVersion: HUNT_SCHEMA_VERSION });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics[0]?.code).toBe('SIM_SCHEMA_INVALID');
    }
  });
});
