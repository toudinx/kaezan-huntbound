import { spawn } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

const cliPath = resolve(import.meta.dirname, 'cli.ts');
const repoRoot = resolve(import.meta.dirname, '../..');
const committedDir = resolve(repoRoot, 'packages/test-fixtures/save/pb06');

const ephemeralRoots: string[] = [];
let sharedFixture: string | undefined;

afterEach(async () => {
  await Promise.all(
    ephemeralRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

afterAll(async () => {
  if (sharedFixture !== undefined) {
    await rm(sharedFixture, { recursive: true, force: true });
  }
});

async function scratch(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'huntbound-save-cli-'));
  ephemeralRoots.push(root);
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

const emptyLegacy = '{"completedRuns":0,"session":null,"stash":[]}\n';

async function generateInto(root: string): Promise<CliResult> {
  await writeFile(join(root, 'legacy.json'), emptyLegacy, 'utf8');
  return runCli(['run', '--dir', root]);
}

async function copyGenerated(root: string): Promise<string> {
  const copy = await scratch();
  const names = [
    'checkpoint.golden.json',
    'export.golden.txt',
    'legacy.json',
    'migrated.golden.json',
    'checkpoint.golden.sha256',
    'export.golden.sha256',
    'legacy.sha256',
    'migrated.golden.sha256',
    'hashes.md',
  ];
  await Promise.all(
    names.map((name) => copyFile(join(root, name), join(copy, name))),
  );
  return copy;
}

describe('save cli usage', () => {
  it('exits 2 when verify is missing --dir', async () => {
    const result = await runCli(['verify']);
    expect(result.exitCode).toBe(2);
  });

  it('exits 2 when check-hashes is missing --dir', async () => {
    const result = await runCli(['check-hashes']);
    expect(result.exitCode).toBe(2);
  });

  it('exits 2 when run is missing --dir', async () => {
    const result = await runCli(['run']);
    expect(result.exitCode).toBe(2);
  });
});

describe('save cli run', () => {
  it('writes byte-identical artifacts on two clean executions', async () => {
    const first = await scratch();
    const second = await scratch();

    const firstRun = await generateInto(first);
    const secondRun = await generateInto(second);

    expect(firstRun.exitCode).toBe(0);
    expect(secondRun.exitCode).toBe(0);

    for (const name of [
      'checkpoint.golden.json',
      'export.golden.txt',
      'migrated.golden.json',
      'hashes.md',
      'checkpoint.golden.sha256',
      'export.golden.sha256',
      'legacy.sha256',
      'migrated.golden.sha256',
    ]) {
      const left = await readFile(join(first, name));
      const right = await readFile(join(second, name));
      expect(left.equals(right)).toBe(true);
    }
  });
});

describe('save cli verify and check-hashes', () => {
  beforeAll(async () => {
    const root = await mkdtemp(join(tmpdir(), 'huntbound-save-shared-'));
    const generated = await generateInto(root);
    expect(generated.exitCode).toBe(0);
    sharedFixture = root;
  });

  it('exits 0 on a fixture generated in the test', async () => {
    expect(sharedFixture).toBeDefined();
    if (sharedFixture === undefined) {
      return;
    }
    const result = await runCli(['verify', '--dir', sharedFixture]);
    expect(result.exitCode).toBe(0);
  });

  it('is idempotent across two consecutive executions', async () => {
    expect(sharedFixture).toBeDefined();
    if (sharedFixture === undefined) {
      return;
    }
    expect((await runCli(['verify', '--dir', sharedFixture])).exitCode).toBe(0);
    expect((await runCli(['verify', '--dir', sharedFixture])).exitCode).toBe(0);
  });

  it('exits 1 when one byte of the checkpoint changes', async () => {
    expect(sharedFixture).toBeDefined();
    if (sharedFixture === undefined) {
      return;
    }
    const root = await copyGenerated(sharedFixture);
    const original = await readFile(
      join(root, 'checkpoint.golden.json'),
      'utf8',
    );
    const index = original.indexOf('"completedRuns":0');
    expect(index).toBeGreaterThan(-1);
    await writeFile(
      join(root, 'checkpoint.golden.json'),
      `${original.slice(0, index + '"completedRuns":'.length)}1${original.slice(index + '"completedRuns":0'.length)}`,
      'utf8',
    );

    const result = await runCli(['verify', '--dir', root]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('divergence');
  });

  it('exits 1 when a bag item changes', async () => {
    expect(sharedFixture).toBeDefined();
    if (sharedFixture === undefined) {
      return;
    }
    const root = await copyGenerated(sharedFixture);
    const original = await readFile(
      join(root, 'checkpoint.golden.json'),
      'utf8',
    );
    const document = JSON.parse(original) as {
      session: { bag: readonly { itemKey: string; count: number }[] };
    };
    const firstEntry = document.session.bag[0];
    expect(firstEntry).toBeDefined();
    if (firstEntry === undefined) {
      return;
    }
    await writeFile(
      join(root, 'checkpoint.golden.json'),
      original.replace(
        `"count":${firstEntry.count},"itemKey":"${firstEntry.itemKey}"`,
        `"count":${firstEntry.count + 1},"itemKey":"${firstEntry.itemKey}"`,
      ),
      'utf8',
    );

    const result = await runCli(['verify', '--dir', root]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('divergence');
  });

  it('exits 1 when one character of the export changes', async () => {
    expect(sharedFixture).toBeDefined();
    if (sharedFixture === undefined) {
      return;
    }
    const root = await copyGenerated(sharedFixture);
    const original = await readFile(join(root, 'export.golden.txt'), 'utf8');
    expect(original.includes('"completedRuns":0')).toBe(true);
    await writeFile(
      join(root, 'export.golden.txt'),
      original.replace('"completedRuns":0', '"completedRuns":1'),
      'utf8',
    );

    const result = await runCli(['verify', '--dir', root]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('divergence');
  });

  it('exits 1 when the legacy document version changes', async () => {
    expect(sharedFixture).toBeDefined();
    if (sharedFixture === undefined) {
      return;
    }
    const root = await copyGenerated(sharedFixture);
    const original = await readFile(join(root, 'legacy.json'), 'utf8');
    const document = JSON.parse(original) as Record<string, unknown>;
    expect(document.schemaVersion).toBeUndefined();
    document.schemaVersion = 4;
    await writeFile(
      join(root, 'legacy.json'),
      `${JSON.stringify(document)}\n`,
      'utf8',
    );

    const result = await runCli(['verify', '--dir', root]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('divergence');
  });

  it('exits 2 when the golden files are missing', async () => {
    const root = await scratch();
    const result = await runCli(['verify', '--dir', root]);
    expect(result.exitCode).toBe(2);
  });

  it('exits 0 from check-hashes on a fixture generated in the test', async () => {
    expect(sharedFixture).toBeDefined();
    if (sharedFixture === undefined) {
      return;
    }
    const result = await runCli(['check-hashes', '--dir', sharedFixture]);
    expect(result.exitCode).toBe(0);
  });

  it('exits 1 when a published hash digit changes', async () => {
    expect(sharedFixture).toBeDefined();
    if (sharedFixture === undefined) {
      return;
    }
    const root = await copyGenerated(sharedFixture);
    const original = await readFile(join(root, 'hashes.md'), 'utf8');
    const match = /`([0-9a-f]{64})`/.exec(original);
    expect(match?.[1]).toBeDefined();
    const digest = match?.[1] ?? '';
    await writeFile(
      join(root, 'hashes.md'),
      original.replace(digest, `${digest.slice(0, -1)}0`),
      'utf8',
    );

    const result = await runCli(['check-hashes', '--dir', root]);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('divergence');
  });

  it('exits 2 when hashes.md is missing', async () => {
    const root = await scratch();
    const result = await runCli(['check-hashes', '--dir', root]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('invalid-input');
  });
});

describe('save cli committed fixture', () => {
  it('exits 0 on packages/test-fixtures/save/pb06', async () => {
    const result = await runCli(['verify', '--dir', committedDir]);
    expect(result.exitCode).toBe(0);
  });
});
