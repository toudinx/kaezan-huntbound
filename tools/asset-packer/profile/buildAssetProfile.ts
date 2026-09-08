import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';

import {
  type AssetBuildProfile,
  type AssetDiagnostic,
  AssetSelectionManifestSchema,
  AssetSourceLockSchema,
  type AssetValidationResult,
} from '../../../packages/assets/src/index.ts';
import {
  buildAssetPackManifest,
  canonicalAssetJson,
} from '../application/buildAssetPack.ts';
import { materializeAssetPack } from '../application/materializeAssetPack.ts';
import { verifyAssetSourceLock } from '../source/sourceLock.ts';
import {
  type ArenaFableSourceManifest,
  parseArenaFableSourceManifest,
} from '../source/sourceManifest.ts';
import { compareAssetProfileTrees } from './compareAssetProfileTrees.ts';
import { createSinglePackAssetCatalog } from './createSinglePackAssetCatalog.ts';
import { stageAssetProfile } from './stageAssetProfile.ts';
import type { ValidatedAssetProfile } from './types.ts';
import { validateAssetProfileTree } from './validateAssetProfileTree.ts';

export interface BuiltAssetProfile {
  readonly profile: AssetBuildProfile;
  readonly packId: string;
  readonly packSha256: string;
  readonly mediaCount: number;
  readonly byteCount: number;
  readonly paths: readonly string[];
  readonly check: boolean;
}

function diagnostic(
  code: AssetDiagnostic['code'],
  path: readonly (string | number)[],
  message: string,
): AssetDiagnostic {
  return { code, severity: 'error', message, path };
}

async function readJson(
  path: string,
  logicalPath: string,
): Promise<
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly diagnostics: readonly AssetDiagnostic[] }
> {
  try {
    return {
      ok: true,
      value: JSON.parse(await readFile(path, 'utf8')) as unknown,
    };
  } catch {
    return {
      ok: false,
      diagnostics: [
        diagnostic(
          'ASSET_SCHEMA_INVALID',
          [logicalPath],
          `${logicalPath} JSON cannot be read or parsed`,
        ),
      ],
    };
  }
}

async function loadBuildInputs(input: {
  readonly selectionPath: string;
  readonly sourceLockPath: string;
  readonly sourceRoot: string;
}): Promise<
  | {
      readonly selection: ReturnType<typeof AssetSelectionManifestSchema.parse>;
      readonly sourceLock: ReturnType<typeof AssetSourceLockSchema.parse>;
      readonly sourceManifest: ArenaFableSourceManifest;
    }
  | { readonly diagnostics: readonly AssetDiagnostic[] }
> {
  const [rawSelection, rawLock] = await Promise.all([
    readJson(input.selectionPath, 'selection'),
    readJson(input.sourceLockPath, 'source-lock'),
  ]);
  if (!rawSelection.ok || !rawLock.ok) {
    return {
      diagnostics: [
        ...(rawSelection.ok ? [] : rawSelection.diagnostics),
        ...(rawLock.ok ? [] : rawLock.diagnostics),
      ],
    };
  }
  const selection = AssetSelectionManifestSchema.safeParse(rawSelection.value);
  const sourceLock = AssetSourceLockSchema.safeParse(rawLock.value);
  if (!selection.success || !sourceLock.success) {
    return {
      diagnostics: [
        ...(selection.success
          ? []
          : [
              diagnostic(
                'ASSET_SCHEMA_INVALID',
                ['selection'],
                'Selection schema is invalid',
              ),
            ]),
        ...(sourceLock.success
          ? []
          : [
              diagnostic(
                'ASSET_SCHEMA_INVALID',
                ['source-lock'],
                'Source lock schema is invalid',
              ),
            ]),
      ],
    };
  }
  const verifiedLock = await verifyAssetSourceLock({
    sourceRoot: input.sourceRoot,
    lock: sourceLock.data,
  });
  if (!verifiedLock.ok) return { diagnostics: verifiedLock.diagnostics };

  const rawManifest = await readJson(
    join(input.sourceRoot, 'manifest.json'),
    'manifest.json',
  );
  if (!rawManifest.ok) return rawManifest;
  const sourceManifest = parseArenaFableSourceManifest(rawManifest.value);
  if (!sourceManifest.ok) return { diagnostics: sourceManifest.diagnostics };
  return {
    selection: selection.data,
    sourceLock: sourceLock.data,
    sourceManifest: sourceManifest.value,
  };
}

function packDirectoryName(packId: string): string | undefined {
  const segment = packId.split(':').at(-1);
  if (
    segment === undefined ||
    segment.length === 0 ||
    segment === '.' ||
    segment === '..' ||
    segment.includes('/') ||
    segment.includes('\\')
  ) {
    return undefined;
  }
  return segment;
}

