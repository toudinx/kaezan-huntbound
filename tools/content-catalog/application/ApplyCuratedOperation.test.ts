import { describe, expect, it } from 'vitest';
import { applyCuratedOperation } from '../../../packages/content/src/application/ApplyCuratedOperation';
import type { CuratedCatalogWriter } from '../../../packages/content/src/application/internal/CuratedCatalogWriter';
import {
  createCatalogBundleFixture,
  createSecondSliceFixture,
} from '../repository/catalogFixture.test-support';

describe('applyCuratedOperation', () => {
  it('applies all bundles inside one transaction and rejects an empty operation', () => {
    const calls: string[] = [];
    const writer = {
      transaction(
        operation: (tx: {
          replaceCatalogBundle(bundle: { slice: { key: string } }): void;
          listOrphanEntities(): readonly string[];
        }) => unknown,
      ) {
        calls.push('begin');
        const result = operation({
          replaceCatalogBundle: (bundle) => calls.push(bundle.slice.key),
          listOrphanEntities: () => [],
        });
        calls.push('commit');
        return result;
      },
    } as unknown as CuratedCatalogWriter;
    const first = createCatalogBundleFixture();
    const second = createSecondSliceFixture();

    applyCuratedOperation([first, second], writer);

    expect(calls).toEqual([
      'begin',
      first.slice.key,
      second.slice.key,
      'commit',
    ]);
    expect(() => applyCuratedOperation([] as never, writer)).toThrow(
      /non-empty/,
    );
  });

  it('asks the transaction to reject orphan rows and preserves rollback semantics', () => {
    const persisted: string[] = [];
    const writer = {
      transaction(
        operation: (tx: {
          replaceCatalogBundle(bundle: { slice: { key: string } }): void;
          listOrphanEntities(): readonly string[];
        }) => unknown,
      ) {
        const before = [...persisted];
        try {
          operation({
            replaceCatalogBundle: (bundle) => persisted.push(bundle.slice.key),
            listOrphanEntities: () => ['orphan-guid'],
          });
        } catch (error) {
          persisted.splice(0, persisted.length, ...before);
          throw error;
        }
      },
    } as unknown as CuratedCatalogWriter;

    expect(() =>
      applyCuratedOperation([createCatalogBundleFixture()], writer),
    ).toThrow(/orphan entities/);
    expect(persisted).toEqual([]);
  });
});
