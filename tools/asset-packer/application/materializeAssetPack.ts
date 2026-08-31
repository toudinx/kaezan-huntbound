import { createHash } from 'node:crypto';
import { dirname, join, parse, resolve } from 'node:path';

import {
  type AssetDiagnostic,
  type AssetPackManifest,
  type AssetValidationResult,
  validateAssetPackManifest,
} from '../../../packages/assets/src/index.ts';

import {
  type AssetPackFileStat,
  type AssetPackFileSystem,
  nodeAssetPackFileSystem,
} from '../filesystem/AssetPackFileSystem.ts';
import {
  assetDiagnostic,
  compareAssetText,
  errorMessage,
  hashAssetBytes,
  isPathWithin,
  sortAssetDiagnostics,
} from '../pack/assetPackSupport.ts';
import {
  createMaterializedAssetPackVerifier,
  type VerifiedAssetPack,
} from '../pack/verifyMaterializedAssetPack.ts';
import {
  type ArenaFableSourceManifest,
  parseArenaFableSourceManifest,
  sourceMapForAsset,
} from '../source/sourceManifest.ts';
import { canonicalAssetJson } from './buildAssetPack.ts';

export type MaterializedAssetPack = VerifiedAssetPack;

interface PreparedMedia {
  readonly bytesByHash: ReadonlyMap<string, Buffer>;
}

async function resolveSourceRoot(
  fileSystem: AssetPackFileSystem,
  sourceRoot: string,
  diagnostics: AssetDiagnostic[],
): Promise<string | undefined> {
  try {
    const root = await fileSystem.realpath(sourceRoot);
    if (!(await fileSystem.stat(root)).isDirectory()) {
      throw new Error('not a directory');
    }
    return root;
  } catch {
    diagnostics.push(
      assetDiagnostic(
        'ASSET_MEDIA_MISSING',
        [],
        'Source root is missing or is not a directory',
      ),
    );
    return undefined;
  }
}

async function readSourceManifest(
  fileSystem: AssetPackFileSystem,
  sourceRoot: string,
  diagnostics: AssetDiagnostic[],
): Promise<ArenaFableSourceManifest | undefined> {
  let bytes: Buffer;
  try {
    const manifestPath = await fileSystem.realpath(
      join(sourceRoot, 'manifest.json'),
    );
    if (!isPathWithin(sourceRoot, manifestPath)) {
      diagnostics.push(
        assetDiagnostic(
          'ASSET_PATH_UNSAFE',
          ['manifest.json'],
          'Source manifest resolves outside the source root',
        ),
      );
      return undefined;
    }
    bytes = await fileSystem.readFile(manifestPath);
  } catch {
    diagnostics.push(
      assetDiagnostic(
        'ASSET_MEDIA_MISSING',
        ['manifest.json'],
        'Source manifest is missing or unreadable',
      ),
    );
    return undefined;
  }

  let input: unknown;
  try {
    input = JSON.parse(bytes.toString('utf8')) as unknown;
  } catch {
    diagnostics.push(
      assetDiagnostic(
        'ASSET_SCHEMA_INVALID',
        ['manifest.json'],
        'Source manifest is not valid JSON',
      ),
    );
    return undefined;
  }
  const parsedManifest = parseArenaFableSourceManifest(input);
  if (!parsedManifest.ok) {
    diagnostics.push(...parsedManifest.diagnostics);
    return undefined;
  }
  return parsedManifest.value;
}

