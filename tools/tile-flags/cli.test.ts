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

import { runTileFlagsCli } from './cli.ts';
import {
  appearance,
  appearancesDat,
  boolField,
  messageField,
} from './testing/protoFixture.ts';

const BANK = 1;
const UNPASS = 13;

/** Carries the five PB-02 frozen identities so the CLI's identity gate passes. */
function snapshotBytes(): Uint8Array {
  return appearancesDat({
    object: [
      appearance(3031),
      appearance(459, messageField(BANK, [])),
      appearance(1385, boolField(UNPASS, true)),
    ],
    outfit: [131, 26],
    effect: [12],
    missile: [36],
  });
}

const itemsXml = [
  '<?xml version="1.0" encoding="ISO-8859-1"?>',
  '<items>',
  '\t<item id="3031" article="a" name="gold coin"/>',
  '\t<item id="459" name="stone floor">',
  '\t\t<attribute key="floorchange" value="down"/>',
  '\t</item>',
  '\t<item id="1385" name="stone wall"/>',
  '</items>',
].join('\n');

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
let output = '';
let sidecar = '';
let captured: Captured;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tile-flags-'));
  sourceRoot = join(root, 'canary');
  mkdirSync(join(sourceRoot, 'data', 'items'), { recursive: true });
  writeFileSync(
    join(sourceRoot, 'data', 'items', 'appearances.dat'),
    snapshotBytes(),
  );
  writeFileSync(
    join(sourceRoot, 'data', 'items', 'items.xml'),
    Buffer.from(itemsXml, 'latin1'),
  );
  output = join(root, 'tile-flags.json');
  sidecar = join(root, 'tile-flags.sha256');
  captured = { out: [], err: [], usage: 0 };
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function build(...extra: readonly string[]): number {
  return runTileFlagsCli(
    ['build', ...extra, '--source-root', sourceRoot, '--output', output],
    io(captured),
  );
}

describe('tile-flags CLI', () => {
  it('prints usage and exits 2 without a command', () => {
    expect(runTileFlagsCli([], io(captured))).toBe(2);
    expect(captured.usage).toBe(1);
  });

  it('prints usage and exits 2 when --output is missing', () => {
    expect(
      runTileFlagsCli(['build', '--source-root', sourceRoot], io(captured)),
    ).toBe(2);
    expect(captured.usage).toBe(1);
  });

  it('writes the table and its sidecar', () => {
    expect(build()).toBe(0);

    const json = readFileSync(output, 'utf8');
    expect(json.endsWith('\n')).toBe(true);
    expect(JSON.parse(json)).toMatchObject({ schemaVersion: 2 });
    expect(readFileSync(sidecar, 'utf8')).toMatch(/^[0-9a-f]{64}\n$/);
  });

  it('writes a sidecar that matches the table it wrote', () => {
    build();

    expect(
      runTileFlagsCli(['sidecar-check', '--output', output], io(captured)),
    ).toBe(0);
  });

  it('returns exit 0 from --check straight after a build, writing nothing', () => {
    build();
    const before = readFileSync(output, 'utf8');

    expect(build('--check')).toBe(0);
    expect(readFileSync(output, 'utf8')).toBe(before);
  });

  it('returns exit 1 from --check when the file on disk diverges, naming the offset', () => {
    build();
    const json = readFileSync(output, 'utf8');
    writeFileSync(output, `${json.slice(0, 30)}X${json.slice(31)}`);

    expect(build('--check')).toBe(1);
    expect(captured.err.join('\n')).toContain('"offset":30');
  });

  it('returns exit 1 from --check when the output file is absent', () => {
    expect(build('--check')).toBe(1);
  });

  it('does not create the output file when --check fails', () => {
    build('--check');

    expect(() => readFileSync(output, 'utf8')).toThrow();
  });

  it('detects a sidecar that disagrees with the table', () => {
    build();
    writeFileSync(sidecar, `${'0'.repeat(64)}\n`);

    expect(
      runTileFlagsCli(['sidecar-check', '--output', output], io(captured)),
    ).toBe(1);
  });

  it('resolves the source root from HUNTBOUND_CANARY_SOURCE', () => {
    process.env.HUNTBOUND_CANARY_SOURCE = sourceRoot;
    try {
      expect(
        runTileFlagsCli(
          [
            'build',
            '--source-root-env',
            'HUNTBOUND_CANARY_SOURCE',
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

  it('exits 2 when the source root does not exist', () => {
    expect(
      runTileFlagsCli(
        ['build', '--source-root', join(root, 'nope'), '--output', output],
        io(captured),
      ),
    ).toBe(2);
  });

  it('fails the build when a required PB-02 identity is absent', () => {
    writeFileSync(
      join(sourceRoot, 'data', 'items', 'appearances.dat'),
      appearancesDat({
        object: [appearance(459)],
        outfit: [131, 26],
        effect: [12],
        missile: [36],
      }),
    );

    expect(build()).toBe(1);
    expect(captured.err.join('\n')).toContain('HUNT_ID_MISMATCH');
    expect(captured.err.join('\n')).toContain('3031');
  });

  it('reports identity coverage from verify-ids', () => {
    expect(
      runTileFlagsCli(
        ['verify-ids', '--source-root', sourceRoot],
        io(captured),
      ),
    ).toBe(0);

    const report = JSON.parse(captured.out.join('')) as {
      ok: boolean;
      resolvedCount: number;
    };
    expect(report.ok).toBe(true);
    expect(report.resolvedCount).toBe(3);
  });
});
