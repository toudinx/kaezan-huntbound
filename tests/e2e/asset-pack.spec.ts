import { expect, test } from '@playwright/test';

const expectedKeys = [
  'creature:tibia:rotworm',
  'effect:tibia:energy-hit',
  'item:tibia:gold-coin',
  'missile:tibia:energy-ball',
  'outfit:tibia:knight',
] as const;

interface AssetProbeSnapshot {
  readonly state: 'idle' | 'loaded' | 'unloaded';
  readonly count: number;
  readonly keys: readonly string[];
}

interface AssetCatalog {
  readonly packs: readonly {
    readonly manifestPath: string;
  }[];
}

interface AssetPackManifest {
  readonly entries: readonly {
    readonly media: {
      readonly path: string;
    };
  }[];
}

async function discoverMediaPaths(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const catalogUrl = new URL('/assets/test/catalog.json', location.href);
    const catalog = (await fetch(catalogUrl).then((response) => {
      if (!response.ok) {
        throw new Error('Unable to read the test asset catalog.');
      }
      return response.json();
    })) as AssetCatalog;

    const mediaPaths = await Promise.all(
      catalog.packs.map(async ({ manifestPath }) => {
        const manifestUrl = new URL(manifestPath, catalogUrl);
        const manifest = (await fetch(manifestUrl).then((response) => {
          if (!response.ok) {
            throw new Error('Unable to read a test asset pack manifest.');
          }
          return response.json();
        })) as AssetPackManifest;

        return manifest.entries.map(
          ({ media }) => new URL(media.path, manifestUrl).pathname,
        );
      }),
    );

    return mediaPaths.flat();
  });
}

test('loads, unloads, and reloads the five browser asset contract keys', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const badResponses: string[] = [];
  const requestPaths: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(request.url()));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      badResponses.push(response.url() + ' (' + response.status() + ')');
    }
  });
  page.on('request', (request) => {
    requestPaths.push(new URL(request.url()).pathname);
  });

  await page.goto('/');
  await expect(
    page.locator('#shell-root[data-assets-ready="true"]'),
  ).toHaveCount(1, { timeout: 5_000 });
  await expect(page.locator('#shell-root[data-assets-count="5"]')).toHaveCount(
    1,
  );

  const initial = await page.evaluate(() => {
    const probe = (
      window as Window & {
        __huntboundAssetProbe?: {
          snapshot(): AssetProbeSnapshot;
          unload(): Promise<AssetProbeSnapshot>;
          reload(): Promise<AssetProbeSnapshot>;
        };
      }
    ).__huntboundAssetProbe;

    return probe?.snapshot();
  });
  expect(initial).toEqual({
    state: 'loaded',
    count: 5,
    keys: expectedKeys,
  });

  const unloaded = await page.evaluate(async () => {
    const probe = (
      window as Window & {
        __huntboundAssetProbe?: {
          unload(): Promise<AssetProbeSnapshot>;
        };
      }
    ).__huntboundAssetProbe;

    return probe?.unload();
  });
  expect(unloaded).toEqual({ state: 'unloaded', count: 0, keys: [] });

  const reloaded = await page.evaluate(async () => {
    const probe = (
      window as Window & {
        __huntboundAssetProbe?: {
          reload(): Promise<AssetProbeSnapshot>;
        };
      }
    ).__huntboundAssetProbe;

    return probe?.reload();
  });
  expect(reloaded).toEqual({
    state: 'loaded',
    count: 5,
    keys: expectedKeys,
  });

  const mediaPaths = await discoverMediaPaths(page);
  expect(requestPaths).toContain('/assets/test/catalog.json');
  expect(requestPaths).toEqual(expect.arrayContaining(mediaPaths));
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(badResponses).toEqual([]);
});
