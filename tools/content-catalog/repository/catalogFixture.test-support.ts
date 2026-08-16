import {
  type CatalogContentBundle,
  type ContentAlias,
  type ContentFacet,
  type ContentGuid,
  type ContentKey,
  createContentGuid,
  type VocationFamilyKey,
} from '@huntbound/contracts';

export type MutableCatalogContentBundle = MutableObject<CatalogContentBundle>;

type MutableObject<Value> = {
  -readonly [Key in keyof Value]: MutableValue<Value[Key]>;
};

type MutableValue<Value> = Value extends string | number | boolean | null
  ? Value
  : Value extends readonly (infer Item)[]
    ? Array<MutableValue<Item>>
    : Value extends object
      ? MutableObject<Value>
      : Value;

export type BundleMutation = (draft: MutableCatalogContentBundle) => void;

const hash = (letter: string) => letter.repeat(64);
const key = (value: string) => value as ContentKey;
const familyKey = key(
  'vocation-family:huntbound:knight',
) as unknown as VocationFamilyKey;

const vocationKey = key('vocation:tibia:4');
const spellKey = key('spell:tibia:80');
const dragonKey = key('creature:tibia:dragon');
const snakeKey = key('creature:tibia:snake');
const itemKey = key('item:tibia:3031');

const guidFor = (
  kind: 'vocation' | 'creature' | 'item' | 'spell',
  sourceId: string,
) => createContentGuid(kind, 'tibia', sourceId);

const vocationGuid = guidFor('vocation', '4');
const spellGuid = guidFor('spell', '80');
const dragonGuid = guidFor('creature', 'dragon');
const snakeGuid = guidFor('creature', 'snake');
const itemGuid = guidFor('item', '3031');

const aliasFor = (entityKey: ContentKey): ContentAlias => ({
  alias: entityKey.split(':').at(-1) ?? entityKey,
  sourceSystem: 'tibia',
  entityKey,
});

const sourceFor = (
  sourceId: string,
  sourcePath: string,
  sourceSha256: string,
) => ({
  system: 'canary' as const,
  snapshot: 'canary-test',
  sourceId,
  sourcePath,
  sourceSha256,
});

const vocationFacets = [
  'identity',
  'progression',
] as const satisfies readonly ContentFacet[];
const creatureBaseFacets = [
  'identity',
  'stats',
  'appearance',
] as const satisfies readonly ContentFacet[];
const dragonFacets = [
  'identity',
  'stats',
  'appearance',
  'combat',
  'conditions',
  'loot',
] as const satisfies readonly ContentFacet[];
const itemFacets = [
  'identity',
  'item',
] as const satisfies readonly ContentFacet[];
const spellFacets = [
  'identity',
  'spell',
] as const satisfies readonly ContentFacet[];

function first<T>(values: readonly T[]): T {
  const value = values[0];
  if (value === undefined) throw new Error('Fixture collection is empty');
  return value;
}

const projection = (
  entityKey: ContentKey,
  facets: readonly ContentFacet[],
) => ({
  entityKey,
  facets,
  consumer: 'huntbound-runtime',
  rationale: 'fixture projection',
});

const baseSlice = {
  key: 'slice:huntbound:catalog-a',
  snapshot: 'canary-test',
  objective: 'Test catalog round-trip',
  consumer: 'huntbound-runtime',
  roots: [dragonKey],
  dependencies: [snakeKey, itemKey, vocationKey, spellKey],
  projections: [
    projection(dragonKey, dragonFacets),
    projection(snakeKey, creatureBaseFacets),
    projection(itemKey, itemFacets),
    projection(vocationKey, vocationFacets),
    projection(spellKey, spellFacets),
  ],
  dependencyMode: 'reachable-only' as const,
  curationState: 'accepted' as const,
  exportVersion: 'catalog-v1',
  sourceFiles: [
    'creatures/dragon.json',
    'creatures/snake.json',
    'items/3031.json',
    'vocations/4.json',
    'spells/80.json',
  ],
};

const dragonSource = sourceFor('dragon', 'creatures/dragon.json', hash('a'));
const snakeSource = sourceFor('snake', 'creatures/snake.json', hash('b'));
const itemSource = sourceFor('3031', 'items/3031.json', hash('c'));
const vocationSource = sourceFor('4', 'vocations/4.json', hash('d'));
const spellSource = sourceFor('80', 'spells/80.json', hash('e'));

