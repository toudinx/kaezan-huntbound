import { dirname, isAbsolute, relative, resolve } from 'node:path';

import {
  type AssetBuildProfile,
  type AssetDiagnostic,
  type AssetPackCatalog,
  type AssetValidationResult,
  validateAssetPackCatalog,
  validateAssetPackManifest,
} from '../../../packages/assets/src/index.ts';

import { verifyMaterializedAssetPack } from '../pack/verifyMaterializedAssetPack.ts';
import {
  isProfilePathWithin,
  prefixProfileDiagnostics,
  profileDiagnostic,
  readProfileJson,
  resolveProfileFile,
  resolveProfileRoot,
  sortProfileDiagnostics,
} from './profileSupport.ts';
import type {
  ProfilePolicyPack,
  ValidatedAssetProfile,
  ValidatedProfilePack,
} from './types.ts';

function profilePolicyDiagnostics(
  profile: AssetBuildProfile,
  packs: readonly ProfilePolicyPack[],
): readonly AssetDiagnostic[] {
  const diagnostics: AssetDiagnostic[] = [];
  packs.forEach((pack, packIndex) => {
    pack.manifest.groups.forEach((group, groupIndex) => {
      const groupPath = [
        'packs',
        packIndex,
        'manifest',
        'groups',
        groupIndex,
      ] as const;
      if (!group.buildProfiles.includes(profile)) {
        diagnostics.push(
          profileDiagnostic(
            'ASSET_PROFILE_FORBIDDEN',
            [...groupPath, 'buildProfiles'],
            'Asset group ' +
              group.groupId +
              ' does not allow profile ' +
              profile,
          ),
        );
      }
      if (profile === 'product' && group.licenseClass === 'cipsoft-personal') {
        diagnostics.push(
          profileDiagnostic(
            'ASSET_LICENSE_FORBIDDEN',
            [...groupPath, 'licenseClass'],
            'License cipsoft-personal is forbidden for product assets',
          ),
        );
      }
    });
  });
  return diagnostics;
}

export function validateAssetProfilePolicies(input: {
  readonly profile: AssetBuildProfile;
  readonly catalog: AssetPackCatalog;
  readonly packs: readonly ProfilePolicyPack[];
}): readonly AssetDiagnostic[] {
  const diagnostics = [...profilePolicyDiagnostics(input.profile, input.packs)];
  const packsById = new Map(
    input.packs.map((pack) => [pack.reference.packId, pack]),
  );

  input.catalog.preloads.forEach((preload, preloadIndex) => {
    const pack = packsById.get(preload.packId);
    if (pack === undefined) return;
    const keys = new Set(pack.manifest.entries.map((entry) => entry.key));
    preload.requiredKeys.forEach((key, keyIndex) => {
      if (keys.has(key)) return;
      diagnostics.push(
        profileDiagnostic(
          'ASSET_REFERENCE_MISSING',
          ['preloads', preloadIndex, 'requiredKeys', keyIndex],
          `Preload key ${key} is missing from pack ${preload.packId}`,
        ),
      );
    });
  });

  return sortProfileDiagnostics(diagnostics);
}

function prefixPackDiagnostics(
  packIndex: number,
  diagnostics: readonly AssetDiagnostic[],
): readonly AssetDiagnostic[] {
  return prefixProfileDiagnostics(
    ['packs', packIndex, 'manifest'],
    diagnostics,
  );
}

async function validateCatalog(
  profileRoot: string,
  catalogPath: string,
  requestedProfile: AssetBuildProfile,
): Promise<
  | {
      readonly ok: true;
      readonly catalog: AssetPackCatalog;
      readonly catalogPath: string;
    }
  | { readonly ok: false; readonly diagnostics: readonly AssetDiagnostic[] }
