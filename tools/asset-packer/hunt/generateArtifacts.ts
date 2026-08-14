import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type {
  AssetSelectionManifest,
  AssetSourceLock,
  HuntPackSelection,
} from '../../../packages/assets/src/index.ts';
import type { MapRegion } from '../../../packages/contracts/src/hunt/types.ts';
import { createAssetSourceLock } from '../source/sourceLock.ts';
import {
  createHuntAssetSelection,
  deriveHuntPackSelection,
} from './huntSelection.ts';

const repositoryRoot = resolve(import.meta.dirname, '../../..');
const regionPath = join(
  repositoryRoot,
  'packages/content/src/generated/hunts/venore-rotworm-cave/region.json',
);
const testRoot = join(repositoryRoot, 'packages/test-fixtures/assets/pb04');
const testSourceRoot = join(testRoot, 'source');
const transparentPixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

const testGroup = {
  groupId: 'huntbound-test',
  source: 'huntbound-synthetic-fixture',
  sourceSnapshot: 'pb04-synthetic-v1',
  licenseClass: 'huntbound-test' as const,
  buildProfiles: ['test', 'product'] as const,
};

const personalGroup = {
  groupId: 'huntbound-private-assets-pb04',
  source: 'huntbound-private-assets',
  sourceSnapshot: 'pb04-private-v1',
  licenseClass: 'cipsoft-personal' as const,
  buildProfiles: ['personal'] as const,
};

function canonicalJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
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

function tileIds(hunt: HuntPackSelection): readonly number[] {
  return hunt.keys
    .filter((key) => key.startsWith('tile:tibia:'))
    .map((key) => Number(key.slice('tile:tibia:'.length)))
    .sort((left, right) => left - right);
}

function syntheticManifest(hunt: HuntPackSelection) {
  const objects = Object.fromEntries(
    tileIds(hunt).map((id) => [String(id), sourceEntry(`objects/${id}.png`)]),
  );
  return {
    outfits: {
      '26': sourceEntry('outfits/26.png'),
      '131': sourceEntry('outfits/131.png'),
    },
    objects,
    effects: {},
    missiles: {},
    semantic: {},
    objectNames: {},
  };
}

function syntheticPaths(hunt: HuntPackSelection): readonly string[] {
  return [
    'outfits/26.png',
    'outfits/131.png',
    ...tileIds(hunt).map((id) => `objects/${id}.png`),
  ];
}

async function writeOrCheck(
  path: string,
  contents: string | Uint8Array,
  check: boolean,
): Promise<void> {
  if (check) {
    const actual = await readFile(path);
    const expected =
      typeof contents === 'string' ? Buffer.from(contents, 'utf8') : contents;
    if (!actual.equals(expected)) {
      throw new Error(`Generated artifact differs: ${path}`);
    }
    return;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
}

async function writeSourceFixture(
  hunt: HuntPackSelection,
  check: boolean,
): Promise<void> {
  const manifest = canonicalJson(syntheticManifest(hunt));
  await writeOrCheck(join(testSourceRoot, 'manifest.json'), manifest, check);
  for (const path of syntheticPaths(hunt)) {
    await writeOrCheck(join(testSourceRoot, path), transparentPixel, check);
  }
}

async function lockFor(input: {
  readonly sourceRoot: string;
  readonly selection: AssetSelectionManifest;
  readonly source: string;
  readonly sourceSnapshot: string;
}): Promise<AssetSourceLock> {
  const result = await createAssetSourceLock(input);
  if (!result.ok) {
    throw new Error(
      result.diagnostics.map(({ message }) => message).join('\n'),
    );
  }
  return result.value;
}

async function readRegion(): Promise<MapRegion> {
  return JSON.parse(await readFile(regionPath, 'utf8')) as MapRegion;
}

async function writeTestArtifacts(
  hunt: HuntPackSelection,
  check: boolean,
): Promise<void> {
  const selection = createHuntAssetSelection({ hunt, group: testGroup });
  await writeSourceFixture(hunt, check);
  const sourceLock = await lockFor({
    sourceRoot: testSourceRoot,
    selection,
    source: testGroup.source,
    sourceSnapshot: testGroup.sourceSnapshot,
  });
  await writeOrCheck(
    join(testRoot, 'selection.json'),
    canonicalJson(selection),
    check,
  );
  await writeOrCheck(
    join(testRoot, 'source-lock.json'),
    canonicalJson(sourceLock),
    check,
  );
}

async function writePersonalArtifacts(
  hunt: HuntPackSelection,
  sourceRoot: string,
  check: boolean,
): Promise<void> {
  const selection = createHuntAssetSelection({
    hunt,
    group: personalGroup,
  });
  const sourceLock = await lockFor({
    sourceRoot,
    selection,
    source: personalGroup.source,
    sourceSnapshot: personalGroup.sourceSnapshot,
  });
  await writeOrCheck(
    join(
      repositoryRoot,
      'packages/assets/catalog/selections/pb-04-venore-rotworm-cave.json',
    ),
    canonicalJson(selection),
    check,
  );
  await writeOrCheck(
    join(testRoot, 'personal-source-lock.json'),
    canonicalJson(sourceLock),
    check,
  );
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const check = args.has('--check');
  const profile = args.has('--personal') ? 'personal' : 'test';
  const region = await readRegion();
  const hunt = deriveHuntPackSelection(region);

  if (profile === 'test') {
    await writeTestArtifacts(hunt, check);
    return;
  }

  const sourceRoot = process.env.HUNTBOUND_PERSONAL_ASSET_SOURCE;
  if (sourceRoot === undefined) {
    throw new Error(
      'HUNTBOUND_PERSONAL_ASSET_SOURCE is required for PB-04 personal assets',
    );
  }
  await writePersonalArtifacts(hunt, sourceRoot, check);
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
