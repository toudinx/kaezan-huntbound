import { z } from 'zod';
import type { AssetDiagnosticCode } from './diagnostics.ts';
import {
  type AssetKey,
  AssetKeySchema,
  type ClientId,
  ClientIdSchema,
  type EffectId,
  EffectIdSchema,
  type LookTypeId,
  LookTypeIdSchema,
  type MissileId,
  MissileIdSchema,
} from './identity.ts';

const schemaVersion = z.literal('1');
const nonEmptyString = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0, {
    message: 'Value must not be empty or whitespace',
  });
const finiteNumber = z.number().finite();
const positiveInteger = z.number().finite().int().positive();
const nonNegativeInteger = z.number().finite().int().nonnegative();
const sha256 = z.string().regex(/^[0-9a-f]{64}$/, {
  message: 'SHA-256 must be 64 lowercase hexadecimal characters',
});

function isSafeRelativePath(value: string): boolean {
  return (
    value.length > 0 &&
    value !== '.' &&
    !value.includes('\\') &&
    !value.startsWith('/') &&
    !/^[a-zA-Z]:/.test(value) &&
    !/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value) &&
    !value.split('/').some((segment) => segment === '..') &&
    !value.includes('//') &&
    !value.endsWith('/')
  );
}

const safeRelativePath = z.string().refine(isSafeRelativePath, {
  message: 'Path must be a relative POSIX path without traversal or a scheme',
  params: { assetCode: 'ASSET_PATH_UNSAFE' satisfies AssetDiagnosticCode },
});

const uniqueReadonlyArray = <T extends z.ZodType>(schema: T) =>
  z
    .array(schema)
    .refine((values) => new Set(values).size === values.length, {
      message: 'Array values must be unique',
    })
    .readonly();

const nonEmptyUniqueReadonlyArray = <T extends z.ZodType>(schema: T) =>
  z
    .array(schema)
    .min(1)
    .refine((values) => new Set(values).size === values.length, {
      message: 'Array values must be unique',
    })
    .readonly();

export const AssetBuildProfileSchema = z.enum(['personal', 'product', 'test']);
export type AssetBuildProfile = z.infer<typeof AssetBuildProfileSchema>;

export const AssetLicenseClassSchema = z.enum([
  'cipsoft-personal',
  'huntbound-owned',
  'huntbound-test',
]);
export type AssetLicenseClass = z.infer<typeof AssetLicenseClassSchema>;

export const AssetCategorySchema = z.enum([
  'outfit',
  'creature',
  'object',
  'effect',
  'missile',
]);
export type AssetCategory = z.infer<typeof AssetCategorySchema>;

const LookTypeIdentitySchema = z
  .object({ kind: z.literal('lookType'), id: LookTypeIdSchema })
  .strict();
const ClientIdIdentitySchema = z
  .object({ kind: z.literal('clientId'), id: ClientIdSchema })
  .strict();
const EffectIdIdentitySchema = z
  .object({ kind: z.literal('effectId'), id: EffectIdSchema })
  .strict();
const MissileIdIdentitySchema = z
  .object({ kind: z.literal('missileId'), id: MissileIdSchema })
  .strict();

export const AssetSourceIdentitySchema = z.discriminatedUnion('kind', [
  LookTypeIdentitySchema,
  ClientIdIdentitySchema,
  EffectIdIdentitySchema,
  MissileIdIdentitySchema,
]);
export type AssetSourceIdentity = z.infer<typeof AssetSourceIdentitySchema>;

export const AssetPresentationSchema = z
  .object({
    pivot: z.object({ x: finiteNumber, y: finiteNumber }).strict(),
    scale: finiteNumber.positive(),
    filtering: z.enum(['nearest', 'linear']),
  })
  .strict();
export type AssetPresentation = z.infer<typeof AssetPresentationSchema>;

export const AssetSourceGroupSchema = z
  .object({
    groupId: nonEmptyString,
    source: nonEmptyString,
    sourceSnapshot: nonEmptyString,
    licenseClass: AssetLicenseClassSchema,
    buildProfiles: nonEmptyUniqueReadonlyArray(AssetBuildProfileSchema),
  })
  .strict()
  .superRefine((group, context) => {
    if (
      group.licenseClass === 'cipsoft-personal' &&
      group.buildProfiles.includes('product')
    ) {
      addAssetIssue(
        context,
        'ASSET_LICENSE_FORBIDDEN',
        ['licenseClass'],
        `License ${group.licenseClass} is forbidden for product assets`,
      );
    }
  });
export type AssetSourceGroup = z.infer<typeof AssetSourceGroupSchema>;

