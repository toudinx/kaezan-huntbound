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
  readonly characters: readonly FrozenCharacter[];
}

const expectedRoots = [
  'vocation:tibia:knight',
  'spell:tibia:berserk',
  'spell:tibia:brutal-strike',
  'spell:tibia:wound-cleansing',
  'spell:tibia:groundshaker',
  'spell:tibia:whirlwind-throw',
  'creature:tibia:rotworm',
  'creature:tibia:cyclops',
  'creature:tibia:amazon',
  'creature:tibia:orc',
  'creature:tibia:orc-spearman',
  'creature:tibia:orc-shaman',
  'creature:tibia:dragon',
  'creature:tibia:hero',
] as const;

const expectedDependencies = ['creature:tibia:snake'] as const;
const expectedSnapshot = '157e6f9e21318bd3033eea553fe9275b429faf72';
const expectedSourceFiles = [
  'data/XML/vocations.xml',
  'data/items/items.xml',
  'data/scripts/spells/attack/berserk.lua',
  'data/scripts/spells/attack/brutal_strike.lua',
  'data/scripts/spells/healing/wound_cleansing.lua',
  'data/scripts/spells/attack/groundshaker.lua',
  'data/scripts/spells/attack/whirlwind_throw.lua',
  'data-otservbr-global/monster/vermins/rotworm.lua',
  'data-otservbr-global/monster/giants/cyclops.lua',
  'data-otservbr-global/monster/humans/amazon.lua',
  'data-otservbr-global/monster/humanoids/orc.lua',
  'data-otservbr-global/monster/humanoids/orc_spearman.lua',
  'data-otservbr-global/monster/humanoids/orc_shaman.lua',
  'data-otservbr-global/monster/dragons/dragon.lua',
  'data-otservbr-global/monster/humans/hero.lua',
  'data-otservbr-global/monster/reptiles/snake.lua',
] as const;

/**
 * Unfrozen on 2026-08-19. The level 8 / sword 10 sheet capped melee at 13
 * damage against a 65 HP rotworm and could not legally cast Berserk, which
 * `berserk.lua` gates at level 35: the hunt was unwinnable by arithmetic.
 * Level 35 with sword 60 is the ordinary knight the cave is written for.
 *
 * The Hero Cave sheet unfrozen again on 2026-08-26, for the same reason one
 * band up. It carried level 130 over the level 35 kit -- sword 60, a plain
 * sword (`3264`, attack 14) and 185 mana -- which caps melee at 97 per 2 s,
 * about 31 HP/s. Hero heals 200-250 at 20 % per 2 s, so 22,5 HP/s of that is
 * undone before it lands: one Hero took near three minutes to fall while
 * dealing 0-240 per 2 s into 2015 HP. Unwinnable by arithmetic, again, and
 * the player reported it as such.
 *
 * The three numbers now follow level 130 instead of level 35. Sword 90 is the
 * ordinary trained knight at that level. The weapon is the two handed sword
 * (`3265`, attack 30, `weaponType` sword, level 20) -- the strongest sword the
 * slice carries, and one Hero itself drops. Mana is Canary's own progression
 * rather than a copied literal: 35 at level 8 plus `gainMana` 5 per level is
 * 645 at 130. By that same formula the level 35 sheet should read 170, not
 * 185; it stays as it is, because the PB-04 and PB-05 goldens were replayed
 * against 185 and nothing about the rotworm cave is broken.
 */
const expectedCharacters: readonly FrozenCharacter[] = [
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
    stableKey: 'character:huntbound:knight-orc-fortress',
    vocationKey: 'vocation:tibia:knight',
    level: 25,
    skills: { sword: 60, magic: 0 },
    weaponItemKey: 'item:tibia:sword',
    weaponSourceId: '3264',
    weaponAttack: 14,
    maxHealth: 440,
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
    stableKey: 'character:huntbound:knight-dragon-lair',
    vocationKey: 'vocation:tibia:knight',
    level: 70,
    skills: { sword: 60, magic: 0 },
    weaponItemKey: 'item:tibia:sword',
    weaponSourceId: '3264',
    weaponAttack: 14,
    maxHealth: 1115,
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
];

const expectedProjectionFacets: Readonly<Record<string, readonly string[]>> = {
  'vocation:tibia:knight': ['identity', 'progression'],
  'spell:tibia:berserk': ['identity', 'spell'],
  'spell:tibia:brutal-strike': ['identity', 'spell'],
  'spell:tibia:wound-cleansing': ['identity', 'spell'],
  'spell:tibia:groundshaker': ['identity', 'spell'],
  'spell:tibia:whirlwind-throw': ['identity', 'spell'],
  'creature:tibia:rotworm': [
    'identity',
    'stats',
    'appearance',
    'combat',
    'loot',
  ],
  'creature:tibia:cyclops': [
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
  'creature:tibia:orc': [
    'identity',
    'stats',
    'appearance',
    'combat',
    'loot',
  ],
  'creature:tibia:orc-spearman': [
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
  'creature:tibia:dragon': [
    'identity',
    'stats',
    'appearance',
    'combat',
    'loot',
  ],
  'creature:tibia:hero': ['identity', 'stats', 'appearance', 'combat', 'loot'],
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
    spell: ['80', '61', '123', '106', '107'],
    creature: ['26', '22', '77', '5', '50', '6', '34', '73'],
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
    characters: _characters,
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
        'Selection must contain Knight, five combat spells, Rotworm, Cyclops, Amazon, Orc, Orc Spearman, Orc Shaman, Dragon, and Hero as roots',
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
  diagnostics.push(...validateFrozenCharacters(input.characters));
  return diagnostics;
}

function validateFrozenCharacters(
  characters: readonly FrozenCharacter[] | undefined,
): ContentDiagnostic[] {
  if (
    characters === undefined ||
    JSON.stringify(characters) !== JSON.stringify(expectedCharacters)
  ) {
    return [
      selectionDiagnostic(
        'selection.character-mismatch',
        'Character sheets must match the frozen hunt Knight loadouts',
      ),
    ];
  }
  return [];
}
