import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { SourceSnapshotLock } from '../../packages/content/src/application/sourceLockTypes.ts';
import type { HuntSelection } from '../hunt-selection/types.ts';
import type { TileFlagsTable } from '../tile-flags/types.ts';
import { extractHunt } from './extract.ts';
import type { HuntFileName } from './output.ts';
import { encodeHuntFiles, HUNT_FILE_NAMES } from './output.ts';
import type { ResolvedHuntSource } from './sources.ts';
import { resolveHuntSources } from './sources.ts';
import { isBlockingDiagnostic } from './types.ts';

interface MapExtractorCliIo {
  stdout(value: unknown): void;
  stderr(value: unknown): void;
  usage(): void;
}

const usageText = `Usage:
  node tools/map-extractor/cli.ts build [--check] --selection <path> --source-root <path> [--source-lock <path>] --tile-flags <path> --output <dir>
  node tools/map-extractor/cli.ts build [--check] --selection <path> --source-root-env HUNTBOUND_CANARY_SOURCE [--source-lock <path>] --tile-flags <path> --output <dir>
  node tools/map-extractor/cli.ts sources --source-root <path> [--source-lock <path>]
  node tools/map-extractor/cli.ts sidecar-check --output <dir>`;

const processIo: MapExtractorCliIo = {
  stdout(value) {
    process.stdout.write(`${JSON.stringify(value)}\n`);
  },
  stderr(value) {
    if (typeof value === 'string') {
      process.stderr.write(`${value}\n`);
      return;
    }
    process.stderr.write(`${JSON.stringify(value, null, 2)}\n`);
  },
  usage() {
    process.stderr.write(`${usageText}\n`);
  },
};

type Command =
  | {
      readonly kind: 'build';
      readonly check: boolean;
      readonly selection: string;
      readonly sourceRoot: string;
      readonly sourceLock: string;
      readonly tileFlags: string;
      readonly output: string;
    }
  | {
      readonly kind: 'sources';
      readonly sourceRoot: string;
      readonly sourceLock: string;
    }
  | { readonly kind: 'sidecar-check'; readonly output: string };

function parseOptions(
  args: readonly string[],
  valueNames: ReadonlySet<string>,
): ReadonlyMap<string, string> | undefined {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const name = args[index];
    const value = args[index + 1];
    if (
      name === undefined ||
      !valueNames.has(name) ||
      value === undefined ||
      value.startsWith('--') ||
      values.has(name)
    ) {
      return undefined;
    }
    values.set(name, value);
    index += 1;
  }
  return values;
}

function requiredValue(
  values: ReadonlyMap<string, string>,
  name: string,
): string | undefined {
  const value = values.get(name);
  return value === undefined || value.length === 0 ? undefined : value;
}

function resolveSourceRoot(
  values: ReadonlyMap<string, string>,
): string | undefined {
  const explicit = requiredValue(values, '--source-root');
  const fromEnv = requiredValue(values, '--source-root-env');
  if (explicit !== undefined && fromEnv !== undefined) return undefined;
  if (explicit !== undefined) return explicit;
  if (fromEnv !== 'HUNTBOUND_CANARY_SOURCE') return undefined;
  return process.env.HUNTBOUND_CANARY_SOURCE;
}