export const AssetSelectionEntrySchema = z
  .object({
    key: AssetKeySchema,
    category: AssetCategorySchema,
    sourceIdentity: AssetSourceIdentitySchema,
    sourceGroupId: nonEmptyString,
    consumer: nonEmptyString,
    rationale: nonEmptyString,
    presentation: AssetPresentationSchema,
  })
  .strict();
export type AssetSelectionEntry = z.infer<typeof AssetSelectionEntrySchema>;

export const AssetMediaReferenceSchema = z
  .object({
    path: safeRelativePath,
    sha256,
    byteLength: nonNegativeInteger,
    mimeType: z.literal('image/png'),
  })
  .strict();
export type AssetMediaReference = z.infer<typeof AssetMediaReferenceSchema>;

const phaseDurationSchema = z
  .tuple([nonNegativeInteger, nonNegativeInteger])
  .refine(([minMs, maxMs]) => minMs <= maxMs, {
    message: 'Animation duration minimum must not exceed its maximum',
    params: {
      assetCode: 'ASSET_ANIMATION_INVALID' satisfies AssetDiagnosticCode,
    },
  })
  .readonly();

export const AssetAnimationGroupSchema = z
  .object({
    kind: nonEmptyString,
    patternX: nonNegativeInteger,
    patternY: nonNegativeInteger,
    patternZ: nonNegativeInteger,
    layers: positiveInteger,
    startFrame: nonNegativeInteger,
    frameCount: positiveInteger,
    phaseDurationsMs: z.array(phaseDurationSchema).readonly(),
  })
  .strict();
export type AssetAnimationGroup = z.infer<typeof AssetAnimationGroupSchema>;

export const AssetPackEntrySchema = z
  .object({
    key: AssetKeySchema,
    category: AssetCategorySchema,
    sourceIdentity: AssetSourceIdentitySchema,
    sourceGroupId: nonEmptyString,
    media: AssetMediaReferenceSchema,
    cellWidth: positiveInteger,
    cellHeight: positiveInteger,
    columns: positiveInteger,
    atlasFrameCount: positiveInteger,
    animations: z.array(AssetAnimationGroupSchema).min(1).readonly(),
    pivot: z.object({ x: finiteNumber, y: finiteNumber }).strict(),
    scale: finiteNumber.positive(),
    filtering: z.enum(['nearest', 'linear']),
  })
  .strict();
export type AssetPackEntry = z.infer<typeof AssetPackEntrySchema>;

const AssetSelectionManifestBaseSchema = z
  .object({
    schemaVersion,
    selectionId: nonEmptyString,
    packId: nonEmptyString,
    contentVersion: nonEmptyString,
    buildProfiles: nonEmptyUniqueReadonlyArray(AssetBuildProfileSchema),
    groups: z.array(AssetSourceGroupSchema).min(1).readonly(),
    entries: z.array(AssetSelectionEntrySchema).min(1).readonly(),
  })
  .strict();

const AssetSourceManifestReferenceSchema = z
  .object({
    path: safeRelativePath,
    sha256,
    byteLength: nonNegativeInteger,
  })
  .strict();
export type AssetSourceManifestReference = z.infer<
  typeof AssetSourceManifestReferenceSchema
>;

export const AssetSourceLockEntrySchema = z
  .object({
    key: AssetKeySchema,
    category: AssetCategorySchema,
    sourceIdentity: AssetSourceIdentitySchema,
    path: safeRelativePath,
    sha256,
    byteLength: nonNegativeInteger,
  })
  .strict();
export type AssetSourceLockEntry = z.infer<typeof AssetSourceLockEntrySchema>;

const AssetSourceLockBaseSchema = z
  .object({
    schemaVersion,
    source: nonEmptyString,
    sourceSnapshot: nonEmptyString,
    manifest: AssetSourceManifestReferenceSchema,
    files: z.array(AssetSourceLockEntrySchema).min(1).readonly(),
  })
  .strict();

const AssetPackManifestBaseSchema = z
  .object({
    schemaVersion,
    packId: nonEmptyString,
    contentVersion: nonEmptyString,
    groups: z.array(AssetSourceGroupSchema).min(1).readonly(),
    entries: z.array(AssetPackEntrySchema).min(1).readonly(),
  })
  .strict();

export const AssetPackReferenceSchema = z
  .object({
    packId: nonEmptyString,
    manifestPath: safeRelativePath,
  })
  .strict();
export type AssetPackReference = z.infer<typeof AssetPackReferenceSchema>;

export const AssetPackPreloadSchema = z
  .object({
    packId: nonEmptyString,
    requiredKeys: uniqueReadonlyArray(AssetKeySchema),
  })
  .strict();
export type AssetPackPreload = z.infer<typeof AssetPackPreloadSchema>;

