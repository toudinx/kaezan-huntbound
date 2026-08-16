import type { ContentSliceDefinition } from '@huntbound/contracts';
import {
  type ContentDiagnostic,
  ContentSliceDefinitionSchema,
  diagnosticsFromZodError,
} from '@huntbound/contracts';

interface SourceIdGroups {
  readonly vocation: readonly string[];
  readonly spell: readonly string[];
  readonly creature: readonly string[];
}

interface RawReferenceMapping {
  readonly rawReference: string;
  readonly targetFamilyKey: string;
}

interface ProjectionPolicy {
  readonly vocationFamilyKey: string;
  readonly rawReferenceMappings: readonly RawReferenceMapping[];
  readonly aliases: readonly string[];
}

interface FrozenCharacter {
  readonly stableKey: string;
  readonly vocationKey: string;
  readonly level: number;
  readonly skills: Readonly<Record<string, number>>;
  readonly weaponItemKey: string;
  readonly weaponSourceId: string;
  readonly weaponAttack: number;
  readonly maxHealth: number;
  readonly maxMana: number;
  readonly spellKeys: readonly string[];
}

interface CuratedSelectionInput extends ContentSliceDefinition {
  readonly rootSourceIds: SourceIdGroups;
  readonly dependencySourceIds: Readonly<Record<string, readonly string[]>>;
  readonly projectionPolicy: ProjectionPolicy;
  readonly character: FrozenCharacter;
}

const expectedRoots = [
  'vocation:tibia:knight',
  'spell:tibia:berserk',
  'spell:tibia:brutal-strike',
  'spell:tibia:wound-cleansing',
  'creature:tibia:rotworm',
  'creature:tibia:amazon',
  'creature:tibia:orc-shaman',
] as const;

const expectedDependencies = ['creature:tibia:snake'] as const;
const expectedSnapshot = '157e6f9e21318bd3033eea553fe9275b429faf72';
const expectedSourceFiles = [
  'data/XML/vocations.xml',
  'data/items/items.xml',
  'data/scripts/spells/attack/berserk.lua',
  'data/scripts/spells/attack/brutal_strike.lua',
  'data/scripts/spells/healing/wound_cleansing.lua',
  'data-otservbr-global/monster/vermins/rotworm.lua',
  'data-otservbr-global/monster/humans/amazon.lua',
  'data-otservbr-global/monster/humanoids/orc_shaman.lua',
  'data-otservbr-global/monster/reptiles/snake.lua',
] as const;

const expectedCharacter: FrozenCharacter = {
  stableKey: 'character:huntbound:knight-venore-rotworm-cave',
  vocationKey: 'vocation:tibia:knight',
  level: 8,
  skills: { sword: 10, magic: 0 },
  weaponItemKey: 'item:tibia:sword',
  weaponSourceId: '3264',
  weaponAttack: 14,
  maxHealth: 185,
  maxMana: 185,
  spellKeys: [
    'spell:tibia:berserk',
    'spell:tibia:brutal-strike',
    'spell:tibia:wound-cleansing',
  ],
};

const expectedProjectionFacets: Readonly<Record<string, readonly string[]>> = {
  'vocation:tibia:knight': ['identity', 'progression'],
  'spell:tibia:berserk': ['identity', 'spell'],
  'spell:tibia:brutal-strike': ['identity', 'spell'],
  'spell:tibia:wound-cleansing': ['identity', 'spell'],
  'creature:tibia:rotworm': [
    'identity',
    'stats',
    'appearance',
    'combat',
    'loot',
  ],
  'creature:tibia:amazon': [
    'identity',
    'stats',
    'appearance',
    'combat',
    'loot',
  ],
  'creature:tibia:orc-shaman': [
    'identity',
    'stats',
    'appearance',
    'combat',
    'loot',
  ],
  'creature:tibia:snake': [
    'identity',
    'stats',
    'appearance',
    'combat',
    'conditions',
  ],
};

function selectionDiagnostic(code: string, message: string): ContentDiagnostic {
  return { code, severity: 'error', message };
}

function sameMembers(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return (
    actual.length === expected.length &&
    actual.every((value) => expected.includes(value))
  );
}

