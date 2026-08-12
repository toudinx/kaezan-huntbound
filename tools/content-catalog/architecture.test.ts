import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

describe('content catalog architecture', () => {
  it('keeps SQLite and Node storage details out of the content package', () => {
    const files = filesUnder(join(process.cwd(), 'packages', 'content')).filter(
      (path) => /\.(ts|tsx|mts|cts)$/.test(path),
    );
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(
        /better-sqlite3|tools[\\/]content-catalog|from ['"]node:/,
      );
    }
  });

  it('keeps the mutable factory restricted to adapter tests and composition root', () => {
    const root = join(process.cwd(), 'tools', 'content-catalog');
    const importers = filesUnder(root).filter((path) =>
      /\.(ts|tsx|mts|cts)$/.test(path),
    );
    const allowed = [
      /\.test\.(ts|tsx|mts|cts)$/,
      /composition[\\/]createContentCatalogApplication\.(ts|tsx|mts|cts)$/,
    ];
    for (const file of importers) {
      const source = readFileSync(file, 'utf8');
      if (!/(?:from|import)[^\n]*openMutableContentCatalog/.test(source))
        continue;
      expect(
        allowed.some((pattern) => pattern.test(relative(process.cwd(), file))),
        relative(process.cwd(), file),
      ).toBe(true);
    }
  });

  it('keeps the public wrapper read-only and free of raw database exports', () => {
    const publicWrapper = readFileSync(
      join(rootPath(), 'repository', 'openContentCatalog.ts'),
      'utf8',
    );
    expect(publicWrapper).not.toMatch(
      /transaction|Database|Statement|prepare|exec|pragma/,
    );
  });
});

function rootPath(): string {
  return join(process.cwd(), 'tools', 'content-catalog');
}
