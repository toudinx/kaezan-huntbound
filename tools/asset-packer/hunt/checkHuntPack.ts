import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  AssetPackManifestSchema,
  AssetSelectionManifestSchema,
  validateHuntPack,
} from '../../../packages/assets/src/index.ts';
import type { MapRegion } from '../../../packages/contracts/src/hunt/types.ts';
import { getHuntPipelineEntry } from './huntRegistry.ts';
import { huntPackExtraKeys } from './huntSelection.ts';

function option(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  const value = index < 0 ? undefined : args[index + 1];
  return value === undefined || value.startsWith('--') ? undefined : value;
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(resolve(path), 'utf8')) as unknown;
}

export async function checkHuntPack(input: {
  readonly selectionPath: string;
  readonly regionPath: string;
  readonly packPath: string;
}): Promise<{
  readonly ok: true;
  readonly packKey: string;
  readonly entries: number;
  readonly bytes: number;
  readonly regionSha256: string;
}> {
  const selectionResult = AssetSelectionManifestSchema.safeParse(
    await readJson(input.selectionPath),
  );
  if (!selectionResult.success) {
    throw new Error('Hunt asset selection manifest is invalid');
  }
  if (selectionResult.data.hunt === undefined) {
    throw new Error('Hunt asset selection manifest has no hunt metadata');
  }
  const pipelineEntry = getHuntPipelineEntry(selectionResult.data.hunt.huntId);
  if (pipelineEntry === undefined) {
    throw new Error(
      `No hunt pipeline metadata for ${selectionResult.data.hunt.huntId}`,
    );
  }
  const region = (await readJson(input.regionPath)) as MapRegion;
  const packResult = AssetPackManifestSchema.safeParse(
    await readJson(input.packPath),
  );
  if (!packResult.success) {
    throw new Error('Hunt asset pack manifest is invalid');
  }

  const resolvedEntries = packResult.data.entries.map((entry) => ({
    key: entry.key,
    bytes: entry.media.byteLength,
  }));
  const diagnostics = validateHuntPack(
    selectionResult.data.hunt,
    region,
    resolvedEntries,
    {
      extraKeys: huntPackExtraKeys(pipelineEntry.assetSelection, region),
    },
  );
  if (diagnostics.length > 0) {
    throw new Error(JSON.stringify(diagnostics));
  }

  return {
    ok: true,
    packKey: selectionResult.data.hunt.packKey,
    entries: resolvedEntries.length,
    bytes: resolvedEntries.reduce((total, entry) => total + entry.bytes, 0),
    regionSha256: selectionResult.data.hunt.regionSha256,
  };
}

export async function runCheckHuntPack(
  args: readonly string[] = process.argv.slice(2),
): Promise<number> {
  const selectionPath = option(args, '--selection');
  const regionPath = option(args, '--region');
  const packPath = option(args, '--pack');
  if (
    selectionPath === undefined ||
    regionPath === undefined ||
    packPath === undefined
  ) {
    throw new Error(
      'Usage: checkHuntPack.ts --selection <path> --region <path> --pack <path>',
    );
  }

  const summary = await checkHuntPack({ selectionPath, regionPath, packPath });
  process.stdout.write(`${JSON.stringify(summary)}\n`);
  return 0;
}

if (import.meta.main) {
  runCheckHuntPack().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
