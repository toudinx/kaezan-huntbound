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

import { encodeOtbmMap } from '../map-extractor/testing/otbmFixture.ts';
import { runMapMaterialsCli } from './cli.ts';

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
let windows = '';
let output = '';
let captured: Captured;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'map-materials-'));
  sourceRoot = join(root, 'canary');
  const mapPath = join(
    sourceRoot,
    'data-otservbr-global',
    'world',
    'otservbr.otbm',
  );
  mkdirSync(join(sourceRoot, 'data-otservbr-global', 'world'), {
    recursive: true,
  });
  writeFileSync(
    mapPath,
    encodeOtbmMap([
      {
        baseX: 100,
        baseY: 200,
        baseZ: 7,
        tiles: [
          { x: 100, y: 200, items: [101] },
          { x: 101, y: 200, items: [101] },
          { x: 100, y: 201, items: [101] },
          { x: 101, y: 201, items: [101] },
        ],
      },
    ]),
  );
  windows = join(root, 'windows.json');
  writeFileSync(
    windows,
    `${JSON.stringify({
      materials: [{ key: 'earth', serverIds: [101] }],
      schemaVersion: 1,
      sourcePath: 'data-otservbr-global/world/otservbr.otbm',
      windows: [
        {
          floors: [7],
          maxX: 101,
          maxY: 201,
          minX: 100,
          minY: 200,
          reason: 'synthetic CLI fixture',
        },
      ],
    })}\n`,
  );
  output = join(root, 'material-borders.json');
  captured = { err: [], out: [], usage: 0 };
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

function build(...extra: readonly string[]): number {
  return runMapMaterialsCli(
    [
      'build',
      ...extra,
      '--source-root',
      sourceRoot,
      '--windows',
      windows,
      '--output',
      output,
    ],
    io(captured),
  );
}

describe('map-materials CLI', () => {
  it('prints usage and exits 2 without a command', () => {
    expect(runMapMaterialsCli([], io(captured))).toBe(2);
    expect(captured.usage).toBe(1);
  });

  it('returns 1 with a material and signature diagnostic for ambiguity', () => {
    writeFileSync(
      join(sourceRoot, 'data-otservbr-global', 'world', 'otservbr.otbm'),
      encodeOtbmMap([
        {
          baseX: 100,
          baseY: 200,
          baseZ: 7,
          tiles: [
            { x: 100, y: 200, items: [101] },
            { x: 102, y: 200, items: [102] },
          ],
        },
      ]),
    );
    writeFileSync(
      windows,
      `${JSON.stringify({
        ambiguityMinimumOccurrence: 1,
        materials: [{ key: 'earth', serverIds: [101, 102] }],
        schemaVersion: 1,
        sourcePath: 'data-otservbr-global/world/otservbr.otbm',
        windows: [
          {
            floors: [7],
            maxX: 102,
            maxY: 200,
            minX: 100,
            minY: 200,
            reason: 'synthetic ambiguity fixture',
          },
        ],
      })}\n`,
    );

    expect(build()).toBe(1);
    expect(captured.err.join('\n')).toContain('ambiguous-material');
    expect(captured.err.join('\n')).toMatch(/earth.*signature 0/i);
  });

  it('writes the table and its sidecar', () => {
    expect(build()).toBe(0);

    const json = readFileSync(output, 'utf8');
    expect(JSON.parse(json)).toMatchObject({ schemaVersion: 1 });
    expect(readFileSync(output.replace(/\.json$/, '.sha256'), 'utf8')).toMatch(
      /^[0-9a-f]{64}\n$/,
    );
  });

  it('reproduces the table byte-for-byte with --check and rejects divergence', () => {
    expect(build()).toBe(0);
    expect(build('--check')).toBe(0);

    const json = readFileSync(output, 'utf8');
    writeFileSync(output, `${json.slice(0, 30)}X${json.slice(31)}`);

    expect(build('--check')).toBe(1);
    expect(captured.err.join('\n')).toContain('content-divergent');
  });

  it('checks the sidecar without the source map and rejects a wrong digest', () => {
    expect(build()).toBe(0);
    const sidecar = output.replace(/\.json$/, '.sha256');

    expect(
      runMapMaterialsCli(['sidecar-check', '--output', output], io(captured)),
    ).toBe(0);
    writeFileSync(sidecar, `${'0'.repeat(64)}\n`);
    expect(
      runMapMaterialsCli(['sidecar-check', '--output', output], io(captured)),
    ).toBe(1);
    expect(captured.err.join('\n')).toContain('sidecar-divergent');
  });
});
