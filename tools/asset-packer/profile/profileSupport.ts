import { lstat, mkdir, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

import type {
  AssetDiagnostic,
  AssetDiagnosticCode,
} from '../../../packages/assets/src/index.ts';

import {
  assetDiagnostic,
  sortAssetDiagnostics,
} from '../pack/assetPackSupport.ts';

export function profileDiagnostic(
  code: AssetDiagnosticCode,
  path: readonly (string | number)[],
  message: string,
): AssetDiagnostic {
  return assetDiagnostic(code, path, message);
}

export function prefixProfileDiagnostics(
  prefix: readonly (string | number)[],
  diagnostics: readonly AssetDiagnostic[],
): readonly AssetDiagnostic[] {
  return diagnostics.map((diagnostic) => ({
    ...diagnostic,
    path: [...prefix, ...diagnostic.path],
  }));
}

export function sortProfileDiagnostics(
  diagnostics: readonly AssetDiagnostic[],
): readonly AssetDiagnostic[] {
  return sortAssetDiagnostics(diagnostics);
}

export function isProfilePathWithin(root: string, candidate: string): boolean {
  const rootRelative = relative(root, candidate);
  return (
    rootRelative.length === 0 ||
    (!rootRelative.startsWith('..') &&
      !isAbsolute(rootRelative) &&
      rootRelative !== '.')
  );
}

export async function resolveProfileRoot(
  profileRoot: string,
): Promise<
  | { readonly ok: true; readonly path: string }
  | { readonly ok: false; readonly diagnostics: readonly AssetDiagnostic[] }
> {
  try {
    const resolved = await realpath(profileRoot);
    const stats = await lstat(resolved);
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw new Error('not a profile directory');
    }
    return { ok: true, path: resolved };
  } catch {
    return {
      ok: false,
      diagnostics: [
        profileDiagnostic(
          'ASSET_MEDIA_MISSING',
          ['profileRoot'],
          'Asset profile root is missing or is not a directory',
        ),
      ],
    };
  }
}

export async function resolveProfileFile(
  profileRoot: string,
  relativePath: string,
  logicalPath: readonly (string | number)[],
): Promise<
  | { readonly ok: true; readonly path: string }
  | { readonly ok: false; readonly diagnostics: readonly AssetDiagnostic[] }
> {
  const candidate = resolve(profileRoot, ...relativePath.split('/'));
  if (!isProfilePathWithin(profileRoot, candidate)) {
    return {
      ok: false,
      diagnostics: [
        profileDiagnostic(
          'ASSET_PATH_UNSAFE',
          logicalPath,
          'Profile path resolves outside the profile root',
        ),
      ],
    };
  }

  let candidateStat: Awaited<ReturnType<typeof lstat>>;
  try {
    candidateStat = await lstat(candidate);
  } catch {
    return {
      ok: false,
      diagnostics: [
        profileDiagnostic(
          'ASSET_MEDIA_MISSING',
          logicalPath,
          'Profile file is missing or unreadable',
        ),
      ],
    };
  }
  if (candidateStat.isSymbolicLink() || !candidateStat.isFile()) {
    return {
      ok: false,
      diagnostics: [
        profileDiagnostic(
          candidateStat.isSymbolicLink()
            ? 'ASSET_PATH_UNSAFE'
            : 'ASSET_MEDIA_MISSING',
          logicalPath,
          candidateStat.isSymbolicLink()
            ? 'Profile file cannot be a symbolic link'
            : 'Profile path must point to a regular file',
        ),
      ],
    };
  }

  try {
    const resolved = await realpath(candidate);
    if (!isProfilePathWithin(profileRoot, resolved)) {
      return {
        ok: false,
        diagnostics: [
          profileDiagnostic(
            'ASSET_PATH_UNSAFE',
            logicalPath,
            'Profile file resolves outside the profile root',
          ),
        ],
      };
    }
    return { ok: true, path: resolved };
  } catch {
    return {
      ok: false,
      diagnostics: [
        profileDiagnostic(
          'ASSET_MEDIA_MISSING',
          logicalPath,
          'Profile file cannot be resolved',
        ),
      ],
    };
  }
}

export async function readProfileJson(
  path: string,
  logicalPath: readonly (string | number)[],
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
        profileDiagnostic(
          'ASSET_SCHEMA_INVALID',
          logicalPath,
          'Profile JSON cannot be read or parsed',
        ),
      ],
    };
  }
}

export async function ensureDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}
