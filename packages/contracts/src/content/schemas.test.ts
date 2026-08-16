import { describe, expect, it } from 'vitest';
import {
  validateCatalogContentBundle,
  validateRuntimeContentBundle,
} from './diagnostics';
import { createContentGuid } from './identity';
import {
  CatalogContentBundleSchema,
  CharacterDefinitionSchema,
  RuntimeContentBundleSchema,
  SpellFormulaDefinitionSchema,
} from './schemas';

const source = {
  system: 'canary' as const,
  snapshot: '157e6f9e21318bd3033eea553fe9275b429faf72',
  sourceId: '26',
  sourcePath: 'data-otservbr-global/monster/vermins/rotworm.lua',
  sourceSha256: 'a'.repeat(64),
};

const creatureGuid = createContentGuid('creature', 'tibia', '26');
const snakeGuid = createContentGuid('creature', 'tibia', '6');
const itemGuid = createContentGuid('item', 'tibia', '3031');
const vocationGuid = createContentGuid('vocation', 'tibia', '4');
const spellGuid = createContentGuid('spell', 'tibia', '80');
const brutalStrikeGuid = createContentGuid('spell', 'tibia', '61');
const woundCleansingGuid = createContentGuid('spell', 'tibia', '123');
const swordGuid = createContentGuid('item', 'tibia', '3264');

function first<T>(values: readonly T[]): T {
  const value = values[0];
  if (value === undefined) {
    throw new Error('Expected test fixture array to contain a value');
  }
  return value;
}

function createSlice() {
  return {
    key: 'fixture:pb-01-contract-coverage',
    objective: 'Cover the content contract shapes.',
    consumer: 'contract tests',
    roots: [
      'vocation:tibia:knight',
      'spell:tibia:berserk',
      'creature:tibia:rotworm',
    ],
    dependencies: ['item:tibia:gold-coin'],
    projections: [
      {
        entityKey: 'creature:tibia:rotworm',
        facets: [
          'identity',
          'stats',
          'appearance',
          'combat',
          'conditions',
          'loot',
        ],
        consumer: 'combat preview',
        rationale: 'The fixture covers all declarative creature forms.',
      },
      {
        entityKey: 'vocation:tibia:knight',
        facets: ['identity', 'progression'],
        consumer: 'spell access',
        rationale:
          'The fixture covers vocation progression and family membership.',
      },
      {
        entityKey: 'spell:tibia:berserk',
        facets: ['identity', 'spell'],
        consumer: 'combat preview',
        rationale: 'The fixture covers declarative spell formulas.',
      },
    ],
    dependencyMode: 'reachable-only' as const,
    snapshot: '157e6f9e21318bd3033eea553fe9275b429faf72',
    sourceFiles: ['data-otservbr-global/monster/vermins/rotworm.lua'],
    curationState: 'accepted' as const,
    exportVersion: '1',
  };
}

function createVocation() {
  return {
    guid: vocationGuid,
    stableKey: 'vocation:tibia:knight',
    displayName: 'Knight',
    includedFacets: ['identity', 'progression'] as const,
    source: { ...source, sourceId: '4', sourcePath: 'data/XML/vocations.xml' },
    aliases: [],
    familyKey: 'vocation-family:huntbound:knight',
    gainHp: 15,
    gainMana: 5,
    gainCapacity: 25,
    baseSpeed: 220,
    attackSpeedMs: 2000,
    manaMultiplier: 3.0,
    skillMultipliers: { sword: 1.0 },
  };
}

