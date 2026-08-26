import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

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
    layout: 'layout.json',
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

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

async function writeSnapshotFile(
  sourceRoot: string,
  relativePath: string,
  contents: string,
) {
  const fullPath = join(sourceRoot, relativePath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, contents, 'utf8');
}

async function createCombatFixture() {
  const root = await mkdtemp(join(tmpdir(), 'combat-selection-cli-'));
  roots.push(root);
  const sourceRoot = join(root, 'source');
  const selectionPath = join(root, 'selection.json');
  const snapshotFiles: Record<string, string> = {
    'data/XML/vocations.xml': `<vocations>
	<vocation id="4" name="Knight" attackspeed="2000" basespeed="110" gainhp="15" gainmana="5" />
</vocations>
`,
    'data/scripts/spells/attack/berserk.lua': `spell:id(80)
spell:words("exori")
`,
    'data/scripts/spells/attack/brutal_strike.lua': `spell:id(61)
spell:words("exori ico")
`,
    'data/scripts/spells/healing/wound_cleansing.lua': `spell:id(123)
spell:words("exura ico")
`,
    'data-otservbr-global/monster/vermins/rotworm.lua': `monster.speed = 58
monster.corpse = 5967
`,
    'data/items/items.xml': `<items>
	<item id="3264" name="sword"><attribute key="attack" value="14"/></item>
	<item id="5967" name="dead rotworm"/>
	<item id="2889" name="small splash"/>
</items>
`,
    'src/utils/utils_definitions.hpp': `CONST_ME_DRAWBLOOD = 1,
CONST_ME_HITAREA = 10,
CONST_ME_MAGIC_BLUE = 13,
CONST_ANI_WEAPONTYPE = 0xFE,
`,
  };
  for (const [relativePath, contents] of Object.entries(snapshotFiles)) {
    await writeSnapshotFile(sourceRoot, relativePath, contents);
  }
  const selection = {
    key: 'selection:pb-05-knight-combat',
    huntKey: 'hunt:tibia:venore-rotworm-cave',
    vocation: {
      stableKey: 'vocation:tibia:knight',
      sourceId: '4',
      sourceFile: 'data/XML/vocations.xml',
      attackSpeedMs: 2000,
      baseSpeed: 110,
    },
    creature: {
      stableKey: 'creature:tibia:rotworm',
      sourceFile: 'data-otservbr-global/monster/vermins/rotworm.lua',
      speed: 58,
      intervalMs: 2000,
      corpseItemId: 5967,
    },
    weapon: {
      stableKey: 'item:tibia:sword',
      sourceId: '3264',
      sourceFile: 'data/items/items.xml',
      attack: 14,
    },
    spells: [
      {
        stableKey: 'spell:tibia:berserk',
        sourceId: '80',
        words: 'exori',
        sourceFile: 'data/scripts/spells/attack/berserk.lua',
        cooldownMs: 4000,
        groupCooldownMs: 2000,
      },
      {
        stableKey: 'spell:tibia:brutal-strike',
        sourceId: '61',
        words: 'exori ico',
        sourceFile: 'data/scripts/spells/attack/brutal_strike.lua',
        cooldownMs: 6000,
        groupCooldownMs: 2000,
      },
      {
        stableKey: 'spell:tibia:wound-cleansing',
        sourceId: '123',
        words: 'exura ico',
        sourceFile: 'data/scripts/spells/healing/wound_cleansing.lua',
        cooldownMs: 1000,
        groupCooldownMs: 1000,
      },
    ],
    assets: [
      {
        kind: 'effect',
        name: 'CONST_ME_DRAWBLOOD',
        sourceId: 1,
        sourceFile: 'src/utils/utils_definitions.hpp',
      },
      {
        kind: 'effect',
        name: 'CONST_ME_HITAREA',
        sourceId: 10,
        sourceFile: 'src/utils/utils_definitions.hpp',
      },
      {
        kind: 'effect',
        name: 'CONST_ME_MAGIC_BLUE',
        sourceId: 13,
        sourceFile: 'src/utils/utils_definitions.hpp',
      },
      {
        kind: 'effect',
        name: 'CONST_ANI_WEAPONTYPE',
        sourceId: 254,
        sourceFile: 'src/utils/utils_definitions.hpp',
      },
      {
        kind: 'item',
        name: 'dead rotworm',
        sourceId: '5967',
        sourceFile: 'data/items/items.xml',
      },
      {
        kind: 'item',
        name: 'small splash',
        sourceId: '2889',
        sourceFile: 'data/items/items.xml',
      },
    ],
    postures: [
      {
        abilityId: 'blood-rage',
        conditionId: 'blood-rage',
        displayName: 'Blood Rage',
        level: 20,
        mana: 20,
        skillIndex: 2,
        skillModifierPermille: 250,
        damageReceivedPermille: 150,
        damageDealtPermille: 0,
        shieldingPermille: 0,
        source: {
          provider: 'TibiaWiki',
          version: '15.25.3a4a52',
          divergence:
            'Uses the 2026 stance values because the Canary snapshot predates toggle stances.',
        },
      },
      {
        abilityId: 'protector',
        conditionId: 'protector',
        displayName: 'Protector',
        level: 20,
        mana: 20,
        skillIndex: null,
        skillModifierPermille: 0,
        damageReceivedPermille: -150,
        damageDealtPermille: -150,
        shieldingPermille: 300,
        source: {
          provider: 'TibiaWiki',
          version: '15.25.3a4a52',
          divergence:
            'Shielding stays declarative until PB-11 adds armor and shielding resolution.',
        },
      },
    ],
    sourceFiles: Object.entries(snapshotFiles).map(
      ([relativePath, contents]) => ({
        relativePath,
        sha256: sha256(contents),
      }),
    ),
  };
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
      'node --no-warnings --experimental-transform-types tools/hunt-selection/checkAll.ts',
    );
    expect(packageJson.scripts['pb05:selection:check']).toBe(
      'node --no-warnings --experimental-transform-types tools/hunt-selection/cli.ts check-combat --selection packages/content/src/selections/pb-05-knight-combat.json --source-root-env HUNTBOUND_CANARY_SOURCE',
    );
    expect(packageJson.scripts.check).not.toContain('hunt:selection:check');
    expect(packageJson.scripts.verify).not.toContain('hunt:selection:check');
    expect(packageJson.scripts.check).not.toContain('pb05:selection:check');
    expect(packageJson.scripts.verify).not.toContain('pb05:selection:check');
  });

  it('returns a combat ID report with exit code 0', async () => {
    const fixture = await createCombatFixture();

    const result = await runCli([
      'check-combat',
      '--selection',
      fixture.selectionPath,
      '--source-root',
      fixture.sourceRoot,
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      command: 'check-combat',
      presentIds: expect.arrayContaining(['vocation:4', 'spell:80']),
      diagnostics: [],
    });
  });

  it('returns exit code 1 listing every missing combat ID', async () => {
    const fixture = await createCombatFixture();
    const selection = JSON.parse(
      await readFile(fixture.selectionPath, 'utf8'),
    ) as { vocation: { sourceId: string }; weapon: { sourceId: string } };
    selection.vocation.sourceId = '99';
    selection.weapon.sourceId = '1';
    await writeFile(
      fixture.selectionPath,
      `${JSON.stringify(selection)}\n`,
      'utf8',
    );

    const result = await runCli([
      'check-combat',
      '--selection',
      fixture.selectionPath,
      '--source-root',
      fixture.sourceRoot,
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    const report = JSON.parse(result.stderr) as {
      diagnostics: { path: string; code: string }[];
    };
    expect(report.diagnostics).toEqual([
      expect.objectContaining({
        path: 'vocation.sourceId',
        code: 'PB05_ID_MISSING',
      }),
      expect.objectContaining({
        path: 'weapon.sourceId',
        code: 'PB05_ID_MISSING',
      }),
    ]);
  });
});
