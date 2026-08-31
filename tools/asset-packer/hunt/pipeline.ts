import { join, resolve } from 'node:path';

import { type AssetPackerCliIo, runAssetPackerCli } from '../cli.ts';
import { checkHuntPack } from './checkHuntPack.ts';
import { generateHuntArtifacts } from './generateArtifacts.ts';
import { listHuntPipelineEntries } from './huntRegistry.ts';

const repositoryRoot = resolve(import.meta.dirname, '../../..');

type StageProfile = 'test' | 'product';

export function compactAssetPipelineOutput(value: unknown): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const record = value as Readonly<Record<string, unknown>>;
  if (!Array.isArray(record.paths)) return value;

  const { paths, ...summary } = record;
  return { ...summary, pathCount: paths.length };
}

const compactProcessIo: AssetPackerCliIo = {
  stdout(value) {
    process.stdout.write(
      `${JSON.stringify(compactAssetPipelineOutput(value))}\n`,
    );
  },
  stderr(value) {
    process.stderr.write(`${JSON.stringify(value)}\n`);
  },
  usage() {
    process.stderr.write('Invalid asset packer command.\n');
  },
};

function workspacePath(relativePath: string): string {
  return resolve(repositoryRoot, relativePath);
}

function pathsFor(entry: ReturnType<typeof listHuntPipelineEntries>[number]) {
  const fixtureRoot = workspacePath(entry.assetFixtureRoot);
  return {
    testSelection: join(fixtureRoot, 'selection.json'),
    testSourceLock: join(fixtureRoot, 'source-lock.json'),
    testSourceRoot: join(fixtureRoot, 'source'),
    testProfileRoot: join(fixtureRoot, 'expected', 'test'),
    productProfileRoot: join(fixtureRoot, 'expected', 'product'),
    personalSelection: workspacePath(entry.personalSelectionPath),
    personalSourceLock: join(fixtureRoot, 'personal-source-lock.json'),
    personalProfileRoot: workspacePath(
      join('apps/game/public/assets/personal', entry.runtimeDirectory),
    ),
    region: workspacePath(join(entry.generatedDirectory, 'region.json')),
    testPack: join(
      fixtureRoot,
      'expected',
      'test',
      'packs',
      entry.packKey,
      'pack.json',
    ),
    personalPack: workspacePath(
      join(
        'apps/game/public/assets/personal',
        entry.runtimeDirectory,
        'packs',
        entry.packKey,
        'pack.json',
      ),
    ),
  };
}

async function runAssetCommand(
  entry: ReturnType<typeof listHuntPipelineEntries>[number],
  args: readonly string[],
): Promise<void> {
  const status = await runAssetPackerCli(args, compactProcessIo);
  if (status !== 0) {
    throw new Error(`Asset pipeline command failed for ${entry.huntId}`);
  }
}

export async function checkHuntPacks(): Promise<void> {
  for (const entry of listHuntPipelineEntries()) {
    const paths = pathsFor(entry);
    await runAssetCommand(entry, [
      'build-profile',
      '--check',
      '--profile',
      'test',
      '--selection',
      paths.testSelection,
      '--source-lock',
      paths.testSourceLock,
      '--source-root',
      paths.testSourceRoot,
      '--output',
      paths.testProfileRoot,
    ]);
  }
}

export async function checkHuntProfiles(): Promise<void> {
  for (const entry of listHuntPipelineEntries()) {
    const paths = pathsFor(entry);
    await runAssetCommand(entry, [
      'profile-check',
      '--profile',
      'test',
      '--profile-root',
      paths.testProfileRoot,
    ]);
    await runAssetCommand(entry, [
      'profile-check',
      '--profile',
      'product',
      '--profile-root',
      paths.productProfileRoot,
    ]);
  }
}

export async function checkHuntPacksAgainstRegions(
  personal = false,
): Promise<void> {
  for (const entry of listHuntPipelineEntries()) {
    const paths = pathsFor(entry);
    const summary = await checkHuntPack({
      selectionPath: personal ? paths.personalSelection : paths.testSelection,
      regionPath: paths.region,
      packPath: personal ? paths.personalPack : paths.testPack,
    });
    process.stdout.write(`${JSON.stringify(summary)}\n`);
  }
}

export async function stageHuntProfile(
  profile: StageProfile,
  outputRoot: string,
): Promise<void> {
  for (const entry of listHuntPipelineEntries()) {
    const paths = pathsFor(entry);
    await runAssetCommand(entry, [
      'stage-profile',
      '--profile',
      profile,
      '--source-profile-root',
      paths.testProfileRoot,
      '--output',
      join(workspacePath(outputRoot), entry.runtimeDirectory),
    ]);
  }
}

export async function generatePersonalHuntProfile(
  check: boolean,
): Promise<void> {
  for (const entry of listHuntPipelineEntries()) {
    await generateHuntArtifacts(entry, {
      profile: 'personal',
      check,
    });
  }

  for (const entry of listHuntPipelineEntries()) {
    const paths = pathsFor(entry);
    await runAssetCommand(entry, [
      'build-profile',
      ...(check ? ['--check'] : []),
      '--profile',
      'personal',
      '--selection',
      paths.personalSelection,
      '--source-lock',
      paths.personalSourceLock,
      '--source-root-env',
      'HUNTBOUND_PERSONAL_ASSET_SOURCE',
      '--output',
      paths.personalProfileRoot,
    ]);
  }

  if (check) await checkHuntPacksAgainstRegions(true);
}

function requiredOption(
  args: readonly string[],
  name: string,
): string | undefined {
  const index = args.indexOf(name);
  const value = index < 0 ? undefined : args[index + 1];
  return value === undefined || value.startsWith('--') ? undefined : value;
}

const usageText = `Usage:
  node tools/asset-packer/hunt/pipeline.ts pack-check
  node tools/asset-packer/hunt/pipeline.ts profile-check
  node tools/asset-packer/hunt/pipeline.ts hunt-check
  node tools/asset-packer/hunt/pipeline.ts stage --profile <test|product> --output-root <path>
  node tools/asset-packer/hunt/pipeline.ts personal-generate
  node tools/asset-packer/hunt/pipeline.ts personal-check`;

export async function runHuntPipeline(
  args: readonly string[] = process.argv.slice(2),
): Promise<number> {
  const command = args[0];
  if (command === 'pack-check' && args.length === 1) {
    await checkHuntPacks();
    return 0;
  }
  if (command === 'profile-check' && args.length === 1) {
    await checkHuntProfiles();
    return 0;
  }
  if (command === 'hunt-check' && args.length === 1) {
    await checkHuntPacksAgainstRegions();
    return 0;
  }
  if (command === 'personal-generate' && args.length === 1) {
    await generatePersonalHuntProfile(false);
    return 0;
  }
  if (command === 'personal-check' && args.length === 1) {
    await generatePersonalHuntProfile(true);
    return 0;
  }
  if (command === 'stage') {
    const profile = requiredOption(args, '--profile');
    const outputRoot = requiredOption(args, '--output-root');
    if (
      (profile === 'test' || profile === 'product') &&
      outputRoot !== undefined &&
      args.length === 5
    ) {
      await stageHuntProfile(profile, outputRoot);
      return 0;
    }
  }

  process.stderr.write(`${usageText}\n`);
  return 2;
}

if (import.meta.main) {
  runHuntPipeline()
    .then((status) => {
      process.exitCode = status;
    })
    .catch((error) => {
      process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exitCode = 1;
    });
}