function createCreature() {
  return {
    guid: creatureGuid,
    stableKey: 'creature:tibia:rotworm',
    displayName: 'Rotworm',
    includedFacets: [
      'identity',
      'stats',
      'appearance',
      'combat',
      'conditions',
      'loot',
    ] as const,
    source,
    aliases: [],
    stats: { health: 40, experience: 40, speed: 100 },
    lookType: 26,
    attacks: [
      {
        kind: 'melee' as const,
        name: 'bite',
        intervalMs: 2000,
        chanceBasisPoints: 10000,
        damageType: 'physical' as const,
        minDamage: 1,
        maxDamage: 8,
      },
    ],
    defenses: [
      {
        kind: 'heal' as const,
        intervalMs: 3000,
        chanceBasisPoints: 2500,
        minAmount: 2,
        maxAmount: 5,
      },
    ],
    conditions: [
      { kind: 'poison' as const, totalDamage: 12, intervalMs: 1000 },
    ],
    summons: [
      {
        creatureKey: 'creature:tibia:snake',
        count: 1,
        chanceBasisPoints: 5000,
      },
    ],
    resistances: { physical: 0, poison: 50 },
    immunities: ['paralyze'],
    loot: [
      {
        itemKey: 'item:tibia:gold-coin',
        chancePerHundredThousand: 50000,
        minCount: 1,
        maxCount: 5,
      },
    ],
  };
}

function createSnake() {
  return {
    guid: snakeGuid,
    stableKey: 'creature:tibia:snake',
    displayName: 'Snake',
    includedFacets: [
      'identity',
      'stats',
      'appearance',
      'combat',
      'conditions',
    ] as const,
    source: {
      ...source,
      sourceId: '6',
      sourcePath: 'data-otservbr-global/monster/reptiles/snake.lua',
    },
    aliases: [],
    stats: { health: 20, experience: 15, speed: 90 },
    lookType: 29,
    attacks: [],
    defenses: [],
    conditions: [{ kind: 'poison' as const, totalDamage: 4, intervalMs: 1000 }],
    summons: [],
    resistances: {},
    immunities: [],
    loot: [],
  };
}

function createItem() {
  return {
    guid: itemGuid,
    stableKey: 'item:tibia:gold-coin',
    displayName: 'Gold Coin',
    includedFacets: ['identity', 'item'] as const,
    source: { ...source, sourceId: '3031', sourcePath: 'data/XML/items.xml' },
    aliases: [],
    stackable: true,
    maxStackSize: 100,
    weight: 0.1,
  };
}

function createSpell() {
  return {
    guid: spellGuid,
    stableKey: 'spell:tibia:berserk',
    displayName: 'Berserk',
    includedFacets: ['identity', 'spell'] as const,
    source: {
      ...source,
      sourceId: '80',
      sourcePath: 'data/scripts/spells/attack/berserk.lua',
    },
    aliases: [],
    words: 'exori',
    level: 35,
    mana: 115,
    cooldownMs: 2000,
    groupCooldownMs: 1000,
    damageType: 'physical' as const,
    area: { shape: 'square' as const, radiusTiles: 1 },
    allowedVocationFamilies: ['vocation-family:huntbound:knight'],
    formula: {
      kind: 'skillAttack' as const,
      levelFactor: 0.2,
      minSkillAttackFactor: 0.8,
      maxSkillAttackFactor: 1.2,
      finalMultiplier: 1,
    },
  };
}

function createLevelMagicFormula() {
  return {
    kind: 'levelMagic' as const,
    levelFactor: 0.2,
    minMagicFactor: 4,
    maxMagicFactor: 7.95,
    minAddend: 25,
    maxAddend: 51,
  };
}

function createSkillAttackProductFormula() {
  return {
    kind: 'skillAttackProduct' as const,
    levelFactor: 0.2,
    minSkillAttackFactor: 0.02,
    maxSkillAttackFactor: 0.04,
    minAddend: 4,
    maxAddend: 9,
    finalMultiplier: 1.28,
  };
}

function createCharacter() {
  return {
    stableKey: 'character:huntbound:knight-venore-rotworm-cave',
    vocationKey: 'vocation:tibia:knight',
    level: 8,
    skills: { sword: 10, magic: 0 },
    weaponItemKey: 'item:tibia:sword',
    weaponAttack: 14,
    maxHealth: 185,
    maxMana: 185,
    spellKeys: [
      'spell:tibia:berserk',
      'spell:tibia:brutal-strike',
      'spell:tibia:wound-cleansing',
    ],
  };
}

