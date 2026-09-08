import {
  type CatalogContentBundle,
  type ContentDiagnostic,
  type ContentKey,
  type ContentSliceDefinition,
  createContentGuid,
  type VocationFamilyKey,
} from '@huntbound/contracts';
import type {
  CanaryCreatureDto,
  CanaryLootEntryDto,
  CanarySpellDto,
} from '../importers/canary/lua/luaTypes.ts';
import {
  parseCanaryMonsterLoot,
  parseCanaryMonsterLua,
} from '../importers/canary/lua/parseMonsterLua.ts';
import { parseCanarySpellLua } from '../importers/canary/lua/parseSpellLua.ts';
import type { CanaryItemDto } from '../importers/canary/xml/parseItemsXml.ts';
import { parseCanaryItemsXml } from '../importers/canary/xml/parseItemsXml.ts';
import type { CanaryVocationDto } from '../importers/canary/xml/parseVocationsXml.ts';
import { parseCanaryVocationsXml } from '../importers/canary/xml/parseVocationsXml.ts';
import { validateSliceSelection } from '../selections/validateSliceSelection.ts';
import { ContentImportError } from './ContentImportError.ts';
import type { CuratedCatalogWriter } from './internal/CuratedCatalogWriter.ts';
import type { SourceSnapshotLock } from './sourceLockTypes.ts';
import { applyValidatedBundles, asContentKey } from './validateAndApply.ts';

interface SelectionManifest extends ContentSliceDefinition {
  readonly rootSourceIds: Readonly<{
    readonly vocation: readonly string[];
    readonly spell: readonly string[];
    readonly creature: readonly string[];
  }>;
  readonly dependencySourceIds: Readonly<Record<string, readonly string[]>>;
  readonly projectionPolicy: {
    readonly vocationFamilyKey: string;
    readonly rawReferenceMappings: readonly {
      readonly rawReference: string;
      readonly targetFamilyKey: string;
    }[];
    readonly aliases: readonly string[];
  };
  readonly characters: readonly {
    readonly stableKey: string;
    readonly vocationKey: string;
    readonly level: number;
    readonly skills: Readonly<{
      readonly sword: number;
      readonly magic: number;
    }>;
    readonly weaponItemKey: string;
    readonly weaponSourceId: string;
    readonly weaponAttack: number;
    readonly maxHealth: number;
    readonly maxMana: number;
    readonly spellKeys: readonly string[];
  }[];
}

export interface ImportCanarySliceDependencies {
  readSource(path: string): string;
  readonly writer: CuratedCatalogWriter;
}

interface EntitySource {
  readonly sourcePath: string;
  readonly sourceSha256: string;
}

type CatalogCreatureDefinition = CatalogContentBundle['creatures'][number];
type CatalogItemDefinition = CatalogContentBundle['items'][number];
type CatalogSpellDefinition = CatalogContentBundle['spells'][number];
type CatalogVocationDefinition = CatalogContentBundle['vocations'][number];

const familyKey = 'vocation-family:huntbound:knight' as VocationFamilyKey;

function selectionInput(selection: ContentSliceDefinition): SelectionManifest {
  return selection as SelectionManifest;
}

function errorDiagnostic(code: string, message: string): ContentDiagnostic {
  return { code, severity: 'error', message };
}

function normalizedName(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

function stableSlug(value: string): string {
  const slug = value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length === 0)
    throw new Error(`Cannot derive stable slug from ${value}`);
  return slug;
}

function sourceFor(
  lock: SourceSnapshotLock,
  snapshot: string,
  sourcePath: string,
  _sourceId: string,
): EntitySource & { readonly snapshot: string } {
  const file = lock.files.find(
    (candidate) => candidate.relativePath === sourcePath,
  );
  if (file === undefined)
    throw new Error(`Missing source lock entry for ${sourcePath}`);
  return { sourcePath, sourceSha256: file.sha256, snapshot };
}

function sourceReference(
  source: EntitySource & { readonly snapshot: string },
  sourceId: string,
) {
  return {
    system: 'canary' as const,
    snapshot: source.snapshot,
    sourceId,
    sourcePath: source.sourcePath,
    sourceSha256: source.sourceSha256,
  };
}

function parseResult<T>(
  result:
    | { readonly ok: true; readonly value: T }
    | {
        readonly ok: false;
        readonly diagnostics: readonly ContentDiagnostic[];
      },
  diagnostics: ContentDiagnostic[],
): T | undefined {
  if (result.ok) return result.value;
  diagnostics.push(...result.diagnostics);
  return undefined;
}

