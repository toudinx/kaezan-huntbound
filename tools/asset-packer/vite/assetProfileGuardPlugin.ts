import { join } from 'node:path';
import type { Plugin } from 'vite';
import type { AssetBuildProfile } from '../../../packages/assets/src/index.ts';

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

export function assetProfileGuardPlugin(input: {
  readonly profile: AssetBuildProfile;
  readonly publicDir: string;
}): Plugin {
  return {
    name: 'huntbound:asset-profile-guard',
    enforce: 'pre',
    async buildStart() {
      const validated = await validateAssetProfileTree({
        profile: input.profile,
        profileRoot: input.publicDir,
        catalogPath: join(input.publicDir, 'catalog.json'),
      });
      if (validated.ok) return;
      throw new Error(
        'Asset profile validation failed:\n' +
          formatDiagnostics(validated.diagnostics),
      );
    },
  };
}
