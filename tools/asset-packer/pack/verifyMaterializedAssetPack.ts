import { join, resolve } from 'node:path';

import {
  type AssetDiagnostic,
  type AssetPackManifest,
  type AssetValidationResult,
  validateAssetPackManifest,
} from '../../../packages/assets/src/index.ts';

import { canonicalAssetJson } from '../application/buildAssetPack.ts';
import {
  type AssetPackDirectoryEntry,
  type AssetPackFileSystem,
  nodeAssetPackFileSystem,
} from '../filesystem/AssetPackFileSystem.ts';
import {
  assetDiagnostic,
  compareAssetText,
  hashAssetBytes,
  isPathWithin,
  sortAssetDiagnostics,
} from './assetPackSupport.ts';

export interface VerifiedAssetPack {
  readonly packId: string;
  readonly packSha256: string;
  readonly mediaCount: number;
  readonly byteCount: number;
  readonly paths: readonly string[];
  readonly manifest: AssetPackManifest;
}

async function readRequiredFile(
  fileSystem: AssetPackFileSystem,
  path: string,
  logicalPath: readonly (string | number)[],
  diagnostics: AssetDiagnostic[],
): Promise<Buffer | undefined> {
  try {
    const fileStat = await fileSystem.lstat(path);
    if (fileStat.isSymbolicLink() || !fileStat.isFile()) {
      diagnostics.push(
        assetDiagnostic(
          fileStat.isSymbolicLink()
            ? 'ASSET_PATH_UNSAFE'
            : 'ASSET_MEDIA_MISSING',
          logicalPath,
          'Pack file must be a regular file inside the pack root',
        ),
      );
      return undefined;
    }
    return await fileSystem.readFile(path);
  } catch {
    diagnostics.push(
      assetDiagnostic(
        'ASSET_MEDIA_MISSING',
        logicalPath,
        'Required pack file is missing or unreadable',
      ),
    );
    return undefined;
  }
}

async function validateExactPackTree(
  fileSystem: AssetPackFileSystem,
  packRoot: string,
  expectedMediaPaths: ReadonlySet<string>,
  diagnostics: AssetDiagnostic[],
): Promise<void> {
  let rootEntries: readonly AssetPackDirectoryEntry[];
  try {
    rootEntries = await fileSystem.readdir(packRoot);
  } catch {
    diagnostics.push(
      assetDiagnostic(
        'ASSET_MEDIA_MISSING',
        [],
        'Pack root cannot be enumerated',
      ),
    );
    return;
  }

  const expectedRootEntries = new Set(['media', 'pack.json', 'pack.sha256']);
  for (const entry of rootEntries) {
    if (expectedRootEntries.has(entry.name)) continue;
    diagnostics.push(
      assetDiagnostic(
        entry.isSymbolicLink() ? 'ASSET_PATH_UNSAFE' : 'ASSET_PACK_CONFLICT',
        [entry.name],
        'Pack tree contains an unexpected root entry',
      ),
    );
  }

  const mediaDirectory = rootEntries.find(({ name }) => name === 'media');
  if (mediaDirectory === undefined) return;
  if (mediaDirectory.isSymbolicLink() || !mediaDirectory.isDirectory()) {
    diagnostics.push(
      assetDiagnostic(
        'ASSET_PATH_UNSAFE',
        ['media'],
        'Pack media entry must be a real directory',
      ),
    );
    return;
  }

  let mediaEntries: readonly AssetPackDirectoryEntry[];
  try {
    mediaEntries = await fileSystem.readdir(join(packRoot, 'media'));
  } catch {
    diagnostics.push(
      assetDiagnostic(
        'ASSET_MEDIA_MISSING',
        ['media'],
        'Pack media directory cannot be enumerated',
      ),
    );
    return;
  }
  for (const entry of mediaEntries) {
    const mediaPath = `media/${entry.name}`;
    if (expectedMediaPaths.has(mediaPath)) continue;
    diagnostics.push(
      assetDiagnostic(
        entry.isSymbolicLink() ? 'ASSET_PATH_UNSAFE' : 'ASSET_PACK_CONFLICT',
        mediaPath.split('/'),
        'Pack tree contains unexpected media',
      ),
    );
  }
}

