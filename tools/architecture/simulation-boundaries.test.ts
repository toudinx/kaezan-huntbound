import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { checkSimulationBoundaries } from './simulation-boundaries.ts';

const roots: string[] = [];

async function scratchRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

describe('simulation architecture boundaries', () => {
  it('accepts a pure kernel module', async () => {
    const root = await scratchRoot('huntbound-simulation-pure-');
    const file = join(root, 'kernel.ts');
    await writeFile(
      file,
      [
        "import type { TickIndex } from '@huntbound/contracts';",
        "import { translate } from '../grid/index.ts';",
        '',
        'export function step(tick: TickIndex): number {',
        '  return Math.ceil((tick * 3) / 2) + translate.length;',
        '}',
        '',
      ].join('\n'),
    );

    assert.deepEqual(
      await checkSimulationBoundaries(root, { sourceFiles: [file] }),
      [],
    );
  });

  it('rejects clocks, global randomness, timers and external imports', async () => {
    const root = await scratchRoot('huntbound-simulation-impure-');
    const file = join(root, 'impure.ts');
    await writeFile(
      file,
      [
        "import { randomUUID } from 'node:crypto';",
        "import seedrandom from 'seedrandom';",
        '',
        'export function drift() {',
        '  const started = Date.now();',
        '  const sample = Math.random() + performance.now();',
        '  setTimeout(() => queueMicrotask(() => undefined), 0);',
        '  setInterval(() => undefined, 1);',
        '  setImmediate(() => undefined);',
        '  return [started, sample, globalThis, process, crypto, randomUUID, seedrandom];',
        '}',
        '',
      ].join('\n'),
    );

    const diagnostics = await checkSimulationBoundaries(root, {
      sourceFiles: [file],
    });
    const report = diagnostics.join('\n');

    for (const forbidden of [
      'Date',
      'performance',
      'Math.random',
      'setTimeout',
      'setInterval',
      'setImmediate',
      'queueMicrotask',
      'crypto',
      'globalThis',
      'process',
    ]) {
      assert.match(
        report,
        new RegExp(`"${forbidden}"`),
        `missing ${forbidden}`,
      );
    }
    assert.match(report, /import "node:crypto"/);
    assert.match(report, /import "seedrandom"/);
  });

  it('keeps scanning after template literals, comments and regular expressions', async () => {
    const root = await scratchRoot('huntbound-simulation-template-');
    const file = join(root, 'late.ts');
    await writeFile(
      file,
      [
        'const pattern = /^[a-z"\'-]+$/;',
        '',
        'export function key(x: number, y: number): string {',
        // biome-ignore lint/suspicious/noTemplateCurlyInString: fixture source that must contain a real interpolation
        '  return `${x}:${y}` + pattern.source;',
        '}',
        '',
        '// Date and Math.random inside a comment stay allowed.',
        "const quoted = 'Date.now() inside a string stays allowed';",
        '',
        'export function drift(): number {',
        '  return Date.now() + Math.random() + quoted.length;',
        '}',
        '',
      ].join('\n'),
    );

    const diagnostics = await checkSimulationBoundaries(root, {
      sourceFiles: [file],
    });

    assert.equal(diagnostics.length, 2);
    assert.match(diagnostics.join('\n'), /"Date"/);
    assert.match(diagnostics.join('\n'), /"Math\.random"/);
  });

  it('ignores forbidden names used as property accesses', async () => {
    const root = await scratchRoot('huntbound-simulation-members-');
    const file = join(root, 'members.ts');
    await writeFile(
      file,
      [
        'export function read(record: { date: number; crypto: number }) {',
        '  return record.crypto + record.date + Math.ceil(1.5);',
        '}',
        '',
      ].join('\n'),
    );

    assert.deepEqual(
      await checkSimulationBoundaries(root, { sourceFiles: [file] }),
      [],
    );
  });

  it('allows vitest only inside test files', async () => {
    const root = await scratchRoot('huntbound-simulation-tests-');
    const test = join(root, 'kernel.test.ts');
    const source = join(root, 'kernel.ts');
    await writeFile(
      test,
      "import { it } from 'vitest';\nit('runs', () => {});\n",
    );
    await writeFile(
      source,
      "import { it } from 'vitest';\nexport const runner = it;\n",
    );

    const diagnostics = await checkSimulationBoundaries(root, {
      sourceFiles: [test, source],
    });

    assert.equal(diagnostics.length, 1);
    assert.match(diagnostics[0] ?? '', /kernel\.ts: import "vitest"/);
  });

  it('keeps the real simulation package inside its boundaries', async () => {
    assert.deepEqual(
      await checkSimulationBoundaries(join(import.meta.dirname, '..', '..')),
      [],
    );
  });
});
