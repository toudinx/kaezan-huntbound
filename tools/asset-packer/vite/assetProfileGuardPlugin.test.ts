import { createHash } from 'node:crypto';
import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import type { Connect, ViteDevServer } from 'vite';
import { describe, expect, it } from 'vitest';

import { canonicalAssetJson } from '../application/buildAssetPack.ts';
import { assetProfileGuardPlugin } from './assetProfileGuardPlugin.ts';

const packId = 'asset-pack:fixture:pb-02-contract-coverage';
const packDirectory = 'pb-02-contract-coverage';
const fixturePackRoot = join(
  process.cwd(),
  'packages/test-fixtures/assets/pb02/expected/test/packs',
  packDirectory,
);

type EmittedAsset = {
  readonly type: 'asset';
  readonly fileName: string;
  readonly source: string | Uint8Array;
};

async function createProfileRoot(
  profile: 'test' | 'product',
  restricted: boolean,
  destination?: string,
): Promise<string> {
  const root =
    destination ?? (await mkdtemp(join(tmpdir(), 'huntbound-vite-guard-')));
  await mkdir(root, { recursive: true });
  const packRoot = join(root, 'packs', packDirectory);
  await cp(fixturePackRoot, packRoot, { recursive: true });
  if (restricted) {
    const packPath = join(packRoot, 'pack.json');
    const pack = JSON.parse(await readFile(packPath, 'utf8')) as {
      groups: Array<{ buildProfiles: string[]; licenseClass: string }>;
    };
    for (const group of pack.groups) {
      group.buildProfiles = ['personal'];
      group.licenseClass = 'cipsoft-personal';
    }
    const packJson = canonicalAssetJson(pack);
    await writeFile(packPath, packJson);
    await writeFile(
      join(packRoot, 'pack.sha256'),
      `${createHash('sha256').update(packJson).digest('hex')}\n`,
    );
  }
  await writeFile(
    join(root, 'catalog.json'),
    `${JSON.stringify({
      packs: [
        {
          manifestPath: `packs/${packDirectory}/pack.json`,
          packId,
        },
      ],
      preloads: [
        {
          packId,
          requiredKeys: [
            'creature:tibia:rotworm',
            'effect:tibia:energy-hit',
            'item:tibia:gold-coin',
            'missile:tibia:energy-ball',
            'outfit:tibia:knight',
          ],
        },
      ],
      profile,
      schemaVersion: '1',
    })}\n`,
  );
  return root;
}

async function listFiles(root: string, current = root): Promise<string[]> {
  const entries = (await readdir(current, { withFileTypes: true })).sort(
    (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  );
  const files: string[] = [];
  for (const entry of entries) {
    const absolutePath = join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, absolutePath)));
      continue;
    }
    if (entry.isFile()) {
      files.push(relative(root, absolutePath).replaceAll('\\', '/'));
    }
  }
  return files;
}

async function runBuildStart(
  root: string,
  profile: 'test' | 'product',
  emitted: EmittedAsset[] = [],
  command?: 'build' | 'serve',
) {
  const plugin = assetProfileGuardPlugin({
    profile,
    publicDir: root,
  });
  if (typeof plugin.buildStart !== 'function') {
    throw new Error('guard plugin must expose a buildStart hook');
  }
  if (command !== undefined) {
    if (typeof plugin.configResolved !== 'function') {
      throw new Error('guard plugin must expose a configResolved hook');
    }
    (plugin.configResolved as (config: { command: 'build' | 'serve' }) => void)(
      { command },
    );
  }
  const context = {
    emitFile(asset: EmittedAsset): string {
      emitted.push(asset);
      return `asset-${emitted.length}`;
    },
  };
  await (
    plugin.buildStart as unknown as (
      this: typeof context,
      options: Record<string, never>,
    ) => void | Promise<void>
  ).call(context, {});
}

async function captureDevMiddleware(
  root: string,
  profile: 'test' | 'product',
): Promise<Connect.NextHandleFunction> {
  const plugin = assetProfileGuardPlugin({
    profile,
    publicDir: root,
  });
  if (typeof plugin.configureServer !== 'function') {
    throw new Error('guard plugin must expose a configureServer hook');
  }

  let middleware: Connect.NextHandleFunction | undefined;
  const server = {
    middlewares: {
      use(handler: Connect.HandleFunction) {
        middleware = handler as Connect.NextHandleFunction;
      },
    },
  } as unknown as ViteDevServer;
  await (
    plugin.configureServer as (server: ViteDevServer) => void | Promise<void>
  )(server);
  if (middleware === undefined) {
    throw new Error('guard plugin did not register dev middleware');
  }
  return middleware;
}

function createTestResponse() {
  const response = {
    statusCode: 0,
    headers: new Map<string, string>(),
    body: undefined as Buffer | undefined,
    ended: false,
    setHeader(name: string, value: string | number) {
      response.headers.set(name.toLowerCase(), String(value));
    },
    end(body?: string | Uint8Array) {
      response.body = body === undefined ? undefined : Buffer.from(body);
      response.ended = true;
    },
  };
  return response;
}

