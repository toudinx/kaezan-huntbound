import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { createPb02SyntheticSource } from '../testing/createPb02SyntheticSource.ts';

const roots: string[] = [];
const syntheticPaths = [
  'outfits/131.png',
  'outfits/26.png',
  'objects/3031.png',
  'effects/12.png',
  'missiles/36.png',
] as const;

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('PB-02 synthetic source generator', () => {
  it('writes five distinct paths with the fixed transparent pixel bytes', async () => {
    const destinationRoot = await mkdtemp(join(tmpdir(), 'pb02-synthetic-'));
    roots.push(destinationRoot);

    await createPb02SyntheticSource({ destinationRoot });

    const files = await Promise.all(
      syntheticPaths.map((path) => readFile(join(destinationRoot, path))),
    );
    expect(files).toHaveLength(5);
    expect(new Set(files.map((file) => file.toString('hex'))).size).toBe(1);
    expect(files[0]?.byteLength).toBe(68);
    expect(
      createHash('sha256')
        .update(files[0] ?? Buffer.alloc(0))
        .digest('hex'),
    ).toBe('431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460');
  });

  it('check mode detects drift without rewriting the changed file', async () => {
    const destinationRoot = await mkdtemp(join(tmpdir(), 'pb02-synthetic-'));
    roots.push(destinationRoot);
    const target = join(destinationRoot, syntheticPaths[0]);

    await createPb02SyntheticSource({ destinationRoot });
    await writeFile(target, Buffer.from('changed'));

    await expect(
      createPb02SyntheticSource({ destinationRoot, check: true }),
    ).rejects.toThrow('Synthetic source drift');
    expect(await readFile(target)).toEqual(Buffer.from('changed'));
  });
});
