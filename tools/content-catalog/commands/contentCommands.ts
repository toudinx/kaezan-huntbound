import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import type {
  CatalogContentBundle,
  ContentSliceDefinition,
} from '@huntbound/contracts';
import type { SourceSnapshotLock } from '../../../packages/content/src/application/sourceLockTypes.ts';
import { projectRuntimeBundle } from '../../../packages/content/src/runtime/contentRegistry.ts';
import { createContentCatalogApplication } from '../composition/createContentCatalogApplication.ts';
import {
  canonicalJsonText,
  createRuntimeExport,
  generateCatalogDocumentation,
} from '../export/runtimeExport.ts';
import {
  canonicalizeCatalogBundle,
  canonicalJson,
} from '../repository/canonicalCatalog.ts';
import { verifySourceLock } from '../source/verifySourceLock.ts';

export interface ContentCommandPaths {
  readonly root: string;
  readonly snapshotRoot: string;
  readonly selectionPath: string;
  readonly sourceLockPath: string;
  readonly operationsDirectory: string;
  readonly databasePath: string;
  readonly generatedJsonPath: string;
  readonly generatedHashPath: string;
  readonly generatedDocsPath: string;
  readonly migrationsDirectory: string;
}

export function defaultContentCommandPaths(
  root = resolve(import.meta.dirname, '../../..'),
): ContentCommandPaths {
  return {
    root,
    snapshotRoot: join(root, 'references', 'canary'),
    selectionPath: join(
      root,
      'packages',
      'content',
      'src',
      'selections',
      'pb-01-contract-coverage.json',
    ),
    sourceLockPath: join(
      root,
      'packages',
      'content',
      'src',
      'sources',
      'canary-157e6f9e.json',
    ),
    operationsDirectory: join(
      root,
      'packages',
      'content',
      'catalog',
      'operations',
    ),
    databasePath: join(
      root,
      '.cache',
      'content-catalog',
      'huntbound-content.sqlite',
    ),
    generatedJsonPath: join(
      root,
      'packages',
      'content',
      'src',
      'generated',
      'pb-01-contract-coverage.json',
    ),
    generatedHashPath: join(
      root,
      'packages',
      'content',
      'src',
      'generated',
      'pb-01-contract-coverage.sha256',
    ),
    generatedDocsPath: join(
      root,
      'docs',
      'content',
      'generated',
      'PB-01-CATALOG.md',
    ),
    migrationsDirectory: join(root, 'tools', 'content-catalog', 'migrations'),
  };
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function readSelection(paths: ContentCommandPaths): ContentSliceDefinition {
  return readJson<ContentSliceDefinition>(paths.selectionPath);
}

function readLock(paths: ContentCommandPaths): SourceSnapshotLock {
  return readJson<SourceSnapshotLock>(paths.sourceLockPath);
}

function operationPaths(paths: ContentCommandPaths): readonly string[] {
  if (!existsSync(paths.operationsDirectory)) return [];
  return readdirSync(paths.operationsDirectory)
    .filter((filename) => filename.endsWith('.json'))
    .sort()
    .map((filename) => join(paths.operationsDirectory, filename));
}

function readOperations(
  paths: ContentCommandPaths,
): readonly CatalogContentBundle[] {
  return operationPaths(paths).map((path) =>
    readJson<CatalogContentBundle>(path),
  );
}

function nonEmptyOperation(
  operations: readonly CatalogContentBundle[],
): [CatalogContentBundle, ...CatalogContentBundle[]] {
  const [first, ...rest] = operations;
  if (first === undefined)
    throw new Error(`No catalog operations found in ${operations}`);
  return [first, ...rest];
}

function openApplication(paths: ContentCommandPaths) {
  mkdirSync(resolve(paths.databasePath, '..'), { recursive: true });
  return createContentCatalogApplication({
    databasePath: paths.databasePath,
    migrationsDirectory: paths.migrationsDirectory,
    snapshotRoot: paths.snapshotRoot,
  });
}

function compareText(path: string, expected: string): void {
  const actual = readFileSync(path, 'utf8');
  if (actual !== expected) {
    throw new Error(`Generated artifact is stale: ${path}`);
  }
}

export function rebuildCatalog(paths = defaultContentCommandPaths()): void {
  const operations = nonEmptyOperation(readOperations(paths));
  const application = openApplication(paths);
  try {
    application.applyCuratedOperation(operations);
  } finally {
    application.close();
  }
}

export function validateCatalog(paths = defaultContentCommandPaths()): void {
  const operations = readOperations(paths);
  const application = openApplication(paths);
  try {
    for (const operation of operations) {
      const actual = application.catalog.readCatalogBundle(operation.slice.key);
      if (
        canonicalJson(actual) !==
        canonicalJson(canonicalizeCatalogBundle(operation))
      ) {
        throw new Error(
          `Materialized catalog diverges from operation ${operation.slice.key}`,
        );
      }
    }
  } finally {
    application.close();
  }
}

export function importCanary(
  paths = defaultContentCommandPaths(),
  check = false,
): void {
  const selection = readSelection(paths);
  const lock = readLock(paths);
  const diagnostics = verifySourceLock(paths.snapshotRoot, lock);
  if (diagnostics.length > 0) {
    throw new Error(
      diagnostics.map((diagnostic) => diagnostic.message).join('\n'),
    );
  }
  const temporaryDirectory = mkdtempSync(
    join(tmpdir(), 'huntbound-canary-import-'),
  );
  const temporaryDatabase = join(temporaryDirectory, 'catalog.sqlite');
  const application = createContentCatalogApplication({
    databasePath: temporaryDatabase,
    migrationsDirectory: paths.migrationsDirectory,
    snapshotRoot: paths.snapshotRoot,
  });
  try {
    const imported = application.importCanarySlice(selection, lock).bundle;
    const normalized = canonicalizeCatalogBundle(imported);
    const operationPath = join(
      paths.operationsDirectory,
      '0001-pb01-contract-coverage.json',
    );
    if (check) {
      if (!existsSync(operationPath))
        throw new Error(`Missing curated operation ${operationPath}`);
      if (
        canonicalJson(normalized) !==
        canonicalJson(readJson<CatalogContentBundle>(operationPath))
      ) {
        throw new Error(
          'Real Canary import diverges from the versioned curated operation',
        );
      }
    } else {
      mkdirSync(paths.operationsDirectory, { recursive: true });
      writeFileSync(operationPath, canonicalJsonText(normalized), 'utf8');
    }
  } finally {
    application.close();
    rmSync(temporaryDirectory, { force: true, recursive: true });
  }
}

export function generateCatalog(
  paths = defaultContentCommandPaths(),
  check = false,
): void {
  const application = openApplication(paths);
  try {
    const selection = readSelection(paths);
    const bundle = application.catalog.readCatalogBundle(selection.key);
    const runtimeExport = createRuntimeExport(projectRuntimeBundle(bundle));
    const documentation = generateCatalogDocumentation(bundle);
    if (check) {
      compareText(paths.generatedJsonPath, runtimeExport.json);
      compareText(paths.generatedHashPath, `${runtimeExport.sha256}\n`);
      compareText(paths.generatedDocsPath, documentation);
      return;
    }
    mkdirSync(join(paths.generatedJsonPath, '..'), { recursive: true });
    mkdirSync(join(paths.generatedDocsPath, '..'), { recursive: true });
    writeFileSync(paths.generatedJsonPath, runtimeExport.json, 'utf8');
    writeFileSync(paths.generatedHashPath, `${runtimeExport.sha256}\n`, 'utf8');
    writeFileSync(paths.generatedDocsPath, documentation, 'utf8');
  } finally {
    application.close();
  }
}
