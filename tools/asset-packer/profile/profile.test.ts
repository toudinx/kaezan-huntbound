import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { createAssetKey } from '../../../packages/assets/src/index.ts';
import { createSinglePackAssetCatalog } from './createSinglePackAssetCatalog.ts';
import { stageAssetProfile } from './stageAssetProfile.ts';
import { validateAssetProfileTree } from './validateAssetProfileTree.ts';

const packId = 'asset-pack:fixture:pb-02-contract-coverage';
const packDirectory = 'pb-02-contract-coverage';
const requiredKeys = [
  'creature:tibia:rotworm',
  'effect:tibia:energy-hit',
  'item:tibia:gold-coin',
  'missile:tibia:energy-ball',
  'outfit:tibia:knight',
] as const;
const fixturePackRoot = join(
  process.cwd(),
  'packages/test-fixtures/assets/pb02/expected/test/packs',
  packDirectory,
);
const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function createProfileFixture(input: {
  readonly profile: 'test' | 'personal' | 'product';
  readonly group?: {
    readonly buildProfiles: readonly ('test' | 'personal' | 'product')[];
    readonly licenseClass:
      | 'cipsoft-personal'
      | 'huntbound-owned'
      | 'huntbound-test';
  };
  readonly removeMedia?: boolean;
  readonly corruptPackHash?: boolean;
}): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'huntbound-profile-test-'));
  temporaryRoots.push(root);
  const packRoot = join(root, 'packs', packDirectory);
  await cp(fixturePackRoot, packRoot, { recursive: true });

  const packPath = join(packRoot, 'pack.json');
  const pack = JSON.parse(await readFile(packPath, 'utf8')) as {
    groups: Array<{
      buildProfiles: string[];
      licenseClass: string;
    }>;
    entries: Array<{ media: { path: string } }>;
  };
  if (input.group !== undefined) {
    for (const group of pack.groups) {
      group.buildProfiles = [...input.group.buildProfiles];
      group.licenseClass = input.group.licenseClass;
    }
    await writeFile(packPath, `${JSON.stringify(pack)}\n`);
  }

  if (input.removeMedia === true) {
    const mediaPath = pack.entries[0]?.media.path;
    if (mediaPath !== undefined) {
      await rm(join(packRoot, ...mediaPath.split('/')));
    }
  }
  if (input.corruptPackHash === true) {
    await writeFile(join(packRoot, 'pack.sha256'), `${'0'.repeat(64)}\n`);
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
      preloads: [{ packId, requiredKeys: [...requiredKeys] }],
      profile: input.profile,
      schemaVersion: '1',
    })}\n`,
  );
  return root;
}

describe('asset profiles', () => {
  it('validates the synthetic test profile transitively', async () => {
    const root = await createProfileFixture({ profile: 'test' });

    const result = await validateAssetProfileTree({
      profile: 'test',
      profileRoot: root,
      catalogPath: join(root, 'catalog.json'),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.catalog.profile).toBe('test');
      expect(result.value.packs).toHaveLength(1);
      expect(result.value.packs[0]?.verified.mediaCount).toBe(1);
    }
  });

  it('validates a product profile when the pack group is allowed', async () => {
    const root = await createProfileFixture({ profile: 'product' });

    const result = await validateAssetProfileTree({
      profile: 'product',
      profileRoot: root,
      catalogPath: join(root, 'catalog.json'),
    });

    expect(result.ok).toBe(true);
  });

  it('aggregates profile, pack, media, and license failures before publishing', async () => {
    const root = await createProfileFixture({
      profile: 'product',
      group: {
        buildProfiles: ['personal'],
        licenseClass: 'cipsoft-personal',
      },
      removeMedia: true,
      corruptPackHash: true,
    });

    const result = await validateAssetProfileTree({
      profile: 'product',
      profileRoot: root,
      catalogPath: join(root, 'catalog.json'),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics.map(({ code }) => code)).toEqual(
        expect.arrayContaining([
          'ASSET_MEDIA_MISSING',
          'ASSET_MEDIA_HASH_MISMATCH',
          'ASSET_PROFILE_FORBIDDEN',
          'ASSET_LICENSE_FORBIDDEN',
        ]),
      );
      expect(JSON.stringify(result.diagnostics)).not.toContain(root);
    }
  });

  it('rejects a catalog whose profile does not match the requested target', async () => {
    const root = await createProfileFixture({ profile: 'test' });

    const result = await validateAssetProfileTree({
      profile: 'product',
      profileRoot: root,
      catalogPath: join(root, 'catalog.json'),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'ASSET_CATALOG_PROFILE_MISMATCH' }),
        ]),
      );
    }
  });

  it('creates a canonical single-pack catalog with sorted required keys', () => {
    const result = createSinglePackAssetCatalog({
      profile: 'test',
      packId,
      manifestPath: `packs/${packDirectory}/pack.json`,
      requiredKeys: [
        createAssetKey('outfit:tibia:knight'),
        createAssetKey('item:tibia:gold-coin'),
        createAssetKey('creature:tibia:rotworm'),
      ],
    });

    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        profile: 'test',
        preloads: [
          {
            packId,
            requiredKeys: [
              'creature:tibia:rotworm',
              'item:tibia:gold-coin',
              'outfit:tibia:knight',
            ],
          },
        ],
      }),
    });
  });

  it('stages validated packs byte-for-byte with the requested catalog profile', async () => {
    const sourceRoot = await createProfileFixture({ profile: 'test' });
    const destinationParent = await mkdtemp(
      join(tmpdir(), 'huntbound-profile-stage-'),
    );
    temporaryRoots.push(destinationParent);
    const destinationRoot = join(destinationParent, 'product');

    const result = await stageAssetProfile({
      profile: 'product',
      sourceProfileRoot: sourceRoot,
      destinationProfileRoot: destinationRoot,
    });

    expect(result.ok).toBe(true);
    const catalog = JSON.parse(
      await readFile(join(destinationRoot, 'catalog.json'), 'utf8'),
    ) as { profile: string };
    expect(catalog.profile).toBe('product');
    expect(
      await readFile(
        join(destinationRoot, 'packs', packDirectory, 'pack.json'),
      ),
    ).toEqual(
      await readFile(join(sourceRoot, 'packs', packDirectory, 'pack.json')),
    );
  });
});
