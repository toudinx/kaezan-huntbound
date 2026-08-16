import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { SimulationDiagnostic } from '../../packages/contracts/src/index.ts';

import { checkPublishedHashes, digestPathFor } from './checkPublishedHashes.ts';
import {
  buildReplayArtifacts,
  type ReplayArtifacts,
  sha256Hex,
} from './replayArtifacts.ts';

type ReplayCommand =
  | {
      readonly kind: 'run';
      readonly scenarioPath: string;
      readonly logPath: string;
      readonly out: string | undefined;
    }
  | {
      readonly kind: 'verify';
      readonly scenarioPath: string;
      readonly logPath: string;
      readonly snapshotPath: string;
      readonly eventsPath: string;
    }
  | { readonly kind: 'hash'; readonly filePath: string }
  | { readonly kind: 'check-hashes'; readonly dir: string };

export interface ReplayCliIo {
  stdout(value: unknown): void;
  stderr(value: unknown): void;
  usage(): void;
}

const usageText = `Usage:
  node tools/replay/cli.ts run --scenario <path> --log <path> [--out <path>]
  node tools/replay/cli.ts verify --scenario <path> --log <path> --snapshot <path> --events <path>
  node tools/replay/cli.ts hash --file <path>
  node tools/replay/cli.ts check-hashes --dir <path>

Exit codes: 0 success, 1 divergence, 2 invalid input.`;

const processIo: ReplayCliIo = {
  stdout(value) {
    process.stdout.write(`${JSON.stringify(value)}\n`);
  },
  stderr(value) {
    process.stderr.write(`${JSON.stringify(value)}\n`);
  },
  usage() {
    process.stderr.write(`${usageText}\n`);
  },
};

const SNAPSHOT_FILE = 'snapshot.golden.json';
const EVENTS_FILE = 'events.golden.jsonl';

function readOption(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) {
    return undefined;
  }
  const value = args[index + 1];
  return value === undefined || value.startsWith('--') ? undefined : value;
}

function parseCommand(args: readonly string[]): ReplayCommand | undefined {
  const [verb, ...rest] = args;

  if (verb === 'run') {
    const scenarioPath = readOption(rest, '--scenario');
    const logPath = readOption(rest, '--log');
    if (scenarioPath === undefined || logPath === undefined) {
      return undefined;
    }
    return {
      kind: 'run',
      scenarioPath,
      logPath,
      out: readOption(rest, '--out'),
    };
  }

  if (verb === 'verify') {
    const scenarioPath = readOption(rest, '--scenario');
    const logPath = readOption(rest, '--log');
    const snapshotPath = readOption(rest, '--snapshot');
    const eventsPath = readOption(rest, '--events');
    if (
      scenarioPath === undefined ||
      logPath === undefined ||
      snapshotPath === undefined ||
      eventsPath === undefined
    ) {
      return undefined;
    }
    return { kind: 'verify', scenarioPath, logPath, snapshotPath, eventsPath };
  }

  if (verb === 'hash') {
    const filePath = readOption(rest, '--file');
    return filePath === undefined ? undefined : { kind: 'hash', filePath };
  }

  if (verb === 'check-hashes') {
    const dir = readOption(rest, '--dir');
    return dir === undefined ? undefined : { kind: 'check-hashes', dir };
  }

  return undefined;
}

