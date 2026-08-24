import {
  type CatalogContentBundle,
  CatalogContentBundleSchema,
  type ContentDiagnostic,
  type ContentGuid,
  type ContentKey,
  characterKitBands,
  createContentGuid,
  diagnosticsFromZodError,
  type EntityKind,
} from '@huntbound/contracts';

import { ContentImportError } from './ContentImportError.ts';

export interface CatalogTransaction {
  replaceCatalogBundle(bundle: CatalogContentBundle): void;
  listOrphanEntities(): readonly ContentGuid[];
}

export type CatalogTransactionRunner = (
  operation: (transaction: CatalogTransaction) => void,
) => void;

function diagnostic(code: string, message: string): ContentDiagnostic {
  return { code, severity: 'error', message };
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

function entityKindFromKey(key: string): EntityKind | undefined {
  const kind = key.split(':', 1)[0];
  return kind === 'vocation' ||
    kind === 'creature' ||
    kind === 'item' ||
    kind === 'spell'
    ? kind
    : undefined;
}

function assertApplicationInvariants(bundle: CatalogContentBundle): void {
  const entities = allEntities(bundle);
  const entityKeys = new Set(
    entities.map((entity) => String(entity.stableKey)),
  );
  const guids = new Set<string>();
  const stableKeys = new Set<string>();
  const projections = new Map(
    bundle.slice.projections.map((projection) => [
      projection.entityKey,
      projection,
    ]),
  );
  const errors: ContentDiagnostic[] = [];

  for (const entity of entities) {
    const key = String(entity.stableKey);
    const kind = entityKindFromKey(key);
    if (kind !== entity.kind) {
      errors.push(
        diagnostic('import.identity-kind', `${key} has the wrong entity kind`),
      );
    }
    if (guids.has(entity.guid)) {
      errors.push(
        diagnostic(
          'import.duplicate-guid',
          `Duplicate content GUID ${entity.guid}`,
        ),
      );
    }
    if (stableKeys.has(key)) {
      errors.push(
        diagnostic('import.duplicate-key', `Duplicate content key ${key}`),
      );
    }
    guids.add(entity.guid);
    stableKeys.add(key);
    const sourceId = key.split(':').at(-1);
    if (kind !== undefined && sourceId !== undefined) {
      const expectedGuid = createContentGuid(
        kind,
        'tibia',
        entity.source.sourceId,
      );
      if (entity.guid !== expectedGuid) {
        errors.push(
          diagnostic('import.guid-mismatch', `GUID does not match ${key}`),
        );
      }
    }
    const projection = projections.get(entity.stableKey);
    if (projection === undefined) {
      errors.push(
        diagnostic(
          'import.missing-projection',
          `${key} has no facet projection`,
        ),
      );
    } else if (
      projection.facets.length !== entity.includedFacets.length ||
      projection.facets.some((facet) => !entity.includedFacets.includes(facet))
    ) {
      errors.push(
        diagnostic(
          'import.facet-mismatch',
          `${key} fields do not match its approved facets`,
        ),
      );
    }
    if (!bundle.slice.sourceFiles.includes(entity.source.sourcePath)) {
      errors.push(
        diagnostic(
          'import.source-file-missing',
          `${key} points to an unlisted source file`,
        ),
      );
    }
    if (entity.source.snapshot !== bundle.slice.snapshot) {
      errors.push(
        diagnostic(
          'import.snapshot-mismatch',
          `${key} points to a different source snapshot`,
        ),
      );
    }
  }

  for (const projection of bundle.slice.projections) {
    if (!entityKeys.has(projection.entityKey)) {
      errors.push(
        diagnostic(
          'import.projection-orphan',
          `Projection points to ${projection.entityKey}, which is not in the bundle`,
        ),
      );
    }
  }

  const roots = new Set(bundle.slice.roots);
  const dependencies = new Set(bundle.slice.dependencies);
  if (bundle.slice.roots.some((root) => dependencies.has(root))) {
    errors.push(
      diagnostic(
        'import.root-dependency-overlap',
        'Roots and dependencies must be disjoint',
      ),
    );
  }
  if (
    roots.size + dependencies.size !== entityKeys.size ||
    [...roots, ...dependencies].some((key) => !entityKeys.has(key))
  ) {
    errors.push(
      diagnostic(
        'import.entity-set-mismatch',
        'Roots and dependencies must cover exactly the bundle entities',
      ),
    );
  }

  const reachable = new Set(bundle.slice.roots);
  let changed = true;
  while (changed) {
    changed = false;
    for (const creature of bundle.creatures) {
      if (!reachable.has(creature.stableKey)) continue;
      for (const summon of creature.summons) {
        if (!reachable.has(summon.creatureKey)) {
          reachable.add(summon.creatureKey);
          changed = true;
        }
      }
      for (const loot of creature.loot) {
        if (!reachable.has(loot.itemKey)) {
          reachable.add(loot.itemKey);
          changed = true;
        }
      }
    }
    for (const vocation of bundle.vocations) reachable.add(vocation.stableKey);
    for (const spell of bundle.spells) reachable.add(spell.stableKey);
    for (const character of bundle.characters) {
      reachable.add(character.weaponItemKey);
      for (const band of characterKitBands(character)) {
        for (const spellKey of band.spellKeys) reachable.add(spellKey);
      }
    }
  }
  for (const dependency of dependencies) {
    if (!reachable.has(dependency)) {
      errors.push(
        diagnostic(
          'import.unreachable-dependency',
          `Dependency ${dependency} is not reachable from a root`,
        ),
      );
    }
  }

  const familyKeys = new Set(
    bundle.vocationFamilies.map((family) => family.key),
  );
  for (const vocation of bundle.vocations) {
    if (!familyKeys.has(vocation.familyKey)) {
      errors.push(
        diagnostic(
          'import.unknown-family',
          `Unknown vocation family ${vocation.familyKey}`,
        ),
      );
    }
  }
  const creatureKeys = new Set(
    bundle.creatures.map((creature) => creature.stableKey),
  );
  const itemKeys = new Set(bundle.items.map((item) => item.stableKey));
  for (const spell of bundle.spells) {
    for (const family of spell.allowedVocationFamilies) {
      if (!familyKeys.has(family))
        errors.push(
          diagnostic('import.unknown-family', `Unknown spell family ${family}`),
        );
    }
  }
  for (const creature of bundle.creatures) {
    for (const summon of creature.summons) {
      if (!creatureKeys.has(summon.creatureKey))
        errors.push(
          diagnostic(
            'import.unknown-summon',
            `Unknown summon ${summon.creatureKey}`,
          ),
        );
    }
    for (const loot of creature.loot) {
      if (!itemKeys.has(loot.itemKey))
        errors.push(
          diagnostic(
            'import.unknown-loot-item',
            `Unknown loot item ${loot.itemKey}`,
          ),
        );
    }
  }

  if (errors.length > 0)
    throw new ContentImportError(
      'Catalog bundle failed application validation',
      errors,
    );
}

export function validateApplicationBundle(
  input: unknown,
): CatalogContentBundle {
  const parsed = CatalogContentBundleSchema.safeParse(input);
  if (!parsed.success) {
    throw new ContentImportError(
      'Catalog bundle failed schema validation',
      diagnosticsFromZodError(parsed.error),
    );
  }
  assertApplicationInvariants(parsed.data);
  return parsed.data;
}

export function applyValidatedBundles(
  operations: readonly CatalogContentBundle[],
  transaction: CatalogTransactionRunner,
): void {
  if (operations.length === 0) {
    throw new ContentImportError('Catalog operation must be non-empty', [
      diagnostic(
        'operation.empty',
        'Catalog operation must contain at least one bundle',
      ),
    ]);
  }
  const validated = operations.map(validateApplicationBundle);
  transaction((tx) => {
    for (const bundle of validated) tx.replaceCatalogBundle(bundle);
    const orphans = tx.listOrphanEntities();
    if (orphans.length > 0) {
      throw new ContentImportError(
        'Catalog operation produced orphan entities',
        [
          diagnostic(
            'operation.orphan-entities',
            `Catalog contains orphan entities: ${orphans.join(', ')}`,
          ),
        ],
      );
    }
  });
}

export function asContentKey(value: string): ContentKey {
  return value as ContentKey;
}
