import {
  lstat,
  mkdir,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, parse, relative, resolve } from 'node:path';

import {
  type AssetBuildProfile,
  type AssetDiagnostic,
  validateAssetPackCatalog,
} from '../../../packages/assets/src/index.ts';

import { canonicalAssetJson } from '../application/buildAssetPack.ts';
import { assetDiagnostic, errorMessage } from '../pack/assetPackSupport.ts';
import {
  isProfilePathWithin,
  profileDiagnostic,
  readProfileJson,
  resolveProfileRoot,
  sortProfileDiagnostics,
} from './profileSupport.ts';
import type { StagedAssetProfile } from './types.ts';
import {
  validateAssetProfilePolicies,
  validateAssetProfileTree,
} from './validateAssetProfileTree.ts';

async function copyProfileTree(
  source: string,
  destination: string,
): Promise<void> {
  const sourceStat = await lstat(source);
  if (sourceStat.isSymbolicLink()) {
    throw new Error('Profile staging does not copy symbolic links');
  }
  if (sourceStat.isDirectory()) {
    await mkdir(destination, { recursive: true });
    const entries = (await readdir(source, { withFileTypes: true })).sort(
      (left, right) => left.name.localeCompare(right.name),
    );
    for (const entry of entries) {
      await copyProfileTree(
        resolve(source, entry.name),
        resolve(destination, entry.name),
      );
    }
    return;
  }
  if (!sourceStat.isFile()) {
    throw new Error('Profile staging requires regular files');
  }
  await writeFile(destination, await readFile(source));
}