async function readTextFile(
  filePath: string,
): Promise<{ ok: true; text: string } | { ok: false; message: string }> {
  try {
    return { ok: true, text: await readFile(filePath, 'utf8') };
  } catch (error) {
    return {
      ok: false,
      message: `Cannot read ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function digestLine(digest: string): string {
  return `${digest}\n`;
}

async function writeArtifacts(
  out: string,
  scenarioPath: string,
  logPath: string,
  built: ReplayArtifacts,
): Promise<void> {
  await mkdir(out, { recursive: true });
  await Promise.all([
    writeFile(join(out, SNAPSHOT_FILE), built.snapshotText, 'utf8'),
    writeFile(join(out, EVENTS_FILE), built.eventsText, 'utf8'),
    writeFile(
      join(out, `${basenameWithoutExtension(scenarioPath)}.sha256`),
      digestLine(built.digests.scenario),
      'utf8',
    ),
    writeFile(
      join(out, `${basenameWithoutExtension(logPath)}.sha256`),
      digestLine(built.digests.commands),
      'utf8',
    ),
    writeFile(
      join(out, 'snapshot.golden.sha256'),
      digestLine(built.digests.snapshot),
      'utf8',
    ),
    writeFile(
      join(out, 'events.golden.sha256'),
      digestLine(built.digests.events),
      'utf8',
    ),
  ]);
}

function basenameWithoutExtension(filePath: string): string {
  const name = filePath.slice(dirname(filePath).length + 1);
  const index = name.lastIndexOf('.');
  return index <= 0 ? name : name.slice(0, index);
}

async function runRun(
  command: Extract<ReplayCommand, { kind: 'run' }>,
  io: ReplayCliIo,
): Promise<number> {
  const scenario = await readTextFile(command.scenarioPath);
  const log = await readTextFile(command.logPath);
  if (!scenario.ok || !log.ok) {
    io.stderr({ error: scenario.ok ? log : scenario });
    return 2;
  }

  const built = buildReplayArtifacts(scenario.text, log.text);
  if (!built.ok) {
    io.stderr({ kind: built.kind, diagnostics: built.diagnostics });
    return built.kind === 'divergence' ? 1 : 2;
  }

  if (command.out !== undefined) {
    await writeArtifacts(
      command.out,
      command.scenarioPath,
      command.logPath,
      built.value,
    );
  }

  io.stdout({ ok: true, command: 'run', digests: built.value.digests });
  return 0;
}

interface Divergence {
  readonly file: string;
  readonly expected: string;
  readonly actual: string;
}

async function compareDigestSidecar(
  filePath: string,
  digest: string,
): Promise<Divergence | { readonly missing: string } | undefined> {
  const sidecarPath = digestPathFor(filePath);
  const sidecar = await readTextFile(sidecarPath);
  if (!sidecar.ok) {
    return { missing: sidecar.message };
  }
  if (sidecar.text.trim() !== digest) {
    return {
      file: sidecarPath,
      expected: sidecar.text.trim(),
      actual: digest,
    };
  }
  return undefined;
}

async function runVerify(
  command: Extract<ReplayCommand, { kind: 'verify' }>,
  io: ReplayCliIo,
): Promise<number> {
  const [scenario, log, snapshot, events] = await Promise.all([
    readTextFile(command.scenarioPath),
    readTextFile(command.logPath),
    readTextFile(command.snapshotPath),
    readTextFile(command.eventsPath),
  ]);

  const unreadable = [scenario, log, snapshot, events].filter(
    (entry) => !entry.ok,
  );
  if (
    unreadable.length > 0 ||
    !scenario.ok ||
    !log.ok ||
    !snapshot.ok ||
    !events.ok
  ) {
    io.stderr({
      kind: 'invalid-input',
      errors: unreadable.map((entry) => (entry.ok ? '' : entry.message)),
    });
    return 2;
  }

  const built = buildReplayArtifacts(scenario.text, log.text);
  if (!built.ok) {
    io.stderr({ kind: built.kind, diagnostics: built.diagnostics });
    return built.kind === 'divergence' ? 1 : 2;
  }

  const divergences: Divergence[] = [];
  const missing: string[] = [];

  if (snapshot.text !== built.value.snapshotText) {
    divergences.push({
      file: command.snapshotPath,
      expected: sha256Hex(snapshot.text),
      actual: built.value.digests.snapshot,
    });
  }
  if (events.text !== built.value.eventsText) {
    divergences.push({
      file: command.eventsPath,
      expected: sha256Hex(events.text),
      actual: built.value.digests.events,
    });
  }

  const sidecars = await Promise.all([
    compareDigestSidecar(command.scenarioPath, built.value.digests.scenario),
    compareDigestSidecar(command.logPath, built.value.digests.commands),
    compareDigestSidecar(command.snapshotPath, built.value.digests.snapshot),
    compareDigestSidecar(command.eventsPath, built.value.digests.events),
  ]);
  for (const sidecar of sidecars) {
    if (sidecar === undefined) {
      continue;
    }
    if ('missing' in sidecar) {
      missing.push(sidecar.missing);
      continue;
    }
    divergences.push(sidecar);
  }

  if (missing.length > 0) {
    io.stderr({ kind: 'invalid-input', errors: missing });
    return 2;
  }

  if (divergences.length > 0) {
    io.stderr({ kind: 'divergence', divergences });
    return 1;
  }

  io.stdout({ ok: true, command: 'verify', digests: built.value.digests });
  return 0;
}

async function runCheckHashes(
  command: Extract<ReplayCommand, { kind: 'check-hashes' }>,
  io: ReplayCliIo,
): Promise<number> {
  const result = await checkPublishedHashes(command.dir);
  if (!result.ok) {
    if (result.kind === 'invalid-input') {
      io.stderr({ kind: 'invalid-input', errors: result.errors });
      return 2;
    }
    io.stderr({ kind: 'divergence', divergences: result.divergences });
    return 1;
  }

  io.stdout({
    ok: true,
    command: 'check-hashes',
    dir: command.dir,
    digests: result.digests,
  });
  return 0;
}

async function runHash(
  command: Extract<ReplayCommand, { kind: 'hash' }>,
  io: ReplayCliIo,
): Promise<number> {
  try {
    const bytes = await readFile(command.filePath);
    const digest = createHash('sha256').update(bytes).digest('hex');
    io.stdout({ ok: true, command: 'hash', file: command.filePath, digest });
    return 0;
  } catch (error) {
    io.stderr({
      kind: 'invalid-input',
      error: error instanceof Error ? error.message : String(error),
    });
    return 2;
  }
}

export async function runReplayCli(
  args: readonly string[],
  io: ReplayCliIo = processIo,
): Promise<number> {
  const command = parseCommand(args);
  if (command === undefined) {
    io.usage();
    return 2;
  }

  switch (command.kind) {
    case 'run':
      return runRun(command, io);
    case 'verify':
      return runVerify(command, io);
    case 'hash':
      return runHash(command, io);
    case 'check-hashes':
      return runCheckHashes(command, io);
  }
}

export type { SimulationDiagnostic };

if (import.meta.main) {
  process.exitCode = await runReplayCli(process.argv.slice(2));
}