function selectedSourceIds(selection: SelectionManifest): Set<string> {
  return new Set([
    ...selection.rootSourceIds.creature,
    ...(selection.dependencySourceIds.creature ?? []),
  ]);
}

function keyMappings(selection: SelectionManifest): Map<string, ContentKey> {
  const result = new Map<string, ContentKey>();
  const rootKeys = selection.roots;
  const add = (
    kind: 'vocation' | 'spell' | 'creature',
    sourceIds: readonly string[],
    dependency = false,
  ) => {
    const keys = dependency
      ? selection.dependencies.filter((key) => key.startsWith(`${kind}:`))
      : rootKeys.filter((key) => key.startsWith(`${kind}:`));
    if (keys.length !== sourceIds.length) {
      throw new ContentImportError(
        'Frozen selection source IDs do not align with stable keys',
        [
          errorDiagnostic(
            'selection.source-key-alignment',
            `${kind} source IDs do not align with selected keys`,
          ),
        ],
      );
    }
    sourceIds.forEach((sourceId, index) => {
      const key = keys[index];
      if (key !== undefined)
        result.set(`${kind}:${sourceId}`, asContentKey(key));
    });
  };
  add('vocation', selection.rootSourceIds.vocation);
  add('spell', selection.rootSourceIds.spell);
  add('creature', selection.rootSourceIds.creature);
  add('creature', selection.dependencySourceIds.creature ?? [], true);
  return result;
}

/** Purposes the curated slice actually imports. */
const catalogPurposes = new Set<SourceSnapshotLock['files'][number]['purpose']>(
  ['vocations', 'items', 'spell', 'creature'],
);

function metadataLookup(
  lock: SourceSnapshotLock,
  purpose: SourceSnapshotLock['files'][number]['purpose'],
): readonly string[] {
  return lock.files
    .filter((file) => file.purpose === purpose)
    .map((file) => file.relativePath);
}

function itemDefinition(
  item: CanaryItemDto,
  source: EntitySource & { readonly snapshot: string },
): CatalogItemDefinition {
  const stableKey = asContentKey(`item:tibia:${stableSlug(item.displayName)}`);
  const attributes = item.attributes;
  return {
    guid: createContentGuid('item', 'tibia', item.sourceId),
    stableKey,
    displayName: item.displayName,
    includedFacets: ['identity', 'item'],
    source: sourceReference(source, item.sourceId),
    aliases: [],
    ...(typeof attributes.stackable === 'boolean'
      ? { stackable: attributes.stackable }
      : {}),
    ...(typeof attributes.maxStackSize === 'number'
      ? { maxStackSize: attributes.maxStackSize }
      : {}),
    ...(typeof attributes.weight === 'number'
      ? { weight: attributes.weight }
      : {}),
    ...(typeof attributes.sellPrice === 'number'
      ? { sellPrice: attributes.sellPrice }
      : {}),
    ...(typeof attributes.attack === 'number'
      ? { attack: attributes.attack }
      : {}),
    ...(typeof attributes.defense === 'number'
      ? { defense: attributes.defense }
      : {}),
    ...(typeof attributes.armor === 'number'
      ? { armor: attributes.armor }
      : {}),
    ...(typeof attributes.slotType === 'string'
      ? { slotType: attributes.slotType }
      : {}),
    ...(typeof attributes.weaponType === 'string'
      ? { weaponType: attributes.weaponType }
      : {}),
  };
}

