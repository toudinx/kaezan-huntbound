import { z } from 'zod';

import {
  ContentGuidSchema,
  ContentKeySchema,
  VocationFamilyKeySchema,
} from './identity.ts';

const nonEmptyString = z.string().trim().min(1);
const nonNegativeNumber = z.number().finite().nonnegative();
const nonNegativeInteger = z.number().int().nonnegative();
const positiveInteger = z.number().int().positive();
const chanceBasisPoints = z.number().int().min(0).max(10_000);
const chancePerHundredThousand = z.number().int().min(0).max(100_000);

export const ContentFacetSchema = z.enum([
  'identity',
  'stats',
  'appearance',
  'combat',
  'conditions',
  'loot',
  'item',
  'progression',
  'spell',
]);
export type ContentFacet = z.infer<typeof ContentFacetSchema>;

const uniqueReadonlyArray = <T extends z.ZodType>(schema: T) =>
  z.array(schema).refine((values) => new Set(values).size === values.length, {
    message: 'Array values must be unique',
  });

const IncludedFacetsSchema = uniqueReadonlyArray(ContentFacetSchema)
  .min(1)
  .readonly();
const ContentKeyArraySchema = uniqueReadonlyArray(ContentKeySchema).readonly();

export const SourceReferenceSchema = z
  .object({
    system: z.literal('canary'),
    snapshot: nonEmptyString,
    sourceId: nonEmptyString,
    sourcePath: nonEmptyString.refine(
      (value) =>
        !value.startsWith('/') &&
        !value.startsWith('\\') &&
        !value.includes('\\') &&
        !value.split('/').includes('..'),
      'sourcePath must be a relative POSIX path without parent traversal',
    ),
    sourceSha256: z
      .string()
      .regex(
        /^[0-9a-f]{64}$/,
        'sourceSha256 must be a lowercase SHA-256 digest',
      ),
  })
  .strict();
export type SourceReference = z.infer<typeof SourceReferenceSchema>;

export const ContentAliasSchema = z
  .object({
    alias: nonEmptyString,
    sourceSystem: z.literal('tibia'),
    entityKey: ContentKeySchema,
  })
  .strict();
export type ContentAlias = z.infer<typeof ContentAliasSchema>;

export const ImportProjectionAuditSchema = z
  .object({
    entityKey: ContentKeySchema,
    rawReference: nonEmptyString,
    relation: z.literal('allowed-vocation-family'),
    targetFamilyKey: VocationFamilyKeySchema,
  })
  .strict();
export type ImportProjectionAudit = z.infer<typeof ImportProjectionAuditSchema>;

export const ContentProjectionSchema = z
  .object({
    entityKey: ContentKeySchema,
    facets: IncludedFacetsSchema,
    consumer: nonEmptyString,
    rationale: nonEmptyString,
  })
  .strict();
export type ContentProjection = z.infer<typeof ContentProjectionSchema>;

const ContentSliceCommonSchema = z
  .object({
    key: z.string().regex(/^[a-z0-9][a-z0-9-]*(?::[a-z0-9][a-z0-9-]*)+$/),
    objective: nonEmptyString,
    consumer: nonEmptyString,
    roots: ContentKeyArraySchema,
    dependencies: ContentKeyArraySchema,
    projections: z.array(ContentProjectionSchema).readonly(),
    dependencyMode: z.literal('reachable-only'),
    curationState: z.enum(['draft', 'accepted']),
    exportVersion: nonEmptyString,
  })
  .strict();

function validateSliceProjections(
  slice: {
    readonly roots: readonly string[];
    readonly projections: readonly { readonly entityKey: string }[];
  },
  context: z.RefinementCtx,
) {
  const projectionKeys = new Set(
    slice.projections.map((projection) => projection.entityKey),
  );
  for (const root of slice.roots) {
    if (!projectionKeys.has(root)) {
      context.addIssue({
        code: 'custom',
        path: ['projections'],
        message: `Root ${root} must have a content projection`,
      });
    }
  }
}