function summary(
  profile: AssetBuildProfile,
  check: boolean,
  validated: ValidatedAssetProfile,
): BuiltAssetProfile {
  return {
    profile,
    packId: validated.packs[0]?.verified.packId ?? '',
    packSha256: validated.packs[0]?.verified.packSha256 ?? '',
    mediaCount: validated.packs.reduce(
      (total, pack) => total + pack.verified.mediaCount,
      0,
    ),
    byteCount: validated.packs.reduce(
      (total, pack) => total + pack.verified.byteCount,
      0,
    ),
    paths: [
      'catalog.json',
      ...validated.packs.flatMap((pack) =>
        pack.verified.paths.map((path) =>
          join(
            'packs',
            pack.reference.manifestPath.split('/').at(-2) ?? '',
            path,
          ).replaceAll('\\', '/'),
        ),
      ),
    ].sort(),
    check,
  };
}

export async function buildAssetProfile(input: {
  readonly profile: AssetBuildProfile;
  readonly selectionPath: string;
  readonly sourceLockPath: string;
  readonly sourceRoot: string;
  readonly output: string;
  readonly check: boolean;
}): Promise<AssetValidationResult<BuiltAssetProfile>> {
  if (!isAbsolute(input.sourceRoot)) {
    return {
      ok: false,
      diagnostics: [
        diagnostic(
          'ASSET_PATH_UNSAFE',
          ['sourceRoot'],
          'Personal source root must be an absolute path',
        ),
      ],
    };
  }

  const inputs = await loadBuildInputs(input);
  if ('diagnostics' in inputs) {
    return { ok: false, diagnostics: inputs.diagnostics };
  }
  if (!inputs.selection.buildProfiles.includes(input.profile)) {
    return {
      ok: false,
      diagnostics: [
        diagnostic(
          'ASSET_PROFILE_FORBIDDEN',
          ['selection', 'buildProfiles'],
          `Selection does not allow profile ${input.profile}`,
        ),
      ],
    };
  }
  const manifest = buildAssetPackManifest(inputs);
  if (!manifest.ok) return manifest;
  const directory = packDirectoryName(manifest.value.packId);
  if (directory === undefined) {
    return {
      ok: false,
      diagnostics: [
        diagnostic(
          'ASSET_PATH_UNSAFE',
          ['packId'],
          'Pack ID cannot form a profile directory name',
        ),
      ],
    };
  }

  // realpath, because the validator canonicalises the profile root it is
  // handed: on macOS the system temp directory is a symlink (/var ->
  // /private/var) and every path built from the raw mkdtemp result then reads
  // as outside its own root.
  const temporaryRoot = await realpath(
    await mkdtemp(join(tmpdir(), 'huntbound-asset-profile-build-')),
  );
  try {
    const generatedPackRoot = join(temporaryRoot, 'packs', directory);
    const materialized = await materializeAssetPack({
      sourceRoot: input.sourceRoot,
      destination: generatedPackRoot,
      manifest: manifest.value,
    });
    if (!materialized.ok) return materialized;

    const catalog = createSinglePackAssetCatalog({
      profile: input.profile,
      packId: manifest.value.packId,
      manifestPath: `packs/${directory}/pack.json`,
      requiredKeys: inputs.selection.entries.map((entry) => entry.key),
    });
    if (!catalog.ok) return catalog;
    await writeFile(
      join(temporaryRoot, 'catalog.json'),
      canonicalAssetJson(catalog.value),
    );

    const generated = await validateAssetProfileTree({
      profile: input.profile,
      profileRoot: temporaryRoot,
      catalogPath: join(temporaryRoot, 'catalog.json'),
    });
    if (!generated.ok) return generated;

    if (input.check) {
      const comparison = await compareAssetProfileTrees(
        temporaryRoot,
        input.output,
      );
      if (!comparison.equal) {
        return {
          ok: false,
          diagnostics: [
            diagnostic(
              'ASSET_PACK_CONFLICT',
              ['output'],
              'Generated asset profile differs from the expected tree: ' +
                comparison.differences
                  .map(
                    (difference) => `${difference.path}:${difference.reason}`,
                  )
                  .join(', '),
            ),
          ],
        };
      }
      return { ok: true, value: summary(input.profile, true, generated.value) };
    }

    const staged = await stageAssetProfile({
      profile: input.profile,
      sourceProfileRoot: temporaryRoot,
      destinationProfileRoot: input.output,
    });
    if (!staged.ok) return staged;
    return { ok: true, value: summary(input.profile, false, staged.value) };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}