function parseCommand(args: readonly string[]): Command | undefined {
  const [head, ...rest] = args;

  if (head === 'build') {
    const check = rest[0] === '--check';
    const values = parseOptions(
      check ? rest.slice(1) : rest,
      new Set([
        '--selection',
        '--source-root',
        '--source-root-env',
        '--source-lock',
        '--tile-flags',
        '--output',
      ]),
    );
    if (values === undefined) return undefined;
    const selection = requiredValue(values, '--selection');
    const sourceRoot = resolveSourceRoot(values);
    const tileFlags = requiredValue(values, '--tile-flags');
    const output = requiredValue(values, '--output');
    if (
      selection === undefined ||
      sourceRoot === undefined ||
      tileFlags === undefined ||
      output === undefined
    ) {
      return undefined;
    }
    return {
      kind: 'build',
      check,
      selection,
      sourceRoot,
      sourceLock: requiredValue(values, '--source-lock') ?? defaultSourceLock(),
      tileFlags,
      output,
    };
  }

  if (head === 'sources') {
    const values = parseOptions(
      rest,
      new Set(['--source-root', '--source-root-env', '--source-lock']),
    );
    if (values === undefined) return undefined;
    const sourceRoot = resolveSourceRoot(values);
    if (sourceRoot === undefined) return undefined;
    return {
      kind: 'sources',
      sourceRoot,
      sourceLock: requiredValue(values, '--source-lock') ?? defaultSourceLock(),
    };
  }

  if (head === 'sidecar-check') {
    const values = parseOptions(rest, new Set(['--output']));
    if (values === undefined) return undefined;
    const output = requiredValue(values, '--output');
    return output === undefined ? undefined : { kind: 'sidecar-check', output };
  }

  return undefined;
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(Buffer.from(value, 'utf8')).digest('hex');
}

function firstDivergence(expected: string, actual: string) {
  const limit = Math.min(expected.length, actual.length);
  for (let offset = 0; offset < limit; offset += 1) {
    if (expected[offset] !== actual[offset]) {
      return {
        offset,
        expected: expected.slice(offset, offset + 40),
        actual: actual.slice(offset, offset + 40),
      };
    }
  }
  return {
    offset: limit,
    expected: expected.slice(limit, limit + 40),
    actual: actual.slice(limit, limit + 40),
  };
}

/** The content source lock that freezes the snapshot this repo extracts from. */
function defaultSourceLock(): string {
  return join(
    resolve(import.meta.dirname, '../..'),
    'packages',
    'content',
    'src',
    'sources',
    'canary-157e6f9e.json',
  );
}

function readSourceLock(path: string): SourceSnapshotLock {
  return JSON.parse(readFileSync(resolve(path), 'utf8')) as SourceSnapshotLock;
}

function provenanceOf(source: ResolvedHuntSource) {
  return { relativePath: source.relativePath, sha256: source.sha256 };
}

function jsonPath(output: string, name: HuntFileName) {
  return join(resolve(output), `${name}.json`);
}

function sidecarPath(output: string, name: HuntFileName) {
  return join(resolve(output), `${name}.sha256`);
}

