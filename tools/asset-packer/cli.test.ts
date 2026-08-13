import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { createPb02SyntheticSource } from './testing/createPb02SyntheticSource.ts';

const roots: string[] = [];
const cliPath = resolve(import.meta.dirname, 'cli.ts');
const fixtureRoot = resolve(
  import.meta.dirname,
  '../../packages/test-fixtures/assets/pb02',
);

interface CliResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

async function runCli(args: readonly string[]): Promise<CliResult> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(
      process.execPath,
      ['--no-warnings', '--experimental-transform-types', cliPath, ...args],
      {
        cwd: import.meta.dirname,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.once('error', reject);
    child.once('close', (exitCode) => {
      resolveResult({ exitCode: exitCode ?? -1, stdout, stderr });
    });
  });
}

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), 'pb02-cli-'));
  roots.push(root);
  const sourceRoot = join(root, 'source');
  const output = join(root, 'output', 'pack');
  await createPb02SyntheticSource({ destinationRoot: sourceRoot });
  const selection = join(fixtureRoot, 'selection.json');
  const sourceLock = join(fixtureRoot, 'source-lock.json');
  const buildArgs = [
    'build',
    '--selection',
    selection,
    '--source-lock',
    sourceLock,
    '--source-root',
    sourceRoot,
    '--output',
    output,
  ] as const;
  return { root, sourceRoot, output, selection, sourceLock, buildArgs };
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('asset packer CLI', () => {
  it('returns exit code 2 for invalid command usage', async () => {
    const result = await runCli(['build', '--selection']);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Usage:');
  });

  it('builds and checks a pack without modifying the checked destination', async () => {
    const fixture = await createFixture();
    const built = await runCli(fixture.buildArgs);

    expect(built.exitCode).toBe(0);
    expect(built.stderr).toBe('');
    expect(JSON.parse(built.stdout)).toMatchObject({
      ok: true,
      command: 'build',
      packId: 'asset-pack:fixture:pb-02-contract-coverage',
      mediaCount: 1,
    });

    const canonicalPack = await readFile(join(fixture.output, 'pack.json'));
    const checked = await runCli([
      'build',
      '--check',
      ...fixture.buildArgs.slice(1),
    ]);
    expect(checked.exitCode).toBe(0);
    expect(checked.stderr).toBe('');
    expect(JSON.parse(checked.stdout)).toMatchObject({
      ok: true,
      command: 'build',
      check: true,
    });
    expect(await readFile(join(fixture.output, 'pack.json'))).toEqual(
      canonicalPack,
    );

    await writeFile(join(fixture.output, 'pack.json'), '{}\n');
    const divergentBytes = await readFile(join(fixture.output, 'pack.json'));
    const divergent = await runCli([
      'build',
      '--check',
      ...fixture.buildArgs.slice(1),
    ]);
    expect(divergent.exitCode).toBe(1);
    expect(divergent.stdout).toBe('');
    const mismatch = JSON.parse(divergent.stderr) as {
      readonly code: string;
      readonly differences: readonly { readonly path: string }[];
    };
    expect(mismatch.code).toBe('ASSET_PACK_CONFLICT');
    expect(mismatch.differences).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'pack.json' })]),
    );
    expect(await readFile(join(fixture.output, 'pack.json'))).toEqual(
      divergentBytes,
    );
  });

  it('verifies source locks and materialized packs with deterministic exit codes', async () => {
    const fixture = await createFixture();
    const sourceVerified = await runCli([
      'source',
      'verify',
      '--source-lock',
      fixture.sourceLock,
      '--source-root',
      fixture.sourceRoot,
    ]);
    expect(sourceVerified.exitCode).toBe(0);
    expect(JSON.parse(sourceVerified.stdout)).toMatchObject({
      ok: true,
      command: 'source verify',
      files: { verified: 5 },
    });

    const built = await runCli(fixture.buildArgs);
    expect(built.exitCode).toBe(0);
    const verified = await runCli([
      'verify-pack',
      '--pack-root',
      fixture.output,
    ]);
    expect(verified.exitCode).toBe(0);
    expect(JSON.parse(verified.stdout)).toMatchObject({
      ok: true,
      command: 'verify-pack',
      mediaCount: 1,
    });

    const mediaPath = join(
      fixture.output,
      'media',
      '431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460.png',
    );
    await rm(mediaPath);
    const invalid = await runCli([
      'verify-pack',
      '--pack-root',
      fixture.output,
    ]);
    expect(invalid.exitCode).toBe(1);
    expect(invalid.stdout).toBe('');
    expect(JSON.parse(invalid.stderr)).toMatchObject([
      { code: 'ASSET_MEDIA_MISSING' },
    ]);
  });
});
