import { createHash } from 'node:crypto';

import {
  type CatalogContentBundle,
  CatalogContentBundleSchema,
  type ContentFacet,
  ContentFacetSchema,
  type ContentKey,
  characterKitBands,
  createContentGuid,
  type EntityKind,
} from '../../../packages/contracts/src/index.ts';

const facetOrder = ContentFacetSchema.options;

const allowedFacets: Readonly<Record<EntityKind, readonly ContentFacet[]>> = {
  vocation: ['identity', 'progression'],
  creature: ['identity', 'stats', 'appearance', 'combat', 'conditions', 'loot'],
  item: ['identity', 'item'],
  spell: ['identity', 'spell'],
};

const requiredFacets: Readonly<Record<EntityKind, readonly ContentFacet[]>> = {
  vocation: ['identity', 'progression'],
  creature: ['identity', 'stats', 'appearance'],
  item: ['identity'],
  spell: ['identity', 'spell'],
};

function fail(message: string): never {
  throw new Error(`Persistable catalog bundle rejected: ${message}`);
}

function assertUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) {
    fail(`${label} contains duplicates`);
  }
}

function entityKindFromKey(stableKey: string): EntityKind {
  const kind = stableKey.split(':')[0];
  if (
    kind !== 'vocation' &&
    kind !== 'creature' &&
    kind !== 'item' &&
    kind !== 'spell'
  ) {
    fail(`unknown entity kind in ${stableKey}`);
  }
  return kind;
}

function allEntities(bundle: CatalogContentBundle) {
  return [
    ...bundle.vocations.map((entity) => ({
      ...entity,
      kind: 'vocation' as const,
    })),
    ...bundle.creatures.map((entity) => ({
      ...entity,
      kind: 'creature' as const,
    })),
    ...bundle.items.map((entity) => ({ ...entity, kind: 'item' as const })),
    ...bundle.spells.map((entity) => ({ ...entity, kind: 'spell' as const })),
  ];
}

function assertCanonicalIdentity(bundle: CatalogContentBundle): void {
  const entities = allEntities(bundle);
  const guids = entities.map((entity) => entity.guid);
  const stableKeys = entities.map((entity) => entity.stableKey);
  assertUnique(guids, 'entity GUIDs');
  assertUnique(stableKeys, 'entity stable keys');

  for (const entity of entities) {
    const kind = entityKindFromKey(entity.stableKey);
    if (kind !== entity.kind) {
      fail(`${entity.stableKey} has child kind ${entity.kind}`);
    }
    const expectedGuid = createContentGuid(
      kind,
      'tibia',
      entity.source.sourceId,
    );
    if (entity.guid !== expectedGuid) {
      fail(`${entity.stableKey} does not have its canonical GUID`);
    }
  }
}

function assertUniqueMetadata(bundle: CatalogContentBundle): void {
  assertUnique(bundle.slice.sourceFiles, 'source files');

  const sourceTuples = new Set<string>();
  const aliases = new Map<string, ContentKey>();
  for (const entity of allEntities(bundle)) {
    const source = entity.source;
    const sourceTuple = `${source.system}\0${source.snapshot}\0${source.sourceId}`;
    if (sourceTuples.has(sourceTuple)) {
      fail(`duplicate source tuple ${sourceTuple}`);
    }
    sourceTuples.add(sourceTuple);
    if (source.snapshot !== bundle.slice.snapshot) {
      fail(`${entity.stableKey} has a different snapshot`);
    }
    if (!bundle.slice.sourceFiles.includes(source.sourcePath)) {
      fail(`${entity.stableKey} source path is absent from sourceFiles`);
    }

    const aliasesForEntity = entity.aliases.map(
      (alias) => `${alias.sourceSystem}\0${alias.alias}`,
    );
    assertUnique(aliasesForEntity, `${entity.stableKey} aliases`);
    for (const alias of entity.aliases) {
      if (alias.entityKey !== entity.stableKey) {
        fail(`${entity.stableKey} alias points to another entity`);
      }
      const aliasKey = `${alias.sourceSystem}\0${alias.alias}`;
      const previous = aliases.get(aliasKey);
      if (previous !== undefined) {
        fail(
          `alias ${alias.alias} maps to both ${previous} and ${entity.stableKey}`,
        );
      }
      aliases.set(aliasKey, entity.stableKey);
    }
  }
}