const projectionAudits = [
  {
    entityKey: spellKey,
    rawReference: 'elite knight',
    relation: 'allowed-vocation-family' as const,
    targetFamilyKey: familyKey,
  },
  {
    entityKey: spellKey,
    rawReference: 'knight',
    relation: 'allowed-vocation-family' as const,
    targetFamilyKey: familyKey,
  },
];

export function createCatalogBundleFixture(): CatalogContentBundle {
  return {
    schemaVersion: '1',
    contentVersion: 'canary-test-v1',
    slice: structuredClone(baseSlice),
    vocationFamilies: [
      {
        key: familyKey,
        displayName: 'Knight',
        vocationKeys: [vocationKey],
      },
    ],
    projectionAudits,
    vocations: [
      {
        guid: vocationGuid,
        stableKey: vocationKey,
        displayName: 'Knight',
        includedFacets: vocationFacets,
        source: vocationSource,
        aliases: [aliasFor(vocationKey)],
        familyKey,
        gainHp: 15,
        gainMana: 5,
        gainCapacity: 25,
        baseSpeed: 220,
        attackSpeedMs: 2000,
        manaMultiplier: 3,
        skillMultipliers: { sword: 1.1, shielding: 1.0 },
      },
    ],
    creatures: [
      {
        guid: dragonGuid,
        stableKey: dragonKey,
        displayName: 'Dragon',
        includedFacets: dragonFacets,
        source: dragonSource,
        aliases: [aliasFor(dragonKey)],
        stats: { health: 1000, experience: 700, speed: 200 },
        lookType: 34,
        attacks: [
          {
            kind: 'melee',
            name: 'bite',
            intervalMs: 2000,
            chanceBasisPoints: 10000,
            damageType: 'physical',
            minDamage: 20,
            maxDamage: 80,
          },
          {
            kind: 'ranged',
            name: 'bolt',
            intervalMs: 3000,
            chanceBasisPoints: 2500,
            damageType: 'fire',
            minDamage: 40,
            maxDamage: 120,
            rangeTiles: 7,
            projectile: 'fire-bolt',
          },
          {
            kind: 'area',
            name: 'wave',
            intervalMs: 4000,
            chanceBasisPoints: 1500,
            damageType: 'fire',
            minDamage: 30,
            maxDamage: 90,
            shape: 'square',
            radiusTiles: 2,
          },
        ],
        defenses: [
          {
            kind: 'heal',
            intervalMs: 5000,
            chanceBasisPoints: 500,
            minAmount: 10,
            maxAmount: 30,
          },
        ],
        conditions: [{ kind: 'poison', totalDamage: 60, intervalMs: 2000 }],
        summons: [{ creatureKey: snakeKey, count: 2, chanceBasisPoints: 250 }],
        resistances: { fire: 20, ice: -10 },
        immunities: ['paralyze'],
        loot: [
          {
            itemKey,
            chancePerHundredThousand: 5000,
            minCount: 1,
            maxCount: 3,
          },
        ],
      },
      {
        guid: snakeGuid,
        stableKey: snakeKey,
        displayName: 'Snake',
        includedFacets: creatureBaseFacets,
        source: snakeSource,
        aliases: [aliasFor(snakeKey)],
        stats: { health: 100, experience: 20, speed: 180 },
        lookType: 93,
        attacks: [],
        defenses: [],
        conditions: [],
        summons: [],
        resistances: {},
        immunities: [],
        loot: [],
      },
    ],
    items: [
      {
        guid: itemGuid,
        stableKey: itemKey,
        displayName: 'Gold Coin',
        includedFacets: itemFacets,
        source: itemSource,
        aliases: [aliasFor(itemKey)],
        stackable: true,
        maxStackSize: 100,
        weight: 0.1,
      },
    ],
    spells: [
      {
        guid: spellGuid,
        stableKey: spellKey,
        displayName: 'Energy Wave',
        includedFacets: spellFacets,
        source: spellSource,
        aliases: [aliasFor(spellKey)],
        words: 'exevo vis hur',
        level: 38,
        mana: 170,
        cooldownMs: 4000,
        groupCooldownMs: 2000,
        damageType: 'energy',
        area: { shape: 'square', radiusTiles: 3 },
        allowedVocationFamilies: [familyKey],
        formula: {
          kind: 'skillAttack',
          levelFactor: 1.2,
          minSkillAttackFactor: 0.5,
          maxSkillAttackFactor: 1.0,
          finalMultiplier: 1.1,
        },
      },
    ],
    characters: [],
  };
}