describe('asset profile Vite guard', () => {
  it('allows a valid test profile before bundle work starts', async () => {
    const root = await createProfileRoot('test', false);
    try {
      await expect(runBuildStart(root, 'test')).resolves.toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects a product profile containing a personal license in buildStart', async () => {
    const root = await createProfileRoot('product', true);
    try {
      await expect(runBuildStart(root, 'product')).rejects.toThrow(
        'ASSET_LICENSE_FORBIDDEN',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('emits only the active profile tree with binary bytes preserved', async () => {
    const publicRoot = await mkdtemp(join(tmpdir(), 'huntbound-vite-output-'));
    const productRoot = join(publicRoot, 'assets', 'product');
    const personalRoot = join(publicRoot, 'assets', 'personal');
    const outputRoot = await mkdtemp(join(tmpdir(), 'huntbound-vite-dist-'));
    await createProfileRoot('product', false, productRoot);
    await createProfileRoot('product', false, personalRoot);
    const emitted: EmittedAsset[] = [];

    try {
      await runBuildStart(productRoot, 'product', emitted);
      for (const asset of emitted) {
        const outputPath = join(outputRoot, asset.fileName);
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, asset.source);
      }

      const expectedFiles = [
        'assets/product/catalog.json',
        'assets/product/packs/pb-02-contract-coverage/media/431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460.png',
        'assets/product/packs/pb-02-contract-coverage/pack.json',
        'assets/product/packs/pb-02-contract-coverage/pack.sha256',
      ];
      expect(await listFiles(outputRoot)).toEqual(expectedFiles);
      expect(
        emitted.every((asset) => asset.fileName.startsWith('assets/product/')),
      ).toBe(true);

      for (const outputFile of expectedFiles) {
        const sourceFile = outputFile.replace('assets/product/', '');
        await expect(readFile(join(outputRoot, outputFile))).resolves.toEqual(
          await readFile(join(productRoot, sourceFile)),
        );
      }
    } finally {
      await rm(publicRoot, { recursive: true, force: true });
      await rm(outputRoot, { recursive: true, force: true });
    }
  });

  it('does not emit build assets while Vite is serving', async () => {
    const root = await createProfileRoot('product', false);
    const emitted: EmittedAsset[] = [];
    try {
      await runBuildStart(root, 'product', emitted, 'serve');
      expect(emitted).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('serves an asset from the active profile in the dev server', async () => {
    const root = await createProfileRoot(
      'product',
      false,
      await mkdtemp(join(tmpdir(), 'huntbound-vite-dev-')),
    );
    try {
      const middleware = await captureDevMiddleware(root, 'product');
      const response = createTestResponse();
      let nextError: unknown;
      await middleware(
        {
          url: '/assets/product/catalog.json',
          method: 'GET',
        } as Connect.IncomingMessage,
        response as unknown as Parameters<Connect.NextHandleFunction>[1],
        (error) => {
          nextError = error;
        },
      );

      expect(nextError).toBeUndefined();
      expect(response.statusCode).toBe(200);
      expect(response.headers.get('content-type')).toBe(
        'application/json; charset=utf-8',
      );
      expect(response.body?.toString('utf8')).toContain('"profile":"product"');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('caches content-addressed media forever and revalidates manifests', async () => {
    const root = await createProfileRoot('product', false);
    try {
      const middleware = await captureDevMiddleware(root, 'product');
      const mediaResponse = createTestResponse();
      await middleware(
        {
          url: '/assets/product/packs/pb-02-contract-coverage/media/431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460.png',
          method: 'GET',
        } as Connect.IncomingMessage,
        mediaResponse as unknown as Parameters<Connect.NextHandleFunction>[1],
        () => undefined,
      );
      const manifestResponse = createTestResponse();
      await middleware(
        {
          url: '/assets/product/packs/pb-02-contract-coverage/pack.json',
          method: 'GET',
        } as Connect.IncomingMessage,
        manifestResponse as unknown as Parameters<Connect.NextHandleFunction>[1],
        () => undefined,
      );

      expect(mediaResponse.statusCode).toBe(200);
      expect(mediaResponse.headers.get('cache-control')).toBe(
        'public, max-age=31536000, immutable',
      );
      expect(manifestResponse.statusCode).toBe(200);
      expect(manifestResponse.headers.get('cache-control')).toBe('no-cache');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('returns not found for inactive profile requests in the dev server', async () => {
    const publicRoot = await mkdtemp(join(tmpdir(), 'huntbound-vite-dev-'));
    const productRoot = join(publicRoot, 'assets', 'product');
    const personalRoot = join(publicRoot, 'assets', 'personal');
    await createProfileRoot('product', false, productRoot);
    await createProfileRoot('product', false, personalRoot);
    try {
      const middleware = await captureDevMiddleware(productRoot, 'product');
      const response = createTestResponse();
      let nextCalls = 0;
      await middleware(
        {
          url: '/assets/personal/catalog.json',
          method: 'GET',
        } as Connect.IncomingMessage,
        response as unknown as Parameters<Connect.NextHandleFunction>[1],
        () => {
          nextCalls += 1;
        },
      );

      expect(nextCalls).toBe(0);
      expect(response.statusCode).toBe(404);
      expect(response.ended).toBe(true);
    } finally {
      await rm(publicRoot, { recursive: true, force: true });
    }
  });
});
