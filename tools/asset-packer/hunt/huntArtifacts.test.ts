import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AssetSelectionManifestSchema,
  AssetSourceLockSchema,
} from '../../../packages/assets/src/manifest/schemas.ts';
import { HUNT_PIPELINE_REGISTRY } from './huntRegistry.ts';
import { HUNT_PACK_BUDGET } from './huntSelection.ts';

const repoRoot = path.resolve(import.meta.dirname, '../../..');

async function readJson(relativePath: string): Promise<unknown> {
  return JSON.parse(
    await readFile(path.join(repoRoot, relativePath), 'utf8'),
  ) as unknown;
}

describe('generated hunt artifacts', () => {
  it('keeps the synthetic selection aligned with the derived hunt keys', async () => {
    const selection = AssetSelectionManifestSchema.parse(
      await readJson('packages/test-fixtures/assets/pb04/selection.json'),
    );

    expect(selection.hunt?.packKey).toBe(
      HUNT_PIPELINE_REGISTRY['hunt:tibia:venore-rotworm-cave'].packKey,
    );
    expect(selection.hunt?.keys).toHaveLength(147);
    expect(selection.hunt?.budget).toEqual(HUNT_PACK_BUDGET);
    expect(selection.hunt?.keys).not.toContain('tile:tibia:0');
    expect(selection.entries).toHaveLength(147);
    expect(new Set(selection.entries.map((entry) => entry.key))).toEqual(
      new Set(selection.hunt?.keys),
    );

    expect(selection.groups[0]?.buildProfiles).toContain('test');
  });

  it('keeps source locks complete and the synthetic fixture deterministic', async () => {
    const sourceLock = AssetSourceLockSchema.parse(
      await readJson('packages/test-fixtures/assets/pb04/source-lock.json'),
    );
    expect(sourceLock.files).toHaveLength(147);
    expect(sourceLock.files.every((file) => file.byteLength === 68)).toBe(true);
    expect(sourceLock.sourceSnapshot).toBe('pb04-synthetic-v1');
  });

  it('keeps the Hero Cave selection tied to lookType 73 and its loot', async () => {
    const selection = AssetSelectionManifestSchema.parse(
      await readJson('packages/test-fixtures/assets/pb10-10/selection.json'),
    );

    expect(selection.hunt?.packKey).toBe(
      HUNT_PIPELINE_REGISTRY['hunt:tibia:hero-cave'].packKey,
    );
    expect(selection.hunt?.keys).toHaveLength(109);
    expect(selection.entries).toHaveLength(109);
    expect(
      selection.entries.find((entry) => entry.key === 'creature:tibia:hero'),
    ).toMatchObject({
      category: 'creature',
      sourceIdentity: { kind: 'lookType', id: 73 },
    });
    expect(
      selection.entries.find((entry) => entry.key === 'item:tibia:arrow'),
    ).toMatchObject({
      category: 'object',
      sourceIdentity: { kind: 'clientId', id: 3447 },
    });
    expect(selection.groups[0]?.buildProfiles).toContain('product');
  });

  it('keeps the Hero Cave source lock complete and synthetic', async () => {
    const sourceLock = AssetSourceLockSchema.parse(
      await readJson('packages/test-fixtures/assets/pb10-10/source-lock.json'),
    );

    expect(sourceLock.files).toHaveLength(109);
    expect(sourceLock.files.every((file) => file.byteLength === 68)).toBe(true);
    expect(sourceLock.sourceSnapshot).toBe('pb10-10-synthetic-v1');
  });
});
