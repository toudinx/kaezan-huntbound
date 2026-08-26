import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runHuntIndexCli } from './cli.ts';

const roots: string[] = [];

interface Captured {
  readonly out: string[];
  readonly err: string[];
  usage: number;
}

function io(captured: Captured) {
  return {
    stdout(value: unknown) {
      captured.out.push(
        typeof value === 'string' ? value : JSON.stringify(value),
      );
    },
    stderr(value: unknown) {
      captured.err.push(
        typeof value === 'string' ? value : JSON.stringify(value),
      );
    },
    usage() {
      captured.usage += 1;
    },
  };
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'hunt-index-'));
  roots.push(root);
  const selections = join(root, 'selections');
  const generatedRoot = join(root, 'generated', 'hunts');
  const slug = 'venore-rotworm-cave';
  mkdirSync(selections, { recursive: true });
  mkdirSync(join(generatedRoot, slug), { recursive: true });

  const selection = {
    key: 'hunt:tibia:venore-rotworm-cave',
    displayName: 'Test Cave',
    sourceUrl: 'https://example.invalid/hunt',
    source: { map: 'map.otbm', spawns: 'spawns.xml' },
    layout: 'layout.json',
    recommendedLevel: 8,
    soloVocation: 'vocation:tibia:knight',
    band: 1,
    region: { minX: 0, minY: 0, maxX: 1, maxY: 1, floors: [8] },
    creatures: ['creature:tibia:rotworm'],
    excludedCreatures: [],
    expectedSpawnGroups: 1,
    expectedSpawnSlots: 2,
    expectedDroppedTransitions: 0,
    budget: { maxFloors: 3, maxWidth: 96, maxHeight: 96 },
  };
  writeFileSync(
    join(selections, `${slug}.json`),
    `${JSON.stringify(selection)}\n`,
    'utf8',
  );
  writeFileSync(
    join(generatedRoot, slug, 'spawns.json'),
    `${JSON.stringify({
      groups: [
        {
          center: { x: 0, y: 0, z: 8 },
          radius: 1,
          sourceCenter: { x: 100, y: 200, z: 8 },
          slots: [
            {
              creatureKey: 'creature:tibia:rotworm',
              blueprintId: 'rotworm',
              offsetX: 0,
              offsetY: 0,
              offsetZ: 0,
              respawnTicks: 1800,
              source: { x: 100, y: 200, z: 8 },
            },
            {
              creatureKey: 'creature:tibia:rotworm',
              blueprintId: 'rotworm',
              offsetX: 1,
              offsetY: 0,
              offsetZ: 0,
              respawnTicks: 1800,
              source: { x: 101, y: 200, z: 8 },
            },
          ],
        },
      ],
      maxLiveActors: 2,
    })}\n`,
    'utf8',
  );
  const catalog = join(root, 'catalog.json');
  writeFileSync(
    catalog,
    `${JSON.stringify({
      creatures: [
        {
          stableKey: 'creature:tibia:rotworm',
          displayName: 'Rotworm',
          stats: { health: 65, experience: 40 },
          lookType: 26,
          loot: [],
        },
      ],
    })}\n`,
    'utf8',
  );
  return {
    selections,
    generatedRoot,
    catalog,
    output: join(root, 'generated', 'hunts', 'index.json'),
  };
}

function args(
  paths: ReturnType<typeof fixture>,
  check = false,
): readonly string[] {
  return [
    'build',
    ...(check ? ['--check'] : []),
    '--selections',
    paths.selections,
    '--catalog',
    paths.catalog,
    '--generated-root',
    paths.generatedRoot,
    '--output',
    paths.output,
  ];
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('runHuntIndexCli', () => {
  it('writes deterministic JSON and sidecar, then rejects a changed byte with --check', () => {
    const paths = fixture();
    let captured: Captured = { out: [], err: [], usage: 0 };

    expect(runHuntIndexCli(args(paths), io(captured))).toBe(0);
    const first = readFileSync(paths.output, 'utf8');
    expect(JSON.parse(first).hunts[0]).toMatchObject({
      experiencePerHour: 3200,
      runtimeDirectory: 'pb04',
    });
    expect(
      readFileSync(paths.output.replace(/\.json$/, '.sha256'), 'utf8'),
    ).toBe(`${sha256(first)}\n`);

    expect(runHuntIndexCli(args(paths), io(captured))).toBe(0);
    expect(readFileSync(paths.output, 'utf8')).toBe(first);
    expect(runHuntIndexCli(args(paths, true), io(captured))).toBe(0);

    writeFileSync(
      paths.output,
      first.replace('"experiencePerHour": 3200', '"experiencePerHour": 3201'),
      'utf8',
    );
    captured = { out: [], err: [], usage: 0 };
    expect(runHuntIndexCli(args(paths, true), io(captured))).toBe(1);
    expect(captured.err.join(' ')).toContain('content-divergent');
    expect(captured.err.join(' ')).toContain('offset');
  });
});
