import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const roots: string[] = [];
const cliPath = resolve(import.meta.dirname, 'cli.ts');
const workspaceRoot = resolve(import.meta.dirname, '../..');

interface CliResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

async function runCli(args: readonly string[], env?: NodeJS.ProcessEnv) {
  return new Promise<CliResult>((resolveResult, reject) => {
    const child = spawn(
      process.execPath,
      ['--no-warnings', '--experimental-transform-types', cliPath, ...args],
      {
        cwd: workspaceRoot,
        env: { ...process.env, ...env },
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
  const root = await mkdtemp(join(tmpdir(), 'hunt-selection-cli-'));
  roots.push(root);
  const sourceRoot = join(root, 'source');
  const xmlPath = join(
    sourceRoot,
    'data-otservbr-global',
    'world',
    'otservbr-monster.xml',
  );
  const selectionPath = join(root, 'selection.json');
  await mkdir(join(sourceRoot, 'data-otservbr-global', 'world'), {
    recursive: true,
  });
  const selection = {
    key: 'hunt:tibia:venore-rotworm-cave',
    displayName: 'Venore Rotworm Cave',
    sourceUrl: 'https://tibiaroute.com/br/hunting-places/Venore-Rotworm-Cave',
    source: {
      map: 'data-otservbr-global/world/otservbr.otbm',
      spawns: 'data-otservbr-global/world/otservbr-monster.xml',
    },
    recommendedLevel: 8,
    soloVocation: 'vocation:tibia:knight',
    region: { minX: 100, minY: 200, maxX: 100, maxY: 200, floors: [8] },
    creatures: ['creature:tibia:rotworm'],
    excludedCreatures: [],
    expectedSpawnGroups: 1,
    expectedSpawnSlots: 1,
    expectedDroppedTransitions: 0,
    budget: { maxFloors: 3, maxWidth: 96, maxHeight: 96 },
  };
  await writeFile(
    xmlPath,
    `<monsters><monster centerx="100" centery="200" centerz="8" radius="2"><monster name="Rotworm" x="0" y="0" z="8" spawntime="90" /></monster></monsters>`,
    'utf8',
  );
  await writeFile(selectionPath, `${JSON.stringify(selection)}\n`, 'utf8');
  return { root, sourceRoot, selectionPath };
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

describe('hunt selection CLI', () => {
  it('returns a measured valid report with exit code 0', async () => {
    const fixture = await createFixture();

    const result = await runCli([
      'check',
      '--selection',
      fixture.selectionPath,
      '--source-root',
      fixture.sourceRoot,
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      command: 'check',
      width: 1,
      height: 1,
      spawnGroups: 1,
      spawnSlots: 1,
    });
  });

  it('returns exit code 1 and ordered diagnostics when the selection is invalid', async () => {
    const fixture = await createFixture();
    const selection = JSON.parse(
      await readFile(fixture.selectionPath, 'utf8'),
    ) as { region: { maxX: number } };
    selection.region.maxX = 196;
    await writeFile(
      fixture.selectionPath,
      `${JSON.stringify(selection)}\n`,
      'utf8',
    );

    const result = await runCli([
      'check',
      '--selection',
      fixture.selectionPath,
      '--source-root',
      fixture.sourceRoot,
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      command: 'check',
      diagnostics: [
        expect.objectContaining({
          path: 'region.maxX',
          code: 'HUNT_REGION_OUT_OF_BUDGET',
        }),
      ],
    });
  });

  it('returns exit code 2 for invalid usage', async () => {
    const result = await runCli(['check', '--selection']);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Usage:');
  });

  it('registers the opt-in root script outside aggregate check and verify', async () => {
    const packageJson = JSON.parse(
      await readFile(resolve(workspaceRoot, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts['hunt:selection:check']).toBe(
      'node --no-warnings --experimental-transform-types tools/hunt-selection/cli.ts check --selection packages/content/src/selections/hunts/venore-rotworm-cave.json --source-root-env HUNTBOUND_CANARY_SOURCE',
    );
    expect(packageJson.scripts.check).not.toContain('hunt:selection:check');
    expect(packageJson.scripts.verify).not.toContain('hunt:selection:check');
  });
});