export function createMaterializedAssetPackVerifier(
  fileSystem: AssetPackFileSystem,
) {
  return async function verifyMaterializedAssetPackWithFileSystem(input: {
    readonly packRoot: string;
  }): Promise<AssetValidationResult<VerifiedAssetPack>> {
    const diagnostics: AssetDiagnostic[] = [];
    let packRoot: string;
    try {
      packRoot = await fileSystem.realpath(input.packRoot);
      if (!(await fileSystem.stat(packRoot)).isDirectory()) {
        throw new Error('not a directory');
      }
    } catch {
      return {
        ok: false,
        diagnostics: [
          assetDiagnostic(
            'ASSET_MEDIA_MISSING',
            [],
            'Pack root is missing or is not a directory',
          ),
        ],
      };
    }

    const packJson = await readRequiredFile(
      fileSystem,
      join(packRoot, 'pack.json'),
      ['pack.json'],
      diagnostics,
    );
    const packHashFile = await readRequiredFile(
      fileSystem,
      join(packRoot, 'pack.sha256'),
      ['pack.sha256'],
      diagnostics,
    );
    if (packJson === undefined || packHashFile === undefined) {
      return { ok: false, diagnostics: sortAssetDiagnostics(diagnostics) };
    }

    let rawManifest: unknown;
    try {
      rawManifest = JSON.parse(packJson.toString('utf8')) as unknown;
    } catch {
      diagnostics.push(
        assetDiagnostic(
          'ASSET_SCHEMA_INVALID',
          ['pack.json'],
          'Pack manifest is not valid JSON',
        ),
      );
      return { ok: false, diagnostics: sortAssetDiagnostics(diagnostics) };
    }
    const validated = validateAssetPackManifest(rawManifest);
    if (!validated.ok) {
      return {
        ok: false,
        diagnostics: sortAssetDiagnostics([
          ...diagnostics,
          ...validated.diagnostics.map((item) => ({
            ...item,
            path: ['pack.json', ...item.path],
          })),
        ]),
      };
    }
    const manifest = validated.value;
    const canonicalBytes = Buffer.from(canonicalAssetJson(manifest), 'utf8');
    if (!packJson.equals(canonicalBytes)) {
      diagnostics.push(
        assetDiagnostic(
          'ASSET_MEDIA_HASH_MISMATCH',
          ['pack.json'],
          'Pack manifest bytes are not canonical',
        ),
      );
    }
    const packSha256 = hashAssetBytes(packJson);
    if (packHashFile.toString('utf8') !== `${packSha256}\n`) {
      diagnostics.push(
        assetDiagnostic(
          'ASSET_MEDIA_HASH_MISMATCH',
          ['pack.sha256'],
          'Pack hash file does not match pack.json',
        ),
      );
    }

    const mediaByPath = new Map(
      manifest.entries.map((entry) => [entry.media.path, entry.media]),
    );
    await validateExactPackTree(
      fileSystem,
      packRoot,
      new Set(mediaByPath.keys()),
      diagnostics,
    );
    let mediaBytes = 0;
    for (const [mediaPath, media] of [...mediaByPath.entries()].sort(
      ([left], [right]) => compareAssetText(left, right),
    )) {
      const candidate = resolve(packRoot, ...mediaPath.split('/'));
      if (!isPathWithin(packRoot, candidate)) {
        diagnostics.push(
          assetDiagnostic(
            'ASSET_PATH_UNSAFE',
            mediaPath.split('/'),
            'Media path resolves outside the pack root',
          ),
        );
        continue;
      }
      const bytes = await readRequiredFile(
        fileSystem,
        candidate,
        mediaPath.split('/'),
        diagnostics,
      );
      if (bytes === undefined) continue;
      mediaBytes += bytes.byteLength;
      if (hashAssetBytes(bytes) !== media.sha256) {
        diagnostics.push(
          assetDiagnostic(
            'ASSET_MEDIA_HASH_MISMATCH',
            mediaPath.split('/'),
            `Media SHA-256 does not match ${media.sha256}`,
          ),
        );
      }
      if (bytes.byteLength !== media.byteLength) {
        diagnostics.push(
          assetDiagnostic(
            'ASSET_MEDIA_SIZE_MISMATCH',
            mediaPath.split('/'),
            `Media byte length does not match ${media.byteLength}`,
          ),
        );
      }
    }

    if (diagnostics.length > 0) {
      return { ok: false, diagnostics: sortAssetDiagnostics(diagnostics) };
    }
    const paths = [...mediaByPath.keys(), 'pack.json', 'pack.sha256'].sort(
      compareAssetText,
    );
    return {
      ok: true,
      value: {
        packId: manifest.packId,
        packSha256,
        mediaCount: mediaByPath.size,
        byteCount: packJson.byteLength + packHashFile.byteLength + mediaBytes,
        paths,
        manifest,
      },
    };
  };
}

export const verifyMaterializedAssetPack = createMaterializedAssetPackVerifier(
  nodeAssetPackFileSystem,
);
