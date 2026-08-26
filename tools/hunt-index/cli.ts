import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import {
  type SpawnTable,
  SpawnTableSchema,
} from '../../packages/contracts/src/index.ts';
import type { HuntSelection } from '../hunt-selection/types.ts';
import {
  buildHuntIndex,
  encodeHuntIndex,
  type HuntIndexCreatureSource,
} from './generate.ts';

export interface HuntIndexCliIo {
  stdout(value: unknown): void;
  stderr(value: unknown): void;
  usage(): void;
}

const usageText = `Usage:
  node tools/hunt-index/cli.ts build [--check] --selections <dir> --catalog <path> --generated-root <dir> --output <path>`;

const processIo: HuntIndexCliIo = {
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

type Command = {
  readonly kind: 'build';
  readonly check: boolean;
  readonly selections: string;
  readonly catalog: string;
  readonly generatedRoot: string;
  readonly output: string;
};

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

function parseCommand(args: readonly string[]): Command | undefined {
  const [head, ...rest] = args;
  if (head !== 'build') return undefined;

  const check = rest[0] === '--check';
  const values = parseOptions(
    check ? rest.slice(1) : rest,
    new Set(['--selections', '--catalog', '--generated-root', '--output']),
  );
  if (values === undefined) return undefined;
  const selections = requiredValue(values, '--selections');
  const catalog = requiredValue(values, '--catalog');
  const generatedRoot = requiredValue(values, '--generated-root');
  const output = requiredValue(values, '--output');
  if (
    selections === undefined ||
    catalog === undefined ||
    generatedRoot === undefined ||
    output === undefined
  ) {
    return undefined;
  }
  return { kind: 'build', check, selections, catalog, generatedRoot, output };
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(path), 'utf8')) as T;
}

function selectionPaths(directory: string): readonly string[] {
  return readdirSync(resolve(directory))
    .filter((entry) => entry.endsWith('.json'))
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
    .map((entry) => join(resolve(directory), entry));
}

function huntSlug(selection: HuntSelection): string {
  const slug = selection.key.split(':').at(-1) ?? selection.key;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(
      `Hunt key does not end in a kebab-case slug: ${selection.key}`,
    );
  }
  return slug;
}

function readSpawns(
  generatedRoot: string,
  selection: HuntSelection,
): SpawnTable {
  const path = join(resolve(generatedRoot), huntSlug(selection), 'spawns.json');
  return SpawnTableSchema.parse(readJson<unknown>(path));
}

function readCatalogCreatures(
  catalogPath: string,
): readonly HuntIndexCreatureSource[] {
  const catalog = readJson<{ readonly creatures?: unknown }>(catalogPath);
  if (!Array.isArray(catalog.creatures)) {
    throw new Error(`Generated catalog has no creatures array: ${catalogPath}`);
  }
  return catalog.creatures as readonly HuntIndexCreatureSource[];
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

function buildIndex(command: Command): {
  readonly encoded: string;
  readonly sha256: string;
  readonly hunts: number;
} {
  const selections = selectionPaths(command.selections).map((path) =>
    readJson<HuntSelection>(path),
  );
  const spawnsByHuntId = new Map(
    selections.map((selection) => [
      selection.key,
      readSpawns(command.generatedRoot, selection),
    ]),
  );
  const index = buildHuntIndex({
    selections,
    catalogCreatures: readCatalogCreatures(command.catalog),
    spawnsByHuntId,
  });
  const encoded = encodeHuntIndex(index);
  return { encoded, sha256: sha256Hex(encoded), hunts: index.hunts.length };
}

function runBuild(command: Command, io: HuntIndexCliIo): number {
  const generated = buildIndex(command);
  const outputPath = resolve(command.output);
  const sidecarPath = outputPath.replace(/\.json$/, '.sha256');

  if (command.check) {
    let onDisk: string;
    try {
      onDisk = readFileSync(outputPath, 'utf8');
    } catch {
      io.stderr({
        command: 'build --check',
        path: outputPath,
        reason: 'output-missing',
      });
      return 1;
    }
    if (onDisk !== generated.encoded) {
      io.stderr({
        command: 'build --check',
        reason: 'content-divergent',
        path: outputPath,
        ...firstDivergence(generated.encoded, onDisk),
      });
      return 1;
    }
    let sidecarOnDisk: string;
    try {
      sidecarOnDisk = readFileSync(sidecarPath, 'utf8').trim();
    } catch {
      io.stderr({
        command: 'build --check',
        path: sidecarPath,
        reason: 'sidecar-missing',
      });
      return 1;
    }
    if (sidecarOnDisk !== generated.sha256) {
      io.stderr({
        command: 'build --check',
        actual: sidecarOnDisk,
        expected: generated.sha256,
        path: sidecarPath,
        reason: 'sidecar-divergent',
      });
      return 1;
    }
    io.stdout({
      command: 'build --check',
      hunts: generated.hunts,
      ok: true,
      sha256: generated.sha256,
    });
    return 0;
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, generated.encoded, 'utf8');
  writeFileSync(sidecarPath, `${generated.sha256}\n`, 'utf8');
  io.stdout({
    command: 'build',
    hunts: generated.hunts,
    ok: true,
    sha256: generated.sha256,
  });
  return 0;
}

export function runHuntIndexCli(
  args: readonly string[],
  io: HuntIndexCliIo = processIo,
): number {
  const command = parseCommand(args);
  if (command === undefined) {
    io.usage();
    return 2;
  }

  try {
    return runBuild(command, io);
  } catch (error) {
    io.stderr({
      kind: 'invalid-input',
      message: error instanceof Error ? error.message : String(error),
    });
    return 2;
  }
}

if (import.meta.main) {
  process.exitCode = runHuntIndexCli(process.argv.slice(2));
}