function runBuild(
  command: Extract<Command, { kind: 'build' }>,
  io: MapExtractorCliIo,
): number {
  const selection = JSON.parse(
    readFileSync(resolve(command.selection), 'utf8'),
  ) as HuntSelection;
  const tileFlagsText = readFileSync(resolve(command.tileFlags), 'utf8');
  const tileFlags = JSON.parse(tileFlagsText) as TileFlagsTable;

  const sources = resolveHuntSources(
    readSourceLock(command.sourceLock),
    command.sourceRoot,
  );
  if (!sources.ok) {
    io.stderr({
      command: 'build',
      reason: 'source-lock',
      diagnostics: sources.diagnostics,
    });
    return 1;
  }

  const { hunt, diagnostics } = extractHunt(
    sources.map.bytes,
    sources.spawn.text,
    tileFlags,
    selection,
  );

  const blocking = diagnostics.filter(isBlockingDiagnostic);
  if (blocking.length > 0) {
    io.stderr({
      command: 'build',
      reason: 'blocking-diagnostics',
      diagnostics: blocking.slice(0, 20),
      total: blocking.length,
    });
    return 1;
  }

  if (hunt.transitions.dropped !== selection.expectedDroppedTransitions) {
    io.stderr({
      command: 'build',
      reason: 'expectedDroppedTransitions',
      expected: selection.expectedDroppedTransitions,
      actual: hunt.transitions.dropped,
    });
    return 1;
  }

  const files = encodeHuntFiles(hunt);
  const summary = {
    huntId: hunt.huntId,
    tiles: hunt.region.width * hunt.region.height * hunt.region.floors.length,
    palette: hunt.region.palette.length,
    transitions: hunt.transitions.entries.length,
    dropped: hunt.transitions.dropped,
    spawnGroups: hunt.spawns.groups.length,
    spawnSlots: hunt.spawns.groups.reduce(
      (total, group) => total + group.slots.length,
      0,
    ),
    emptyTiles: diagnostics.filter((item) => item.code === 'HUNT_EMPTY_TILE')
      .length,
    // Every palette id traces back to these files: geometry from the locked
    // map, creatures from the locked spawn declaration, and id semantics from
    // tile-flags.json, itself derived from the locked appearances.dat/items.xml.
    sources: {
      map: provenanceOf(sources.map),
      spawn: provenanceOf(sources.spawn),
      tileFlags: { sha256: sha256Hex(tileFlagsText) },
    },
    sha256: Object.fromEntries(
      HUNT_FILE_NAMES.map((name) => [
        name,
        sha256Hex(files.get(name) as string),
      ]),
    ),
  };

  if (command.check) {
    for (const name of HUNT_FILE_NAMES) {
      const encoded = files.get(name) as string;
      let onDisk: string;
      try {
        onDisk = readFileSync(jsonPath(command.output, name), 'utf8');
      } catch {
        io.stderr({
          command: 'build --check',
          reason: 'output-missing',
          file: `${name}.json`,
        });
        return 1;
      }
      if (onDisk !== encoded) {
        io.stderr({
          command: 'build --check',
          reason: 'content-divergent',
          file: `${name}.json`,
          ...firstDivergence(encoded, onDisk),
        });
        return 1;
      }
      const digest = sha256Hex(encoded);
      const sidecar = readFileSync(
        sidecarPath(command.output, name),
        'utf8',
      ).trim();
      if (sidecar !== digest) {
        io.stderr({
          command: 'build --check',
          reason: 'sidecar-divergent',
          file: `${name}.sha256`,
          expected: digest,
          actual: sidecar,
        });
        return 1;
      }
    }
    io.stdout({ command: 'build --check', ok: true, ...summary });
    return 0;
  }

  mkdirSync(resolve(command.output), { recursive: true });
  for (const name of HUNT_FILE_NAMES) {
    const encoded = files.get(name) as string;
    writeFileSync(jsonPath(command.output, name), encoded);
    writeFileSync(sidecarPath(command.output, name), `${sha256Hex(encoded)}\n`);
  }
  io.stdout({ command: 'build', ok: true, ...summary });
  return 0;
}

function runSources(
  command: Extract<Command, { kind: 'sources' }>,
  io: MapExtractorCliIo,
): number {
  const sources = resolveHuntSources(
    readSourceLock(command.sourceLock),
    command.sourceRoot,
  );
  if (!sources.ok) {
    io.stderr({
      command: 'sources',
      reason: 'source-lock',
      diagnostics: sources.diagnostics,
    });
    return 1;
  }
  io.stdout({
    command: 'sources',
    ok: true,
    map: provenanceOf(sources.map),
    spawn: provenanceOf(sources.spawn),
  });
  return 0;
}

function runSidecarCheck(output: string, io: MapExtractorCliIo): number {
  const digests: Record<string, string> = {};
  for (const name of HUNT_FILE_NAMES) {
    const expected = sha256Hex(readFileSync(jsonPath(output, name), 'utf8'));
    const actual = readFileSync(sidecarPath(output, name), 'utf8').trim();
    if (expected !== actual) {
      io.stderr({
        command: 'sidecar-check',
        reason: 'sidecar-divergent',
        file: `${name}.sha256`,
        expected,
        actual,
      });
      return 1;
    }
    digests[name] = expected;
  }
  io.stdout({ command: 'sidecar-check', ok: true, sha256: digests });
  return 0;
}

export function runMapExtractorCli(
  args: readonly string[],
  io: MapExtractorCliIo = processIo,
): number {
  const command = parseCommand(args);
  if (command === undefined) {
    io.usage();
    return 2;
  }

  try {
    if (command.kind === 'build') return runBuild(command, io);
    if (command.kind === 'sources') return runSources(command, io);
    return runSidecarCheck(command.output, io);
  } catch (error) {
    io.stderr({
      kind: 'invalid-input',
      message: error instanceof Error ? error.message : String(error),
    });
    return 2;
  }
}

if (import.meta.main) {
  process.exitCode = runMapExtractorCli(process.argv.slice(2));
}
