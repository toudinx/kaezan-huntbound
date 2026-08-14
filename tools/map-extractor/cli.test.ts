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

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runMapExtractorCli } from './cli.ts';
import { HUNT_FILE_NAMES } from './output.ts';
import type { OtbmAreaFixture } from './testing/otbmFixture.ts';
import { encodeOtbmMap } from './testing/otbmFixture.ts';
import { tileFlags, tileFlagsTable } from './testing/tileFlagsFixture.ts';

const MIN_X = 1000;
const MIN_Y = 2000;
const SIZE = 4;
const GROUND = 100;

const selection = {
  key: 'hunt:tibia:test-cave',
  displayName: 'Test Cave',
  sourceUrl: 'https://example.invalid/hunt',
  recommendedLevel: 8,
  soloVocation: 'vocation:tibia:knight',
  region: {
    minX: MIN_X,
    minY: MIN_Y,
    maxX: MIN_X + SIZE - 1,
    maxY: MIN_Y + SIZE - 1,
    floors: [7, 8],
  },
  creatures: ['creature:tibia:rotworm'],
  excludedCreatures: [],
  expectedSpawnGroups: 1,
  expectedSpawnSlots: 1,
  expectedDroppedTransitions: 0,
  budget: { maxFloors: 3, maxWidth: 96, maxHeight: 96 },
};

const spawnXml = `<?xml version="1.0"?><monsters><monster centerx="${MIN_X + 2}" centery="${MIN_Y + 2}" centerz="8" radius="2"><monster name="Rotworm" x="0" y="1" z="8" spawntime="90" /></monster></monsters>`;

function areas(): readonly OtbmAreaFixture[] {
  return [7, 8].map((baseZ) => ({
    baseX: MIN_X,
    baseY: MIN_Y,
    baseZ,
    tiles: Array.from({ length: SIZE * SIZE }, (_value, index) => ({
      x: MIN_X + (index % SIZE),
      y: MIN_Y + Math.floor(index / SIZE),
      items: [GROUND],
    })),
  }));
}

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

let root = '';
let sourceRoot = '';
let selectionPath = '';
let tileFlagsPath = '';
let sourceLockPath = '';
let mapPath = '';
let spawnPath = '';
let output = '';
let captured: Captured;

function sha256Of(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/** Rewrites the fixture lock so it matches whatever is on disk right now. */
function writeSourceLock(
  overrides: {
    readonly mapRelativePath?: string;
    readonly mapSha256?: string;
  } = {},
) {
  writeFileSync(
    sourceLockPath,
    JSON.stringify({
      sourceSystem: 'canary',
      commit: '157e6f9e21318bd3033eea553fe9275b429faf72',
      license: 'GPL-2.0-only',
      licensePath: 'LICENSE',
      licenseSha256: 'a'.repeat(64),
      files: [
        {
          relativePath:
            overrides.mapRelativePath ?? 'data-canary/world/canary.otbm',
          sha256: overrides.mapSha256 ?? sha256Of(mapPath),
          purpose: 'map',
        },
        {
          relativePath: 'data-otservbr-global/world/otservbr-monster.xml',
          sha256: sha256Of(spawnPath),
          purpose: 'spawn',
        },
      ],
    }),
  );
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'map-extractor-'));
  sourceRoot = join(root, 'canary');
  mkdirSync(join(sourceRoot, 'data-canary', 'world'), { recursive: true });
  mkdirSync(join(sourceRoot, 'data-otservbr-global', 'world'), {
    recursive: true,
  });
  mapPath = join(sourceRoot, 'data-canary', 'world', 'canary.otbm');
  spawnPath = join(
    sourceRoot,
    'data-otservbr-global',
    'world',
    'otservbr-monster.xml',
  );
  writeFileSync(mapPath, encodeOtbmMap(areas()));
  writeFileSync(spawnPath, spawnXml, 'latin1');

  selectionPath = join(root, 'selection.json');
  writeFileSync(selectionPath, JSON.stringify(selection));
  tileFlagsPath = join(root, 'tile-flags.json');
  writeFileSync(
    tileFlagsPath,
    JSON.stringify(tileFlagsTable([tileFlags(GROUND, { ground: true })])),
  );
  sourceLockPath = join(root, 'source-lock.json');
  writeSourceLock();

  output = join(root, 'out');
  captured = { out: [], err: [], usage: 0 };
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function buildArgs(check = false): readonly string[] {
  return [
    'build',
    ...(check ? ['--check'] : []),
    '--selection',
    selectionPath,
    '--source-root',
    sourceRoot,
    '--source-lock',
    sourceLockPath,
    '--tile-flags',
    tileFlagsPath,
    '--output',
    output,
  ];
}

