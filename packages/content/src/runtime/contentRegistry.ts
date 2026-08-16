import {
  type CatalogContentBundle,
  type ContentKey,
  type CreatureDefinition,
  type ItemDefinition,
  type RuntimeContentBundle,
  RuntimeContentBundleSchema,
  type SpellDefinition,
  type VocationDefinition,
  type VocationFamilyDefinition,
  type VocationFamilyKey,
} from '@huntbound/contracts';

export interface ContentRegistry {
  getVocationFamily(key: VocationFamilyKey): VocationFamilyDefinition;
  getVocation(key: ContentKey): VocationDefinition;
  getCreature(key: ContentKey): CreatureDefinition;
  getItem(key: ContentKey): ItemDefinition;
  getSpell(key: ContentKey): SpellDefinition;
  has(key: ContentKey): boolean;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

function withoutCatalogMetadata<
  T extends { readonly source: unknown; readonly aliases: unknown },
>(entity: T) {
  const { source: _source, aliases: _aliases, ...runtimeEntity } = entity;
  return runtimeEntity;
}

export function projectRuntimeBundle(
  bundle: CatalogContentBundle,
): RuntimeContentBundle {
  const runtime = {
    schemaVersion: bundle.schemaVersion,
    contentVersion: bundle.contentVersion,
    slice: {
      key: bundle.slice.key,
      objective: bundle.slice.objective,
      consumer: bundle.slice.consumer,
      roots: bundle.slice.roots,
      dependencies: bundle.slice.dependencies,
      projections: bundle.slice.projections,
      dependencyMode: bundle.slice.dependencyMode,
      curationState: bundle.slice.curationState,
      exportVersion: bundle.slice.exportVersion,
    },
    vocationFamilies: bundle.vocationFamilies,
    vocations: bundle.vocations.map(withoutCatalogMetadata),
    creatures: bundle.creatures.map(withoutCatalogMetadata),
    items: bundle.items.map(withoutCatalogMetadata),
    spells: bundle.spells.map(withoutCatalogMetadata),
    characters: bundle.characters,
  };
  return RuntimeContentBundleSchema.parse(runtime);
}

function missing(sliceKey: string, key: string): Error {
  return new Error(`Content key ${key} is missing from slice ${sliceKey}`);
}

export function createContentRegistry(
  bundle: RuntimeContentBundle,
): ContentRegistry {
  const validated = RuntimeContentBundleSchema.parse(bundle);
  const stored = deepFreeze(clone(validated));
  const families = new Map(
    stored.vocationFamilies.map((family) => [family.key, family]),
  );
  const vocations = new Map(
    stored.vocations.map((vocation) => [vocation.stableKey, vocation]),
  );
  const creatures = new Map(
    stored.creatures.map((creature) => [creature.stableKey, creature]),
  );
  const items = new Map(stored.items.map((item) => [item.stableKey, item]));
  const spells = new Map(
    stored.spells.map((spell) => [spell.stableKey, spell]),
  );

  return {
    getVocationFamily(key) {
      const value = families.get(key);
      if (value === undefined) throw missing(stored.slice.key, key);
      return value;
    },
    getVocation(key) {
      const value = vocations.get(key);
      if (value === undefined) throw missing(stored.slice.key, key);
      return value;
    },
    getCreature(key) {
      const value = creatures.get(key);
      if (value === undefined) throw missing(stored.slice.key, key);
      return value;
    },
    getItem(key) {
      const value = items.get(key);
      if (value === undefined) throw missing(stored.slice.key, key);
      return value;
    },
    getSpell(key) {
      const value = spells.get(key);
      if (value === undefined) throw missing(stored.slice.key, key);
      return value;
    },
    has(key) {
      return (
        families.has(key as unknown as VocationFamilyKey) ||
        vocations.has(key) ||
        creatures.has(key) ||
        items.has(key) ||
        spells.has(key)
      );
    },
  };
}
