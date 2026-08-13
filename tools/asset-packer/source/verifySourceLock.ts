import { readFile } from 'node:fs/promises';

import {
  type AssetSourceLock,
  validateAssetSourceLock,
} from '../../../packages/assets/src/index.ts';

import { verifyAssetSourceLock } from './sourceLock.ts';

function argumentValue(
  args: readonly string[],
  name: string,
): string | undefined {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

function usage(): void {
  console.error(
    'Usage: node tools/asset-packer/source/verifySourceLock.ts --lock <path> [--source-root <path>]',
  );
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const lockPath = argumentValue(args, '--lock');
  const sourceRoot =
    argumentValue(args, '--source-root') ??
    process.env.HUNTBOUND_PERSONAL_ASSET_SOURCE;

  if (lockPath === undefined || sourceRoot === undefined) {
    usage();
    process.exitCode = 2;
  } else {
    let input: unknown;
    try {
      input = JSON.parse(await readFile(lockPath, 'utf8')) as unknown;
    } catch {
      console.error(
        JSON.stringify({
          code: 'ASSET_SCHEMA_INVALID',
          message: 'Source lock JSON cannot be read',
        }),
      );
      process.exitCode = 2;
    }

    if (input !== undefined) {
      const lockResult = validateAssetSourceLock(input);
      if (!lockResult.ok) {
        console.error(JSON.stringify(lockResult.diagnostics, null, 2));
        process.exitCode = 2;
      } else {
        const result = await verifyAssetSourceLock({
          sourceRoot,
          lock: lockResult.value as AssetSourceLock,
        });
        if (!result.ok) {
          console.error(JSON.stringify(result.diagnostics, null, 2));
          process.exitCode = 1;
        } else {
          console.log(
            JSON.stringify({
              ok: true,
              source: result.value.source,
              sourceSnapshot: result.value.sourceSnapshot,
              manifest: {
                path: result.value.manifest.path,
                byteLength: result.value.manifest.byteLength,
                sha256: result.value.manifest.sha256,
                verified: true,
              },
              files: {
                verified: result.value.files.length,
                total: result.value.files.length,
              },
            }),
          );
        }
      }
    }
  }
}