describe('runMapExtractorCli', () => {
  it('writes the four hunt files with their sidecars', () => {
    expect(runMapExtractorCli(buildArgs(), io(captured))).toBe(0);

    for (const name of HUNT_FILE_NAMES) {
      const encoded = readFileSync(join(output, `${name}.json`), 'utf8');
      expect(encoded.endsWith('\n')).toBe(true);
      expect(encoded.split('\n')).toHaveLength(2);
      expect(
        readFileSync(join(output, `${name}.sha256`), 'utf8').trim(),
      ).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('reports exit 0 without writing on the second run with --check', () => {
    expect(runMapExtractorCli(buildArgs(), io(captured))).toBe(0);
    const before = readFileSync(join(output, 'hunt.json'), 'utf8');

    expect(runMapExtractorCli(buildArgs(true), io(captured))).toBe(0);
    expect(readFileSync(join(output, 'hunt.json'), 'utf8')).toBe(before);
  });

  it('re-extracting the same snapshot produces identical bytes', () => {
    runMapExtractorCli(buildArgs(), io(captured));
    const first = HUNT_FILE_NAMES.map((name) =>
      readFileSync(join(output, `${name}.json`), 'utf8'),
    );

    runMapExtractorCli(buildArgs(), io(captured));
    expect(
      HUNT_FILE_NAMES.map((name) =>
        readFileSync(join(output, `${name}.json`), 'utf8'),
      ),
    ).toEqual(first);
  });

  it('fails --check on a divergence naming the file and the offset', () => {
    runMapExtractorCli(buildArgs(), io(captured));
    const path = join(output, 'region.json');
    const encoded = readFileSync(path, 'utf8');
    writeFileSync(
      path,
      encoded.replace('"regionRevision":1', '"regionRevision":2'),
    );

    captured = { out: [], err: [], usage: 0 };
    expect(runMapExtractorCli(buildArgs(true), io(captured))).toBe(1);
    expect(captured.err.join(' ')).toContain('region.json');
    expect(captured.err.join(' ')).toContain('offset');
  });

  it('fails --check when the output is missing', () => {
    expect(runMapExtractorCli(buildArgs(true), io(captured))).toBe(1);
    expect(captured.err.join(' ')).toContain('output-missing');
  });

  it('refuses to write when a blocking diagnostic is raised', () => {
    writeFileSync(
      tileFlagsPath,
      JSON.stringify(tileFlagsTable([tileFlags(999, { ground: true })])),
    );

    expect(runMapExtractorCli(buildArgs(), io(captured))).toBe(1);
    expect(captured.err.join(' ')).toContain('HUNT_ID_MISMATCH');
    expect(() => readFileSync(join(output, 'hunt.json'), 'utf8')).toThrow();
  });

  it('fails when the dropped transition count disagrees with the selection', () => {
    writeFileSync(
      selectionPath,
      JSON.stringify({ ...selection, expectedDroppedTransitions: 3 }),
    );

    expect(runMapExtractorCli(buildArgs(), io(captured))).toBe(1);
    expect(captured.err.join(' ')).toContain('expectedDroppedTransitions');
  });

  it('verifies the sidecars without needing the snapshot', () => {
    runMapExtractorCli(buildArgs(), io(captured));

    expect(
      runMapExtractorCli(['sidecar-check', '--output', output], io(captured)),
    ).toBe(0);

    writeFileSync(join(output, 'spawns.sha256'), `${'0'.repeat(64)}\n`);
    captured = { out: [], err: [], usage: 0 };
    expect(
      runMapExtractorCli(['sidecar-check', '--output', output], io(captured)),
    ).toBe(1);
    expect(captured.err.join(' ')).toContain('spawns');
  });

  it('reports the provenance of every source it consumed', () => {
    expect(runMapExtractorCli(buildArgs(), io(captured))).toBe(0);

    const summary = JSON.parse(captured.out.join('')) as {
      sources: {
        map: { relativePath: string; sha256: string };
        spawn: { relativePath: string; sha256: string };
        tileFlags: { sha256: string };
      };
    };
    expect(summary.sources.map.relativePath).toBe(
      'data-canary/world/canary.otbm',
    );
    expect(summary.sources.map.sha256).toBe(sha256Of(mapPath));
    expect(summary.sources.spawn.relativePath).toBe(
      'data-otservbr-global/world/otservbr-monster.xml',
    );
    expect(summary.sources.spawn.sha256).toBe(sha256Of(spawnPath));
    expect(summary.sources.tileFlags.sha256).toBe(sha256Of(tileFlagsPath));
  });

  it('reads the map the lock names, not a hard-coded path', () => {
    const moved = join(
      sourceRoot,
      'data-otservbr-global',
      'world',
      'otservbr.otbm',
    );
    writeFileSync(moved, readFileSync(mapPath));
    rmSync(mapPath);
    writeSourceLock({
      mapRelativePath: 'data-otservbr-global/world/otservbr.otbm',
      mapSha256: sha256Of(moved),
    });

    expect(runMapExtractorCli(buildArgs(), io(captured))).toBe(0);
    expect(captured.out.join('')).toContain(
      'data-otservbr-global/world/otservbr.otbm',
    );
  });

  it('refuses to extract when the map digest disagrees with the lock', () => {
    writeSourceLock({ mapSha256: 'b'.repeat(64) });

    expect(runMapExtractorCli(buildArgs(), io(captured))).toBe(1);
    expect(captured.err.join(' ')).toContain('HUNT_SOURCE_HASH_MISMATCH');
    expect(() => readFileSync(join(output, 'hunt.json'), 'utf8')).toThrow();
  });

  it('refuses to extract when the snapshot has no locked map', () => {
    rmSync(mapPath);

    expect(runMapExtractorCli(buildArgs(), io(captured))).toBe(1);
    expect(captured.err.join(' ')).toContain('HUNT_SOURCE_MISSING');
  });

  it('verifies the locked hunt sources on their own', () => {
    expect(
      runMapExtractorCli(
        [
          'sources',
          '--source-root',
          sourceRoot,
          '--source-lock',
          sourceLockPath,
        ],
        io(captured),
      ),
    ).toBe(0);
    expect(captured.out.join('')).toContain('data-canary/world/canary.otbm');

    writeSourceLock({ mapSha256: 'c'.repeat(64) });
    captured = { out: [], err: [], usage: 0 };
    expect(
      runMapExtractorCli(
        [
          'sources',
          '--source-root',
          sourceRoot,
          '--source-lock',
          sourceLockPath,
        ],
        io(captured),
      ),
    ).toBe(1);
    expect(captured.err.join(' ')).toContain('HUNT_SOURCE_HASH_MISMATCH');
  });

  it('prints usage and exits 2 on an unknown command', () => {
    expect(runMapExtractorCli(['frobnicate'], io(captured))).toBe(2);
    expect(captured.usage).toBe(1);
  });

  it('resolves the source root from the environment', () => {
    process.env.HUNTBOUND_CANARY_SOURCE = sourceRoot;
    try {
      expect(
        runMapExtractorCli(
          [
            'build',
            '--selection',
            selectionPath,
            '--source-root-env',
            'HUNTBOUND_CANARY_SOURCE',
            '--source-lock',
            sourceLockPath,
            '--tile-flags',
            tileFlagsPath,
            '--output',
            output,
          ],
          io(captured),
        ),
      ).toBe(0);
    } finally {
      delete process.env.HUNTBOUND_CANARY_SOURCE;
    }
  });
});
