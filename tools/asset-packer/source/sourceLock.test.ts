import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  type AssetSelectionManifest,
  AssetSelectionManifestSchema,
} from '@huntbound/assets';
import { afterEach, describe, expect, it } from 'vitest';

import { createAssetSourceLock, verifyAssetSourceLock } from './sourceLock.ts';

const roots: string[] = [];

const identities = [
  { kind: 'lookType', id: 131 },
  { kind: 'lookType', id: 26 },
  { kind: 'clientId', id: 3031 },
  { kind: 'effectId', id: 12 },
  { kind: 'missileId', id: 36 },
] as const;

const keys = [
  'outfit:tibia:knight',
  'creature:tibia:rotworm',
  'item:tibia:gold-coin',
  'effect:tibia:energy-hit',
  'missile:tibia:energy-ball',
] as const;

const categories = [
  'outfit',
  'creature',
  'object',
  'effect',
  'missile',
] as const;
const paths = [
  'outfits/131.png',
  'outfits/26.png',
  'objects/3031.png',
  'effects/12.png',
  'missiles/36.png',
] as const;

function selectionManifest(): AssetSelectionManifest {
  return AssetSelectionManifestSchema.parse({
    schemaVersion: '1',
    selectionId: 'fixture:pb-02-contract-coverage',
    packId: 'asset-pack:fixture:pb-02-contract-coverage',
    contentVersion: 'pb-02-contract-coverage@1',
    buildProfiles: ['test', 'product'],
    groups: [
      {
        groupId: 'huntbound-test',
        source: 'huntbound-synthetic-fixture',
        sourceSnapshot: 'pb02-synthetic-v1',
        licenseClass: 'huntbound-test',
        buildProfiles: ['test', 'product'],
      },
    ],
    entries: keys.map((key, index) => ({
      key,
      category: categories[index],
      sourceIdentity: identities[index],
      sourceGroupId: 'huntbound-test',
      consumer: 'PB-02 browser contract fixture',
      rationale: `Covers ${key}.`,
      presentation: {
        pivot: { x: 0.5, y: index < 2 ? 1 : 0.5 },
        scale: 1,
        filtering: 'nearest',
      },
    })),
  });
}

function sourceEntry(file: string) {
  return {
    name: '',
    file,
    cellW: 1,
    cellH: 1,
    cols: 1,
    groups: {
      kind: 'default',
      patternX: 1,
      patternY: 1,
      patternZ: 1,
      layers: 1,
      phases: [[100, 100]],
      start: 0,
      count: 1,
    },
    flags: {},
  };
}

function sourceManifest() {
  return {
    outfits: {
      '131': sourceEntry(paths[0]),
      '26': sourceEntry(paths[1]),
    },
    objects: { '3031': sourceEntry(paths[2]) },
    effects: { '12': sourceEntry(paths[3]) },
    missiles: { '36': sourceEntry(paths[4]) },
    semantic: {},
    objectNames: {},
  };
}

async function createTemporarySource(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'pb02-source-lock-'));
  roots.push(root);
  await Promise.all(
    [...new Set(paths.map((path) => join(root, path, '..')))].map((directory) =>
      mkdir(directory, { recursive: true }),
    ),
  );
  await writeFile(
    join(root, 'manifest.json'),
    JSON.stringify(sourceManifest()),
  );
  await Promise.all(
    paths.map((path, index) =>
      writeFile(join(root, path), Buffer.from([index + 1])),
    ),
  );
  return root;
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('PB-02 source lock', () => {
  it('creates a deterministic lock and aggregates two changed files', async () => {
    const sourceRoot = await createTemporarySource();
    const input = {
      sourceRoot,
      selection: selectionManifest(),
      source: 'huntbound-synthetic-fixture',
      sourceSnapshot: 'pb02-synthetic-v1',
    } as const;

    const first = await createAssetSourceLock(input);
    const second = await createAssetSourceLock(input);

    expect(second).toEqual(first);
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error('lock creation should pass');
    expect(first.value.files.map(({ key }) => key)).toEqual([...keys].sort());

    await writeFile(join(sourceRoot, paths[0]), Buffer.from('changed-1'));
    await writeFile(join(sourceRoot, paths[1]), Buffer.from('changed-2'));
    const verified = await verifyAssetSourceLock({
      sourceRoot,
      lock: first.value,
    });

    expect(verified.ok).toBe(false);
    if (!verified.ok) {
      expect(
        verified.diagnostics.filter(
          ({ code }) => code === 'ASSET_MEDIA_HASH_MISMATCH',
        ),
      ).toHaveLength(2);
      expect(JSON.stringify(verified.diagnostics)).not.toContain(sourceRoot);
    }
  });

  it('rejects media symlinks that escape the source root', async ({ skip }) => {
    const sourceRoot = await createTemporarySource();
    const outsideRoot = await mkdtemp(join(tmpdir(), 'pb02-source-outside-'));
    roots.push(outsideRoot);
    const outsideOutfits = join(outsideRoot, 'outfits');
    await mkdir(outsideOutfits, { recursive: true });
    await writeFile(join(outsideOutfits, '131.png'), Buffer.from('outside'));

    try {
      await rm(join(sourceRoot, 'outfits'), { recursive: true });
      await symlink(outsideOutfits, join(sourceRoot, 'outfits'), 'junction');
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error.code === 'EPERM' || error.code === 'EACCES')
      ) {
        skip('filesystem does not allow symlink creation in this environment');
      }
      throw error;
    }

    const result = await createAssetSourceLock({
      sourceRoot,
      selection: selectionManifest(),
      source: 'huntbound-synthetic-fixture',
      sourceSnapshot: 'pb02-synthetic-v1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'ASSET_PATH_UNSAFE',
            path: ['outfits', '131.png'],
          }),
        ]),
      );
    }
  });

  it('reports a missing manifest without reading a source root into diagnostics', async () => {
    const sourceRoot = await createTemporarySource();
    await rm(join(sourceRoot, 'manifest.json'));

    const result = await createAssetSourceLock({
      sourceRoot,
      selection: selectionManifest(),
      source: 'huntbound-synthetic-fixture',
      sourceSnapshot: 'pb02-synthetic-v1',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(JSON.stringify(result.diagnostics)).not.toContain(sourceRoot);
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'ASSET_MEDIA_MISSING',
            path: ['manifest.json'],
          }),
        ]),
      );
    }
  });
});