export const ContentSliceDefinitionSchema = ContentSliceCommonSchema.extend({
  snapshot: nonEmptyString,
  sourceFiles: z
    .array(
      nonEmptyString.refine(
        (value) =>
          !value.startsWith('/') &&
          !value.includes('\\') &&
          !value.split('/').includes('..'),
        'sourceFiles must contain relative POSIX paths',
      ),
    )
    .readonly(),
})
  .strict()
  .superRefine(validateSliceProjections);
export type ContentSliceDefinition = z.infer<
  typeof ContentSliceDefinitionSchema
>;

const RuntimeContentSliceSchema = ContentSliceCommonSchema.superRefine(
  validateSliceProjections,
);

const EntityIdentitySchema = z
  .object({
    guid: ContentGuidSchema,
    stableKey: ContentKeySchema,
    displayName: nonEmptyString,
    includedFacets: IncludedFacetsSchema,
  })
  .strict();

const CatalogMetadataSchema = z
  .object({
    source: SourceReferenceSchema,
    aliases: z.array(ContentAliasSchema).readonly(),
  })
  .strict();

const withRange = <T extends z.ZodObject<Record<string, z.ZodTypeAny>>>(
  schema: T,
) =>
  schema.refine(
    (value) => {
      const damage = value as {
        readonly minDamage: number;
        readonly maxDamage: number;
      };
      return damage.minDamage <= damage.maxDamage;
    },
    {
      path: ['maxDamage'],
      message: 'minDamage must be less than or equal to maxDamage',
    },
  );

const DamageTypeSchema = z.enum([
  'physical',
  'fire',
  'ice',
  'energy',
  'earth',
  'holy',
  'death',
  'poison',
  'healing',
]);

const CreatureAttackBaseSchema = z
  .object({
    name: nonEmptyString,
    intervalMs: nonNegativeInteger,
    chanceBasisPoints,
    damageType: DamageTypeSchema,
    minDamage: nonNegativeNumber,
    maxDamage: nonNegativeNumber,
  })
  .strict();

const MeleeAttackSchema = withRange(
  CreatureAttackBaseSchema.extend({
    kind: z.literal('melee'),
  }).strict(),
);

const RangedAttackSchema = withRange(
  CreatureAttackBaseSchema.extend({
    kind: z.literal('ranged'),
    rangeTiles: nonNegativeInteger,
    projectile: nonEmptyString,
  }).strict(),
);

const AreaAttackSchema = withRange(
  CreatureAttackBaseSchema.extend({
    kind: z.literal('area'),
    shape: z.literal('square'),
    radiusTiles: nonNegativeInteger,
  }).strict(),
);

export const CreatureAttackDefinitionSchema = z.discriminatedUnion('kind', [
  MeleeAttackSchema,
  RangedAttackSchema,
  AreaAttackSchema,
]);
export type CreatureAttackDefinition = z.infer<
  typeof CreatureAttackDefinitionSchema
>;

const HealDefenseActionSchema = z
  .object({
    kind: z.literal('heal'),
    intervalMs: nonNegativeInteger,
    chanceBasisPoints,
    minAmount: nonNegativeNumber,
    maxAmount: nonNegativeNumber,
  })
  .strict()
  .refine((value) => value.minAmount <= value.maxAmount, {
    path: ['maxAmount'],
    message: 'minAmount must be less than or equal to maxAmount',
  });

export const CreatureDefenseActionSchema = z.discriminatedUnion('kind', [
  HealDefenseActionSchema,
]);
export type CreatureDefenseAction = z.infer<typeof CreatureDefenseActionSchema>;

const signedInteger = z.number().int();

const PoisonConditionSchema = z
  .object({
    kind: z.literal('poison'),
    totalDamage: nonNegativeNumber,
    intervalMs: positiveInteger,
  })
  .strict();

const SkillModifierConditionSchema = z
  .object({
    kind: z.literal('skill-modifier'),
    skillIndex: nonNegativeInteger,
    permille: signedInteger,
    durationMs: nonNegativeInteger,
    exclusivityGroup: nonNegativeInteger.nullable().default(null),
  })
  .strict();

const DamageDealtConditionSchema = z
  .object({
    kind: z.literal('damage-dealt'),
    permille: signedInteger,
    durationMs: nonNegativeInteger,
    exclusivityGroup: nonNegativeInteger.nullable().default(null),
  })
  .strict();

