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
  it('keeps the catalog and test selection aligned with the derived hunt keys', async () => {
    const selection = AssetSelectionManifestSchema.parse(
      await readJson('packages/test-fixtures/assets/pb04/selection.json'),
    );
    const catalog = AssetSelectionManifestSchema.parse(
      await readJson(
        'packages/assets/catalog/selections/pb-04-venore-rotworm-cave.json',
      ),
    );

    for (const manifest of [selection, catalog]) {
      expect(manifest.hunt?.packKey).toBe(HUNT_PACK_KEY);
      expect(manifest.hunt?.keys).toHaveLength(139);
      expect(manifest.hunt?.budget).toEqual(HUNT_PACK_BUDGET);
      expect(manifest.hunt?.keys).not.toContain('tile:tibia:0');
      expect(manifest.entries).toHaveLength(139);
      expect(new Set(manifest.entries.map((entry) => entry.key))).toEqual(
        new Set(manifest.hunt?.keys),
      );
    }

    expect(selection.groups[0]?.buildProfiles).toContain('test');
    expect(catalog.groups[0]?.buildProfiles).toContain('personal');
  });

  it('keeps source locks complete and the synthetic fixture deterministic', async () => {
    const sourceLock = AssetSourceLockSchema.parse(
      await readJson('packages/test-fixtures/assets/pb04/source-lock.json'),
    );
    const personalSourceLock = AssetSourceLockSchema.parse(
      await readJson(
        'packages/test-fixtures/assets/pb04/personal-source-lock.json',
      ),
    );

    expect(sourceLock.files).toHaveLength(139);
    expect(sourceLock.files.every((file) => file.byteLength === 68)).toBe(true);
    expect(personalSourceLock.files).toHaveLength(139);
    expect(sourceLock.sourceSnapshot).toBe('pb04-synthetic-v1');
    expect(personalSourceLock.sourceSnapshot).toBe('pb04-private-v1');
    expect(personalSourceLock.source).toBe('huntbound-private-assets');
  });
});