function duplicateValues(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function validateSourceIdGroups(
  selection: CuratedSelectionInput,
): ContentDiagnostic[] {
  const diagnostics: ContentDiagnostic[] = [];
  const expected: SourceIdGroups = {
    vocation: ['4'],
    spell: ['80', '61', '123'],
    creature: ['26', '77', '6'],
  };

  for (const kind of ['vocation', 'spell', 'creature'] as const) {
    const actual = selection.rootSourceIds[kind];
    const duplicates = duplicateValues(actual);
    if (duplicates.length > 0) {
      diagnostics.push(
        selectionDiagnostic(
          'selection.duplicate-source-id',
          `${kind} root source IDs contain duplicates: ${duplicates.join(', ')}`,
        ),
      );
    }
    if (!sameMembers(actual, expected[kind])) {
      diagnostics.push(
        selectionDiagnostic(
          'selection.source-id-set-mismatch',
          `${kind} root source IDs do not match the frozen selection`,
        ),
      );
    }
  }

  const dependencyCreatures = selection.dependencySourceIds.creature;
  if (!sameMembers(dependencyCreatures ?? [], ['28'])) {
    diagnostics.push(
      selectionDiagnostic(
        'selection.dependency-source-id-set-mismatch',
        'Creature dependency source IDs must contain only Snake race ID 28',
      ),
    );
  }
  return diagnostics;
}

function validateProjectionPolicy(
  policy: ProjectionPolicy,
): ContentDiagnostic[] {
  const diagnostics: ContentDiagnostic[] = [];
  const expectedFamily = 'vocation-family:huntbound:knight';

  if (policy.vocationFamilyKey !== expectedFamily) {
    diagnostics.push(
      selectionDiagnostic(
        'selection.vocation-family-mismatch',
        `Projection policy must target ${expectedFamily}`,
      ),
    );
  }

  const mappings = new Map(
    policy.rawReferenceMappings.map((mapping) => [
      mapping.rawReference,
      mapping.targetFamilyKey,
    ]),
  );
  for (const rawReference of ['knight', 'elite knight']) {
    if (mappings.get(rawReference) !== expectedFamily) {
      diagnostics.push(
        selectionDiagnostic(
          'selection.raw-reference-mapping-mismatch',
          `Raw reference ${rawReference} must map to ${expectedFamily}`,
        ),
      );
    }
  }

  if (policy.aliases.includes('elite knight')) {
    diagnostics.push(
      selectionDiagnostic(
        'selection.raw-reference-alias',
        'Elite Knight is a raw spell reference, not an alias of the Knight entity',
      ),
    );
  }
  return diagnostics;
}

export function validateSliceSelection(
  selection: ContentSliceDefinition,
): readonly ContentDiagnostic[] {
  const input = selection as unknown as CuratedSelectionInput;
  const {
    rootSourceIds: _rootSourceIds,
    dependencySourceIds: _dependencySourceIds,
    projectionPolicy: _projectionPolicy,
    character: _character,
    ...definition
  } = input as unknown as Record<string, unknown>;
  const diagnostics: ContentDiagnostic[] = [];

  const parsed = ContentSliceDefinitionSchema.safeParse(definition);
  if (!parsed.success)
    diagnostics.push(...diagnosticsFromZodError(parsed.error));

  if (input.roots.some((root) => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(root))) {
    diagnostics.push(
      selectionDiagnostic(
        'selection.manual-guid',
        'Roots must use stable content keys, never manually supplied GUIDs',
      ),
    );
  }

  if (!sameMembers(input.roots, expectedRoots)) {
    diagnostics.push(
      selectionDiagnostic(
        'selection.root-set-mismatch',
        'Selection must contain Knight, three combat spells, Rotworm, Amazon, and Orc Shaman as roots',
      ),
    );
  }
  if (input.roots.some((root) => root.startsWith('item:'))) {
    diagnostics.push(
      selectionDiagnostic(
        'selection.item-root-not-allowed',
        'Loot items are reachable dependencies and cannot be roots without a separate consumer justification',
      ),
    );
  }
  if (!sameMembers(input.dependencies, expectedDependencies)) {
    diagnostics.push(
      selectionDiagnostic(
        'selection.dependency-set-mismatch',
        'The frozen explicit dependency set contains only Snake; loot items are discovered by materialization',
      ),
    );
  }
  if (input.snapshot !== expectedSnapshot) {
    diagnostics.push(
      selectionDiagnostic(
        'selection.snapshot-mismatch',
        `Selection must target snapshot ${expectedSnapshot}`,
      ),
    );
  }
  if (!sameMembers(input.sourceFiles, expectedSourceFiles)) {
    diagnostics.push(
      selectionDiagnostic(
        'selection.source-file-set-mismatch',
        'Selection source files must match the catalog source-lock paths',
      ),
    );
  }
  if (new Set(input.sourceFiles).size !== input.sourceFiles.length) {
    diagnostics.push(
      selectionDiagnostic(
        'selection.duplicate-source-file',
        'Selection source files must be unique',
      ),
    );
  }

  const projectionKeys = input.projections.map(
    (projection) => projection.entityKey,
  );
  const expectedProjectionKeys = Object.keys(expectedProjectionFacets);
  if (!sameMembers(projectionKeys, expectedProjectionKeys)) {
    diagnostics.push(
      selectionDiagnostic(
        'selection.projection-set-mismatch',
        'Every frozen root and the Snake dependency must have exactly one projection',
      ),
    );
  }
  for (const projection of input.projections) {
    const expectedFacets = expectedProjectionFacets[projection.entityKey];
    if (expectedFacets !== undefined) {
      const facets = projection.facets as readonly string[];
      if (!sameMembers(facets, expectedFacets)) {
        diagnostics.push(
          selectionDiagnostic(
            'selection.facet-set-mismatch',
            `Projection ${projection.entityKey} has facets outside its frozen contract`,
          ),
        );
      }
      const fields = (projection as Record<string, unknown>).fields;
      if (Array.isArray(fields)) {
        for (const field of fields) {
          if (typeof field === 'string' && !facets.includes(field)) {
            diagnostics.push(
              selectionDiagnostic(
                'selection.field-without-facet',
                `Field ${field} is not covered by a facet on ${projection.entityKey}`,
              ),
            );
          }
        }
      }
    }
  }

  diagnostics.push(...validateSourceIdGroups(input));
  diagnostics.push(...validateProjectionPolicy(input.projectionPolicy));
  diagnostics.push(...validateFrozenCharacter(input.character));
  return diagnostics;
}

function validateFrozenCharacter(
  character: FrozenCharacter | undefined,
): ContentDiagnostic[] {
  if (
    character === undefined ||
    JSON.stringify(character) !== JSON.stringify(expectedCharacter)
  ) {
    return [
      selectionDiagnostic(
        'selection.character-mismatch',
        'Character sheet must match the frozen PB-05 Knight loadout',
      ),
    ];
  }
  return [];
}