const DamageReceivedConditionSchema = z
  .object({
    kind: z.literal('damage-received'),
    permille: signedInteger,
    durationMs: nonNegativeInteger,
    exclusivityGroup: nonNegativeInteger.nullable().default(null),
  })
  .strict();

const SpeedConditionSchema = z
  .object({
    kind: z.literal('speed'),
    permille: signedInteger,
    durationMs: nonNegativeInteger,
    exclusivityGroup: nonNegativeInteger.nullable().default(null),
  })
  .strict();

const ManaShieldConditionSchema = z
  .object({
    kind: z.literal('mana-shield'),
    durationMs: nonNegativeInteger,
  })
  .strict();

export const ConditionDefinitionSchema = z.discriminatedUnion('kind', [
  PoisonConditionSchema,
  SkillModifierConditionSchema,
  DamageDealtConditionSchema,
  DamageReceivedConditionSchema,
  SpeedConditionSchema,
  ManaShieldConditionSchema,
]);
export type ConditionDefinition = z.infer<typeof ConditionDefinitionSchema>;

export const CreatureSummonDefinitionSchema = z
  .object({
    creatureKey: ContentKeySchema,
    count: positiveInteger,
    chanceBasisPoints,
  })
  .strict();
export type CreatureSummonDefinition = z.infer<
  typeof CreatureSummonDefinitionSchema
>;

export const LootEntryDefinitionSchema = z
  .object({
    itemKey: ContentKeySchema,
    chancePerHundredThousand,
    minCount: positiveInteger,
    maxCount: positiveInteger,
  })
  .strict()
  .refine((value) => value.minCount <= value.maxCount, {
    path: ['maxCount'],
    message: 'minCount must be less than or equal to maxCount',
  });
export type LootEntryDefinition = z.infer<typeof LootEntryDefinitionSchema>;

export const CreatureDefinitionSchema = EntityIdentitySchema.extend({
  stats: z
    .object({
      health: nonNegativeInteger,
      experience: nonNegativeInteger,
      speed: nonNegativeInteger,
    })
    .strict(),
  lookType: nonNegativeInteger,
  attacks: z.array(CreatureAttackDefinitionSchema).readonly(),
  defenses: z.array(CreatureDefenseActionSchema).readonly(),
  conditions: z.array(ConditionDefinitionSchema).readonly(),
  summons: z.array(CreatureSummonDefinitionSchema).readonly(),
  resistances: z.record(z.string().min(1), z.number().finite()),
  immunities: z.array(nonEmptyString).readonly(),
  loot: z.array(LootEntryDefinitionSchema).readonly(),
})
  .strict()
  .superRefine((creature, context) => {
    const facets = new Set(creature.includedFacets);
    const requireFacet = (
      facet: ContentFacet,
      field: string,
      hasValue = true,
    ) => {
      if (hasValue && !facets.has(facet)) {
        context.addIssue({
          code: 'custom',
          path: ['includedFacets'],
          message: `${field} requires the ${facet} facet`,
        });
      }
    };

    requireFacet('stats', 'stats');
    requireFacet('appearance', 'lookType');
    requireFacet(
      'combat',
      'combat actions',
      creature.attacks.length > 0 ||
        creature.defenses.length > 0 ||
        creature.summons.length > 0 ||
        Object.keys(creature.resistances).length > 0 ||
        creature.immunities.length > 0,
    );
    requireFacet('conditions', 'conditions', creature.conditions.length > 0);
    requireFacet('loot', 'loot', creature.loot.length > 0);
  });
export type CreatureDefinition = z.infer<typeof CreatureDefinitionSchema>;

export const VocationFamilyDefinitionSchema = z
  .object({
    key: VocationFamilyKeySchema,
    displayName: nonEmptyString,
    vocationKeys: ContentKeyArraySchema,
  })
  .strict();
export type VocationFamilyDefinition = z.infer<
  typeof VocationFamilyDefinitionSchema
>;

