import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { canonicalAssetJson } from '../application/buildAssetPack.ts';
import { assetProfileGuardPlugin } from './assetProfileGuardPlugin.ts';

const packId = 'asset-pack:fixture:pb-02-contract-coverage';
const packDirectory = 'pb-02-contract-coverage';
const fixturePackRoot = join(
  process.cwd(),
  'packages/test-fixtures/assets/pb02/expected/test/packs',
  packDirectory,
);

async function createProfileRoot(
  profile: 'test' | 'product',
  restricted: boolean,
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'huntbound-vite-guard-'));
  const packRoot = join(root, 'packs', packDirectory);
  await cp(fixturePackRoot, packRoot, { recursive: true });
  if (restricted) {
    const packPath = join(packRoot, 'pack.json');
    const pack = JSON.parse(await readFile(packPath, 'utf8')) as {
      groups: Array<{ buildProfiles: string[]; licenseClass: string }>;
    };
    for (const group of pack.groups) {
      group.buildProfiles = ['personal'];
      group.licenseClass = 'cipsoft-personal';
    }
    const packJson = canonicalAssetJson(pack);
    await writeFile(packPath, packJson);
    await writeFile(
      join(packRoot, 'pack.sha256'),
      `${createHash('sha256').update(packJson).digest('hex')}\n`,
    );
  }
  await writeFile(
    join(root, 'catalog.json'),
    `${JSON.stringify({
      packs: [
        {
          manifestPath: `packs/${packDirectory}/pack.json`,
          packId,
        },
      ],
      preloads: [
        {
          packId,
          requiredKeys: [
            'creature:tibia:rotworm',
            'effect:tibia:energy-hit',
            'item:tibia:gold-coin',
            'missile:tibia:energy-ball',
            'outfit:tibia:knight',
          ],
        },
      ],
      profile,
      schemaVersion: '1',
    })}\n`,
  );
  return root;
}

async function runBuildStart(root: string, profile: 'test' | 'product') {
  const plugin = assetProfileGuardPlugin({
    profile,
    publicDir: root,
  });
  if (typeof plugin.buildStart !== 'function') {
    throw new Error('guard plugin must expose a buildStart hook');
  }
  await (plugin.buildStart as () => Promise<void>)();
}

describe('asset profile Vite guard', () => {
  it('allows a valid test profile before bundle work starts', async () => {
    const root = await createProfileRoot('test', false);
    try {
      await expect(runBuildStart(root, 'test')).resolves.toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects a product profile containing a personal license in buildStart', async () => {
    const root = await createProfileRoot('product', true);
    try {
      await expect(runBuildStart(root, 'product')).rejects.toThrow(
        'ASSET_LICENSE_FORBIDDEN',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
