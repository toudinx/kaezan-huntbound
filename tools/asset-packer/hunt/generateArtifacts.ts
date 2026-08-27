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
  getHuntPipelineEntry,
  type HuntPipelineEntry,
  listHuntPipelineEntries,
} from './huntRegistry.ts';
import {
  createHuntAssetSelection,
  deriveHuntPackSelection,
} from './huntSelection.ts';

const repositoryRoot = resolve(import.meta.dirname, '../../..');
const transparentPixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

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

function sourcePathForEntry(
  entry: AssetSelectionManifest['entries'][number],
): string {
  const directory = (() => {
    switch (entry.sourceIdentity.kind) {
      case 'lookType':
        return 'outfits';
      case 'clientId':
        return 'objects';
      case 'effectId':
        return 'effects';
      case 'missileId':
        return 'missiles';
    }
  })();
  return `${directory}/${entry.sourceIdentity.id}.png`;
}

function syntheticManifest(selection: AssetSelectionManifest) {
  const maps = {
    outfits: {} as Record<string, ReturnType<typeof sourceEntry>>,
    objects: {} as Record<string, ReturnType<typeof sourceEntry>>,
    effects: {} as Record<string, ReturnType<typeof sourceEntry>>,
    missiles: {} as Record<string, ReturnType<typeof sourceEntry>>,
  };
  for (const entry of selection.entries) {
    const mapName = (() => {
      switch (entry.sourceIdentity.kind) {
        case 'lookType':
          return 'outfits';
        case 'clientId':
          return 'objects';
        case 'effectId':
          return 'effects';
        case 'missileId':
          return 'missiles';
      }
    })();
    maps[mapName][String(entry.sourceIdentity.id)] = sourceEntry(
      sourcePathForEntry(entry),
    );
  }
  return {
    ...maps,
    semantic: {},
    objectNames: {},
  };
}

function syntheticPaths(selection: AssetSelectionManifest): readonly string[] {
  return [
    ...new Set(selection.entries.map((entry) => sourcePathForEntry(entry))),
  ].sort();
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
  selection: AssetSelectionManifest,
  sourceRoot: string,
  check: boolean,
): Promise<void> {
  const manifest = canonicalJson(syntheticManifest(selection));
  await writeOrCheck(join(sourceRoot, 'manifest.json'), manifest, check);
  for (const path of syntheticPaths(selection)) {
    await writeOrCheck(join(sourceRoot, path), transparentPixel, check);
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

async function readRegion(entry: HuntPipelineEntry): Promise<MapRegion> {
  return JSON.parse(
    await readFile(
      join(repositoryRoot, entry.generatedDirectory, 'region.json'),
      'utf8',
    ),
  ) as MapRegion;
}

async function writeTestArtifacts(
  entry: HuntPipelineEntry,
  hunt: HuntPackSelection,
  check: boolean,
): Promise<void> {
  const testRoot = join(repositoryRoot, entry.assetFixtureRoot);
  const selection = createHuntAssetSelection({
    hunt,
    group: entry.testGroup,
    consumer: entry.consumer,
  });
  await writeSourceFixture(selection, join(testRoot, 'source'), check);
  const sourceLock = await lockFor({
    sourceRoot: join(testRoot, 'source'),
    selection,
    source: entry.testGroup.source,
    sourceSnapshot: entry.testGroup.sourceSnapshot,
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
  entry: HuntPipelineEntry,
  hunt: HuntPackSelection,
  sourceRoot: string,
  check: boolean,
): Promise<void> {
  const selection = createHuntAssetSelection({
    hunt,
    group: entry.personalGroup,
    consumer: entry.consumer,
  });
  const sourceLock = await lockFor({
    sourceRoot,
    selection,
    source: entry.personalGroup.source,
    sourceSnapshot: entry.personalGroup.sourceSnapshot,
  });
  await writePersonalSelection(entry, selection, check);
  const testRoot = join(repositoryRoot, entry.assetFixtureRoot);
  await writeOrCheck(
    join(testRoot, 'personal-source-lock.json'),
    canonicalJson(sourceLock),
    check,
  );
}

async function writePersonalSelection(
  entry: HuntPipelineEntry,
  selection: AssetSelectionManifest,
  check: boolean,
): Promise<void> {
  await writeOrCheck(
    join(repositoryRoot, entry.personalSelectionPath),
    canonicalJson(selection),
    check,
  );
}

export type GenerateHuntArtifactsOptions = {
  readonly profile: 'test' | 'personal';
  readonly check: boolean;
  readonly selectionOnly?: boolean;
  readonly personalSourceRoot?: string;
};

export async function generateHuntArtifacts(
  entry: HuntPipelineEntry,
  options: GenerateHuntArtifactsOptions,
): Promise<void> {
  const region = await readRegion(entry);
  const hunt = deriveHuntPackSelection(region, {
    huntId: entry.huntId,
    packKey: entry.packKey,
    creatureKey: entry.creatureKey,
    lootKeys: entry.lootKeys,
  });

  if (options.profile === 'test') {
    await writeTestArtifacts(entry, hunt, options.check);
    return;
  }

  if (options.selectionOnly === true) {
    await writePersonalSelection(
      entry,
      createHuntAssetSelection({
        hunt,
        group: entry.personalGroup,
        consumer: entry.consumer,
      }),
      options.check,
    );
    return;
  }

  const sourceRoot =
    options.personalSourceRoot ?? process.env.HUNTBOUND_PERSONAL_ASSET_SOURCE;
  if (sourceRoot === undefined) {
    throw new Error(
      'HUNTBOUND_PERSONAL_ASSET_SOURCE is required for personal hunt assets',
    );
  }
  await writePersonalArtifacts(entry, hunt, sourceRoot, options.check);
}

function option(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  const value = index < 0 ? undefined : args[index + 1];
  return value === undefined || value.startsWith('--') ? undefined : value;
}

export async function runGenerateArtifacts(
  args: readonly string[] = process.argv.slice(2),
): Promise<void> {
  const argSet = new Set(args);
  const check = argSet.has('--check');
  const profile = argSet.has('--personal') ? 'personal' : 'test';
  const selectionOnly = argSet.has('--selection-only');
  const requestedHuntId = option(args, '--hunt-id');
  const entries =
    requestedHuntId === undefined
      ? listHuntPipelineEntries()
      : (() => {
          const entry = getHuntPipelineEntry(requestedHuntId);
          if (entry === undefined) {
            throw new Error(`Unknown hunt pipeline id: ${requestedHuntId}`);
          }
          return [entry];
        })();

  for (const entry of entries) {
    await generateHuntArtifacts(entry, {
      profile,
      check,
      selectionOnly,
    });
  }
}

if (import.meta.main) {
  try {
    await runGenerateArtifacts();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