export const VocationDefinitionSchema = EntityIdentitySchema.extend({
  familyKey: VocationFamilyKeySchema,
  gainHp: nonNegativeNumber,
  gainMana: nonNegativeNumber,
  gainCapacity: nonNegativeNumber,
  baseSpeed: nonNegativeInteger,
  attackSpeedMs: nonNegativeInteger,
  manaMultiplier: z.number().finite().positive(),
  skillMultipliers: z.record(
    z.string().min(1),
    z.number().finite().nonnegative(),
  ),
})
  .strict()
  .superRefine((vocation, context) => {
    if (!vocation.includedFacets.includes('progression')) {
      context.addIssue({
        code: 'custom',
        path: ['includedFacets'],
        message: 'Vocation progression fields require the progression facet',
      });
    }
  });
export type VocationDefinition = z.infer<typeof VocationDefinitionSchema>;

export const ItemDefinitionSchema = EntityIdentitySchema.extend({
  stackable: z.boolean().optional(),
  maxStackSize: positiveInteger.optional(),
  weight: nonNegativeNumber.optional(),
})
  .strict()
  .superRefine((item, context) => {
    if (
      (item.stackable !== undefined ||
        item.maxStackSize !== undefined ||
        item.weight !== undefined) &&
      !item.includedFacets.includes('item')
    ) {
      context.addIssue({
        code: 'custom',
        path: ['includedFacets'],
        message: 'Item fields require the item facet',
      });
    }
  });
export type ItemDefinition = z.infer<typeof ItemDefinitionSchema>;

const finiteNumber = z.number().finite();

const SkillAttackFormulaSchema = z
  .object({
    kind: z.literal('skillAttack'),
    levelFactor: finiteNumber,
    minSkillAttackFactor: finiteNumber,
    maxSkillAttackFactor: finiteNumber,
    finalMultiplier: finiteNumber,
  })
  .strict()
  .refine(
    (formula) => formula.minSkillAttackFactor <= formula.maxSkillAttackFactor,
    {
      path: ['maxSkillAttackFactor'],
      message:
        'minSkillAttackFactor must be less than or equal to maxSkillAttackFactor',
    },
  );

const SkillAttackProductFormulaSchema = z
  .object({
    kind: z.literal('skillAttackProduct'),
    levelFactor: finiteNumber,
    minSkillAttackFactor: finiteNumber,
    maxSkillAttackFactor: finiteNumber,
    minAddend: finiteNumber,
    maxAddend: finiteNumber,
    finalMultiplier: finiteNumber,
  })
  .strict()
  .refine(
    (formula) => formula.minSkillAttackFactor <= formula.maxSkillAttackFactor,
    {
      path: ['maxSkillAttackFactor'],
      message:
        'minSkillAttackFactor must be less than or equal to maxSkillAttackFactor',
    },
  )
  .refine((formula) => formula.minAddend <= formula.maxAddend, {
    path: ['maxAddend'],
    message: 'minAddend must be less than or equal to maxAddend',
  });

const LevelMagicFormulaSchema = z
  .object({
    kind: z.literal('levelMagic'),
    levelFactor: finiteNumber,
    minMagicFactor: finiteNumber,
    maxMagicFactor: finiteNumber,
    minAddend: finiteNumber,
    maxAddend: finiteNumber,
  })
  .strict()
  .refine((formula) => formula.minMagicFactor <= formula.maxMagicFactor, {
    path: ['maxMagicFactor'],
    message: 'minMagicFactor must be less than or equal to maxMagicFactor',
  })
  .refine((formula) => formula.minAddend <= formula.maxAddend, {
    path: ['maxAddend'],
    message: 'minAddend must be less than or equal to maxAddend',
  });

export const SpellFormulaDefinitionSchema = z.union([
  SkillAttackFormulaSchema,
  SkillAttackProductFormulaSchema,
  LevelMagicFormulaSchema,
]);
export type SpellFormulaDefinition = z.infer<
  typeof SpellFormulaDefinitionSchema
>;

