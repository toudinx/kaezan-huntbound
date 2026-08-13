import { join, posix } from 'node:path';

import {
  type AssetPackFileSystem,
  nodeAssetPackFileSystem,
} from '../filesystem/AssetPackFileSystem.ts';
import { compareAssetText, hashAssetBytes } from './assetPackSupport.ts';

export type AssetTreeDifferenceReason =
  | 'missing'
  | 'unexpected'
  | 'byte-length'
  | 'sha256'
  | 'unsafe';

export interface AssetTreeDifference {
  readonly path: string;
  readonly reason: AssetTreeDifferenceReason;
  readonly expected?: string | number;
  readonly actual?: string | number;
}

export interface AssetTreeComparison {
  readonly equal: boolean;
  readonly differences: readonly AssetTreeDifference[];
}

interface TreeFile {
  readonly byteLength: number;
  readonly sha256: string;
}

async function readTree(
  fileSystem: AssetPackFileSystem,
  root: string,
): Promise<{
  readonly files: ReadonlyMap<string, TreeFile>;
  readonly unsafePaths: readonly string[];
}> {
  const files = new Map<string, TreeFile>();
  const unsafePaths: string[] = [];

  async function visit(directory: string, relativeDirectory: string) {
    const entries = [...(await fileSystem.readdir(directory))].sort(
      (left, right) => compareAssetText(left.name, right.name),
    );
    for (const entry of entries) {
      const relativePath =
        relativeDirectory.length === 0
          ? entry.name
          : posix.join(relativeDirectory, entry.name);
      const absolutePath = join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        unsafePaths.push(relativePath);
      } else if (entry.isDirectory()) {
        await visit(absolutePath, relativePath);
      } else if (entry.isFile()) {
        const bytes = await fileSystem.readFile(absolutePath);
        files.set(relativePath, {
          byteLength: bytes.byteLength,
          sha256: hashAssetBytes(bytes),
        });
      } else {
        unsafePaths.push(relativePath);
      }
    }
  }

  try {
    if ((await fileSystem.stat(root)).isDirectory()) {
      await visit(root, '');
    }
  } catch {
    return { files, unsafePaths };
  }
  return { files, unsafePaths };
}

export function createAssetPackTreeComparator(fileSystem: AssetPackFileSystem) {
  return async function compareAssetPackTreesWithFileSystem(
    expectedRoot: string,
    actualRoot: string,
  ): Promise<AssetTreeComparison> {
    const [expectedTree, actualTree] = await Promise.all([
      readTree(fileSystem, expectedRoot),
      readTree(fileSystem, actualRoot),
    ]);
    const differences: AssetTreeDifference[] = [
      ...expectedTree.unsafePaths.map((path) => ({
        path,
        reason: 'unsafe' as const,
        expected: 'regular file or directory',
        actual: 'unsafe entry',
      })),
      ...actualTree.unsafePaths.map((path) => ({
        path,
        reason: 'unsafe' as const,
        expected: 'regular file or directory',
        actual: 'unsafe entry',
      })),
    ];
    const paths = new Set([
      ...expectedTree.files.keys(),
      ...actualTree.files.keys(),
    ]);
    for (const path of [...paths].sort(compareAssetText)) {
      const expected = expectedTree.files.get(path);
      const actual = actualTree.files.get(path);
      if (expected === undefined) {
        differences.push({ path, reason: 'unexpected' });
        continue;
      }
      if (actual === undefined) {
        differences.push({ path, reason: 'missing' });
        continue;
      }
      if (expected.byteLength !== actual.byteLength) {
        differences.push({
          path,
          reason: 'byte-length',
          expected: expected.byteLength,
          actual: actual.byteLength,
        });
      }
      if (expected.sha256 !== actual.sha256) {
        differences.push({
          path,
          reason: 'sha256',
          expected: expected.sha256,
          actual: actual.sha256,
        });
      }
    }

    differences.sort((left, right) => {
      const pathOrder = compareAssetText(left.path, right.path);
      return pathOrder !== 0
        ? pathOrder
        : compareAssetText(left.reason, right.reason);
    });
    return { equal: differences.length === 0, differences };
  };
}

export const compareAssetPackTrees = createAssetPackTreeComparator(
  nodeAssetPackFileSystem,
);
