import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const cliPath = resolve(import.meta.dirname, 'cli.ts');
const repoRoot = resolve(import.meta.dirname, '../..');
const fixtureRoot = resolve(repoRoot, 'packages/test-fixtures/simulation/pb03');

const scenarioPath = join(fixtureRoot, 'scenario.json');
const logPath = join(fixtureRoot, 'commands.jsonl');
const snapshotPath = join(fixtureRoot, 'snapshot.golden.json');
const eventsPath = join(fixtureRoot, 'events.golden.jsonl');

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function scratch(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'huntbound-replay-'));
  roots.push(root);
  return root;
}

interface CliResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

async function runCli(args: readonly string[]): Promise<CliResult> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(
      process.execPath,
      ['--no-warnings', '--experimental-transform-types', cliPath, ...args],
      { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolveResult({ exitCode: code ?? 0, stdout, stderr });
    });
  });
}

/** Copies the fixture into a scratch directory so a test can mutate it. */
async function scratchFixture(): Promise<{
  readonly root: string;
  readonly scenario: string;
  readonly log: string;
  readonly snapshot: string;
  readonly events: string;
}> {
  const root = await scratch();
  const names = [
    'scenario.json',
    'commands.jsonl',
    'snapshot.golden.json',
    'events.golden.jsonl',
    'scenario.sha256',
    'commands.sha256',
    'snapshot.golden.sha256',
    'events.golden.sha256',
  ];
  await Promise.all(
    names.map((name) => copyFile(join(fixtureRoot, name), join(root, name))),
  );
  return {
    root,
    scenario: join(root, 'scenario.json'),
    log: join(root, 'commands.jsonl'),
    snapshot: join(root, 'snapshot.golden.json'),
    events: join(root, 'events.golden.jsonl'),
  };
}

function verifyArgs(paths: {
  scenario: string;
  log: string;
  snapshot: string;
  events: string;
}): readonly string[] {
  return [
    'verify',
    '--scenario',
    paths.scenario,
    '--log',
    paths.log,
    '--snapshot',
    paths.snapshot,
    '--events',
    paths.events,
  ];
}

describe('replay cli hash', () => {
  it('prints the sha256 of the file and exits 0', async () => {
    const result = await runCli(['hash', '--file', scenarioPath]);
    const expected = createHash('sha256')
      .update(await readFile(scenarioPath))
      .digest('hex');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(expected);
  });

  it('is stable across executions', async () => {
    const first = await runCli(['hash', '--file', logPath]);
    const second = await runCli(['hash', '--file', logPath]);

    expect(first.exitCode).toBe(0);
    expect(second.stdout).toBe(first.stdout);
  });

  it('exits 2 for a file that does not exist', async () => {
    const result = await runCli(['hash', '--file', join(fixtureRoot, 'nope')]);

    expect(result.exitCode).toBe(2);
  });
});

describe('replay cli run', () => {
  it('writes byte-identical artifacts on two clean executions', async () => {
    const first = await scratch();
    const second = await scratch();

    const firstRun = await runCli([
      'run',
      '--scenario',
      scenarioPath,
      '--log',
      logPath,
      '--out',
      first,
    ]);
    const secondRun = await runCli([
      'run',
      '--scenario',
      scenarioPath,
      '--log',
      logPath,
      '--out',
      second,
    ]);

    expect(firstRun.exitCode).toBe(0);
    expect(secondRun.exitCode).toBe(0);

    for (const name of [
      'snapshot.golden.json',
      'events.golden.jsonl',
      'scenario.sha256',
      'commands.sha256',
      'snapshot.golden.sha256',
      'events.golden.sha256',
    ]) {
      const left = await readFile(join(first, name));
      const right = await readFile(join(second, name));
      expect(right.equals(left)).toBe(true);
    }
  });

  it('reproduces the committed golden artifacts exactly', async () => {
    const out = await scratch();

    const result = await runCli([
      'run',
      '--scenario',
      scenarioPath,
      '--log',
      logPath,
      '--out',
      out,
    ]);

    expect(result.exitCode).toBe(0);
    for (const name of [
      'snapshot.golden.json',
      'events.golden.jsonl',
      'scenario.sha256',
      'commands.sha256',
      'snapshot.golden.sha256',
      'events.golden.sha256',
    ]) {
      const produced = await readFile(join(out, name));
      const committed = await readFile(join(fixtureRoot, name));
      expect(produced.equals(committed)).toBe(true);
    }
  });

  it('exits 2 when an argument is missing', async () => {
    const result = await runCli(['run', '--scenario', scenarioPath]);

    expect(result.exitCode).toBe(2);
  });
});

