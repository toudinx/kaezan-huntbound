import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runAssetPackerCli } from '../cli.ts';

const packDirectory = 'pb-02-contract-coverage';
const packId = 'asset-pack:fixture:pb-02-contract-coverage';
const packSourceRoot = join(
  process.cwd(),
  'packages/test-fixtures/assets/pb02/expected/test/packs',
  packDirectory,
);
const temporaryRoots: string[] = [];

afterEach(async () => {
  const sourceRoot = process.env.HUNTBOUND_PERSONAL_ASSET_SOURCE;
  if (sourceRoot !== undefined) {
    delete process.env.HUNTBOUND_PERSONAL_ASSET_SOURCE;
  }
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function createProfileRoot(profile: 'test' | 'product'): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'huntbound-profile-cli-'));
  temporaryRoots.push(root);
  await cp(packSourceRoot, join(root, 'packs', packDirectory), {
    recursive: true,
  });
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

function ioCapture() {
  const stdout: unknown[] = [];
  const stderr: unknown[] = [];
  return {
    stdout,
    stderr,
    io: {
      stdout(value: unknown) {
        stdout.push(value);
      },
      stderr(value: unknown) {
        stderr.push(value);
      },
      usage() {
        stderr.push('usage');
      },
    },
  };
}

describe('asset profile CLI', () => {
  it('checks an existing profile tree', async () => {
    const root = await createProfileRoot('test');
    const capture = ioCapture();

    const code = await runAssetPackerCli(
      [
        'profile-check',
        '--profile',
        'test',
        '--profile-root',
        relative(process.cwd(), root),
      ],
      capture.io,
    );

    expect(code).toBe(0);
    expect(capture.stderr).toEqual([]);
  });

  it('stages a profile and rewrites only the target catalog profile', async () => {
    const sourceRoot = await createProfileRoot('test');
    const destinationParent = await mkdtemp(
      join(tmpdir(), 'huntbound-profile-cli-output-'),
    );
    temporaryRoots.push(destinationParent);
    const destinationRoot = join(destinationParent, 'product');
    const capture = ioCapture();

    const code = await runAssetPackerCli(
      [
        'stage-profile',
        '--profile',
        'product',
        '--source-profile-root',
        sourceRoot,
        '--output',
        destinationRoot,
      ],
      capture.io,
    );

    expect(code).toBe(0);
    expect(
      JSON.parse(await readFile(join(destinationRoot, 'catalog.json'), 'utf8')),
    ).toEqual(expect.objectContaining({ profile: 'product' }));
  });

  it('accepts only the allowlisted personal source environment name', async () => {
    const sourceRoot = await mkdtemp(join(tmpdir(), 'huntbound-personal-'));
    temporaryRoots.push(sourceRoot);
    process.env.HUNTBOUND_PERSONAL_ASSET_SOURCE = sourceRoot;
    const capture = ioCapture();

    const code = await runAssetPackerCli(
      [
        'build-profile',
        '--profile',
        'personal',
        '--selection',
        join(sourceRoot, 'selection.json'),
        '--source-lock',
        join(sourceRoot, 'source-lock.json'),
        '--source-root-env',
        'HUNTBOUND_PERSONAL_ASSET_SOURCE',
        '--output',
        join(sourceRoot, 'output'),
      ],
      capture.io,
    );

    expect(code).toBe(1);
    expect(capture.stderr.length).toBeGreaterThan(0);
  });
});
