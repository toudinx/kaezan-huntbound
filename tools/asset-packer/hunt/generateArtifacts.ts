import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type {
  AssetSelectionManifest,
  AssetSourceLock,
  HuntPackSelection,
} from '../../../packages/assets/src/index.ts';
import type { MapRegion } from '../../../packages/contracts/src/hunt/types.ts';
import { createAssetSourceLock } from '../source/sourceLock.ts';
import { sourceMapForAsset } from '../source/sourceManifest.ts';
import {
  createVisibleFallbackPng,
  cropSpellIconAtlas,
  type VisibleFallbackKind,
} from '../spells/cropSpellIcons.ts';
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
const preparedPersonalSpellRoots = new Set<string>();
const preparedPersonalFallbackRoots = new Set<string>();
const allowPersonalDevFallbacks =
  process.env.HUNTBOUND_DEV_ALLOW_PERSONAL_ASSET_FALLBACKS === '1';
const PERSONAL_FALLBACK_CELL_SIZE = 32;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

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

/** Keeps a generated placeholder at the same scale as one world sqm. */
function personalFallbackSourceEntry(file: string) {
  return {
    ...sourceEntry(file),
    cellW: PERSONAL_FALLBACK_CELL_SIZE,
    cellH: PERSONAL_FALLBACK_CELL_SIZE,
  };
}

function sourcePathForEntry(
  entry: AssetSelectionManifest['entries'][number],
): string {
  const { name, id } = sourceMapForAsset(entry.category, entry.sourceIdentity);
  return `${name}/${id}.png`;
}

async function ensurePersonalFallbackAssets(
  sourceRoot: string,
  selection: AssetSelectionManifest,
): Promise<void> {
  const manifestPath = join(sourceRoot, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<
    string,
    unknown
  >;
  let manifestChanged = false;

  for (const entry of selection.entries) {
    const { name, id } = sourceMapForAsset(
      entry.category,
      entry.sourceIdentity,
    );
    const map = isRecord(manifest[name]) ? manifest[name] : {};
    const key = String(id);
    const existingEntry = isRecord(map[key]) ? map[key] : undefined;
    const sourcePath =
      existingEntry !== undefined && typeof existingEntry.file === 'string'
        ? existingEntry.file
        : sourcePathForEntry(entry);
    const isGeneratedFallback =
      existingEntry?.name === '' &&
      existingEntry?.cellW === 1 &&
      existingEntry?.cellH === 1 &&
      existingEntry?.cols === 1 &&
      isRecord(existingEntry.groups);

    if (existingEntry === undefined || isGeneratedFallback) {
      map[key] = personalFallbackSourceEntry(sourcePath);
      manifestChanged = true;
    }

    const mediaPath = join(sourceRoot, sourcePath);
    if (!(await isFile(mediaPath))) {
      await mkdir(dirname(mediaPath), { recursive: true });
      const fallbackKind: VisibleFallbackKind =
        entry.category === 'object' ? 'tile' : 'spell';
      await writeFile(mediaPath, createVisibleFallbackPng(id, fallbackKind));
    }
    manifest[name] = map;
  }

  if (manifestChanged) {
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
}

function syntheticManifest(selection: AssetSelectionManifest) {
  const maps = {
    outfits: {} as Record<string, ReturnType<typeof sourceEntry>>,
    objects: {} as Record<string, ReturnType<typeof sourceEntry>>,
    effects: {} as Record<string, ReturnType<typeof sourceEntry>>,
    missiles: {} as Record<string, ReturnType<typeof sourceEntry>>,
    spells: {} as Record<string, ReturnType<typeof sourceEntry>>,
  };
  for (const entry of selection.entries) {
    const { name, id } = sourceMapForAsset(
      entry.category,
      entry.sourceIdentity,
    );
    maps[name][String(id)] = sourceEntry(sourcePathForEntry(entry));
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
    assetSelection: entry.assetSelection,
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
    assetSelection: entry.assetSelection,
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
    false,
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
    assetSelection: entry.assetSelection,
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
        assetSelection: entry.assetSelection,
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
  if (!options.check && !preparedPersonalSpellRoots.has(sourceRoot)) {
    const result = await cropSpellIconAtlas({
      sourceRoot,
      allowMissingAtlas: allowPersonalDevFallbacks,
    });
    if (result.usedFallback) {
      console.warn(
        'Personal spell atlas not found; generated visible local fallback icons for dev.',
      );
    }
    preparedPersonalSpellRoots.add(sourceRoot);
  }
  if (!options.check && allowPersonalDevFallbacks) {
    if (!preparedPersonalFallbackRoots.has(sourceRoot)) {
      for (const candidate of listHuntPipelineEntries()) {
        const candidateRegion = await readRegion(candidate);
        const candidateHunt = deriveHuntPackSelection(candidateRegion, {
          huntId: candidate.huntId,
          packKey: candidate.packKey,
          assetSelection: candidate.assetSelection,
        });
        await ensurePersonalFallbackAssets(
          sourceRoot,
          createHuntAssetSelection({
            hunt: candidateHunt,
            group: candidate.personalGroup,
            consumer: candidate.consumer,
            assetSelection: candidate.assetSelection,
          }),
        );
      }
      preparedPersonalFallbackRoots.add(sourceRoot);
    }
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
