import type { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface AssetProfileTreeDifference {
  readonly path: string;
  readonly reason: 'missing' | 'unexpected' | 'type' | 'bytes';
}

export interface AssetProfileTreeComparison {
  readonly equal: boolean;
  readonly differences: readonly AssetProfileTreeDifference[];
}

async function collectFiles(
  root: string,
  current: string,
  files: Map<string, Buffer>,
  differences: AssetProfileTreeDifference[],
): Promise<void> {
  let entries: readonly Dirent<string>[];
  try {
    entries = await readdir(current, {
      encoding: 'utf8',
      withFileTypes: true,
    });
  } catch {
    differences.push({ path: '', reason: 'missing' });
    return;
  }
  for (const entry of entries) {
    const absolute = join(current, entry.name);
    const relativePath = absolute.slice(root.length + 1).replaceAll('\\', '/');
    if (entry.isSymbolicLink()) {
      differences.push({ path: relativePath, reason: 'type' });
      continue;
    }
    if (entry.isDirectory()) {
      await collectFiles(root, absolute, files, differences);
      continue;
    }
    if (!entry.isFile()) {
      differences.push({ path: relativePath, reason: 'type' });
      continue;
    }
    files.set(relativePath, await readFile(absolute));
  }
}

export async function compareAssetProfileTrees(
  generatedRoot: string,
  expectedRoot: string,
): Promise<AssetProfileTreeComparison> {
  const generated = new Map<string, Buffer>();
  const expected = new Map<string, Buffer>();
  const differences: AssetProfileTreeDifference[] = [];
  await collectFiles(generatedRoot, generatedRoot, generated, differences);
  await collectFiles(expectedRoot, expectedRoot, expected, differences);

  const paths = new Set([...generated.keys(), ...expected.keys()]);
  for (const path of [...paths].sort()) {
    const generatedBytes = generated.get(path);
    const expectedBytes = expected.get(path);
    if (generatedBytes === undefined) {
      differences.push({ path, reason: 'missing' });
      continue;
    }
    if (expectedBytes === undefined) {
      differences.push({ path, reason: 'unexpected' });
      continue;
    }
    if (!generatedBytes.equals(expectedBytes)) {
      differences.push({ path, reason: 'bytes' });
    }
  }

  const uniqueDifferences = [
    ...new Map(
      differences.map((difference) => [
        `${difference.path}:${difference.reason}`,
        difference,
      ]),
    ).values(),
  ].sort((left, right) => left.path.localeCompare(right.path));
  return {
    equal: uniqueDifferences.length === 0,
    differences: uniqueDifferences,
  };
}