export function createSecondSliceFixture(): CatalogContentBundle {
  return mutateBundle(createCatalogBundleFixture(), (draft) => {
    draft.slice.key = 'slice:huntbound:catalog-b';
    draft.slice.objective = 'Second test catalog slice';
    draft.slice.consumer = 'second-consumer';
    draft.slice.projections = draft.slice.projections.map((value) => ({
      ...value,
      consumer: 'second-consumer',
    }));
  });
}

export function mutateBundle(
  bundle: CatalogContentBundle,
  mutation: BundleMutation,
): CatalogContentBundle {
  const draft = structuredClone(
    bundle,
  ) as unknown as MutableCatalogContentBundle;
  mutation(draft);
  return draft as unknown as CatalogContentBundle;
}

export function withoutIdentityFacet(): unknown {
  return mutateBundle(createCatalogBundleFixture(), (draft) => {
    first(draft.creatures).includedFacets = ['stats', 'appearance'];
  });
}

export function creatureWithItemKey(): unknown {
  return mutateBundle(createCatalogBundleFixture(), (draft) => {
    first(draft.creatures).stableKey = itemKey;
  });
}

export function withUnreachableDependency(): unknown {
  return mutateBundle(createCatalogBundleFixture(), (draft) => {
    draft.slice.roots = [key('creature:tibia:snake')];
    draft.slice.dependencies = [dragonKey, itemKey, vocationKey, spellKey];
  });
}

export function withDuplicateSourceFile(): unknown {
  return mutateBundle(createCatalogBundleFixture(), (draft) => {
    draft.slice.sourceFiles.push('creatures/dragon.json');
  });
}

export function withDuplicateAlias(): unknown {
  return mutateBundle(createCatalogBundleFixture(), (draft) => {
    first(draft.creatures).aliases.push(aliasFor(dragonKey));
  });
}

export function withDuplicateAllowedFamily(): unknown {
  return mutateBundle(createCatalogBundleFixture(), (draft) => {
    first(draft.spells).allowedVocationFamilies.push(familyKey);
  });
}

export function withMismatchedFamilyMembership(): unknown {
  return mutateBundle(createCatalogBundleFixture(), (draft) => {
    first(draft.vocationFamilies).vocationKeys = [];
  });
}

export function shuffledFixture(): CatalogContentBundle {
  return mutateBundle(createCatalogBundleFixture(), (draft) => {
    draft.creatures.reverse();
  });
}

export function withGuidCollision(): CatalogContentBundle {
  return mutateBundle(createCatalogBundleFixture(), (draft) => {
    first(draft.items).guid = dragonGuid;
  });
}

export function withStableKeyCollision(): CatalogContentBundle {
  return mutateBundle(createCatalogBundleFixture(), (draft) => {
    first(draft.items).stableKey = dragonKey;
  });
}

export function withSourceTupleCollision(): CatalogContentBundle {
  return mutateBundle(createCatalogBundleFixture(), (draft) => {
    first(draft.items).source.sourceId = 'dragon';
  });
}

export function withAliasAmbiguity(): CatalogContentBundle {
  return mutateBundle(createCatalogBundleFixture(), (draft) => {
    first(first(draft.items).aliases).alias = first(
      first(draft.creatures).aliases,
    ).alias;
  });
}

export function withCrossSliceLootTarget(): CatalogContentBundle {
  return mutateBundle(createCatalogBundleFixture(), (draft) => {
    first(first(draft.creatures).loot).itemKey = key('item:tibia:9999');
  });
}

export function withCrossSliceSummonTarget(): CatalogContentBundle {
  return mutateBundle(createCatalogBundleFixture(), (draft) => {
    first(first(draft.creatures).summons).creatureKey = key(
      'creature:tibia:9999',
    );
  });
}

export function withWrongChildKind(): CatalogContentBundle {
  return mutateBundle(createCatalogBundleFixture(), (draft) => {
    first(draft.creatures).guid = itemGuid;
  });
}

export function withCrossSliceFamily(): CatalogContentBundle {
  return mutateBundle(createCatalogBundleFixture(), (draft) => {
    first(draft.spells).allowedVocationFamilies = [
      key('vocation-family:huntbound:missing') as unknown as VocationFamilyKey,
    ];
  });
}

export const fixtureGuids: Readonly<Record<string, ContentGuid>> = {
  vocation: vocationGuid,
  spell: spellGuid,
  dragon: dragonGuid,
  snake: snakeGuid,
  item: itemGuid,
};
