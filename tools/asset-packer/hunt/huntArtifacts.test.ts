import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AssetSelectionManifestSchema,
  AssetSourceLockSchema,
} from '../../../packages/assets/src/manifest/schemas.ts';
import { HUNT_PACK_BUDGET, HUNT_PACK_KEY } from './huntSelection.ts';

const repoRoot = path.resolve(import.meta.dirname, '../../..');

async function readJson(relativePath: string): Promise<unknown> {
  return JSON.parse(
    await readFile(path.join(repoRoot, relativePath), 'utf8'),
  ) as unknown;
}

describe('PB-04 generated hunt artifacts', () => {
  it('keeps the synthetic selection aligned with the derived hunt keys', async () => {
    const selection = AssetSelectionManifestSchema.parse(
      await readJson('packages/test-fixtures/assets/pb04/selection.json'),
    );

    expect(selection.hunt?.packKey).toBe(HUNT_PACK_KEY);
    expect(selection.hunt?.keys).toHaveLength(140);
    expect(selection.hunt?.budget).toEqual(HUNT_PACK_BUDGET);
    expect(selection.hunt?.keys).not.toContain('tile:tibia:0');
    expect(selection.entries).toHaveLength(140);
    expect(new Set(selection.entries.map((entry) => entry.key))).toEqual(
      new Set(selection.hunt?.keys),
    );

    expect(selection.groups[0]?.buildProfiles).toContain('test');
  });

  it('keeps source locks complete and the synthetic fixture deterministic', async () => {
    const sourceLock = AssetSourceLockSchema.parse(
      await readJson('packages/test-fixtures/assets/pb04/source-lock.json'),
    );
    expect(sourceLock.files).toHaveLength(140);
    expect(sourceLock.files.every((file) => file.byteLength === 68)).toBe(true);
    expect(sourceLock.sourceSnapshot).toBe('pb04-synthetic-v1');
  });
});