function createCatalogBundle() {
  return {
    schemaVersion: '1',
    contentVersion: 'fixture-1',
    slice: createSlice(),
    vocationFamilies: [
      {
        key: 'vocation-family:huntbound:knight',
        displayName: 'Knight',
        vocationKeys: ['vocation:tibia:knight'],
      },
    ],
    vocations: [createVocation()],
    creatures: [createCreature(), createSnake()],
    items: [createItem()],
    spells: [createSpell()],
    characters: [],
    projectionAudits: [
      {
        entityKey: 'spell:tibia:berserk',
        rawReference: 'elite knight',
        relation: 'allowed-vocation-family' as const,
        targetFamilyKey: 'vocation-family:huntbound:knight',
      },
    ],
  };
}

function createRuntimeBundle() {
  const bundle = createCatalogBundle();
  const {
    snapshot: _snapshot,
    sourceFiles: _sourceFiles,
    ...slice
  } = bundle.slice;
  const {
    source: _vocationSource,
    aliases: _vocationAliases,
    ...vocation
  } = first(bundle.vocations);
  const creatures = bundle.creatures.map(
    ({ source: _source, aliases: _aliases, ...creature }) => creature,
  );
  const {
    source: _itemSource,
    aliases: _itemAliases,
    ...item
  } = first(bundle.items);
  const {
    source: _spellSource,
    aliases: _spellAliases,
    ...spell
  } = first(bundle.spells);

  return {
    schemaVersion: bundle.schemaVersion,
    contentVersion: bundle.contentVersion,
    slice,
    vocationFamilies: bundle.vocationFamilies,
    vocations: [vocation],
    creatures,
    items: [item],
    spells: [spell],
    characters: bundle.characters,
  };
}

type InvalidBundle = {
  creatures: Array<{
    guid: string;
    stableKey: string;
    includedFacets: string[];
    attacks: Array<Record<string, unknown>>;
    conditions: Array<Record<string, unknown>>;
    summons: Array<Record<string, unknown>>;
    loot: Array<Record<string, unknown>>;
  }>;
  slice: { projections: Array<{ consumer: string; rationale: string }> };
  vocationFamilies: unknown[];
};

function createInvalidBundle() {
  return createCatalogBundle() as unknown as InvalidBundle;
}