function assertIdentityAndFacetMatrix(bundle: CatalogContentBundle): void {
  const entities = allEntities(bundle);
  const projections = new Map(
    bundle.slice.projections.map((projection) => [
      projection.entityKey,
      projection,
    ]),
  );
  if (projections.size !== bundle.slice.projections.length) {
    fail('projections contain duplicates');
  }

  const entityKeys = new Set<string>(
    entities.map((entity) => entity.stableKey),
  );
  for (const entity of entities) {
    const facets = [...entity.includedFacets];
    const allowed = allowedFacets[entity.kind];
    const required = requiredFacets[entity.kind];
    if (!required.every((facet) => facets.includes(facet))) {
      fail(`${entity.stableKey} is missing a required facet`);
    }
    if (facets.some((facet) => !allowed.includes(facet))) {
      fail(
        `${entity.stableKey} contains a facet not allowed for ${entity.kind}`,
      );
    }
    const projection = projections.get(entity.stableKey);
    if (!projection) {
      fail(`${entity.stableKey} is missing a projection`);
    }
    const projectionFacets = [...projection.facets].sort(
      (left, right) => facetOrder.indexOf(left) - facetOrder.indexOf(right),
    );
    const entityFacets = [...facets].sort(
      (left, right) => facetOrder.indexOf(left) - facetOrder.indexOf(right),
    );
    if (JSON.stringify(projectionFacets) !== JSON.stringify(entityFacets)) {
      fail(`${entity.stableKey} projection facets do not match includedFacets`);
    }
  }

  for (const projection of bundle.slice.projections) {
    if (!entityKeys.has(projection.entityKey)) {
      fail(`projection points to unknown entity ${projection.entityKey}`);
    }
  }
}

function assertSliceClosure(bundle: CatalogContentBundle): void {
  const entities = allEntities(bundle);
  const entityKeys: Set<string> = new Set(
    entities.map((entity) => String(entity.stableKey)),
  );
  const roots = new Set(bundle.slice.roots);
  const dependencies = new Set(bundle.slice.dependencies);
  if (bundle.slice.roots.some((root) => dependencies.has(root))) {
    fail('roots and dependencies must be disjoint');
  }
  if (
    roots.size + dependencies.size !== entityKeys.size ||
    [...roots, ...dependencies].some((key) => !entityKeys.has(key))
  ) {
    fail('roots and dependencies must be the exact entity set');
  }

  const reachable: Set<string> = new Set(
    [...roots].map((value) => String(value)),
  );
  const add = (value: string) => {
    if (entityKeys.has(value)) reachable.add(value);
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (const creature of bundle.creatures) {
      if (!reachable.has(creature.stableKey)) continue;
      for (const summon of creature.summons) {
        const before = reachable.size;
        add(summon.creatureKey);
        changed ||= reachable.size !== before;
      }
      for (const loot of creature.loot) {
        const before = reachable.size;
        add(loot.itemKey);
        changed ||= reachable.size !== before;
      }
    }
  }

  // Vocation and spell projections are catalog dependencies selected by the slice.
  // Their internal references are still checked below, while roots remain the runtime entry points.
  for (const entity of entities) {
    if (entity.kind === 'vocation' || entity.kind === 'spell')
      reachable.add(entity.stableKey);
  }
  for (const character of bundle.characters) {
    add(character.weaponItemKey);
    for (const band of characterKitBands(character)) {
      for (const spellKey of band.spellKeys) add(spellKey);
    }
  }

  if ([...dependencies].some((dependency) => !reachable.has(dependency))) {
    fail('slice contains an unreachable dependency');
  }
}