async function prepareMedia(
  fileSystem: AssetPackFileSystem,
  sourceRootInput: string,
  manifest: AssetPackManifest,
): Promise<AssetValidationResult<PreparedMedia>> {
  const diagnostics: AssetDiagnostic[] = [];
  const sourceRoot = await resolveSourceRoot(
    fileSystem,
    sourceRootInput,
    diagnostics,
  );
  if (sourceRoot === undefined) {
    return { ok: false, diagnostics: sortAssetDiagnostics(diagnostics) };
  }
  const sourceManifest = await readSourceManifest(
    fileSystem,
    sourceRoot,
    diagnostics,
  );
  if (sourceManifest === undefined) {
    return { ok: false, diagnostics: sortAssetDiagnostics(diagnostics) };
  }

  const bytesByHash = new Map<string, Buffer>();
  for (const [index, entry] of manifest.entries.entries()) {
    const { name, id } = sourceMapForAsset(
      entry.category,
      entry.sourceIdentity,
    );
    const sourceEntry = sourceManifest[name][String(id)];
    if (sourceEntry === undefined) {
      diagnostics.push(
        assetDiagnostic(
          'ASSET_REFERENCE_MISSING',
          ['entries', index, 'sourceIdentity'],
          `Source identity ${entry.sourceIdentity.kind}:${id} is missing`,
          entry.key,
        ),
      );
      continue;
    }

    let sourcePath: string;
    try {
      sourcePath = await fileSystem.realpath(
        resolve(sourceRoot, ...sourceEntry.file.split('/')),
      );
    } catch {
      diagnostics.push(
        assetDiagnostic(
          'ASSET_MEDIA_MISSING',
          ['entries', index, 'media'],
          `Source media for ${entry.key} is missing`,
          entry.key,
        ),
      );
      continue;
    }
    if (!isPathWithin(sourceRoot, sourcePath)) {
      diagnostics.push(
        assetDiagnostic(
          'ASSET_PATH_UNSAFE',
          ['entries', index, 'media'],
          `Source media for ${entry.key} resolves outside the source root`,
          entry.key,
        ),
      );
      continue;
    }

    let bytes: Buffer;
    try {
      const sourceStat = await fileSystem.stat(sourcePath);
      if (!sourceStat.isFile()) throw new Error('not a regular file');
      bytes = await fileSystem.readFile(sourcePath);
    } catch {
      diagnostics.push(
        assetDiagnostic(
          'ASSET_MEDIA_MISSING',
          ['entries', index, 'media'],
          `Source media for ${entry.key} is unreadable`,
          entry.key,
        ),
      );
      continue;
    }
    if (hashAssetBytes(bytes) !== entry.media.sha256) {
      diagnostics.push(
        assetDiagnostic(
          'ASSET_MEDIA_HASH_MISMATCH',
          ['entries', index, 'media'],
          `Source media SHA-256 does not match ${entry.media.sha256}`,
          entry.key,
        ),
      );
    }
    if (bytes.byteLength !== entry.media.byteLength) {
      diagnostics.push(
        assetDiagnostic(
          'ASSET_MEDIA_SIZE_MISMATCH',
          ['entries', index, 'media'],
          `Source media byte length does not match ${entry.media.byteLength}`,
          entry.key,
        ),
      );
    }
    if (
      bytes.byteLength === entry.media.byteLength &&
      hashAssetBytes(bytes) === entry.media.sha256 &&
      !bytesByHash.has(entry.media.sha256)
    ) {
      bytesByHash.set(entry.media.sha256, bytes);
    }
  }

  return diagnostics.length > 0
    ? { ok: false, diagnostics: sortAssetDiagnostics(diagnostics) }
    : { ok: true, value: { bytesByHash } };
}

async function pathExists(
  fileSystem: AssetPackFileSystem,
  path: string,
): Promise<boolean> {
  try {
    await fileSystem.lstat(path);
    return true;
  } catch {
    return false;
  }
}

function destinationIsIntrinsicallyUnsafe(destination: string): boolean {
  const normalized = resolve(destination);
  const protectedPaths = [
    resolve(process.cwd()),
    process.env.USERPROFILE,
    process.env.HOME,
  ]
    .filter((path): path is string => path !== undefined && path.length > 0)
    .map((path) => resolve(path));
  return (
    normalized === parse(normalized).root ||
    protectedPaths.includes(normalized) ||
    /[*?[\]]/.test(destination)
  );
}

async function hasGitMetadata(
  fileSystem: AssetPackFileSystem,
  destination: string,
): Promise<boolean> {
  return pathExists(fileSystem, join(destination, '.git'));
}

function safePackSegment(packId: string): string | undefined {
  const segment = packId.replaceAll(/[^a-zA-Z0-9._-]/g, '-');
  return segment.length > 0 && segment.length <= 120 ? segment : undefined;
}

async function resolveTransactionPaths(
  fileSystem: AssetPackFileSystem,
  destinationInput: string,
  packId: string,
): Promise<
  AssetValidationResult<{
    readonly parent: string;
    readonly destination: string;
    readonly staging: string;
    readonly backup: string;
  }>
