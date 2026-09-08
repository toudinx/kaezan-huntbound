import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';

import {
  AssetSelectionManifestSchema,
  AssetSourceLockSchema,
} from '@huntbound/assets';
import { afterEach, describe, expect, it } from 'vitest';
import {
  type AssetPackFileSystem,
  nodeAssetPackFileSystem,
} from '../filesystem/AssetPackFileSystem.ts';
import { verifyMaterializedAssetPack } from '../pack/verifyMaterializedAssetPack.ts';
import { parseArenaFableSourceManifest } from '../source/sourceManifest.ts';
import { createPb02SyntheticSource } from '../testing/createPb02SyntheticSource.ts';
import { buildAssetPackManifest } from './buildAssetPack.ts';
import {
  createAssetPackMaterializer,
  materializeAssetPack,
} from './materializeAssetPack.ts';

const roots: string[] = [];
const fixtureRoot = resolve(
  import.meta.dirname,
  '../../../packages/test-fixtures/assets/pb02',
);
const mediaSha256 =
  '431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460';

async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

async function directoryEntries(path: string): Promise<readonly string[]> {
  try {
    return (await readdir(path)).sort();
  } catch {
    return [];
  }
}

async function createFixture() {
  // realpath, because the promotion test compares a path the materializer
  // reports against this one: the macOS temp directory is a symlink and the
  // raw mkdtemp result never matches what the filesystem hands back.
  const root = await realpath(
    await mkdtemp(join(tmpdir(), 'pb02-materialize-')),
  );
  roots.push(root);
  const sourceRoot = join(root, 'source');
  const destination = join(root, 'output', 'pack');
  await createPb02SyntheticSource({ destinationRoot: sourceRoot });

  const selection = AssetSelectionManifestSchema.parse(
    JSON.parse(
      await readFile(join(fixtureRoot, 'selection.json'), 'utf8'),
    ) as unknown,
  );
  const sourceLock = AssetSourceLockSchema.parse(
    JSON.parse(
      await readFile(join(fixtureRoot, 'source-lock.json'), 'utf8'),
    ) as unknown,
  );
  const parsedSource = parseArenaFableSourceManifest(
    JSON.parse(
      await readFile(join(sourceRoot, 'manifest.json'), 'utf8'),
    ) as unknown,
  );
  if (!parsedSource.ok) throw new Error('synthetic source should parse');
  const built = buildAssetPackManifest({
    selection,
    sourceLock,
    sourceManifest: parsedSource.value,
  });
  if (!built.ok) throw new Error('synthetic pack manifest should build');

  return { root, sourceRoot, destination, manifest: built.value };
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('asset pack materialization', () => {
  it('writes a verified pack and copies identical media bytes only once', async () => {
    const fixture = await createFixture();

    const result = await materializeAssetPack(fixture);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('materialization should pass');
    expect(result.value).toMatchObject({
      packId: 'asset-pack:fixture:pb-02-contract-coverage',
      mediaCount: 1,
      paths: [`media/${mediaSha256}.png`, 'pack.json', 'pack.sha256'],
    });
    expect(result.value.byteCount).toBeGreaterThan(68);
    expect(await directoryEntries(join(fixture.destination, 'media'))).toEqual([
      `${mediaSha256}.png`,
    ]);
    expect(
      await verifyMaterializedAssetPack({ packRoot: fixture.destination }),
    ).toMatchObject({
      ok: true,
      value: {
        packId: 'asset-pack:fixture:pb-02-contract-coverage',
        mediaCount: 1,
      },
    });
  });

  it('aggregates corrupt source media before creating the destination parent or staging', async () => {
    const fixture = await createFixture();
    await writeFile(
      join(fixture.sourceRoot, 'outfits', '131.png'),
      Buffer.alloc(68, 1),
    );
    await writeFile(
      join(fixture.sourceRoot, 'outfits', '26.png'),
      Buffer.alloc(69, 2),
    );

    const result = await materializeAssetPack(fixture);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('corrupt source should fail');
    expect(result.diagnostics.map(({ code }) => code)).toEqual([
      'ASSET_MEDIA_HASH_MISMATCH',
      'ASSET_MEDIA_SIZE_MISMATCH',
      'ASSET_MEDIA_HASH_MISMATCH',
    ]);
    expect(JSON.stringify(result.diagnostics)).not.toContain(fixture.root);
    expect(await directoryEntries(join(fixture.root, 'output'))).toEqual([]);
  });

  it('preserves the previous output when a staging write fails', async () => {
    const fixture = await createFixture();
    const previous = await materializeAssetPack(fixture);
    if (!previous.ok) throw new Error('previous pack should materialize');
    const previousPackJson = await readFile(
      join(fixture.destination, 'pack.json'),
    );
    const failingFileSystem: AssetPackFileSystem = {
      ...nodeAssetPackFileSystem,
      async writeFile(path, data) {
        if (
          path.includes(`${sep}.staging-`) &&
          basename(path) === 'pack.json'
        ) {
          throw new Error('injected staging write failure');
        }
        await nodeAssetPackFileSystem.writeFile(path, data);
      },
    };

    const result =
      await createAssetPackMaterializer(failingFileSystem)(fixture);

    expect(result.ok).toBe(false);
    expect(await readFile(join(fixture.destination, 'pack.json'))).toEqual(
      previousPackJson,
    );
    expect(
      await verifyMaterializedAssetPack({ packRoot: fixture.destination }),
    ).toMatchObject({ ok: true });
    expect(await directoryEntries(join(fixture.root, 'output'))).toEqual([
      'pack',
    ]);
  });

  it('rejects an existing non-directory destination without replacing it', async () => {
    const fixture = await createFixture();
    await mkdir(join(fixture.root, 'output'), { recursive: true });
    await writeFile(fixture.destination, 'do-not-replace');

    const result = await materializeAssetPack(fixture);

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'ASSET_PATH_UNSAFE', path: ['destination'] }],
    });
    expect(await readFile(fixture.destination, 'utf8')).toBe('do-not-replace');
    expect(await directoryEntries(join(fixture.root, 'output'))).toEqual([
      'pack',
    ]);
  });

  it('rejects an unrelated destination directory without deleting its contents', async () => {
    const fixture = await createFixture();
    await mkdir(fixture.destination, { recursive: true });
    await writeFile(join(fixture.destination, 'sentinel.txt'), 'unrelated');

    const result = await materializeAssetPack(fixture);

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'ASSET_PACK_CONFLICT', path: ['destination'] }],
    });
    expect(
      await readFile(join(fixture.destination, 'sentinel.txt'), 'utf8'),
    ).toBe('unrelated');
  });

  it('rejects a valid pack tree with an unexpected file before replacement', async () => {
    const fixture = await createFixture();
    const previous = await materializeAssetPack(fixture);
    if (!previous.ok) throw new Error('previous pack should materialize');
    await writeFile(join(fixture.destination, 'sentinel.txt'), 'unrelated');

    expect(
      await verifyMaterializedAssetPack({ packRoot: fixture.destination }),
    ).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'ASSET_PACK_CONFLICT', path: ['sentinel.txt'] }],
    });
    const result = await materializeAssetPack(fixture);

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'ASSET_PACK_CONFLICT', path: ['destination'] }],
    });
    expect(
      await readFile(join(fixture.destination, 'sentinel.txt'), 'utf8'),
    ).toBe('unrelated');
    expect(await directoryEntries(join(fixture.root, 'output'))).toEqual([
      'pack',
    ]);
  });

  it('rolls the previous output back when staging promotion fails', async () => {
    const fixture = await createFixture();
    const previous = await materializeAssetPack(fixture);
    if (!previous.ok) throw new Error('previous pack should materialize');
    const previousPackJson = await readFile(
      join(fixture.destination, 'pack.json'),
    );
    const destination = resolve(fixture.destination);
    const failingFileSystem: AssetPackFileSystem = {
      ...nodeAssetPackFileSystem,
      async rename(source, target) {
        if (
          source.includes(`${sep}.staging-`) &&
          resolve(target) === destination
        ) {
          throw new Error('injected promotion failure');
        }
        await nodeAssetPackFileSystem.rename(source, target);
      },
    };

    const result =
      await createAssetPackMaterializer(failingFileSystem)(fixture);

    expect(result.ok).toBe(false);
    expect(await readFile(join(fixture.destination, 'pack.json'))).toEqual(
      previousPackJson,
    );
    expect(
      await verifyMaterializedAssetPack({ packRoot: fixture.destination }),
    ).toMatchObject({ ok: true });
    expect(await directoryEntries(join(fixture.root, 'output'))).toEqual([
      'pack',
    ]);
  });

  it('refuses promotion when the staging target becomes unsafe before rename', async () => {
    const fixture = await createFixture();
    const previous = await materializeAssetPack(fixture);
    if (!previous.ok) throw new Error('previous pack should materialize');
    const previousPackJson = await readFile(
      join(fixture.destination, 'pack.json'),
    );
    const changingFileSystem: AssetPackFileSystem = {
      ...nodeAssetPackFileSystem,
      async lstat(path) {
        const actual = await nodeAssetPackFileSystem.lstat(path);
        if (basename(path).startsWith('.staging-') && actual.isDirectory()) {
          return {
            isDirectory: () => false,
            isFile: () => false,
            isSymbolicLink: () => true,
          };
        }
        return actual;
      },
    };

    const result =
      await createAssetPackMaterializer(changingFileSystem)(fixture);

    expect(result).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'ASSET_PATH_UNSAFE', path: ['staging'] }],
    });
    expect(await readFile(join(fixture.destination, 'pack.json'))).toEqual(
      previousPackJson,
    );
  });

  it('detects removed media plus independent byte-length and hash divergence', async () => {
    const fixture = await createFixture();
    const mediaPath = join(fixture.destination, 'media', `${mediaSha256}.png`);
    const first = await materializeAssetPack(fixture);
    if (!first.ok) throw new Error('initial materialization should pass');

    await rm(mediaPath);
    const missing = await verifyMaterializedAssetPack({
      packRoot: fixture.destination,
    });
    expect(missing).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'ASSET_MEDIA_MISSING' }],
    });

    await rm(fixture.destination, { recursive: true });
    const second = await materializeAssetPack(fixture);
    if (!second.ok) throw new Error('second materialization should pass');
    await writeFile(mediaPath, Buffer.alloc(68, 1));
    const wrongHash = await verifyMaterializedAssetPack({
      packRoot: fixture.destination,
    });
    expect(wrongHash).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'ASSET_MEDIA_HASH_MISMATCH' }],
    });

    await rm(fixture.destination, { recursive: true });
    const third = await materializeAssetPack(fixture);
    if (!third.ok) throw new Error('third materialization should pass');
    await writeFile(mediaPath, Buffer.alloc(69, 2));
    const wrongLength = await verifyMaterializedAssetPack({
      packRoot: fixture.destination,
    });
    expect(wrongLength).toMatchObject({
      ok: false,
      diagnostics: [
        { code: 'ASSET_MEDIA_HASH_MISMATCH' },
        { code: 'ASSET_MEDIA_SIZE_MISMATCH' },
      ],
    });
    expect(await fileExists(join(fixture.destination, 'pack.json'))).toBe(true);
  });
});
