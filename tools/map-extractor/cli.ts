import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

import type { SourceSnapshotLock } from '../../packages/content/src/application/sourceLockTypes.ts';
import type { HuntSelection } from '../hunt-selection/types.ts';
import type { TileFlagsTable } from '../tile-flags/types.ts';
import { extractHunt } from './extract.ts';
import { parseHuntLayoutRecipe } from './layout.ts';
import type { HuntFileName } from './output.ts';
import { encodeHuntFiles, HUNT_FILE_NAMES } from './output.ts';
import type { ResolvedHuntSource } from './sources.ts';
import { resolveHuntSources } from './sources.ts';
import { analyzeHuntTopology } from './topology.ts';
import { diagnostic, isBlockingDiagnostic } from './types.ts';

interface MapExtractorCliIo {
  stdout(value: unknown): void;
  stderr(value: unknown): void;
  usage(): void;
}

const usageText = `Usage:
  node tools/map-extractor/cli.ts build [--check] --selection <path> --source-root <path> [--source-lock <path>] --tile-flags <path> --output <dir>
  node tools/map-extractor/cli.ts build-all [--check] --selections <dir> --source-root <path> [--source-lock <path>] --tile-flags <path> --output-root <dir>
  node tools/map-extractor/cli.ts sources --selections <dir> --source-root <path> [--source-lock <path>]
  node tools/map-extractor/cli.ts sidecar-check --output <dir>

--source-root may be replaced by --source-root-env HUNTBOUND_CANARY_SOURCE.`;

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
      readonly kind: 'build-all';
      readonly check: boolean;
      readonly selections: string;
      readonly sourceRoot: string;
      readonly sourceLock: string;
      readonly tileFlags: string;
      readonly outputRoot: string;
    }
  | {
      readonly kind: 'sources';
      readonly selections: string;
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

  if (head === 'build-all') {
    const check = rest[0] === '--check';
    const values = parseOptions(
      check ? rest.slice(1) : rest,
      new Set([
        '--selections',
        '--source-root',
        '--source-root-env',
        '--source-lock',
        '--tile-flags',
        '--output-root',
      ]),
    );
    if (values === undefined) return undefined;
    const selections = requiredValue(values, '--selections');
    const sourceRoot = resolveSourceRoot(values);
    const tileFlags = requiredValue(values, '--tile-flags');
    const outputRoot = requiredValue(values, '--output-root');
    if (
      selections === undefined ||
      sourceRoot === undefined ||
      tileFlags === undefined ||
      outputRoot === undefined
    ) {
      return undefined;
    }
    return {
      kind: 'build-all',
      check,
      selections,
      sourceRoot,
      sourceLock: requiredValue(values, '--source-lock') ?? defaultSourceLock(),
      tileFlags,
      outputRoot,
    };
  }

  if (head === 'sources') {
    const values = parseOptions(
      rest,
      new Set([
        '--selections',
        '--source-root',
        '--source-root-env',
        '--source-lock',
      ]),
    );
    if (values === undefined) return undefined;
    const sourceRoot = resolveSourceRoot(values);
    const selections = requiredValue(values, '--selections');
    if (sourceRoot === undefined || selections === undefined) return undefined;
    return {
      kind: 'sources',
      selections,
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

function readSelection(path: string): HuntSelection {
  return JSON.parse(readFileSync(resolve(path), 'utf8')) as HuntSelection;
}

/** A selection key's final segment names its generated output directory. */
function huntSlug(selection: HuntSelection): string {
  const slug = selection.key.split(':').at(-1) ?? selection.key;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(
      `Hunt key does not end in a kebab-case slug: ${selection.key}`,
    );
  }
  return slug;
}

/** Every hunt selection in a directory, in a stable order. */
function huntSelectionPaths(directory: string): readonly string[] {
  return readdirSync(resolve(directory))
    .filter((entry) => entry.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right))
    .map((entry) => join(resolve(directory), entry));
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
  const selectionPath = resolve(command.selection);
  const selection = readSelection(selectionPath);
  const tileFlagsText = readFileSync(resolve(command.tileFlags), 'utf8');
  const tileFlags = JSON.parse(tileFlagsText) as TileFlagsTable;

  if (typeof selection.layout !== 'string' || selection.layout.length === 0) {
    io.stderr({
      command: 'build',
      reason: 'blocking-diagnostics',
      diagnostics: [
        diagnostic(
          'layout',
          'HUNT_LAYOUT_INVALID',
          'Selection must name a Huntbound layout recipe',
        ),
      ],
      total: 1,
    });
    return 1;
  }
  const selectionDirectory = dirname(selectionPath);
  const layoutPath = resolve(selectionDirectory, selection.layout);
  const layoutRelative = relative(selectionDirectory, layoutPath);
  if (
    isAbsolute(selection.layout) ||
    selection.layout.includes('\\') ||
    /^[a-zA-Z]:/.test(selection.layout)
  ) {
    io.stderr({
      command: 'build',
      reason: 'blocking-diagnostics',
      diagnostics: [
        diagnostic(
          'layout',
          'HUNT_LAYOUT_INVALID',
          `Layout path must stay relative to the selection file: ${selection.layout}`,
        ),
      ],
      total: 1,
    });
    return 1;
  }
  let layoutText: string;
  try {
    layoutText = readFileSync(layoutPath, 'utf8');
  } catch (error) {
    io.stderr({
      command: 'build',
      reason: 'blocking-diagnostics',
      diagnostics: [
        diagnostic(
          'layout',
          'HUNT_LAYOUT_INVALID',
          `Layout recipe cannot be read: ${error instanceof Error ? error.message : String(error)}`,
        ),
      ],
      total: 1,
    });
    return 1;
  }
  let layout: ReturnType<typeof parseHuntLayoutRecipe>;
  try {
    layout = parseHuntLayoutRecipe(
      JSON.parse(layoutText) as unknown,
      selection.region,
    );
  } catch (error) {
    io.stderr({
      command: 'build',
      reason: 'blocking-diagnostics',
      diagnostics: [
        diagnostic(
          'layout',
          'HUNT_LAYOUT_INVALID',
          error instanceof Error ? error.message : String(error),
        ),
      ],
      total: 1,
    });
    return 1;
  }

  const sources = resolveHuntSources(
    readSourceLock(command.sourceLock),
    command.sourceRoot,
    selection.source,
  );
  if (!sources.ok) {
    io.stderr({
      command: 'build',
      huntId: selection.key,
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
    layout,
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
  const topology = analyzeHuntTopology(hunt);
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
    layout: {
      relativePath: layoutRelative.replaceAll('\\', '/'),
      sha256: sha256Hex(layoutText),
    },
    topology: topology.floors.map(({ z, walkableTiles, componentCount }) => ({
      z,
      walkableTiles,
      componentCount,
    })),
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

/** Extracts every hunt in the selections directory into its own folder. */
function runBuildAll(
  command: Extract<Command, { kind: 'build-all' }>,
  io: MapExtractorCliIo,
): number {
  for (const selectionPath of huntSelectionPaths(command.selections)) {
    const selection = readSelection(selectionPath);
    const status = runBuild(
      {
        kind: 'build',
        check: command.check,
        selection: selectionPath,
        sourceRoot: command.sourceRoot,
        sourceLock: command.sourceLock,
        tileFlags: command.tileFlags,
        output: join(resolve(command.outputRoot), huntSlug(selection)),
      },
      io,
    );
    if (status !== 0) return status;
  }
  return 0;
}

function runSources(
  command: Extract<Command, { kind: 'sources' }>,
  io: MapExtractorCliIo,
): number {
  const lock = readSourceLock(command.sourceLock);
  const hunts: unknown[] = [];

  for (const selectionPath of huntSelectionPaths(command.selections)) {
    const selection = readSelection(selectionPath);
    const sources = resolveHuntSources(
      lock,
      command.sourceRoot,
      selection.source,
    );
    if (!sources.ok) {
      io.stderr({
        command: 'sources',
        huntId: selection.key,
        reason: 'source-lock',
        diagnostics: sources.diagnostics,
      });
      return 1;
    }
    hunts.push({
      huntId: selection.key,
      map: provenanceOf(sources.map),
      spawn: provenanceOf(sources.spawn),
    });
  }

  io.stdout({ command: 'sources', ok: true, hunts });
  return 0;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function readHuntId(output: string): string {
  const encoded = readFileSync(jsonPath(output, 'hunt'), 'utf8');
  const parsed = JSON.parse(encoded) as { readonly huntId?: unknown };
  if (typeof parsed.huntId !== 'string' || parsed.huntId.length === 0) {
    throw new Error(`Generated hunt has no valid huntId: ${output}`);
  }
  return parsed.huntId;
}

function huntOutputDirectories(outputRoot: string): readonly {
  readonly directory: string;
  readonly huntId: string;
}[] {
  const resolvedRoot = resolve(outputRoot);
  const directories = readdirSync(resolvedRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(resolvedRoot, entry.name));
  if (directories.length === 0 && existsSync(jsonPath(resolvedRoot, 'hunt'))) {
    return [{ directory: resolvedRoot, huntId: readHuntId(resolvedRoot) }];
  }
  if (
    directories.length === 0 &&
    existsSync(join(resolvedRoot, 'index.json'))
  ) {
    return [];
  }

  const outputs = directories
    .map((directory) => ({ directory, huntId: readHuntId(directory) }))
    .sort((left, right) => {
      const byHuntId = compareStrings(left.huntId, right.huntId);
      return byHuntId === 0
        ? compareStrings(left.directory, right.directory)
        : byHuntId;
    });
  if (outputs.length === 0) {
    throw new Error(`No generated hunt directories found: ${resolvedRoot}`);
  }
  return outputs;
}

function runSidecarCheck(output: string, io: MapExtractorCliIo): number {
  const resolvedOutput = resolve(output);
  const digests: Record<string, Record<string, string>> = {};
  const indexJsonPath = join(resolvedOutput, 'index.json');
  if (existsSync(indexJsonPath)) {
    const expected = sha256Hex(readFileSync(indexJsonPath, 'utf8'));
    const indexSidecarPath = join(resolvedOutput, 'index.sha256');
    const actual = readFileSync(indexSidecarPath, 'utf8').trim();
    if (expected !== actual) {
      io.stderr({
        command: 'sidecar-check',
        expected,
        actual,
        file: 'index.sha256',
        reason: 'sidecar-divergent',
      });
      return 1;
    }
    digests.index = { index: expected };
  }
  for (const { directory, huntId } of huntOutputDirectories(resolvedOutput)) {
    if (digests[huntId] !== undefined) {
      throw new Error(`Duplicate generated hunt id: ${huntId}`);
    }
    const huntDigests: Record<string, string> = {};
    for (const name of HUNT_FILE_NAMES) {
      const expected = sha256Hex(
        readFileSync(jsonPath(directory, name), 'utf8'),
      );
      const actual = readFileSync(sidecarPath(directory, name), 'utf8').trim();
      if (expected !== actual) {
        io.stderr({
          command: 'sidecar-check',
          reason: 'sidecar-divergent',
          huntId,
          file: `${name}.sha256`,
          expected,
          actual,
        });
        return 1;
      }
      huntDigests[name] = expected;
    }
    digests[huntId] = huntDigests;
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
    if (command.kind === 'build-all') return runBuildAll(command, io);
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
