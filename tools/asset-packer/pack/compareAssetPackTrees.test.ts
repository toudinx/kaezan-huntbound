import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { compareAssetPackTrees } from './compareAssetPackTrees.ts';

const roots: string[] = [];

async function createTrees(): Promise<{
  readonly expected: string;
  readonly actual: string;
}> {
  const root = await mkdtemp(join(tmpdir(), 'pb02-compare-trees-'));
  roots.push(root);
  const expected = join(root, 'expected');
  const actual = join(root, 'actual');
  await Promise.all([
    mkdir(join(expected, 'media'), { recursive: true }),
    mkdir(join(actual, 'media'), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(join(expected, 'pack.json'), '{"ok":true}\n'),
    writeFile(join(expected, 'media', 'a.png'), Buffer.from([1, 2, 3])),
    writeFile(join(actual, 'media', 'a.png'), Buffer.from([1, 2, 3])),
    writeFile(join(actual, 'pack.json'), '{"ok":true}\n'),
  ]);
  return { expected, actual };
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('asset pack tree comparison', () => {
  it('reports byte-identical trees regardless of file creation order', async () => {
    const trees = await createTrees();

    await expect(
      compareAssetPackTrees(trees.expected, trees.actual),
    ).resolves.toEqual({ equal: true, differences: [] });
  });

  it('sorts missing, changed, and unexpected file differences by relative path', async () => {
    const trees = await createTrees();
    await rm(join(trees.actual, 'media', 'a.png'));
    await writeFile(join(trees.actual, 'pack.json'), '{"ok":false}\n');
    await writeFile(join(trees.actual, 'unexpected.txt'), 'extra');

    const comparison = await compareAssetPackTrees(
      trees.expected,
      trees.actual,
    );

    expect(comparison.equal).toBe(false);
    expect(
      comparison.differences.map(({ path, reason }) => ({ path, reason })),
    ).toEqual([
      { path: 'media/a.png', reason: 'missing' },
      { path: 'pack.json', reason: 'byte-length' },
      { path: 'pack.json', reason: 'sha256' },
      { path: 'unexpected.txt', reason: 'unexpected' },
    ]);
  });
});
