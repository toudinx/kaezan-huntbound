import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  CatalogContentBundle,
  ContentSliceDefinition,
} from '@huntbound/contracts';
import type { SourceSnapshotLock } from '../../../packages/content/src/application/sourceLockTypes.ts';
import {
  applyCuratedOperation,
  importCanarySlice,
} from '../../../packages/content/src/index.ts';
import {
  type OpenMutableContentCatalog,
  openMutableContentCatalog,
} from '../repository/internal/openMutableContentCatalog.ts';

export interface ContentCatalogApplicationOptions {
  readonly databasePath: string;
  readonly migrationsDirectory?: string;
  readonly snapshotRoot?: string;
  readonly readSource?: (relativePath: string) => string;
}

export interface ContentCatalogApplication {
  readonly catalog: OpenMutableContentCatalog;
  importCanarySlice(
    selection: ContentSliceDefinition,
    lock: SourceSnapshotLock,
  ): ReturnType<typeof importCanarySlice>;
  applyCuratedOperation(
    operations: readonly [CatalogContentBundle, ...CatalogContentBundle[]],
  ): void;
  close(): void;
}

function readSnapshotFile(snapshotRoot: string, relativePath: string): string {
  return readFileSync(join(snapshotRoot, ...relativePath.split('/')), 'utf8');
}

export function createContentCatalogApplication(
  options: ContentCatalogApplicationOptions,
): ContentCatalogApplication {
  const catalog = openMutableContentCatalog(
    options.databasePath,
    options.migrationsDirectory,
  );
  catalog.migrate();
  const readSource =
    options.readSource ??
    ((relativePath: string) => {
      if (options.snapshotRoot === undefined) {
        throw new Error(
          'A snapshotRoot or readSource is required for Canary import',
        );
      }
      return readSnapshotFile(options.snapshotRoot, relativePath);
    });
  return {
    catalog,
    importCanarySlice: (selection, lock) =>
      importCanarySlice(selection, lock, { readSource, writer: catalog }),
    applyCuratedOperation: (operations) =>
      applyCuratedOperation(operations, catalog),
    close: () => catalog.close(),
  };
}