describe('replay cli verify', () => {
  it('exits 0 on the committed fixture', async () => {
    const result = await runCli(
      verifyArgs({
        scenario: scenarioPath,
        log: logPath,
        snapshot: snapshotPath,
        events: eventsPath,
      }),
    );

    expect(result.exitCode).toBe(0);
  });

  it('is idempotent across two consecutive executions', async () => {
    const args = verifyArgs({
      scenario: scenarioPath,
      log: logPath,
      snapshot: snapshotPath,
      events: eventsPath,
    });

    expect((await runCli(args)).exitCode).toBe(0);
    expect((await runCli(args)).exitCode).toBe(0);
  });

  it('exits 1 when one seed bit changes in the header', async () => {
    const paths = await scratchFixture();
    const original = await readFile(paths.log, 'utf8');
    await writeFile(
      paths.log,
      original.replace('0f1e2d3c4b5a6978', '0f1e2d3c4b5a6979'),
      'utf8',
    );

    expect((await runCli(verifyArgs(paths))).exitCode).toBe(1);
  });

  it('exits 1 when a logged command changes', async () => {
    const paths = await scratchFixture();
    const original = await readFile(paths.log, 'utf8');
    await writeFile(
      paths.log,
      original.replace(
        '"direction":"ne","entityId":1',
        '"direction":"se","entityId":1',
      ),
      'utf8',
    );

    expect((await runCli(verifyArgs(paths))).exitCode).toBe(1);
  });

  it('exits 1 when rulesVersion changes', async () => {
    const paths = await scratchFixture();
    const original = await readFile(paths.log, 'utf8');
    await writeFile(
      paths.log,
      original.replace('"rulesVersion":1', '"rulesVersion":2'),
      'utf8',
    );

    expect((await runCli(verifyArgs(paths))).exitCode).toBe(1);
  });

  it('exits 1 when the golden snapshot is edited', async () => {
    const paths = await scratchFixture();
    const original = await readFile(paths.snapshot, 'utf8');
    await writeFile(
      paths.snapshot,
      original.replace('"tick":200', '"tick":199'),
      'utf8',
    );

    expect((await runCli(verifyArgs(paths))).exitCode).toBe(1);
  });

  it('exits 1 when a committed digest no longer matches its file', async () => {
    const paths = await scratchFixture();
    await writeFile(
      join(paths.root, 'commands.sha256'),
      `${'0'.repeat(64)}\n`,
      'utf8',
    );

    expect((await runCli(verifyArgs(paths))).exitCode).toBe(1);
  });

  it('exits 2 when the scenario is not valid JSON', async () => {
    const paths = await scratchFixture();
    await writeFile(paths.scenario, '{ not json', 'utf8');

    expect((await runCli(verifyArgs(paths))).exitCode).toBe(2);
  });

  it('exits 2 when a log line is not valid JSON', async () => {
    const paths = await scratchFixture();
    const original = await readFile(paths.log, 'utf8');
    await writeFile(paths.log, `${original}{ not json\n`, 'utf8');

    expect((await runCli(verifyArgs(paths))).exitCode).toBe(2);
  });

  it('exits 2 when a log line uses a forbidden issuer', async () => {
    const paths = await scratchFixture();
    const original = await readFile(paths.log, 'utf8');
    await writeFile(
      paths.log,
      original.replace(
        '{"issuer":"scenario","kind":"command","payload":{"entityId":5}',
        '{"issuer":"player","kind":"command","payload":{"entityId":5}',
      ),
      'utf8',
    );

    expect((await runCli(verifyArgs(paths))).exitCode).toBe(2);
  });

  it('exits 2 when the golden files are missing', async () => {
    const root = await scratch();

    const result = await runCli(
      verifyArgs({
        scenario: scenarioPath,
        log: logPath,
        snapshot: join(root, 'missing.json'),
        events: join(root, 'missing.jsonl'),
      }),
    );

    expect(result.exitCode).toBe(2);
  });
});
