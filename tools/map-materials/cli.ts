import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { MaterialAmbiguityError, mineMaterialBorders } from './mine.ts';
import { readMaterialMiningRecipe } from './recipe.ts';
import { encodeMaterialBordersTable } from './table.ts';

interface MapMaterialsCliIo {
  stdout(value: unknown): void;
  stderr(value: unknown): void;
  usage(): void;
}

const usageText = `Usage:
  node tools/map-materials/cli.ts build [--check] --source-root <path> --windows <path> --output <path>
  node tools/map-materials/cli.ts build [--check] --source-root-env HUNTBOUND_CANARY_SOURCE --windows <path> --output <path>
  node tools/map-materials/cli.ts sidecar-check --output <path>`;

const processIo: MapMaterialsCliIo = {
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
      readonly check: boolean;
      readonly kind: 'build';
      readonly output: string;
      readonly sourceRoot: string;
      readonly windows: string;
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
      new Set(['--source-root', '--source-root-env', '--windows', '--output']),
    );
    if (values === undefined) return undefined;
    const sourceRoot = resolveSourceRoot(values);
    const windows = requiredValue(values, '--windows');
    const output = requiredValue(values, '--output');
    if (
      sourceRoot === undefined ||
      windows === undefined ||
      output === undefined
    ) {
      return undefined;
    }
    return { check, kind: 'build', output, sourceRoot, windows };
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

function sidecarPathFor(output: string): string {
  return output.replace(/\.json$/, '.sha256');
}

function firstDivergence(expected: string, actual: string) {
  const limit = Math.min(expected.length, actual.length);
  for (let offset = 0; offset < limit; offset += 1) {
    if (expected[offset] !== actual[offset]) {
      return {
        actual: actual.slice(offset, offset + 40),
        expected: expected.slice(offset, offset + 40),
        offset,
      };
    }
  }
  return {
    actual: actual.slice(limit, limit + 40),
    expected: expected.slice(limit, limit + 40),
    offset: limit,
  };
}

function runBuild(
  command: Extract<Command, { kind: 'build' }>,
  io: MapMaterialsCliIo,
): number {
  const recipe = readMaterialMiningRecipe(command.windows);
  const mapPath = join(resolve(command.sourceRoot), recipe.sourcePath);
  const mapBytes = readFileSync(mapPath);
  const table = mineMaterialBorders(
    new Uint8Array(mapBytes.buffer, mapBytes.byteOffset, mapBytes.byteLength),
    recipe,
  );
  const encoded = encodeMaterialBordersTable(table);
  const digest = sha256Hex(encoded);
  const outputPath = resolve(command.output);
  const sidecarPath = sidecarPathFor(outputPath);

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
    if (onDisk !== encoded) {
      io.stderr({
        command: 'build --check',
        reason: 'content-divergent',
        ...firstDivergence(encoded, onDisk),
      });
      return 1;
    }
    const sidecarOnDisk = readFileSync(sidecarPath, 'utf8').trim();
    if (sidecarOnDisk !== digest) {
      io.stderr({
        actual: sidecarOnDisk,
        command: 'build --check',
        expected: digest,
        reason: 'sidecar-divergent',
      });
      return 1;
    }
    io.stdout({
      command: 'build --check',
      materials: table.materials.length,
      ok: true,
      sha256: digest,
    });
    return 0;
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, encoded);
  writeFileSync(sidecarPath, `${digest}\n`);
  io.stdout({
    command: 'build',
    materials: table.materials.length,
    ok: true,
    sha256: digest,
  });
  return 0;
}

function runSidecarCheck(output: string, io: MapMaterialsCliIo): number {
  const outputPath = resolve(output);
  const expected = sha256Hex(readFileSync(outputPath, 'utf8'));
  const actual = readFileSync(sidecarPathFor(outputPath), 'utf8').trim();
  if (actual !== expected) {
    io.stderr({
      actual,
      command: 'sidecar-check',
      expected,
      reason: 'sidecar-divergent',
    });
    return 1;
  }
  io.stdout({ command: 'sidecar-check', ok: true, sha256: expected });
  return 0;
}

export function runMapMaterialsCli(
  args: readonly string[],
  io: MapMaterialsCliIo = processIo,
): number {
  const command = parseCommand(args);
  if (command === undefined) {
    io.usage();
    return 2;
  }

  try {
    return command.kind === 'build'
      ? runBuild(command, io)
      : runSidecarCheck(command.output, io);
  } catch (error) {
    if (error instanceof MaterialAmbiguityError) {
      io.stderr({
        command: command.kind,
        diagnostics: error.ambiguities,
        reason: 'ambiguous-material',
      });
      return 1;
    }
    io.stderr({
      kind: 'invalid-input',
      message: error instanceof Error ? error.message : String(error),
    });
    return 2;
  }
}

if (import.meta.main) {
  process.exitCode = runMapMaterialsCli(process.argv.slice(2));
}
