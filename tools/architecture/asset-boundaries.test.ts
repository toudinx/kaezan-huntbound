import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, it } from 'node:test';

import { checkAssetBoundaries } from './asset-boundaries.ts';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixtureRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'huntbound-asset-boundaries-'));
  temporaryRoots.push(root);
  return root;
}

async function sourceFile(
  root: string,
  relativePath: string,
  source: string,
): Promise<void> {
  const path = join(root, relativePath);
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, source);
}

describe('checkAssetBoundaries', () => {
  it('reports forbidden asset imports and consumer media paths', async () => {
    const root = await fixtureRoot();
    await sourceFile(
      root,
      'packages/simulation/src/index.ts',
      [
        "import '@huntbound/assets';",
        "const personal = '/assets/personal/packs/x.png';",
        "const media = 'sprite.png';",
        'void personal; void media;',
      ].join('\n'),
    );
    await sourceFile(
      root,
      'packages/assets/src/index.ts',
      "import 'phaser'; import 'node:fs'; import 'path';\n",
    );
    await sourceFile(
      root,
      'packages/content/src/index.ts',
      "const manifest = 'packs/x/pack.json';\nvoid manifest;\n",
    );

    const diagnostics = await checkAssetBoundaries(root);

    assert.ok(
      diagnostics.some((diagnostic) => diagnostic.includes('simulation')),
    );
    assert.ok(
      diagnostics.some((diagnostic) =>
        diagnostic.includes('@huntbound/assets'),
      ),
    );
    assert.ok(
      diagnostics.some((diagnostic) => diagnostic.includes('sprite.png')),
    );
    assert.ok(
      diagnostics.some((diagnostic) => diagnostic.includes('assets/personal')),
    );
    assert.ok(
      diagnostics.some((diagnostic) => diagnostic.includes('packages/assets')),
    );
    assert.ok(diagnostics.some((diagnostic) => diagnostic.includes('phaser')));
    assert.ok(diagnostics.some((diagnostic) => diagnostic.includes('node:fs')));
    assert.ok(
      diagnostics.some((diagnostic) => diagnostic.includes('packages/content')),
    );
    assert.ok(
      diagnostics.some((diagnostic) =>
        diagnostic.includes('packs/x/pack.json'),
      ),
    );
  });

  it('allows manifest tooling, fixtures, and the profile composition boundary', async () => {
    const root = await fixtureRoot();
    await sourceFile(
      root,
      'tools/asset-packer/index.ts',
      "const media = 'media/abc.png'; void media;\n",
    );
    await sourceFile(
      root,
      'packages/assets/catalog/selections/index.ts',
      "const pack = 'packs/x/pack.json'; void pack;\n",
    );
    await sourceFile(
      root,
      'packages/test-fixtures/assets/index.ts',
      "const fixture = 'fixture.png'; void fixture;\n",
    );
    await sourceFile(
      root,
      'apps/game/vite.config.ts',
      "const profile = 'assets/personal'; void profile;\n",
    );
    await sourceFile(
      root,
      'apps/game/src/assets/AssetProfile.ts',
      "export const catalogUrl = '/assets/test/catalog.json';\n",
    );

    assert.deepEqual(await checkAssetBoundaries(root), []);
  });
});