> {
  if (destinationIsIntrinsicallyUnsafe(destinationInput)) {
    return {
      ok: false,
      diagnostics: [
        assetDiagnostic(
          'ASSET_PATH_UNSAFE',
          ['destination'],
          'Destination cannot be a root, home, workspace root, or glob',
        ),
      ],
    };
  }
  const segment = safePackSegment(packId);
  if (segment === undefined) {
    return {
      ok: false,
      diagnostics: [
        assetDiagnostic(
          'ASSET_PATH_UNSAFE',
          ['packId'],
          'Pack ID cannot form a safe staging directory name',
        ),
      ],
    };
  }

  const unresolvedDestination = resolve(destinationInput);
  const parentInput = dirname(unresolvedDestination);
  await fileSystem.mkdir(parentInput, { recursive: true });
  const parent = await fileSystem.realpath(parentInput);
  const destination = resolve(parent, parse(unresolvedDestination).base);
  const staging = resolve(parent, `.staging-${segment}-${process.pid}`);
  const backup = resolve(parent, `.backup-${segment}-${process.pid}`);
  if (
    ![destination, staging, backup].every(
      (path) => dirname(path) === parent && isPathWithin(parent, path),
    )
  ) {
    return {
      ok: false,
      diagnostics: [
        assetDiagnostic(
          'ASSET_PATH_UNSAFE',
          ['destination'],
          'Transaction paths must be direct children of the destination parent',
        ),
      ],
    };
  }
  if (await hasGitMetadata(fileSystem, destination)) {
    return {
      ok: false,
      diagnostics: [
        assetDiagnostic(
          'ASSET_PATH_UNSAFE',
          ['destination'],
          'Destination cannot be a Git workspace root',
        ),
      ],
    };
  }

  for (const [name, path] of [
    ['destination', destination],
    ['staging', staging],
    ['backup', backup],
  ] as const) {
    if (!(await pathExists(fileSystem, path))) continue;
    const pathStat = await fileSystem.lstat(path);
    if (pathStat.isSymbolicLink()) {
      return {
        ok: false,
        diagnostics: [
          assetDiagnostic(
            'ASSET_PATH_UNSAFE',
            [name],
            `${name} cannot be a symbolic link`,
          ),
        ],
      };
    }
    if (name === 'destination' && !pathStat.isDirectory()) {
      return {
        ok: false,
        diagnostics: [
          assetDiagnostic(
            'ASSET_PATH_UNSAFE',
            [name],
            'Existing destination must be a directory',
          ),
        ],
      };
    }
    const realPath = await fileSystem.realpath(path);
    if (dirname(realPath) !== parent || !isPathWithin(parent, realPath)) {
      return {
        ok: false,
        diagnostics: [
          assetDiagnostic(
            'ASSET_PATH_UNSAFE',
            [name],
            `${name} resolves outside the destination parent`,
          ),
        ],
      };
    }
  }

  if (
    (await pathExists(fileSystem, staging)) ||
    (await pathExists(fileSystem, backup))
  ) {
    return {
      ok: false,
      diagnostics: [
        assetDiagnostic(
          'ASSET_PACK_CONFLICT',
          ['destination'],
          'A staging or backup sibling already exists',
        ),
      ],
    };
  }
  return { ok: true, value: { parent, destination, staging, backup } };
}

async function validateExistingTransactionDirectory(
  fileSystem: AssetPackFileSystem,
  path: string,
  parent: string,
  name: 'destination' | 'staging' | 'backup',
): Promise<AssetDiagnostic | undefined> {
  if (dirname(resolve(path)) !== parent || !isPathWithin(parent, path)) {
    return assetDiagnostic(
      'ASSET_PATH_UNSAFE',
      [name],
      `${name} is not a direct child of the transaction parent`,
    );
  }
  let pathStat: AssetPackFileStat;
  try {
    pathStat = await fileSystem.lstat(path);
  } catch {
    return assetDiagnostic(
      'ASSET_PACK_CONFLICT',
      [name],
      `${name} disappeared before the filesystem operation`,
    );
  }
  if (pathStat.isSymbolicLink() || !pathStat.isDirectory()) {
    return assetDiagnostic(
      'ASSET_PATH_UNSAFE',
      [name],
      `${name} must remain a real directory`,
    );
  }
  try {
    const realPath = await fileSystem.realpath(path);
    if (dirname(realPath) !== parent || !isPathWithin(parent, realPath)) {
      return assetDiagnostic(
        'ASSET_PATH_UNSAFE',
        [name],
        `${name} resolves outside the transaction parent`,
      );
    }
  } catch {
    return assetDiagnostic(
      'ASSET_PATH_UNSAFE',
      [name],
      `${name} cannot be resolved before the filesystem operation`,
    );
  }
  return undefined;
}

