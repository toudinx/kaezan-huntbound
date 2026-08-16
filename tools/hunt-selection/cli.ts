import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { validateCombatSelection } from './validateCombatSelection.ts';
import { validateHuntSelection } from './validateHuntSelection.ts';

interface UnknownRecord {
  readonly [key: string]: unknown;
}

interface HuntSelectionCliIo {
  stdout(value: unknown): void;
  stderr(value: unknown): void;
  usage(): void;
}

interface SelectionCheckCommand {
  readonly kind: 'check' | 'check-combat';
  readonly selectionPath: string;
  readonly sourceRoot: string;
}

const usageText = `Usage:
  node tools/hunt-selection/cli.ts check --selection <path> --source-root <path>
  node tools/hunt-selection/cli.ts check --selection <path> --source-root-env HUNTBOUND_CANARY_SOURCE
  node tools/hunt-selection/cli.ts check-combat --selection <path> --source-root <path>
  node tools/hunt-selection/cli.ts check-combat --selection <path> --source-root-env HUNTBOUND_CANARY_SOURCE`;

const processIo: HuntSelectionCliIo = {
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

function parseCommand(
  args: readonly string[],
): SelectionCheckCommand | undefined {
  const kind = args[0];
  if (kind !== 'check' && kind !== 'check-combat') return undefined;
  const values = parseOptions(
    args.slice(1),
    new Set(['--selection', '--source-root', '--source-root-env']),
  );
  if (values === undefined) return undefined;

  const selectionPath = requiredValue(values, '--selection');
  const explicitSourceRoot = requiredValue(values, '--source-root');
  const sourceRootEnv = requiredValue(values, '--source-root-env');
  if (
    selectionPath === undefined ||
    (explicitSourceRoot !== undefined && sourceRootEnv !== undefined) ||
    (sourceRootEnv !== undefined && sourceRootEnv !== 'HUNTBOUND_CANARY_SOURCE')
  ) {
    return undefined;
  }

  const sourceRoot =
    explicitSourceRoot ??
    (sourceRootEnv === 'HUNTBOUND_CANARY_SOURCE'
      ? process.env.HUNTBOUND_CANARY_SOURCE
      : undefined);
  return sourceRoot === undefined
    ? undefined
    : { kind, selectionPath, sourceRoot };
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

function catalogCreatureKeys(root: unknown): readonly string[] {
  if (typeof root !== 'object' || root === null || Array.isArray(root)) {
    throw new Error('PB-01 catalog must be a JSON object');
  }
  const creatures = (root as UnknownRecord).creatures;
  if (!Array.isArray(creatures)) {
    throw new Error('PB-01 catalog must contain a creatures array');
  }
  return creatures.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      return [];
    }
    const stableKey = (entry as UnknownRecord).stableKey;
    return typeof stableKey === 'string' ? [stableKey] : [];
  });
}

function collectSourcePaths(value: unknown, paths: Set<string>): void {
  if (Array.isArray(value)) {
    for (const entry of value) collectSourcePaths(entry, paths);
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  const record = value as UnknownRecord;
  if (typeof record.sourceFile === 'string') paths.add(record.sourceFile);
  if (typeof record.relativePath === 'string') paths.add(record.relativePath);
  for (const nested of Object.values(record)) collectSourcePaths(nested, paths);
}

function readSnapshotFiles(
  sourceRoot: string,
  selection: unknown,
): Map<string, string> {
  const paths = new Set<string>();
  collectSourcePaths(selection, paths);
  const files = new Map<string, string>();
  for (const relativePath of paths) {
    const fullPath = join(sourceRoot, relativePath);
    if (existsSync(fullPath) === false) continue;
    files.set(relativePath, readFileSync(fullPath, 'utf8'));
  }
  return files;
}

function runCheck(
  command: SelectionCheckCommand,
  io: HuntSelectionCliIo,
): number {
  try {
    const workspaceRoot = resolve(import.meta.dirname, '../..');
    const selection = readJson(resolve(command.selectionPath));
    const sourceRoot = resolve(command.sourceRoot);
    if (command.kind === 'check-combat') {
      const report = validateCombatSelection(
        selection,
        readSnapshotFiles(sourceRoot, selection),
      );
      const result = { command: 'check-combat', ...report };
      if (!report.ok) {
        io.stderr(result);
        return 1;
      }
      io.stdout(result);
      return 0;
    }
    const monsterXml = readFileSync(
      join(sourceRoot, 'data-otservbr-global', 'world', 'otservbr-monster.xml'),
      'utf8',
    );
    const catalog = readJson(
      join(
        workspaceRoot,
        'packages',
        'content',
        'src',
        'generated',
        'pb-01-contract-coverage.json',
      ),
    );
    const report = validateHuntSelection(
      selection,
      monsterXml,
      catalogCreatureKeys(catalog),
    );
    const result = { command: 'check', ...report };
    if (!report.ok) {
      io.stderr(result);
      return 1;
    }
    io.stdout(result);
    return 0;
  } catch (error) {
    io.stderr({
      kind: 'invalid-input',
      message: error instanceof Error ? error.message : String(error),
    });
    return 2;
  }
}

export function runHuntSelectionCli(
  args: readonly string[],
  io: HuntSelectionCliIo = processIo,
): number {
  const command = parseCommand(args);
  if (command === undefined) {
    io.usage();
    return 2;
  }
  return runCheck(command, io);
}

if (import.meta.main) {
  process.exitCode = runHuntSelectionCli(process.argv.slice(2));
}