function assertRelations(bundle: CatalogContentBundle): void {
  const familyKeys = new Set(
    bundle.vocationFamilies.map((family) => family.key),
  );
  const vocationByKey = new Map(
    bundle.vocations.map((vocation) => [vocation.stableKey, vocation]),
  );
  const creatureKeys = new Set(
    bundle.creatures.map((creature) => creature.stableKey),
  );
  const itemKeys = new Set(bundle.items.map((item) => item.stableKey));

  assertUnique(
    bundle.vocationFamilies.map((family) => family.key),
    'vocation families',
  );
  for (const family of bundle.vocationFamilies) {
    assertUnique(family.vocationKeys, `${family.key} vocation members`);
    const expected = bundle.vocations
      .filter((vocation) => vocation.familyKey === family.key)
      .map((vocation) => vocation.stableKey);
    if (
      JSON.stringify([...family.vocationKeys].sort()) !==
      JSON.stringify(expected.sort())
    ) {
      fail(`${family.key} vocation membership is not bidirectional`);
    }
  }

  for (const vocation of bundle.vocations) {
    if (!familyKeys.has(vocation.familyKey))
      fail(`unknown vocation family ${vocation.familyKey}`);
  }
  for (const spell of bundle.spells) {
    assertUnique(
      spell.allowedVocationFamilies,
      `${spell.stableKey} allowed families`,
    );
    for (const family of spell.allowedVocationFamilies) {
      if (!familyKeys.has(family)) fail(`unknown spell family ${family}`);
    }
  }
  for (const audit of bundle.projectionAudits) {
    if (!bundle.spells.some((spell) => spell.stableKey === audit.entityKey)) {
      fail(`projection audit points to a non-spell ${audit.entityKey}`);
    }
    if (!familyKeys.has(audit.targetFamilyKey))
      fail(`audit points to unknown family ${audit.targetFamilyKey}`);
    if (
      !bundle.spells.some(
        (spell) =>
          spell.stableKey === audit.entityKey &&
          spell.allowedVocationFamilies.includes(audit.targetFamilyKey),
      )
    ) {
      fail(`audit target family is not allowed by its spell`);
    }
  }
  for (const creature of bundle.creatures) {
    for (const summon of creature.summons) {
      if (!creatureKeys.has(summon.creatureKey))
        fail(`unknown summon ${summon.creatureKey}`);
    }
    for (const loot of creature.loot) {
      if (!itemKeys.has(loot.itemKey))
        fail(`unknown loot item ${loot.itemKey}`);
    }
  }
  if (vocationByKey.size !== bundle.vocations.length)
    fail('duplicate vocation key');
}

export function validatePersistableBundle(
  input: unknown,
): CatalogContentBundle {
  const bundle = CatalogContentBundleSchema.parse(input);
  assertCanonicalIdentity(bundle);
  assertUniqueMetadata(bundle);
  assertIdentityAndFacetMatrix(bundle);
  assertSliceClosure(bundle);
  assertRelations(bundle);
  return bundle;
}

function sortByKey<T extends { readonly stableKey: string }>(
  values: readonly T[],
): T[] {
  return [...values].sort((left, right) =>
    left.stableKey.localeCompare(right.stableKey),
  );
}

function sortFacets(values: readonly ContentFacet[]): ContentFacet[] {
  return [...values].sort(
    (left, right) => facetOrder.indexOf(left) - facetOrder.indexOf(right),
  );
}