const CharacterKeySchema = z
  .string()
  .regex(
    /^character:huntbound:[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Expected a lowercase Huntbound character key',
  );

const vocationContentKey = ContentKeySchema.refine(
  (value) => value.startsWith('vocation:tibia:'),
  'vocationKey must be a vocation content key',
);
const itemContentKey = ContentKeySchema.refine(
  (value) => value.startsWith('item:tibia:'),
  'weaponItemKey must be an item content key',
);
const spellContentKey = ContentKeySchema.refine(
  (value) => value.startsWith('spell:tibia:'),
  'spellKeys must contain spell content keys',
);

export const CharacterDefinitionSchema = z
  .object({
    stableKey: CharacterKeySchema,
    vocationKey: vocationContentKey,
    level: nonNegativeInteger,
    skills: z
      .object({
        sword: nonNegativeNumber,
        magic: nonNegativeNumber,
      })
      .strict(),
    weaponItemKey: itemContentKey,
    weaponAttack: nonNegativeInteger,
    maxHealth: positiveInteger,
    maxMana: positiveInteger,
    spellKeys: uniqueReadonlyArray(spellContentKey).min(1).readonly(),
  })
  .strict();
export type CharacterDefinition = z.infer<typeof CharacterDefinitionSchema>;

export const SpellDefinitionSchema = EntityIdentitySchema.extend({
  words: nonEmptyString,
  level: nonNegativeInteger,
  mana: nonNegativeInteger,
  cooldownMs: nonNegativeInteger,
  groupCooldownMs: nonNegativeInteger,
  damageType: DamageTypeSchema,
  area: z
    .object({
      shape: z.literal('square'),
      radiusTiles: nonNegativeInteger,
    })
    .strict()
    .optional(),
  allowedVocationFamilies: z.array(VocationFamilyKeySchema).readonly(),
  formula: SpellFormulaDefinitionSchema,
})
  .strict()
  .superRefine((spell, context) => {
    if (!spell.includedFacets.includes('spell')) {
      context.addIssue({
        code: 'custom',
        path: ['includedFacets'],
        message: 'Spell fields require the spell facet',
      });
    }
  });
export type SpellDefinition = z.infer<typeof SpellDefinitionSchema>;

const CatalogVocationDefinitionSchema = VocationDefinitionSchema.extend(
  CatalogMetadataSchema.shape,
).strict();
const CatalogCreatureDefinitionSchema = CreatureDefinitionSchema.extend(
  CatalogMetadataSchema.shape,
).strict();
const CatalogItemDefinitionSchema = ItemDefinitionSchema.extend(
  CatalogMetadataSchema.shape,
).strict();
const CatalogSpellDefinitionSchema = SpellDefinitionSchema.extend(
  CatalogMetadataSchema.shape,
).strict();

const CatalogBundleBaseSchema = z
  .object({
    schemaVersion: nonEmptyString,
    contentVersion: nonEmptyString,
    slice: ContentSliceDefinitionSchema,
    vocationFamilies: z.array(VocationFamilyDefinitionSchema).readonly(),
    projectionAudits: z.array(ImportProjectionAuditSchema).readonly(),
  })
  .strict();

const RuntimeBundleBaseSchema = z
  .object({
    schemaVersion: nonEmptyString,
    contentVersion: nonEmptyString,
    slice: RuntimeContentSliceSchema,
    vocationFamilies: z.array(VocationFamilyDefinitionSchema).readonly(),
  })
  .strict();

function addReferenceIssues(
  bundle: {
    readonly vocationFamilies: readonly { readonly key: string }[];
    readonly vocations: readonly {
      readonly stableKey: string;
      readonly familyKey: string;
    }[];
    readonly spells: readonly {
      readonly stableKey: string;
      readonly allowedVocationFamilies: readonly string[];
    }[];
    readonly creatures: readonly {
      readonly stableKey: string;
      readonly summons: readonly { readonly creatureKey: string }[];
      readonly loot: readonly { readonly itemKey: string }[];
    }[];
    readonly items: readonly { readonly stableKey: string }[];
    readonly characters: readonly {
      readonly vocationKey: string;
      readonly weaponItemKey: string;
      readonly spellKeys: readonly string[];
    }[];
  },
  context: z.RefinementCtx,
) {
  const familyKeys = new Set(
    bundle.vocationFamilies.map((family) => family.key),
  );
  const itemKeys = new Set(bundle.items.map((item) => item.stableKey));
  const creatureKeys = new Set(
    bundle.creatures.map((creature) => creature.stableKey),
  );
  const vocationByKey = new Map(
    bundle.vocations.map((vocation) => [vocation.stableKey, vocation]),
  );
  const spellByKey = new Map(
    bundle.spells.map((spell) => [spell.stableKey, spell]),
  );

  bundle.vocations.forEach((vocation, index) => {
    if (!familyKeys.has(vocation.familyKey)) {
      context.addIssue({
        code: 'custom',
        path: ['vocations', index, 'familyKey'],
        message: `Unknown vocation family ${vocation.familyKey}`,
      });
    }
  });

  bundle.spells.forEach((spell, index) => {
    spell.allowedVocationFamilies.forEach((familyKey, familyIndex) => {
      if (!familyKeys.has(familyKey)) {
        context.addIssue({
          code: 'custom',
          path: ['spells', index, 'allowedVocationFamilies', familyIndex],
          message: `Unknown vocation family ${familyKey}`,
        });
      }
    });
  });

  bundle.creatures.forEach((creature, creatureIndex) => {
    creature.summons.forEach((summon, summonIndex) => {
      if (!creatureKeys.has(summon.creatureKey)) {
        context.addIssue({
          code: 'custom',
          path: [
            'creatures',
            creatureIndex,
            'summons',
            summonIndex,
            'creatureKey',
          ],
          message: `Unknown summoned creature ${summon.creatureKey}`,
        });
      }
    });
    creature.loot.forEach((loot, lootIndex) => {
      if (!itemKeys.has(loot.itemKey)) {
        context.addIssue({
          code: 'custom',
          path: ['creatures', creatureIndex, 'loot', lootIndex, 'itemKey'],
          message: `Unknown loot item ${loot.itemKey}`,
        });
      }
    });
  });

  bundle.characters.forEach((character, index) => {
    const vocation = vocationByKey.get(character.vocationKey);
    if (vocation === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['characters', index, 'vocationKey'],
        message: `Unknown vocation ${character.vocationKey}`,
      });
    }
    if (!itemKeys.has(character.weaponItemKey)) {
      context.addIssue({
        code: 'custom',
        path: ['characters', index, 'weaponItemKey'],
        message: `Unknown weapon item ${character.weaponItemKey}`,
      });
    }
    character.spellKeys.forEach((spellKey, spellIndex) => {
      const spell = spellByKey.get(spellKey);
      if (spell === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['characters', index, 'spellKeys', spellIndex],
          message: `Unknown spell ${spellKey}`,
        });
        return;
      }
      if (
        vocation !== undefined &&
        !spell.allowedVocationFamilies.includes(vocation.familyKey)
      ) {
        context.addIssue({
          code: 'custom',
          path: ['characters', index, 'spellKeys', spellIndex],
          message: `Spell ${spellKey} does not allow vocation family ${vocation.familyKey}`,
        });
      }
    });
  });
}

export const CatalogContentBundleSchema = CatalogBundleBaseSchema.extend({
  vocations: z.array(CatalogVocationDefinitionSchema).readonly(),
  creatures: z.array(CatalogCreatureDefinitionSchema).readonly(),
  items: z.array(CatalogItemDefinitionSchema).readonly(),
  spells: z.array(CatalogSpellDefinitionSchema).readonly(),
  characters: z.array(CharacterDefinitionSchema).readonly(),
})
  .strict()
  .superRefine(addReferenceIssues);
export type CatalogContentBundle = z.infer<typeof CatalogContentBundleSchema>;

export const RuntimeContentBundleSchema = RuntimeBundleBaseSchema.extend({
  vocations: z.array(VocationDefinitionSchema).readonly(),
  creatures: z.array(CreatureDefinitionSchema).readonly(),
  items: z.array(ItemDefinitionSchema).readonly(),
  spells: z.array(SpellDefinitionSchema).readonly(),
  characters: z.array(CharacterDefinitionSchema).readonly(),
})
  .strict()
  .superRefine(addReferenceIssues);
export type RuntimeContentBundle = z.infer<typeof RuntimeContentBundleSchema>;
