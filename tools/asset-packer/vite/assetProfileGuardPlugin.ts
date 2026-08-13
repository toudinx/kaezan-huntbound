import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

import type { Plugin } from 'vite';
import type { AssetBuildProfile } from '../../../packages/assets/src/index.ts';
import { resolveProfileFile } from '../profile/profileSupport.ts';
import type { ValidatedAssetProfile } from '../profile/types.ts';
import { validateAssetProfileTree } from '../profile/validateAssetProfileTree.ts';

function formatDiagnostics(
  diagnostics: readonly {
    readonly code: string;
    readonly message: string;
    readonly path: readonly (string | number)[];
  }[],
): string {
  return diagnostics
    .map(
      (diagnostic) =>
        diagnostic.code +
        ' at ' +
        diagnostic.path
          .map((segment) =>
            typeof segment === 'number' ? `[${segment}]` : segment,
          )
          .join('.') +
        ': ' +
        diagnostic.message,
    )
    .join('\n');
}

type ProfileFile = {
  readonly absolutePath: string;
  readonly relativePath: string;
};

async function collectProfileFiles(
  profileRoot: string,
): Promise<readonly ProfileFile[]> {
  const files: ProfileFile[] = [];

  async function visit(directory: string): Promise<void> {
    const entries = (await readdir(directory, { withFileTypes: true })).sort(
      (left, right) =>
        left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
    );
    for (const entry of entries) {
      const absolutePath = join(directory, entry.name);
      const relativePath = relative(profileRoot, absolutePath).replaceAll(
        '\\',
        '/',
      );
      if (entry.isSymbolicLink()) {
        throw new Error(
          'Asset profile contains an unsupported symbolic link at ' +
            relativePath,
        );
      }
      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }
      if (!entry.isFile()) {
        throw new Error(
          'Asset profile contains an unsupported filesystem entry at ' +
            relativePath,
        );
      }
      files.push({ absolutePath, relativePath });
    }
  }

  await visit(profileRoot);
  return files;
}

function contentTypeFor(path: string): string {
  switch (extname(path).toLowerCase()) {
    case '.json':
      return 'application/json; charset=utf-8';
    case '.png':
      return 'image/png';
    default:
      return 'application/octet-stream';
  }
}

type RequestedAssetPath = {
  readonly profile: AssetBuildProfile;
  readonly relativePath: string;
};

const assetProfiles = new Set<AssetBuildProfile>([
  'test',
  'personal',
  'product',
]);

function requestedAssetPath(
  requestUrl: string | undefined,
): RequestedAssetPath | undefined {
  if (requestUrl === undefined) return undefined;

  let pathname: string;
  try {
    pathname = new URL(requestUrl, 'http://localhost').pathname;
  } catch {
    return undefined;
  }

  const prefix = '/assets/';
  if (!pathname.startsWith(prefix)) return undefined;

  const remainder = pathname.slice(prefix.length);
  const separator = remainder.indexOf('/');
  const profileName =
    separator === -1 ? remainder : remainder.slice(0, separator);
  const profile = profileName as AssetBuildProfile;
  if (!assetProfiles.has(profile)) return undefined;
  const encodedPath = separator === -1 ? '' : remainder.slice(separator + 1);

  try {
    return {
      profile,
      relativePath: decodeURIComponent(encodedPath).replaceAll('\\', '/'),
    };
  } catch {
    return undefined;
  }
}

export function assetProfileGuardPlugin(input: {
  readonly profile: AssetBuildProfile;
  readonly publicDir: string;
}): Plugin {
  let validatedProfilePromise: Promise<ValidatedAssetProfile> | undefined;
  let shouldEmit = true;
  const loadValidatedProfile = (): Promise<ValidatedAssetProfile> => {
    validatedProfilePromise ??= validateAssetProfileTree({
      profile: input.profile,
      profileRoot: input.publicDir,
      catalogPath: join(input.publicDir, 'catalog.json'),
    }).then((validated) => {
      if (validated.ok) return validated.value;
      throw new Error(
        'Asset profile validation failed:\n' +
          formatDiagnostics(validated.diagnostics),
      );
    });
    return validatedProfilePromise;
  };

  return {
    name: 'huntbound:asset-profile-guard',
    enforce: 'pre',
    configResolved(config) {
      shouldEmit = config.command === 'build';
    },
    async buildStart() {
      if (!shouldEmit) return;
      const validated = await loadValidatedProfile();
      const files = await collectProfileFiles(validated.profileRoot);
      for (const file of files) {
        this.emitFile({
          type: 'asset',
          fileName: `assets/${input.profile}/${file.relativePath}`,
          source: await readFile(file.absolutePath),
        });
      }
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const requested = requestedAssetPath(request.url);
        if (requested === undefined) {
          next();
          return;
        }
        if (
          requested.profile !== input.profile ||
          requested.relativePath.length === 0
        ) {
          response.statusCode = 404;
          response.end();
          return;
        }

        try {
          const validated = await loadValidatedProfile();
          const resolved = await resolveProfileFile(
            validated.profileRoot,
            requested.relativePath,
            ['assets', input.profile, requested.relativePath],
          );
          if (!resolved.ok) {
            response.statusCode = 404;
            response.end();
            return;
          }

          const body = await readFile(resolved.path);
          response.statusCode = 200;
          response.setHeader('Content-Type', contentTypeFor(resolved.path));
          response.setHeader('Content-Length', body.byteLength);
          response.end(request.method === 'HEAD' ? undefined : body);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
