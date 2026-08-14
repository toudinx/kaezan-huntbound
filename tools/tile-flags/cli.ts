import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { type RequiredIdentity, verifyItemIdentity } from './identity.ts';
import { buildTileFlagsTable, encodeTileFlagsTable } from './table.ts';

interface UnknownRecord {
  readonly [key: string]: unknown;
}

interface TileFlagsCliIo {
  stdout(value: unknown): void;
  stderr(value: unknown): void;
  usage(): void;
}

const usageText = `Usage:
  node tools/tile-flags/cli.ts build [--check] --source-root <path> --output <path>
  node tools/tile-flags/cli.ts build [--check] --source-root-env HUNTBOUND_CANARY_SOURCE --output <path>
  node tools/tile-flags/cli.ts verify-ids --source-root <path>
  node tools/tile-flags/cli.ts sidecar-check --output <path>`;

const processIo: TileFlagsCliIo = {
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
      readonly sourceRoot: string;
      readonly output: string;
    }
  | { readonly kind: 'verify-ids'; readonly sourceRoot: string }
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
      new Set(['--source-root', '--source-root-env', '--output']),
    );
    if (values === undefined) return undefined;
    const sourceRoot = resolveSourceRoot(values);
    const output = requiredValue(values, '--output');
    if (sourceRoot === undefined || output === undefined) return undefined;
    return { kind: 'build', check, sourceRoot, output };
  }

  if (head === 'verify-ids') {
    const values = parseOptions(
      rest,
      new Set(['--source-root', '--source-root-env']),
    );
    if (values === undefined) return undefined;
    const sourceRoot = resolveSourceRoot(values);
    return sourceRoot === undefined
      ? undefined
      : { kind: 'verify-ids', sourceRoot };
  }

  if (head === 'sidecar-check') {
    const values = parseOptions(rest, new Set(['--output']));
    if (values === undefined) return undefined;
    const output = requiredValue(values, '--output');
    return output === undefined ? undefined : { kind: 'sidecar-check', output };
  }

  return undefined;
}

interface Snapshot {
  readonly appearances: Uint8Array;
  readonly itemsXml: string;
}

function readSnapshot(sourceRoot: string): Snapshot {
  const items = join(resolve(sourceRoot), 'data', 'items');
  const appearances = readFileSync(join(items, 'appearances.dat'));
  // items.xml is ISO-8859-1; latin1 round-trips its bytes exactly.
  const itemsXml = readFileSync(join(items, 'items.xml'), 'latin1');
  return {
    appearances: new Uint8Array(
      appearances.buffer,
      appearances.byteOffset,
      appearances.byteLength,
    ),
    itemsXml,
  };
}

function sidecarPathFor(output: string): string {
  return output.replace(/\.json$/, '.sha256');
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(Buffer.from(value, 'utf8')).digest('hex');
}

/** Reads the PB-02 frozen identities so the gate tracks the real selection. */
function requiredIdentities(): readonly RequiredIdentity[] {
  const workspaceRoot = resolve(import.meta.dirname, '../..');
  const selectionPath = join(
    workspaceRoot,
    'packages',
    'assets',
    'catalog',
    'selections',
    'pb-02-contract-coverage.json',
  );
  const parsed = JSON.parse(
    readFileSync(selectionPath, 'utf8'),
  ) as UnknownRecord;
  const entries = parsed.entries;
  if (!Array.isArray(entries)) {
    throw new Error('PB-02 selection must contain an entries array');
  }

  return entries.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const record = entry as UnknownRecord;
    const identity = record.sourceIdentity;
    if (typeof identity !== 'object' || identity === null) return [];
    const { kind, id } = identity as UnknownRecord;
    const key = record.key;
    if (
      typeof key !== 'string' ||
      typeof id !== 'number' ||
      (kind !== 'clientId' &&
        kind !== 'lookType' &&
        kind !== 'effectId' &&
        kind !== 'missileId')
    ) {
      return [];
    }
    return [{ key, kind, id } satisfies RequiredIdentity];
  });
}

function firstDivergence(
  expected: string,
  actual: string,
): { offset: number; expected: string; actual: string } {
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

function runBuild(
  command: Extract<Command, { kind: 'build' }>,
  io: TileFlagsCliIo,
): number {
  const snapshot = readSnapshot(command.sourceRoot);

  const identity = verifyItemIdentity(
    snapshot.appearances,
    snapshot.itemsXml,
    requiredIdentities(),
  );
  if (!identity.ok) {
    io.stderr({ command: 'build', ...identity });
    return 1;
  }

  const table = buildTileFlagsTable(
    snapshot.appearances,
    snapshot.itemsXml,
    readSourceCommit(),
  );
  const encoded = encodeTileFlagsTable(table);
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
        reason: 'output-missing',
        path: outputPath,
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
        command: 'build --check',
        reason: 'sidecar-divergent',
        expected: digest,
        actual: sidecarOnDisk,
      });
      return 1;
    }
    io.stdout({
      command: 'build --check',
      ok: true,
      entries: table.entries.length,
      sha256: digest,
    });
    return 0;
  }

  writeFileSync(outputPath, encoded);
  writeFileSync(sidecarPath, `${digest}\n`);
  io.stdout({
    command: 'build',
    ok: true,
    entries: table.entries.length,
    sha256: digest,
    identity,
  });
  return 0;
}

/** The snapshot commit is pinned by the content source lock. */
function readSourceCommit(): string {
  const workspaceRoot = resolve(import.meta.dirname, '../..');
  const lockPath = join(
    workspaceRoot,
    'packages',
    'content',
    'src',
    'sources',
    'canary-157e6f9e.json',
  );
  const parsed = JSON.parse(readFileSync(lockPath, 'utf8')) as UnknownRecord;
  const commit = parsed.commit;
  if (typeof commit !== 'string' || commit.length === 0) {
    throw new Error('content source lock has no commit');
  }
  return commit;
}

function runVerifyIds(sourceRoot: string, io: TileFlagsCliIo): number {
  const snapshot = readSnapshot(sourceRoot);
  const report = verifyItemIdentity(
    snapshot.appearances,
    snapshot.itemsXml,
    requiredIdentities(),
  );
  if (!report.ok) {
    io.stderr({ command: 'verify-ids', ...report });
    return 1;
  }
  io.stdout({ command: 'verify-ids', ...report });
  return 0;
}

function runSidecarCheck(output: string, io: TileFlagsCliIo): number {
  const outputPath = resolve(output);
  const encoded = readFileSync(outputPath, 'utf8');
  const expected = sha256Hex(encoded);
  const actual = readFileSync(sidecarPathFor(outputPath), 'utf8').trim();
  if (expected !== actual) {
    io.stderr({
      command: 'sidecar-check',
      reason: 'sidecar-divergent',
      expected,
      actual,
    });
    return 1;
  }
  io.stdout({ command: 'sidecar-check', ok: true, sha256: expected });
  return 0;
}

export function runTileFlagsCli(
  args: readonly string[],
  io: TileFlagsCliIo = processIo,
): number {
  const command = parseCommand(args);
  if (command === undefined) {
    io.usage();
    return 2;
  }

  try {
    if (command.kind === 'build') return runBuild(command, io);
    if (command.kind === 'verify-ids') {
      return runVerifyIds(command.sourceRoot, io);
    }
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
  process.exitCode = runTileFlagsCli(process.argv.slice(2));
}
