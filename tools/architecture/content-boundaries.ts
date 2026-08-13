import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

interface ContentBoundaryOptions {
  readonly runtimeFiles?: readonly string[];
  readonly writerFiles?: readonly string[];
  readonly allowedWriterFiles?: readonly string[];
}

async function filesUnder(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(path)));
    else if (entry.isFile() && path.endsWith('.ts')) files.push(path);
  }
  return files;
}

function importSpecifiers(source: string): readonly string[] {
  const values: string[] = [];
  const pattern =
    /\b(?:import|export)\s+(?:[^'";]*?\sfrom\s+)?["']([^"']+)["']/g;
  for (const match of source.matchAll(pattern)) {
    const value = match[1];
    if (value !== undefined) values.push(value);
  }
  const dynamicPattern = /\bimport\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of source.matchAll(dynamicPattern)) {
    const value = match[1];
    if (value !== undefined) values.push(value);
  }
  return values;
}

export async function checkContentBoundaries(
  root: string,
  options: ContentBoundaryOptions = {},
): Promise<readonly string[]> {
  const runtimeFiles = options.runtimeFiles ?? [
    ...(await filesUnder(join(root, 'apps', 'game'))),
    ...(await filesUnder(join(root, 'packages', 'simulation'))),
    ...(await filesUnder(join(root, 'packages', 'content', 'src', 'runtime'))),
  ];
  const writerFiles =
    options.writerFiles ??
    [
      ...(await filesUnder(join(root, 'packages', 'content', 'src'))),
      ...(await filesUnder(join(root, 'tools', 'content-catalog'))),
    ].filter(
      (path) => !path.endsWith('.test.ts') && !path.endsWith('.spec.ts'),
    );
  const allowedWriterFiles = new Set(
    options.allowedWriterFiles ?? [
      join(
        root,
        'packages',
        'content',
        'src',
        'application',
        'ImportCanarySlice.ts',
      ),
      join(
        root,
        'packages',
        'content',
        'src',
        'application',
        'ApplyCuratedOperation.ts',
      ),
      join(
        root,
        'tools',
        'content-catalog',
        'composition',
        'createContentCatalogApplication.ts',
      ),
    ],
  );
  const diagnostics: string[] = [];
  const forbiddenRuntimeImport =
    /tools\/content-catalog|references\/canary|\.lua(?:$|[?#])|\.xml(?:$|[?#])|better-sqlite3|node:sqlite|\bsqlite\b/i;

  for (const path of runtimeFiles) {
    const source = await readFile(path, 'utf8');
    for (const specifier of importSpecifiers(source)) {
      if (forbiddenRuntimeImport.test(specifier)) {
        diagnostics.push(
          `${path}: import "${specifier}" is forbidden in browser/runtime paths`,
        );
      }
    }
  }

  for (const path of writerFiles) {
    const source = await readFile(path, 'utf8');
    if (!/import\s+(?:type\s+)?[^;]*CuratedCatalogWriter/.test(source))
      continue;
    if (!allowedWriterFiles.has(path)) {
      diagnostics.push(
        `${path}: CuratedCatalogWriter import is only allowed in ImportCanarySlice.ts, ApplyCuratedOperation.ts, or the composition root`,
      );
    }
  }
  return diagnostics;
}