async function cleanupPath(path: string): Promise<AssetDiagnostic | undefined> {
  try {
    await rm(path, { recursive: true, force: true });
    return undefined;
  } catch (error) {
    return assetDiagnostic(
      'ASSET_PACK_CONFLICT',
      ['staging'],
      `Profile staging cleanup failed: ${errorMessage(error)}`,
    );
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch {
    return false;
  }
}

async function prepareTransactionPaths(destinationInput: string): Promise<
  | {
      readonly parent: string;
      readonly destination: string;
      readonly staging: string;
      readonly backup: string;
      readonly hadDestination: boolean;
    }
  | { readonly diagnostics: readonly AssetDiagnostic[] }
> {
  const destinationInputPath = resolve(destinationInput);
  if (
    destinationInputPath === parse(destinationInputPath).root ||
    parse(destinationInputPath).base.length === 0
  ) {
    return {
      diagnostics: [
        profileDiagnostic(
          'ASSET_PATH_UNSAFE',
          ['destination'],
          'Profile destination cannot be a filesystem root',
        ),
      ],
    };
  }

  const parentInput = dirname(destinationInputPath);
  try {
    await mkdir(parentInput, { recursive: true });
    const parent = await realpath(parentInput);
    const destination = resolve(parent, parse(destinationInputPath).base);
    const safeName = parse(destination).base.replaceAll(
      /[^a-zA-Z0-9._-]/g,
      '-',
    );
    const staging = resolve(
      parent,
      `.staging-profile-${safeName}-${process.pid}`,
    );
    const backup = resolve(
      parent,
      `.backup-profile-${safeName}-${process.pid}`,
    );

    for (const [name, path] of [
      ['destination', destination],
      ['staging', staging],
      ['backup', backup],
    ] as const) {
      if (!isProfilePathWithin(parent, path) || dirname(path) !== parent) {
        return {
          diagnostics: [
            profileDiagnostic(
              'ASSET_PATH_UNSAFE',
              [name],
              'Profile transaction paths must be direct children of one parent',
            ),
          ],
        };
      }
      if (!(await pathExists(path))) continue;
      const stats = await lstat(path);
      if (stats.isSymbolicLink()) {
        return {
          diagnostics: [
            profileDiagnostic(
              'ASSET_PATH_UNSAFE',
              [name],
              'Profile transaction paths cannot be symbolic links',
            ),
          ],
        };
      }
      if (name !== 'destination' && !stats.isDirectory()) {
        return {
          diagnostics: [
            profileDiagnostic(
              'ASSET_PATH_UNSAFE',
              [name],
              'Profile transaction sibling must be a directory',
            ),
          ],
        };
      }
      if (name === 'destination' && !stats.isDirectory()) {
        return {
          diagnostics: [
            profileDiagnostic(
              'ASSET_PATH_UNSAFE',
              [name],
              'Existing profile destination must be a directory',
            ),
          ],
        };
      }
      const resolved = await realpath(path);
      if (
        !isProfilePathWithin(parent, resolved) ||
        dirname(resolved) !== parent
      ) {
        return {
          diagnostics: [
            profileDiagnostic(
              'ASSET_PATH_UNSAFE',
              [name],
              'Profile transaction path resolves outside its parent',
            ),
          ],
        };
      }
    }

    if ((await pathExists(staging)) || (await pathExists(backup))) {
      return {
        diagnostics: [
          profileDiagnostic(
            'ASSET_PACK_CONFLICT',
            ['destination'],
            'A profile staging or backup sibling already exists',
          ),
        ],
      };
    }
    return {
      parent,
      destination,
      staging,
      backup,
      hadDestination: await pathExists(destination),
    };
  } catch (error) {
    return {
      diagnostics: [
        profileDiagnostic(
          'ASSET_PATH_UNSAFE',
          ['destination'],
          `Profile destination cannot be prepared: ${errorMessage(error)}`,
        ),
      ],
    };
  }
}

async function readDeclaredProfile(
  sourceProfileRoot: string,
): Promise<
  | { readonly ok: true; readonly profile: AssetBuildProfile }
  | { readonly ok: false; readonly diagnostics: readonly AssetDiagnostic[] }
> {
  const resolvedRoot = await resolveProfileRoot(sourceProfileRoot);
  if (!resolvedRoot.ok) return resolvedRoot;
  const catalogPath = resolve(resolvedRoot.path, 'catalog.json');
  const rawCatalog = await readProfileJson(catalogPath, ['catalog']);
  if (!rawCatalog.ok) return rawCatalog;
  const catalog = validateAssetPackCatalog(rawCatalog.value);
  if (!catalog.ok) return catalog;
  return { ok: true, profile: catalog.value.profile };
}

export async function stageAssetProfile(input: {
  readonly profile: AssetBuildProfile;
  readonly sourceProfileRoot: string;
  readonly destinationProfileRoot: string;
}): Promise<
  | { readonly ok: true; readonly value: StagedAssetProfile }
  | { readonly ok: false; readonly diagnostics: readonly AssetDiagnostic[] }
> {
  const declaredProfile = await readDeclaredProfile(input.sourceProfileRoot);
  if (!declaredProfile.ok) {
    return {
      ok: false,
      diagnostics: sortProfileDiagnostics(declaredProfile.diagnostics),
    };
  }

  const sourceValidation = await validateAssetProfileTree({
    profile: declaredProfile.profile,
    profileRoot: input.sourceProfileRoot,
    catalogPath: resolve(input.sourceProfileRoot, 'catalog.json'),
  });
  if (!sourceValidation.ok) {
    return {
      ok: false,
      diagnostics: sortProfileDiagnostics(sourceValidation.diagnostics),
    };
  }

  const targetPolicy = validateAssetProfilePolicies({
    profile: input.profile,
    catalog: sourceValidation.value.catalog,
    packs: sourceValidation.value.packs,
  });
  if (targetPolicy.length > 0) {
    return { ok: false, diagnostics: targetPolicy };
  }

  const targetCatalog = validateAssetPackCatalog({
    ...sourceValidation.value.catalog,
    profile: input.profile,
  });
  if (!targetCatalog.ok) {
    return { ok: false, diagnostics: targetCatalog.diagnostics };
  }

  const transaction = await prepareTransactionPaths(
    input.destinationProfileRoot,
  );
  if ('diagnostics' in transaction) {
    return {
      ok: false,
      diagnostics: sortProfileDiagnostics(transaction.diagnostics),
    };
  }

  try {
    await mkdir(transaction.staging, { recursive: true });
    for (const pack of sourceValidation.value.packs) {
      const relativePackRoot = relative(
        sourceValidation.value.profileRoot,
        pack.packRoot,
      );
      if (
        !isProfilePathWithin(sourceValidation.value.profileRoot, pack.packRoot)
      ) {
        throw new Error('Pack root resolves outside source profile root');
      }
      await copyProfileTree(
        pack.packRoot,
        resolve(transaction.staging, relativePackRoot),
      );
    }
    await writeFile(
      resolve(transaction.staging, 'catalog.json'),
      canonicalAssetJson(targetCatalog.value),
    );

    const stagedValidation = await validateAssetProfileTree({
      profile: input.profile,
      profileRoot: transaction.staging,
      catalogPath: resolve(transaction.staging, 'catalog.json'),
    });
    if (!stagedValidation.ok) {
      const cleanupDiagnostic = await cleanupPath(transaction.staging);
      return {
        ok: false,
        diagnostics: sortProfileDiagnostics([
          ...stagedValidation.diagnostics,
          ...(cleanupDiagnostic === undefined ? [] : [cleanupDiagnostic]),
        ]),
      };
    }

    if (transaction.hadDestination) {
      await rename(transaction.destination, transaction.backup);
    }
    try {
      await rename(transaction.staging, transaction.destination);
    } catch (error) {
      if (transaction.hadDestination) {
        await rename(transaction.backup, transaction.destination);
      }
      throw error;
    }
    if (transaction.hadDestination) {
      const backupCleanup = await cleanupPath(transaction.backup);
      if (backupCleanup !== undefined) {
        return { ok: false, diagnostics: [backupCleanup] };
      }
    }
  } catch (error) {
    const cleanupDiagnostic = await cleanupPath(transaction.staging);
    return {
      ok: false,
      diagnostics: sortProfileDiagnostics([
        assetDiagnostic(
          'ASSET_PACK_CONFLICT',
          ['staging'],
          `Profile staging failed: ${errorMessage(error)}`,
        ),
        ...(cleanupDiagnostic === undefined ? [] : [cleanupDiagnostic]),
      ]),
    };
  }

  const promoted = await validateAssetProfileTree({
    profile: input.profile,
    profileRoot: transaction.destination,
    catalogPath: resolve(transaction.destination, 'catalog.json'),
  });
  if (!promoted.ok) {
    return promoted;
  }
  return promoted;
}