function creatureDefinition(
  dto: CanaryCreatureDto,
  key: ContentKey,
  projection: SelectionManifest['projections'][number],
  source: EntitySource & { readonly snapshot: string },
  creatureKeyFor: (
    reference: CanaryCreatureDto['summons'][number]['creatureRef'],
  ) => ContentKey,
  itemKeyFor: (reference: CanaryCreatureDto['lootRefs'][number]) => ContentKey,
  lootEntries: readonly CanaryLootEntryDto[],
): CatalogCreatureDefinition {
  return {
    guid: createContentGuid('creature', 'tibia', dto.sourceId),
    stableKey: key,
    displayName: dto.displayName,
    includedFacets: projection.facets,
    source: sourceReference(source, dto.sourceId),
    aliases: [],
    stats: dto.stats,
    lookType: dto.lookType,
    ...(dto.corpseItemId === undefined
      ? {}
      : { corpseItemId: dto.corpseItemId }),
    attacks: dto.attacks.map((attack) =>
      attack.kind === 'area' ? { ...attack, shape: 'square' as const } : attack,
    ) as CatalogCreatureDefinition['attacks'],
    defenses: dto.defenses as CatalogCreatureDefinition['defenses'],
    conditions: dto.conditions as CatalogCreatureDefinition['conditions'],
    summons: dto.summons.map((summon) => ({
      creatureKey: creatureKeyFor(summon.creatureRef),
      count: summon.count,
      chanceBasisPoints: summon.chanceBasisPoints,
    })),
    resistances: dto.elements,
    immunities: dto.immunities,
    loot: dto.lootRefs.map((reference, index) => {
      const entry = lootEntries[index];
      if (entry === undefined) {
        throw new ContentImportError('Loot parser output is inconsistent', [
          errorDiagnostic(
            'import.loot-shape-mismatch',
            `Missing loot details for ${key}`,
          ),
        ]);
      }
      return {
        itemKey: itemKeyFor(reference),
        chancePerHundredThousand: entry.chancePerHundredThousand,
        minCount: entry.minCount,
        maxCount: entry.maxCount,
      };
    }),
  };
}

function vocationDefinition(
  dto: CanaryVocationDto,
  key: ContentKey,
  projection: SelectionManifest['projections'][number],
  source: EntitySource & { readonly snapshot: string },
): CatalogVocationDefinition {
  return {
    guid: createContentGuid('vocation', 'tibia', dto.sourceId),
    stableKey: key,
    displayName: dto.displayName,
    includedFacets: projection.facets,
    source: sourceReference(source, dto.sourceId),
    aliases: [],
    familyKey,
    gainHp: dto.gainHp,
    gainMana: dto.gainMana,
    gainCapacity: dto.gainCapacity,
    baseSpeed: dto.baseSpeed,
    attackSpeedMs: dto.attackSpeedMs,
    manaMultiplier: dto.manaMultiplier,
    skillMultipliers: dto.skillMultipliers,
  };
}

function spellDefinition(
  dto: CanarySpellDto,
  key: ContentKey,
  projection: SelectionManifest['projections'][number],
  source: EntitySource & { readonly snapshot: string },
  allowedVocationFamilies: readonly string[],
): CatalogSpellDefinition {
  return {
    guid: createContentGuid('spell', 'tibia', dto.sourceId),
    stableKey: key,
    displayName: dto.displayName,
    includedFacets: projection.facets,
    source: sourceReference(source, dto.sourceId),
    aliases: [],
    words: dto.words,
    level: dto.level,
    mana: dto.mana,
    cooldownMs: dto.cooldownMs,
    groupCooldownMs: dto.groupCooldownMs,
    damageType: dto.damageType as CatalogSpellDefinition['damageType'],
    ...(dto.rangeTiles === undefined ? {} : { rangeTiles: dto.rangeTiles }),
    ...(dto.area === undefined
      ? {}
      : { area: { shape: dto.area.shape, radiusTiles: dto.area.radius } }),
    allowedVocationFamilies:
      allowedVocationFamilies as CatalogSpellDefinition['allowedVocationFamilies'],
    formula: dto.formula,
  };
}

