import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

import type {
  AssetPackCatalog,
  AssetPackManifest,
} from '../../../packages/assets/src/index.ts';

import { canonicalAssetJson } from '../application/buildAssetPack.ts';

export async function createRestrictedProductProof(output: string): Promise<{
  readonly packId: string;
  readonly manifestPath: string;
  readonly licenseClass: 'cipsoft-personal';
}> {
  const profileRoot = resolve(output);
  const catalogPath = join(profileRoot, 'catalog.json');
  const catalog = JSON.parse(
    await readFile(catalogPath, 'utf8'),
  ) as AssetPackCatalog;
  if (catalog.profile !== 'product') {
    throw new Error('Product proof requires a product catalog');
  }
  const reference = catalog.packs[0];
  if (reference === undefined) {
    throw new Error('Product proof requires one pack reference');
  }
  const manifestPath = resolve(
    profileRoot,
    ...reference.manifestPath.split('/'),
  );
  const relativeManifest = relative(profileRoot, manifestPath);
  if (
    relativeManifest.startsWith('..') ||
    resolve(profileRoot, relativeManifest) !== manifestPath
  ) {
    throw new Error(
      'Product proof manifest must remain below its profile root',
    );
  }
  const manifest = JSON.parse(
    await readFile(manifestPath, 'utf8'),
  ) as AssetPackManifest;
  const restrictedManifest = {
    ...manifest,
    groups: manifest.groups.map((group) => ({
      ...group,
      buildProfiles: ['personal'] as const,
      licenseClass: 'cipsoft-personal' as const,
    })),
  };
  const manifestJson = canonicalAssetJson(restrictedManifest);
  await writeFile(manifestPath, manifestJson);
  await writeFile(
    join(dirname(manifestPath), 'pack.sha256'),
    `${createHash('sha256').update(manifestJson).digest('hex')}\n`,
  );
  return {
    packId: reference.packId,
    manifestPath: reference.manifestPath,
    licenseClass: 'cipsoft-personal',
  };
}

async function main(): Promise<void> {
  const outputFlag = process.argv.indexOf('--output');
  const output = outputFlag >= 0 ? process.argv[outputFlag + 1] : undefined;
  if (output === undefined || output.length === 0) {
    process.stderr.write(
      'Usage: node createRestrictedProductProof.ts --output <product-root>\n',
    );
    process.exitCode = 2;
    return;
  }
  try {
    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        ...(await createRestrictedProductProof(output)),
      })}\n`,
    );
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      })}\n`,
    );
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await main();
}