const AssetPackCatalogBaseSchema = z
  .object({
    schemaVersion,
    profile: AssetBuildProfileSchema,
    packs: z.array(AssetPackReferenceSchema).min(1).readonly(),
    preloads: z.array(AssetPackPreloadSchema).readonly(),
  })
  .strict();

function addAssetIssue(
  context: z.RefinementCtx,
  code: AssetDiagnosticCode,
  path: readonly (string | number)[],
  message: string,
  options: {
    readonly key?: AssetKey | undefined;
    readonly packId?: string | undefined;
  } = {},
) {
  context.addIssue({
    code: 'custom',
    path: [...path],
    message,
    params: {
      assetCode: code,
      ...(options.key === undefined ? {} : { assetKey: options.key }),
      ...(options.packId === undefined ? {} : { packId: options.packId }),
    },
  });
}

function categoryMatchesIdentity(
  identity: AssetSourceIdentity,
  category: AssetCategory,
): boolean {
  switch (identity.kind) {
    case 'lookType':
      return category === 'outfit' || category === 'creature';
    case 'clientId':
      return category === 'object';
    case 'effectId':
      return category === 'effect';
    case 'missileId':
      return category === 'missile';
  }
}

function keyMatchesCategory(key: AssetKey, category: AssetCategory): boolean {
  const keyKind = key.split(':', 1)[0];
  return (keyKind === 'item' ? 'object' : keyKind) === category;
}

interface IdentityEntry {
  readonly key: AssetKey;
  readonly category: AssetCategory;
  readonly sourceIdentity: AssetSourceIdentity;
  readonly sourceGroupId?: string;
}

function validateIdentityEntries(
  entries: readonly IdentityEntry[],
  context: z.RefinementCtx,
  path: readonly (string | number)[],
  groupIds?: ReadonlySet<string>,
  packId?: string,
) {
  const keyIndexes = new Map<string, number>();
  const identityIndexes = new Map<string, number>();

  entries.forEach((entry, index) => {
    const entryPath = [...path, index];
    const keyIndex = keyIndexes.get(entry.key);
    if (keyIndex !== undefined) {
      addAssetIssue(
        context,
        'ASSET_KEY_DUPLICATE',
        [...entryPath, 'key'],
        `Asset key ${entry.key} duplicates entry ${keyIndex}`,
        { key: entry.key, packId },
      );
    } else {
      keyIndexes.set(entry.key, index);
    }

    const identityKey = `${entry.sourceIdentity.kind}:${entry.sourceIdentity.id}`;
    const identityIndex = identityIndexes.get(identityKey);
    if (identityIndex !== undefined) {
      addAssetIssue(
        context,
        'ASSET_ID_DUPLICATE',
        [...entryPath, 'sourceIdentity', 'id'],
        `Source identity ${identityKey} duplicates entry ${identityIndex}`,
        { key: entry.key, packId },
      );
    } else {
      identityIndexes.set(identityKey, index);
    }

    if (
      !categoryMatchesIdentity(entry.sourceIdentity, entry.category) ||
      !keyMatchesCategory(entry.key, entry.category)
    ) {
      addAssetIssue(
        context,
        'ASSET_CATEGORY_MISMATCH',
        [...entryPath, 'category'],
        `Category ${entry.category} is incompatible with ${entry.sourceIdentity.kind} and ${entry.key}`,
        { key: entry.key, packId },
      );
    }

    if (
      groupIds !== undefined &&
      (entry.sourceGroupId === undefined || !groupIds.has(entry.sourceGroupId))
    ) {
      addAssetIssue(
        context,
        'ASSET_REFERENCE_MISSING',
        [...entryPath, 'sourceGroupId'],
        `Unknown asset source group ${entry.sourceGroupId ?? ''}`,
        { key: entry.key, packId },
      );
    }
  });
}

function validateGroups(
  groups: readonly AssetSourceGroup[],
  context: z.RefinementCtx,
  options: {
    readonly rootProfiles?: readonly AssetBuildProfile[];
    readonly path: readonly (string | number)[];
  },
): ReadonlySet<string> {
  const groupIds = new Set<string>();
  groups.forEach((group, index) => {
    const groupPath = [...options.path, index];
    if (groupIds.has(group.groupId)) {
      addAssetIssue(
        context,
        'ASSET_PACK_CONFLICT',
        [...groupPath, 'groupId'],
        `Asset source group ${group.groupId} is duplicated`,
      );
    }
    groupIds.add(group.groupId);

    if (
      group.licenseClass === 'cipsoft-personal' &&
      options.rootProfiles?.includes('product') === true
    ) {
      addAssetIssue(
        context,
        'ASSET_LICENSE_FORBIDDEN',
        [...groupPath, 'licenseClass'],
        `License ${group.licenseClass} is forbidden for product assets`,
      );
    }
  });
  return groupIds;
}

