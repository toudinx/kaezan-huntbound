import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  AssetPackManifestSchema,
  AssetSelectionManifestSchema,
  validateHuntPack,
} from '../../../packages/assets/src/index.ts';
import type { MapRegion } from '../../../packages/contracts/src/hunt/types.ts';

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  return value === undefined || value.startsWith('--') ? undefined : value;
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(resolve(path), 'utf8')) as unknown;
}

async function main(): Promise<void> {
  const selectionPath = option('--selection');
  const regionPath = option('--region');
  const packPath = option('--pack');
  if (
    selectionPath === undefined ||
    regionPath === undefined ||
    packPath === undefined
  ) {
    throw new Error(
      'Usage: checkHuntPack.ts --selection <path> --region <path> --pack <path>',
    );
  }

  const selectionResult = AssetSelectionManifestSchema.safeParse(
    await readJson(selectionPath),
  );
  if (!selectionResult.success) {
    throw new Error('PB-04 selection manifest is invalid');
  }
  if (selectionResult.data.hunt === undefined) {
    throw new Error('PB-04 selection manifest has no hunt metadata');
  }
  const region = (await readJson(regionPath)) as MapRegion;
  const packResult = AssetPackManifestSchema.safeParse(
    await readJson(packPath),
  );
  if (!packResult.success) {
    throw new Error('PB-04 pack manifest is invalid');
  }

  const resolvedEntries = packResult.data.entries.map((entry) => ({
    key: entry.key,
    bytes: entry.media.byteLength,
  }));
  const diagnostics = validateHuntPack(
    selectionResult.data.hunt,
    region,
    resolvedEntries,
  );
  if (diagnostics.length > 0) {
    throw new Error(JSON.stringify(diagnostics));
  }

  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      packKey: selectionResult.data.hunt.packKey,
      entries: resolvedEntries.length,
      bytes: resolvedEntries.reduce((total, entry) => total + entry.bytes, 0),
      regionSha256: selectionResult.data.hunt.regionSha256,
    })}\n`,
  );
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
