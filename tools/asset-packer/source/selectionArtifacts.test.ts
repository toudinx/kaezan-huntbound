import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  validateAssetSelectionManifest,
  validateAssetSourceLock,
} from '../../../packages/assets/src/index.ts';

const repositoryRoot = resolve(import.meta.dirname, '../../../');

async function readJson(relativePath: string): Promise<unknown> {
  return JSON.parse(
    await readFile(resolve(repositoryRoot, relativePath), 'utf8'),
  ) as unknown;
}

describe('versioned PB-02 selection artifacts', () => {
  it('contains exactly the five frozen entries in both real and synthetic selections', async () => {
    const real = validateAssetSelectionManifest(
      await readJson(
        'packages/assets/catalog/selections/pb-02-contract-coverage.json',
      ),
    );
    const synthetic = validateAssetSelectionManifest(
      await readJson('packages/test-fixtures/assets/pb02/selection.json'),
    );

    expect(real.ok).toBe(true);
    expect(synthetic.ok).toBe(true);
    if (!real.ok || !synthetic.ok)
      throw new Error('selection artifacts should validate');

    expect(real.value.entries).toHaveLength(5);
    expect(synthetic.value.entries).toHaveLength(5);
    expect(synthetic.value.entries.map(({ key }) => key)).toEqual(
      real.value.entries.map(({ key }) => key),
    );
    expect(
      synthetic.value.entries.map(
        ({ key, category, sourceIdentity, presentation }) => ({
          key,
          category,
          sourceIdentity,
          presentation,
        }),
      ),
    ).toEqual(
      real.value.entries.map(
        ({ key, category, sourceIdentity, presentation }) => ({
          key,
          category,
          sourceIdentity,
          presentation,
        }),
      ),
    );
    expect(real.value.groups[0]?.licenseClass).toBe('cipsoft-personal');
    expect(synthetic.value.groups[0]?.licenseClass).toBe('huntbound-test');
  });

  it('keeps the real six-file facts and the synthetic 68-byte hash frozen', async () => {
    const real = validateAssetSourceLock(
      await readJson(
        'packages/assets/catalog/sources/arena-fable-tibia-1b14dee.json',
      ),
    );
    const synthetic = validateAssetSourceLock(
      await readJson('packages/test-fixtures/assets/pb02/source-lock.json'),
    );

    expect(real.ok).toBe(true);
    expect(synthetic.ok).toBe(true);
    if (!real.ok || !synthetic.ok)
      throw new Error('source locks should validate');

    expect(real.value.manifest).toEqual({
      path: 'manifest.json',
      byteLength: 808964,
      sha256:
        'edf07a6edfc7c68128d8d0c712fbf0f2f66839e17399da62d9531598b3a05a94',
    });
    expect(real.value.files).toHaveLength(5);
    expect(real.value.files.map(({ key }) => key)).toEqual(
      [...real.value.files].map(({ key }) => key).sort(),
    );
    expect(synthetic.value.files).toHaveLength(5);
    expect(
      new Set(synthetic.value.files.map(({ byteLength }) => byteLength)),
    ).toEqual(new Set([68]));
    expect(new Set(synthetic.value.files.map(({ sha256 }) => sha256))).toEqual(
      new Set([
        '431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460',
      ]),
    );
  });
});