function validatePackEntryDetails(
  entries: readonly AssetPackEntry[],
  context: z.RefinementCtx,
) {
  entries.forEach((entry, entryIndex) => {
    const entryPath = ['entries', entryIndex] as const;
    if (entry.media.path !== `media/${entry.media.sha256}.png`) {
      addAssetIssue(
        context,
        'ASSET_MEDIA_HASH_MISMATCH',
        [...entryPath, 'media', 'path'],
        'Media path must be media/<sha256>.png',
        { key: entry.key },
      );
    }

    entry.animations.forEach((animation, animationIndex) => {
      const animationPath = [...entryPath, 'animations', animationIndex];
      const patternAndLayerCount =
        Math.max(animation.patternX, 1) *
        Math.max(animation.patternY, 1) *
        Math.max(animation.patternZ, 1) *
        animation.layers;
      const expectedFrameCount =
        patternAndLayerCount * Math.max(animation.phaseDurationsMs.length, 1);
      if (
        animation.startFrame + animation.frameCount > entry.atlasFrameCount ||
        animation.frameCount !== expectedFrameCount
      ) {
        addAssetIssue(
          context,
          'ASSET_ANIMATION_INVALID',
          animationPath,
          'Animation frame count must match patterns, layers, source phases, and the atlas',
          { key: entry.key },
        );
      }
    });
  });
}

function validateSelectionManifest(
  manifest: z.infer<typeof AssetSelectionManifestBaseSchema>,
  context: z.RefinementCtx,
) {
  const groupIds = validateGroups(manifest.groups, context, {
    path: ['groups'],
    rootProfiles: manifest.buildProfiles,
  });
  validateIdentityEntries(manifest.entries, context, ['entries'], groupIds);
}

function validateSourceLock(
  lock: z.infer<typeof AssetSourceLockBaseSchema>,
  context: z.RefinementCtx,
) {
  validateIdentityEntries(lock.files, context, ['files']);
}

function validatePackManifest(
  manifest: z.infer<typeof AssetPackManifestBaseSchema>,
  context: z.RefinementCtx,
) {
  const groupIds = validateGroups(manifest.groups, context, {
    path: ['groups'],
  });
  validateIdentityEntries(
    manifest.entries,
    context,
    ['entries'],
    groupIds,
    manifest.packId,
  );
  validatePackEntryDetails(manifest.entries, context);
}

function validatePackCatalog(
  catalog: z.infer<typeof AssetPackCatalogBaseSchema>,
  context: z.RefinementCtx,
) {
  const packIds = new Set<string>();
  catalog.packs.forEach((pack, index) => {
    if (packIds.has(pack.packId)) {
      addAssetIssue(
        context,
        'ASSET_PACK_CONFLICT',
        ['packs', index, 'packId'],
        `Pack ${pack.packId} is duplicated`,
        { packId: pack.packId },
      );
    }
    packIds.add(pack.packId);
  });

  catalog.preloads.forEach((preload, preloadIndex) => {
    if (!packIds.has(preload.packId)) {
      addAssetIssue(
        context,
        'ASSET_REFERENCE_MISSING',
        ['preloads', preloadIndex, 'packId'],
        `Preload references unknown pack ${preload.packId}`,
        { packId: preload.packId },
      );
    }

    const keyIndexes = new Map<string, number>();
    preload.requiredKeys.forEach((key, keyIndex) => {
      const previousIndex = keyIndexes.get(key);
      if (previousIndex !== undefined) {
        addAssetIssue(
          context,
          'ASSET_KEY_DUPLICATE',
          ['preloads', preloadIndex, 'requiredKeys', keyIndex],
          `Preload key ${key} duplicates entry ${previousIndex}`,
          { key, packId: preload.packId },
        );
      } else {
        keyIndexes.set(key, keyIndex);
      }
    });
  });
}

export const AssetSelectionManifestSchema =
  AssetSelectionManifestBaseSchema.superRefine(validateSelectionManifest);
export type AssetSelectionManifest = z.infer<
  typeof AssetSelectionManifestSchema
>;

export const AssetSourceLockSchema =
  AssetSourceLockBaseSchema.superRefine(validateSourceLock);
export type AssetSourceLock = z.infer<typeof AssetSourceLockSchema>;

export const AssetPackManifestSchema =
  AssetPackManifestBaseSchema.superRefine(validatePackManifest);
export type AssetPackManifest = z.infer<typeof AssetPackManifestSchema>;

export const AssetPackCatalogSchema =
  AssetPackCatalogBaseSchema.superRefine(validatePackCatalog);
export type AssetPackCatalog = z.infer<typeof AssetPackCatalogSchema>;

export type AssetIdentityId = LookTypeId | ClientId | EffectId | MissileId;