> {
  const requestedPath = isAbsolute(catalogPath)
    ? resolve(catalogPath)
    : resolve(profileRoot, ...catalogPath.split('/'));
  if (!isProfilePathWithin(profileRoot, requestedPath)) {
    return {
      ok: false,
      diagnostics: [
        profileDiagnostic(
          'ASSET_PATH_UNSAFE',
          ['catalog'],
          'Catalog path resolves outside the profile root',
        ),
      ],
    };
  }
  const requestedRelativePath = relative(profileRoot, requestedPath).replaceAll(
    '\\',
    '/',
  );
  const catalogFile = await resolveProfileFile(
    profileRoot,
    requestedRelativePath,
    ['catalog'],
  );
  if (!catalogFile.ok) return catalogFile;

  const rawCatalog = await readProfileJson(catalogFile.path, ['catalog']);
  if (!rawCatalog.ok) return rawCatalog;
  const validated = validateAssetPackCatalog(rawCatalog.value);
  if (!validated.ok) {
    return {
      ok: false,
      diagnostics: prefixProfileDiagnostics(['catalog'], validated.diagnostics),
    };
  }
  const diagnostics: AssetDiagnostic[] = [];
  if (validated.value.profile !== requestedProfile) {
    diagnostics.push(
      profileDiagnostic(
        'ASSET_CATALOG_PROFILE_MISMATCH',
        ['catalog', 'profile'],
        'Catalog profile ' +
          validated.value.profile +
          ' does not match requested profile ' +
          requestedProfile,
      ),
    );
  }
  return diagnostics.length > 0
    ? { ok: false, diagnostics }
    : {
        ok: true,
        catalog: validated.value,
        catalogPath: catalogFile.path,
      };
}

export async function validateAssetProfileTree(input: {
  readonly profile: AssetBuildProfile;
  readonly profileRoot: string;
  readonly catalogPath: string;
}): Promise<AssetValidationResult<ValidatedAssetProfile>> {
  const resolvedRoot = await resolveProfileRoot(input.profileRoot);
  if (!resolvedRoot.ok) return resolvedRoot;

  const validatedCatalog = await validateCatalog(
    resolvedRoot.path,
    input.catalogPath,
    input.profile,
  );
  if (!validatedCatalog.ok) {
    return {
      ok: false,
      diagnostics: sortProfileDiagnostics(validatedCatalog.diagnostics),
    };
  }

  const diagnostics: AssetDiagnostic[] = [];
  const packs: ValidatedProfilePack[] = [];
  const policyPacks: ProfilePolicyPack[] = [];
  for (const [
    packIndex,
    reference,
  ] of validatedCatalog.catalog.packs.entries()) {
    const manifestFile = await resolveProfileFile(
      resolvedRoot.path,
      reference.manifestPath,
      ['packs', packIndex, 'manifestPath'],
    );
    if (!manifestFile.ok) {
      diagnostics.push(...manifestFile.diagnostics);
      continue;
    }
    const verified = await verifyMaterializedAssetPack({
      packRoot: dirname(manifestFile.path),
    });
    if (!verified.ok) {
      diagnostics.push(
        ...prefixPackDiagnostics(packIndex, verified.diagnostics),
      );
      const rawManifest = await readProfileJson(manifestFile.path, [
        'packs',
        packIndex,
        'pack.json',
      ]);
      if (rawManifest.ok) {
        const parsedManifest = validateAssetPackManifest(rawManifest.value);
        if (parsedManifest.ok) {
          policyPacks.push({
            reference,
            manifest: parsedManifest.value,
          });
        } else {
          diagnostics.push(
            ...prefixPackDiagnostics(packIndex, parsedManifest.diagnostics),
          );
        }
      }
      continue;
    }
    if (verified.value.packId !== reference.packId) {
      diagnostics.push(
        profileDiagnostic(
          'ASSET_PACK_CONFLICT',
          ['packs', packIndex, 'packId'],
          'Catalog pack ' +
            reference.packId +
            ' does not match manifest pack ' +
            verified.value.packId,
        ),
      );
      continue;
    }
    const validatedPack = {
      packRoot: dirname(manifestFile.path),
      reference,
      verified: verified.value,
      manifest: verified.value.manifest,
    } satisfies ValidatedProfilePack;
    packs.push(validatedPack);
    policyPacks.push(validatedPack);
  }

  diagnostics.push(
    ...validateAssetProfilePolicies({
      profile: input.profile,
      catalog: validatedCatalog.catalog,
      packs: policyPacks,
    }),
  );
  if (diagnostics.length > 0) {
    return {
      ok: false,
      diagnostics: sortProfileDiagnostics(diagnostics),
    };
  }

  return {
    ok: true,
    value: {
      profile: input.profile,
      profileRoot: resolvedRoot.path,
      catalogPath: validatedCatalog.catalogPath,
      catalog: validatedCatalog.catalog,
      packs,
    },
  };
}