describe('content schemas', () => {
  it('accepts a catalog bundle with provenance and raw projection audits', () => {
    expect(
      CatalogContentBundleSchema.safeParse(createCatalogBundle()).success,
    ).toBe(true);
  });

  it('accepts a runtime bundle without catalog-only fields', () => {
    expect(
      RuntimeContentBundleSchema.safeParse(createRuntimeBundle()).success,
    ).toBe(true);
  });

  it('rejects invalid GUIDs, stable keys, and action chances', () => {
    const bundle = createInvalidBundle();
    const creature = first(bundle.creatures);
    creature.guid = 'not-a-guid';
    creature.stableKey = 'creature:tibia:Rot Worm';
    first(creature.attacks).chanceBasisPoints = 10001;

    const result = CatalogContentBundleSchema.safeParse(bundle);
    expect(result.success).toBe(false);
  });

  it('rejects negative damage, reversed ranges, and non-integer intervals', () => {
    const bundle = createInvalidBundle();
    const attack = first(first(bundle.creatures).attacks);
    attack.minDamage = -1;
    attack.maxDamage = -2;
    attack.intervalMs = 10.5;

    const result = CatalogContentBundleSchema.safeParse(bundle);
    expect(result.success).toBe(false);
  });

  it('rejects invalid poison conditions, summons without creature keys, and loot without item keys', () => {
    const bundle = createInvalidBundle();
    const creature = first(bundle.creatures);
    const condition = first(creature.conditions);
    condition.totalDamage = -1;
    condition.intervalMs = 0;
    creature.summons[0] = { count: 1, chanceBasisPoints: 5000 };
    creature.loot[0] = {
      chancePerHundredThousand: 50000,
      minCount: 1,
      maxCount: 1,
    };

    expect(CatalogContentBundleSchema.safeParse(bundle).success).toBe(false);
  });

  it('rejects a projection without consumer or rationale and a field outside its facet', () => {
    const bundle = createInvalidBundle();
    const projection = first(bundle.slice.projections);
    const creature = first(bundle.creatures);
    projection.consumer = '';
    projection.rationale = '';
    creature.loot = [];
    creature.includedFacets = [
      'identity',
      'stats',
      'appearance',
      'combat',
      'conditions',
    ];

    expect(CatalogContentBundleSchema.safeParse(bundle).success).toBe(false);
  });

  it('rejects a vocation that points to an absent family', () => {
    const bundle = createInvalidBundle();
    bundle.vocationFamilies = [];

    expect(CatalogContentBundleSchema.safeParse(bundle).success).toBe(false);
  });

  it('rejects extra fields at every strict object boundary', () => {
    const bundle = createCatalogBundle() as unknown as {
      unexpected?: boolean;
      creatures: Array<Record<string, unknown>>;
    };
    bundle.unexpected = true;
    first(bundle.creatures).unexpected = true;

    expect(CatalogContentBundleSchema.safeParse(bundle).success).toBe(false);
  });

  it('keeps raw vocation references as audits instead of aliases', () => {
    const bundle = createCatalogBundle();

    expect(first(bundle.projectionAudits).rawReference).toBe('elite knight');
    expect(first(bundle.vocations).aliases).toHaveLength(0);
    expect(CatalogContentBundleSchema.safeParse(bundle).success).toBe(true);
  });

  it('rejects catalog provenance, aliases, and projection audits in runtime bundles', () => {
    const runtime = createRuntimeBundle() as unknown as {
      projectionAudits?: unknown;
      vocations: Array<Record<string, unknown>>;
    };
    runtime.projectionAudits = createCatalogBundle().projectionAudits;
    const vocation = first(runtime.vocations);
    vocation.source = source;
    vocation.aliases = [];

    expect(RuntimeContentBundleSchema.safeParse(runtime).success).toBe(false);
  });

  it('rejects source snapshot and paths in the runtime slice', () => {
    const runtime = createRuntimeBundle() as unknown as {
      slice: Record<string, unknown>;
    };
    runtime.slice.snapshot = '157e6f9e21318bd3033eea553fe9275b429faf72';
    runtime.slice.sourceFiles = ['data/XML/vocations.xml'];

    expect(RuntimeContentBundleSchema.safeParse(runtime).success).toBe(false);
  });

  it('returns structured diagnostics from public validators', () => {
    const result = validateCatalogContentBundle({ schemaVersion: 1 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics.length).toBeGreaterThan(0);
      const diagnostic = first(result.diagnostics);
      expect(diagnostic.severity).toBe('error');
      expect(diagnostic.code).toBeTypeOf('string');
      expect(diagnostic.message).toContain('schemaVersion');
    }

    const runtimeResult = validateRuntimeContentBundle({ schemaVersion: 1 });
    expect(runtimeResult.ok).toBe(false);
  });

  it('accepts the measured Wound Cleansing levelMagic formula', () => {
    expect(
      SpellFormulaDefinitionSchema.safeParse(createLevelMagicFormula()).success,
    ).toBe(true);
  });

  it('rejects nearby invalid levelMagic formulas', () => {
    const reversedMagic = {
      ...createLevelMagicFormula(),
      minMagicFactor: 8,
      maxMagicFactor: 4,
    };
    const reversedAddend = {
      ...createLevelMagicFormula(),
      minAddend: 51,
      maxAddend: 25,
    };
    const extraField = { ...createLevelMagicFormula(), skill: 10 };
    const missingAddend = {
      kind: 'levelMagic',
      levelFactor: 0.2,
      minMagicFactor: 4,
      maxMagicFactor: 7.95,
      minAddend: 25,
    };
    const asSkillAttack = {
      kind: 'skillAttack',
      levelFactor: 0.2,
      minMagicFactor: 4,
      maxMagicFactor: 7.95,
      minAddend: 25,
      maxAddend: 51,
    };

    expect(SpellFormulaDefinitionSchema.safeParse(reversedMagic).success).toBe(
      false,
    );
    expect(SpellFormulaDefinitionSchema.safeParse(reversedAddend).success).toBe(
      false,
    );
    expect(SpellFormulaDefinitionSchema.safeParse(extraField).success).toBe(
      false,
    );
    expect(SpellFormulaDefinitionSchema.safeParse(missingAddend).success).toBe(
      false,
    );
    expect(SpellFormulaDefinitionSchema.safeParse(asSkillAttack).success).toBe(
      false,
    );
  });

  it('accepts Brutal Strike skillAttackProduct and refuses to store it as skillAttack', () => {
    expect(
      SpellFormulaDefinitionSchema.safeParse(createSkillAttackProductFormula())
        .success,
    ).toBe(true);
    expect(
      SpellFormulaDefinitionSchema.safeParse({
        ...createSkillAttackProductFormula(),
        kind: 'skillAttack',
      }).success,
    ).toBe(false);
  });

  it('accepts the frozen Knight character sheet', () => {
    expect(CharacterDefinitionSchema.safeParse(createCharacter()).success).toBe(
      true,
    );
  });

  it('rejects a character with negative level, negative skill, or non-positive vitals', () => {
    const negativeLevel = { ...createCharacter(), level: -1 };
    const negativeSkill = {
      ...createCharacter(),
      skills: { sword: -1, magic: 0 },
    };
    const zeroHealth = { ...createCharacter(), maxHealth: 0 };
    const zeroMana = { ...createCharacter(), maxMana: 0 };

    expect(CharacterDefinitionSchema.safeParse(negativeLevel).success).toBe(
      false,
    );
    expect(CharacterDefinitionSchema.safeParse(negativeSkill).success).toBe(
      false,
    );
    expect(CharacterDefinitionSchema.safeParse(zeroHealth).success).toBe(false);
    expect(CharacterDefinitionSchema.safeParse(zeroMana).success).toBe(false);
  });

  it('rejects empty spellKeys, unknown keys, and unknown fields on a character', () => {
    const emptySpells = { ...createCharacter(), spellKeys: [] };
    const unknownSkill = {
      ...createCharacter(),
      skills: { sword: 10, magic: 0, shielding: 10 },
    };
    const unknownField = { ...createCharacter(), experience: 0 };
    const unknownStableKey = {
      ...createCharacter(),
      stableKey: 'character:tibia:knight',
    };

    expect(CharacterDefinitionSchema.safeParse(emptySpells).success).toBe(
      false,
    );
    expect(CharacterDefinitionSchema.safeParse(unknownSkill).success).toBe(
      false,
    );
    expect(CharacterDefinitionSchema.safeParse(unknownField).success).toBe(
      false,
    );
    expect(CharacterDefinitionSchema.safeParse(unknownStableKey).success).toBe(
      false,
    );
  });

  it('rejects a character that references a spell whose allowed families omit Knight', () => {
    const druidSpell = {
      ...createSpell(),
      guid: woundCleansingGuid,
      stableKey: 'spell:tibia:wound-cleansing',
      displayName: 'Wound Cleansing',
      source: {
        ...source,
        sourceId: '123',
        sourcePath: 'data/scripts/spells/healing/wound_cleansing.lua',
      },
      words: 'exura ico',
      allowedVocationFamilies: ['vocation-family:huntbound:druid'],
      formula: createLevelMagicFormula(),
    };
    const bundle = {
      ...createCatalogBundle(),
      vocationFamilies: [
        ...createCatalogBundle().vocationFamilies,
        {
          key: 'vocation-family:huntbound:druid',
          displayName: 'Druid',
          vocationKeys: [],
        },
      ],
      items: [
        ...createCatalogBundle().items,
        {
          guid: swordGuid,
          stableKey: 'item:tibia:sword',
          displayName: 'sword',
          includedFacets: ['identity', 'item'] as const,
          source: {
            ...source,
            sourceId: '3264',
            sourcePath: 'data/items/items.xml',
          },
          aliases: [],
        },
      ],
      spells: [
        createSpell(),
        {
          ...createSpell(),
          guid: brutalStrikeGuid,
          stableKey: 'spell:tibia:brutal-strike',
          displayName: 'Brutal Strike',
          source: {
            ...source,
            sourceId: '61',
            sourcePath: 'data/scripts/spells/attack/brutal_strike.lua',
          },
          words: 'exori ico',
          area: undefined,
          formula: createSkillAttackProductFormula(),
        },
        druidSpell,
      ],
      characters: [createCharacter()],
    };

    expect(CatalogContentBundleSchema.safeParse(bundle).success).toBe(false);
  });
});