async function cleanupStaging(
  fileSystem: AssetPackFileSystem,
  staging: string,
  parent: string,
): Promise<AssetDiagnostic | undefined> {
  if (!(await pathExists(fileSystem, staging))) return undefined;
  const unsafe = await validateExistingTransactionDirectory(
    fileSystem,
    staging,
    parent,
    'staging',
  );
  if (unsafe !== undefined) return unsafe;
  try {
    await fileSystem.rm(staging, { recursive: true, force: true });
    return undefined;
  } catch (error) {
    return assetDiagnostic(
      'ASSET_PACK_CONFLICT',
      ['staging'],
      `Staging cleanup failed: ${errorMessage(error)}`,
    );
  }
}

export function createAssetPackMaterializer(fileSystem: AssetPackFileSystem) {
  const verifyPack = createMaterializedAssetPackVerifier(fileSystem);
  return async function materializeAssetPackWithFileSystem(input: {
    readonly sourceRoot: string;
    readonly destination: string;
    readonly manifest: AssetPackManifest;
  }): Promise<AssetValidationResult<MaterializedAssetPack>> {
    const validatedManifest = validateAssetPackManifest(input.manifest);
    if (!validatedManifest.ok) return validatedManifest;

    const prepared = await prepareMedia(
      fileSystem,
      input.sourceRoot,
      validatedManifest.value,
    );
    if (!prepared.ok) return prepared;

    let transactionPaths: Awaited<ReturnType<typeof resolveTransactionPaths>>;
    try {
      transactionPaths = await resolveTransactionPaths(
        fileSystem,
        input.destination,
        validatedManifest.value.packId,
      );
    } catch (error) {
      return {
        ok: false,
        diagnostics: [
          assetDiagnostic(
            'ASSET_PATH_UNSAFE',
            ['destination'],
            `Destination cannot be prepared: ${errorMessage(error)}`,
          ),
        ],
      };
    }
    if (!transactionPaths.ok) return transactionPaths;
    const { parent, destination, staging, backup } = transactionPaths.value;
    const hadDestination = await pathExists(fileSystem, destination);
    if (hadDestination) {
      const destinationSafety = await validateExistingTransactionDirectory(
        fileSystem,
        destination,
        parent,
        'destination',
      );
      if (destinationSafety !== undefined) {
        return { ok: false, diagnostics: [destinationSafety] };
      }

      const existingPack = await verifyPack({ packRoot: destination });
      if (
        !existingPack.ok ||
        existingPack.value.packId !== validatedManifest.value.packId
      ) {
        return {
          ok: false,
          diagnostics: [
            assetDiagnostic(
              'ASSET_PACK_CONFLICT',
              ['destination'],
              'Existing destination must be a valid pack with the same pack ID',
            ),
          ],
        };
      }
    }
    const packJson = canonicalAssetJson(validatedManifest.value);
    const packSha256 = createHash('sha256').update(packJson).digest('hex');

    try {
      await fileSystem.mkdir(staging);
      await fileSystem.mkdir(join(staging, 'media'));
      for (const [sha256, bytes] of [
        ...prepared.value.bytesByHash.entries(),
      ].sort(([left], [right]) => compareAssetText(left, right))) {
        await fileSystem.writeFile(
          join(staging, 'media', `${sha256}.png`),
          bytes,
        );
      }
      await fileSystem.writeFile(join(staging, 'pack.json'), packJson);
      await fileSystem.writeFile(
        join(staging, 'pack.sha256'),
        `${packSha256}\n`,
      );
    } catch (error) {
      const cleanupDiagnostic = await cleanupStaging(
        fileSystem,
        staging,
        parent,
      );
      return {
        ok: false,
        diagnostics: sortAssetDiagnostics([
          assetDiagnostic(
            'ASSET_PACK_CONFLICT',
            ['staging'],
            `Staging write failed: ${errorMessage(error)}`,
          ),
          ...(cleanupDiagnostic === undefined ? [] : [cleanupDiagnostic]),
        ]),
      };
    }

    const stagedVerification = await verifyPack({ packRoot: staging });
    if (!stagedVerification.ok) {
      const cleanupDiagnostic = await cleanupStaging(
        fileSystem,
        staging,
        parent,
      );
      return cleanupDiagnostic === undefined
        ? stagedVerification
        : {
            ok: false,
            diagnostics: sortAssetDiagnostics([
              ...stagedVerification.diagnostics,
              cleanupDiagnostic,
            ]),
          };
    }

    const stagingSafety = await validateExistingTransactionDirectory(
      fileSystem,
      staging,
      parent,
      'staging',
    );
    if (stagingSafety !== undefined) {
      return { ok: false, diagnostics: [stagingSafety] };
    }
    if (hadDestination) {
      const destinationSafety = await validateExistingTransactionDirectory(
        fileSystem,
        destination,
        parent,
        'destination',
      );
      if (destinationSafety !== undefined) {
        const cleanupDiagnostic = await cleanupStaging(
          fileSystem,
          staging,
          parent,
        );
        return {
          ok: false,
          diagnostics: sortAssetDiagnostics([
            destinationSafety,
            ...(cleanupDiagnostic === undefined ? [] : [cleanupDiagnostic]),
          ]),
        };
      }
      try {
        await fileSystem.rename(destination, backup);
      } catch (error) {
        const cleanupDiagnostic = await cleanupStaging(
          fileSystem,
          staging,
          parent,
        );
        return {
          ok: false,
          diagnostics: sortAssetDiagnostics([
            assetDiagnostic(
              'ASSET_PACK_CONFLICT',
              ['destination'],
              `Previous output could not be backed up: ${errorMessage(error)}`,
            ),
            ...(cleanupDiagnostic === undefined ? [] : [cleanupDiagnostic]),
          ]),
        };
      }
    }

    const promotionSafety = await validateExistingTransactionDirectory(
      fileSystem,
      staging,
      parent,
      'staging',
    );
    if (promotionSafety !== undefined) {
      const rollbackDiagnostics: AssetDiagnostic[] = [promotionSafety];
      if (hadDestination) {
        const backupSafety = await validateExistingTransactionDirectory(
          fileSystem,
          backup,
          parent,
          'backup',
        );
        if (backupSafety === undefined) {
          try {
            await fileSystem.rename(backup, destination);
          } catch (error) {
            rollbackDiagnostics.push(
              assetDiagnostic(
                'ASSET_PACK_CONFLICT',
                ['backup'],
                `Rollback failed: ${errorMessage(error)}`,
              ),
            );
          }
        } else {
          rollbackDiagnostics.push(backupSafety);
        }
      }
      return {
        ok: false,
        diagnostics: sortAssetDiagnostics(rollbackDiagnostics),
      };
    }

    try {
      await fileSystem.rename(staging, destination);
    } catch (error) {
      const rollbackDiagnostics: AssetDiagnostic[] = [];
      if (hadDestination) {
        const backupSafety = await validateExistingTransactionDirectory(
          fileSystem,
          backup,
          parent,
          'backup',
        );
        if (backupSafety === undefined) {
          try {
            await fileSystem.rename(backup, destination);
          } catch (rollbackError) {
            rollbackDiagnostics.push(
              assetDiagnostic(
                'ASSET_PACK_CONFLICT',
                ['backup'],
                `Rollback failed: ${errorMessage(rollbackError)}`,
              ),
            );
          }
        } else {
          rollbackDiagnostics.push(backupSafety);
        }
      }
      const cleanupDiagnostic = await cleanupStaging(
        fileSystem,
        staging,
        parent,
      );
      return {
        ok: false,
        diagnostics: sortAssetDiagnostics([
          ...rollbackDiagnostics,
          assetDiagnostic(
            'ASSET_PACK_CONFLICT',
            ['staging'],
            `Staging promotion failed: ${errorMessage(error)}`,
          ),
          ...(cleanupDiagnostic === undefined ? [] : [cleanupDiagnostic]),
        ]),
      };
    }

    if (hadDestination) {
      const backupSafety = await validateExistingTransactionDirectory(
        fileSystem,
        backup,
        parent,
        'backup',
      );
      if (backupSafety !== undefined) {
        return { ok: false, diagnostics: [backupSafety] };
      }
      try {
        await fileSystem.rm(backup, { recursive: true, force: true });
      } catch (error) {
        return {
          ok: false,
          diagnostics: [
            assetDiagnostic(
              'ASSET_PACK_CONFLICT',
              ['backup'],
              `Backup cleanup failed: ${errorMessage(error)}`,
            ),
          ],
        };
      }
    }
    return stagedVerification;
  };
}

export const materializeAssetPack = createAssetPackMaterializer(
  nodeAssetPackFileSystem,
);
