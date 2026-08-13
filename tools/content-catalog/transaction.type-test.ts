declare const writer: import('../../packages/content/src/application/internal/CuratedCatalogWriter.ts').CuratedCatalogWriter;

writer.transaction(() => 1);

// @ts-expect-error async callbacks are forbidden
writer.transaction(async () => 1);

declare const unionResult: () => void | Promise<void>;
// @ts-expect-error any PromiseLike branch is forbidden
writer.transaction(unionResult);