export function canonicalizeCatalogBundle(
  bundle: CatalogContentBundle,
): CatalogContentBundle {
  return {
    ...bundle,
    slice: {
      ...bundle.slice,
      roots: [...bundle.slice.roots].sort(),
      dependencies: [...bundle.slice.dependencies].sort(),
      sourceFiles: [...bundle.slice.sourceFiles].sort(),
      projections: [...bundle.slice.projections]
        .map((projection) => ({
          ...projection,
          facets: sortFacets(projection.facets),
        }))
        .sort((left, right) => left.entityKey.localeCompare(right.entityKey)),
    },
    vocationFamilies: [...bundle.vocationFamilies]
      .map((family) => ({
        ...family,
        vocationKeys: [...family.vocationKeys].sort(),
      }))
      .sort((left, right) => left.key.localeCompare(right.key)),
    projectionAudits: [...bundle.projectionAudits].sort((left, right) => {
      const byEntity = left.entityKey.localeCompare(right.entityKey);
      if (byEntity !== 0) return byEntity;
      return left.rawReference.localeCompare(right.rawReference);
    }),
    vocations: sortByKey(bundle.vocations).map((entity) => ({
      ...entity,
      includedFacets: sortFacets(entity.includedFacets),
      aliases: [...entity.aliases].sort((left, right) =>
        `${left.sourceSystem}:${left.alias}`.localeCompare(
          `${right.sourceSystem}:${right.alias}`,
        ),
      ),
      skillMultipliers: Object.fromEntries(
        Object.entries(entity.skillMultipliers).sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ),
    })),
    creatures: sortByKey(bundle.creatures).map((entity) => ({
      ...entity,
      includedFacets: sortFacets(entity.includedFacets),
      aliases: [...entity.aliases].sort((left, right) =>
        `${left.sourceSystem}:${left.alias}`.localeCompare(
          `${right.sourceSystem}:${right.alias}`,
        ),
      ),
      resistances: Object.fromEntries(
        Object.entries(entity.resistances).sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ),
    })),
    items: sortByKey(bundle.items).map((entity) => ({
      ...entity,
      includedFacets: sortFacets(entity.includedFacets),
      aliases: [...entity.aliases].sort((left, right) =>
        `${left.sourceSystem}:${left.alias}`.localeCompare(
          `${right.sourceSystem}:${right.alias}`,
        ),
      ),
    })),
    spells: sortByKey(bundle.spells).map((entity) => ({
      ...entity,
      includedFacets: sortFacets(entity.includedFacets),
      aliases: [...entity.aliases].sort((left, right) =>
        `${left.sourceSystem}:${left.alias}`.localeCompare(
          `${right.sourceSystem}:${right.alias}`,
        ),
      ),
      allowedVocationFamilies: [...entity.allowedVocationFamilies].sort(),
    })),
    characters: [...bundle.characters]
      .map((character) => {
        if (character.kit !== undefined) {
          return {
            ...character,
            kit: character.kit.map((band) => ({
              ...band,
              spellKeys: [...band.spellKeys],
            })),
          };
        }
        if (character.spellKeys !== undefined) {
          return { ...character, spellKeys: [...character.spellKeys] };
        }
        throw new Error('Character must define either kit or spellKeys');
      })
      .sort((left, right) => left.stableKey.localeCompare(right.stableKey)),
  };
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`;
}

export function facetPayloadHash(
  entity:
    | CatalogContentBundle['creatures'][number]
    | CatalogContentBundle['vocations'][number]
    | CatalogContentBundle['items'][number]
    | CatalogContentBundle['spells'][number],
  facet: ContentFacet,
): string {
  const payload = (() => {
    switch (facet) {
      case 'identity':
        return { guid: entity.guid, stableKey: entity.stableKey };
      case 'stats':
        return 'stats' in entity ? entity.stats : {};
      case 'appearance':
        return 'lookType' in entity
          ? {
              lookType: entity.lookType,
              ...(entity.corpseItemId === undefined
                ? {}
                : { corpseItemId: entity.corpseItemId }),
            }
          : {};
      case 'combat':
        return 'attacks' in entity
          ? {
              attacks: entity.attacks,
              defenses: entity.defenses,
              summons: entity.summons,
              resistances: entity.resistances,
              immunities: entity.immunities,
            }
          : {};
      case 'conditions':
        return 'conditions' in entity ? { conditions: entity.conditions } : {};
      case 'loot':
        return 'loot' in entity ? { loot: entity.loot } : {};
      // An item is the union member with no required field of its own, so it
      // is named by exclusion. Keying off `stackable` -- optional, and absent
      // on every piece of armor -- hashed the whole facet as `{}` for exactly
      // the entities PB-13-04 gives stats to.
      case 'item':
        return !(
          'stats' in entity ||
          'familyKey' in entity ||
          'words' in entity
        )
          ? {
              stackable: entity.stackable,
              maxStackSize: entity.maxStackSize,
              weight: entity.weight,
              ...(entity.sellPrice === undefined
                ? {}
                : { sellPrice: entity.sellPrice }),
              attack: entity.attack,
              defense: entity.defense,
              armor: entity.armor,
              slotType: entity.slotType,
              weaponType: entity.weaponType,
            }
          : {};
      case 'progression':
        return 'familyKey' in entity
          ? {
              familyKey: entity.familyKey,
              gainHp: entity.gainHp,
              gainMana: entity.gainMana,
              gainCapacity: entity.gainCapacity,
              baseSpeed: entity.baseSpeed,
              attackSpeedMs: entity.attackSpeedMs,
              manaMultiplier: entity.manaMultiplier,
              skillMultipliers: entity.skillMultipliers,
            }
          : {};
      case 'spell':
        return 'words' in entity
          ? {
              words: entity.words,
              level: entity.level,
              mana: entity.mana,
              cooldownMs: entity.cooldownMs,
              groupCooldownMs: entity.groupCooldownMs,
              damageType: entity.damageType,
              rangeTiles: entity.rangeTiles,
              area: entity.area,
              allowedVocationFamilies: entity.allowedVocationFamilies,
              formula: entity.formula,
            }
          : {};
    }
  })();
  return createHash('sha256').update(canonicalJson(payload)).digest('hex');
}