export function importCanarySlice(
  selection: ContentSliceDefinition,
  lock: SourceSnapshotLock,
  dependencies: ImportCanarySliceDependencies,
): {
  readonly bundle: CatalogContentBundle;
  readonly diagnostics: readonly ContentDiagnostic[];
} {
  const input = selectionInput(selection);
  const diagnostics = [...validateSliceSelection(selection)];
  // The slice reads only the catalog purposes. PB-04-04 locks the map and the
  // spawn declaration for the region extractor; those never enter the slice and
  // must not make the frozen selection look inconsistent.
  const lockPaths = lock.files
    .filter((file) => catalogPurposes.has(file.purpose))
    .map((file) => file.relativePath);
  if (
    lockPaths.length !== input.sourceFiles.length ||
    lockPaths.some((path) => !input.sourceFiles.includes(path))
  ) {
    diagnostics.push(
      errorDiagnostic(
        'source-lock.selection-mismatch',
        'Selection source files must match the source lock',
      ),
    );
  }
  if (diagnostics.length > 0)
    throw new ContentImportError(
      'Cannot import an invalid frozen slice',
      diagnostics,
    );

  const pathsByPurpose = {
    vocation: metadataLookup(lock, 'vocations')[0],
    items: metadataLookup(lock, 'items')[0],
    spells: metadataLookup(lock, 'spell'),
    creatures: metadataLookup(lock, 'creature'),
  };
  if (
    pathsByPurpose.vocation === undefined ||
    pathsByPurpose.items === undefined ||
    pathsByPurpose.spells.length === 0
  ) {
    throw new ContentImportError(
      'Source lock is missing a required source file',
      [
        errorDiagnostic(
          'source-lock.required-file-missing',
          'Vocation, item, and spell source files are required',
        ),
      ],
    );
  }

  const read = (path: string): string => {
    try {
      return dependencies.readSource(path);
    } catch (error) {
      diagnostics.push(
        errorDiagnostic(
          'source.read-failed',
          `${path}: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      return '';
    }
  };
  const vocationDto = parseResult(
    parseCanaryVocationsXml(
      read(pathsByPurpose.vocation),
      input.rootSourceIds.vocation,
    ),
    diagnostics,
  )?.[0];
  const spellDtos = new Map<string, { dto: CanarySpellDto; path: string }>();
  for (const path of pathsByPurpose.spells) {
    const dto = parseResult(parseCanarySpellLua(read(path)), diagnostics);
    if (dto !== undefined) spellDtos.set(dto.sourceId, { dto, path });
  }
  const creatureDtos = new Map<
    string,
    {
      readonly dto: CanaryCreatureDto;
      readonly loot: readonly CanaryLootEntryDto[];
      readonly path: string;
    }
  >();
  for (const path of pathsByPurpose.creatures) {
    const dto = parseResult(parseCanaryMonsterLua(read(path)), diagnostics);
    const loot = parseResult(parseCanaryMonsterLoot(read(path)), diagnostics);
    if (dto !== undefined && loot !== undefined) {
      creatureDtos.set(dto.sourceId, { dto, loot, path });
    }
  }
  if (diagnostics.length > 0 || vocationDto === undefined) {
    throw new ContentImportError('Canary parsing failed', diagnostics);
  }

  const requiredCreatureIds = selectedSourceIds(input);
  const missingCreatureIds = [...requiredCreatureIds].filter(
    (sourceId) => !creatureDtos.has(sourceId),
  );
  if (missingCreatureIds.length > 0) {
    diagnostics.push(
      errorDiagnostic(
        'import.creature-missing',
        `Selected creatures were not parsed: ${missingCreatureIds.join(', ')}`,
      ),
    );
  }
  const missingSpellIds = input.rootSourceIds.spell.filter(
    (sourceId) => !spellDtos.has(sourceId),
  );
  if (missingSpellIds.length > 0) {
    diagnostics.push(
      errorDiagnostic(
        'import.spell-missing',
        `Selected spells were not parsed: ${missingSpellIds.join(', ')}`,
      ),
    );
  }
  const mapping = keyMappings(input);
  const creatureByName = new Map<string, ContentKey>();
  for (const [sourceId, entry] of creatureDtos) {
    const key = mapping.get(`creature:${sourceId}`);
    if (key !== undefined)
      creatureByName.set(normalizedName(entry.dto.displayName), key);
  }
  const creatureKeyFor = (
    reference: CanaryCreatureDto['summons'][number]['creatureRef'],
  ): ContentKey => {
    const key =
      'sourceId' in reference
        ? mapping.get(`creature:${reference.sourceId}`)
        : creatureByName.get(normalizedName(reference.sourceName));
    if (key === undefined)
      throw new ContentImportError('Creature dependency resolution failed', [
        errorDiagnostic(
          'import.creature-reference-missing',
          `Could not resolve creature dependency ${JSON.stringify(reference)}`,
        ),
      ]);
    return key;
  };

  const itemRefs = [...input.rootSourceIds.creature].flatMap(
    (sourceId) => creatureDtos.get(sourceId)?.dto.lootRefs ?? [],
  );
  const itemIds = [
    ...itemRefs.flatMap((reference) =>
      'sourceId' in reference ? [reference.sourceId] : [],
    ),
    ...input.characters.map((character) => character.weaponSourceId),
  ];
  const itemNames = itemRefs.flatMap((reference) =>
    'sourceName' in reference ? [reference.sourceName] : [],
  );
  const itemDtos =
    parseResult(
      parseCanaryItemsXml(read(pathsByPurpose.items), {
        ids: itemIds,
        names: itemNames,
      }),
      diagnostics,
    ) ?? [];
  if (diagnostics.length > 0)
    throw new ContentImportError(
      'Canary dependency parsing failed',
      diagnostics,
    );

  const itemById = new Map(itemDtos.map((item) => [item.sourceId, item]));
  const itemByName = new Map(
    itemDtos.map((item) => [normalizedName(item.displayName), item]),
  );
  const itemKeyFor = (
    reference: CanaryCreatureDto['lootRefs'][number],
  ): ContentKey => {
    const item =
      'sourceId' in reference
        ? itemById.get(reference.sourceId)
        : itemByName.get(normalizedName(reference.sourceName));
    if (item === undefined)
      throw new ContentImportError('Loot dependency resolution failed', [
        errorDiagnostic(
          'import.item-reference-missing',
          `Could not resolve loot dependency ${JSON.stringify(reference)}`,
        ),
      ]);
    return asContentKey(`item:tibia:${stableSlug(item.displayName)}`);
  };

  const vocationKey = mapping.get(`vocation:${vocationDto.sourceId}`);
  const selectedSpells = input.rootSourceIds.spell.flatMap((sourceId) => {
    const entry = spellDtos.get(sourceId);
    const key = mapping.get(`spell:${sourceId}`);
    return entry === undefined || key === undefined
      ? []
      : [{ sourceId, entry, key }];
  });
  if (vocationKey === undefined || selectedSpells.length === 0) {
    throw new ContentImportError(
      'Selected XML/Lua root was not mapped to a stable key',
      [
        errorDiagnostic(
          'import.root-key-missing',
          'Vocation or spell root is absent from the frozen selection',
        ),
      ],
    );
  }

  const projections = new Map(
    input.projections.map((projection) => [projection.entityKey, projection]),
  );
  const itemRequiredBy = new Map<ContentKey, ContentKey[]>();
  for (const sourceId of input.rootSourceIds.creature) {
    const creature = creatureDtos.get(sourceId)?.dto;
    const creatureKey = mapping.get(`creature:${sourceId}`);
    if (creature === undefined || creatureKey === undefined) continue;
    for (const reference of creature.lootRefs) {
      const itemKey = itemKeyFor(reference);
      const requiredBy = itemRequiredBy.get(itemKey) ?? [];
      requiredBy.push(creatureKey);
      itemRequiredBy.set(itemKey, requiredBy);
    }
  }
  for (const character of input.characters) {
    const weaponItem = itemById.get(character.weaponSourceId);
    if (weaponItem === undefined) {
      throw new ContentImportError('Character weapon resolution failed', [
        errorDiagnostic(
          'import.weapon-item-missing',
          `Could not resolve character weapon ${character.weaponSourceId}`,
        ),
      ]);
    }
    const weaponKey = asContentKey(
      `item:tibia:${stableSlug(weaponItem.displayName)}`,
    );
    if (weaponKey !== asContentKey(character.weaponItemKey)) {
      throw new ContentImportError('Character weapon key mismatch', [
        errorDiagnostic(
          'import.weapon-key-mismatch',
          `Weapon source ${character.weaponSourceId} resolved to ${weaponKey}`,
        ),
      ]);
    }
    const weaponRequiredBy = itemRequiredBy.get(weaponKey) ?? [];
    weaponRequiredBy.push(asContentKey(character.stableKey));
    itemRequiredBy.set(weaponKey, weaponRequiredBy);
  }
  for (const [itemKey, requiredBy] of itemRequiredBy) {
    const fromCharacter = requiredBy.some((key) =>
      String(key).startsWith('character:'),
    );
    projections.set(itemKey, {
      entityKey: itemKey,
      facets: ['identity', 'item'],
      consumer: fromCharacter
        ? 'frozen character sheet'
        : 'creature contract tests',
      rationale: fromCharacter
        ? `Required by ${[...new Set(requiredBy)].sort().join(', ')}`
        : `Required by ${[...new Set(requiredBy)].sort().join(', ')} loot`,
    });
  }

  const mapVocationNames = (names: readonly string[]): readonly string[] =>
    names.map((name) => {
      const mappingEntry = input.projectionPolicy.rawReferenceMappings.find(
        (entry) => normalizedName(entry.rawReference) === normalizedName(name),
      );
      if (mappingEntry === undefined) {
        throw new ContentImportError('Spell vocation projection failed', [
          errorDiagnostic(
            'import.vocation-reference-unmapped',
            `No projection policy exists for raw vocation reference ${name}`,
          ),
        ]);
      }
      return mappingEntry.targetFamilyKey;
    });
  const projection = (key: ContentKey) => {
    const value = projections.get(key);
    if (value === undefined)
      throw new ContentImportError('Facet projection missing', [
        errorDiagnostic(
          'import.projection-missing',
          `No facet projection exists for ${key}`,
        ),
      ]);
    return value;
  };
  const creatureDefinitions = [...creatureDtos.entries()]
    .filter(([sourceId]) => mapping.has(`creature:${sourceId}`))
    .map(([sourceId, entry]) => {
      const key = mapping.get(`creature:${sourceId}`) as ContentKey;
      return creatureDefinition(
        entry.dto,
        key,
        projection(key),
        sourceFor(lock, input.snapshot, entry.path, sourceId),
        creatureKeyFor,
        itemKeyFor,
        entry.loot,
      );
    })
    .sort((left, right) => left.stableKey.localeCompare(right.stableKey));
  const items = itemDtos
    .map((item) =>
      itemDefinition(
        item,
        sourceFor(
          lock,
          input.snapshot,
          pathsByPurpose.items as string,
          item.sourceId,
        ),
      ),
    )
    .filter((item) => projections.has(item.stableKey))
    .sort((left, right) => left.stableKey.localeCompare(right.stableKey));
  const vocation = vocationDefinition(
    vocationDto,
    vocationKey,
    projection(vocationKey),
    sourceFor(
      lock,
      input.snapshot,
      pathsByPurpose.vocation as string,
      vocationDto.sourceId,
    ),
  );
  const spells = selectedSpells
    .map(({ sourceId, entry, key }) =>
      spellDefinition(
        entry.dto,
        key,
        projection(key),
        sourceFor(lock, input.snapshot, entry.path, sourceId),
        [...new Set(mapVocationNames(entry.dto.vocationNames))],
      ),
    )
    .sort((left, right) => left.stableKey.localeCompare(right.stableKey));
  const projectionAudits = selectedSpells.flatMap(({ entry, key }) => {
    const mappedVocationNames = mapVocationNames(entry.dto.vocationNames);
    return entry.dto.vocationNames.map((rawReference, index) => ({
      entityKey: key,
      rawReference,
      relation: 'allowed-vocation-family' as const,
      targetFamilyKey: mappedVocationNames[
        index
      ] as CatalogSpellDefinition['allowedVocationFamilies'][number],
    }));
  });
  const characters = input.characters
    .map((character) => ({
      stableKey: character.stableKey,
      vocationKey: character.vocationKey,
      level: character.level,
      skills: character.skills,
      weaponItemKey: character.weaponItemKey,
      weaponAttack: character.weaponAttack,
      maxHealth: character.maxHealth,
      maxMana: character.maxMana,
      spellKeys: character.spellKeys,
    }))
    .sort((left, right) => left.stableKey.localeCompare(right.stableKey));

  const entities = {
    vocations: [vocation],
    creatures: creatureDefinitions,
    items,
    spells,
    characters,
  };
  const allKeys = [
    ...entities.vocations,
    ...entities.creatures,
    ...entities.items,
    ...entities.spells,
  ].map((entity) => entity.stableKey);
  const roots = [...input.roots] as ContentKey[];
  const bundle: CatalogContentBundle = {
    schemaVersion: '1',
    contentVersion: 'pb-01-contract-coverage-v1',
    slice: {
      key: input.key,
      snapshot: input.snapshot,
      objective: input.objective,
      consumer: input.consumer,
      roots,
      dependencies: allKeys.filter((key) => !roots.includes(key)),
      projections: [...projections.values()],
      dependencyMode: input.dependencyMode,
      curationState: input.curationState,
      exportVersion: input.exportVersion,
      sourceFiles: input.sourceFiles,
    },
    vocationFamilies: [
      {
        key: familyKey as unknown as CatalogContentBundle['vocationFamilies'][number]['key'],
        displayName: 'Knight',
        vocationKeys: [vocationKey],
      },
    ],
    projectionAudits,
    ...entities,
  } as unknown as CatalogContentBundle;

  applyValidatedBundles([bundle], (operation) =>
    dependencies.writer.transaction((transaction) => {
      operation(transaction);
    }),
  );
  return { bundle, diagnostics: [] };
}
