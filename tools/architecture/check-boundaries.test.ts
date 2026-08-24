import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { checkBoundaries } from './check-boundaries.ts';

const packagePolicy = {
  '@huntbound/contracts': [],
  '@huntbound/simulation': ['@huntbound/contracts'],
  '@huntbound/content': ['@huntbound/contracts'],
  '@huntbound/assets': ['@huntbound/contracts'],
  '@huntbound/map-authoring': ['@huntbound/contracts'],
  '@huntbound/save': ['@huntbound/contracts', '@huntbound/simulation'],
  '@huntbound/test-fixtures': ['@huntbound/contracts', '@huntbound/simulation'],
  '@huntbound/game': [
    '@huntbound/contracts',
    '@huntbound/simulation',
    '@huntbound/content',
    '@huntbound/assets',
    '@huntbound/save',
  ],
};

const temporaryWorkspaces: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryWorkspaces
      .splice(0)
      .map((path) => rm(path, { force: true, recursive: true })),
  );
});

async function createWorkspace(
  packages: Record<
    string,
    {
      dependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
      source?: string;
      tsconfig?: Record<string, unknown>;
    }
  >,
): Promise<{ policyPath: string; root: string }> {
  const root = await mkdtemp(join(tmpdir(), 'huntbound-boundaries-'));
  temporaryWorkspaces.push(root);
  const policyPath = join(root, 'dependency-policy.json');

  await writeFile(
    policyPath,
    `${JSON.stringify(
      {
        ...packagePolicy,
        external: {
          '@huntbound/simulation': {
            allowedDependencies: [],
            forbidDomLibraries: ['phaser'],
            forbidNodeBuiltins: true,
          },
          '@huntbound/map-authoring': {
            allowedDependencies: [],
            forbidDomLibraries: ['phaser'],
            forbidNodeBuiltins: true,
          },
        },
      },
      null,
      2,
    )}\n`,
  );

  await Promise.all(
    Object.entries(packages).map(async ([name, definition]) => {
      const directory = join(root, 'packages', name.replace('@huntbound/', ''));
      await mkdir(join(directory, 'src'), { recursive: true });
      await writeFile(
        join(directory, 'package.json'),
        `${JSON.stringify({ dependencies: definition.dependencies, name, optionalDependencies: definition.optionalDependencies, private: true, version: '0.0.0' })}\n`,
      );
      await writeFile(
        join(directory, 'tsconfig.json'),
        `${JSON.stringify(
          definition.tsconfig ?? {
            compilerOptions: { lib: ['ES2022'] },
            include: ['src/**/*.ts'],
          },
        )}\n`,
      );
      await writeFile(
        join(directory, 'src', 'index.ts'),
        definition.source ?? 'export {};\n',
      );
    }),
  );

  return { policyPath, root };
}

describe('checkBoundaries', () => {
  it('exits nonzero with an actionable Phaser violation from a temporary fixture', async () => {
    const workspace = await createWorkspace({
      '@huntbound/simulation': {
        dependencies: { phaser: '4.2.1' },
        source: 'import "phaser";\n',
      },
    });
    const result = await new Promise<{ code: number | null; stderr: string }>(
      (resolveResult, reject) => {
        const child = spawn(
          process.execPath,
          [
            'tools/architecture/check-boundaries.ts',
            workspace.root,
            workspace.policyPath,
          ],
          { cwd: process.cwd(), stdio: ['ignore', 'ignore', 'pipe'] },
        );
        let stderr = '';
        child.stderr.setEncoding('utf8');
        child.stderr.on('data', (chunk: string) => {
          stderr += chunk;
        });
        child.once('error', reject);
        child.once('close', (code) => {
          resolveResult({ code, stderr });
        });
      },
    );

    assert.equal(result.code, 1);
    assert.match(
      result.stderr,
      /packages[\\/]simulation[\\/]src[\\/]index\.ts:1:8/,
    );
    assert.match(
      result.stderr,
      /import "phaser" violates the DOM library rule/,
    );
  });

  it('accepts an allowed declared internal import', async () => {
    const workspace = await createWorkspace({
      '@huntbound/contracts': {},
      '@huntbound/simulation': {
        dependencies: { '@huntbound/contracts': 'workspace:*' },
        source:
          'import type { Command } from "@huntbound/contracts";\nexport type Input = Command;\n',
      },
    });

    assert.deepEqual(
      await checkBoundaries(workspace.root, workspace.policyPath),
      [],
    );
  });

  it('reports a Phaser import from simulation', async () => {
    const workspace = await createWorkspace({
      '@huntbound/simulation': {
        dependencies: { phaser: '4.2.1' },
        source: 'import "phaser";\n',
      },
    });

    assert.ok(
      (await checkBoundaries(workspace.root, workspace.policyPath)).some(
        (diagnostic) =>
          diagnostic.includes('import "phaser" violates the DOM library rule'),
      ),
    );
  });

  it('reports a literal dynamic Phaser import from simulation', async () => {
    const workspace = await createWorkspace({
      '@huntbound/simulation': {
        dependencies: { phaser: '4.2.1' },
        source: 'await import(`phaser`);\n',
      },
    });

    assert.ok(
      (await checkBoundaries(workspace.root, workspace.policyPath)).some(
        (diagnostic) =>
          diagnostic.includes('import "phaser" violates the DOM library rule'),
      ),
    );
  });

  it('reports a Phaser reexport with a string export name from simulation', async () => {
    const workspace = await createWorkspace({
      '@huntbound/simulation': {
        dependencies: { phaser: '4.2.1', 'wire-name': '1.0.0' },
        source: 'export { value as "wire-name" } from "phaser";\n',
      },
    });

    assert.ok(
      (await checkBoundaries(workspace.root, workspace.policyPath)).some(
        (diagnostic) =>
          diagnostic.includes('import "phaser" violates the DOM library rule'),
      ),
    );
  });

  it('reports a Node builtin import from simulation', async () => {
    const workspace = await createWorkspace({
      '@huntbound/simulation': {
        source: 'import { readFile } from "node:fs";\nvoid readFile;\n',
      },
    });

    assert.ok(
      (await checkBoundaries(workspace.root, workspace.policyPath)).some(
        (diagnostic) =>
          diagnostic.includes(
            'import "node:fs" violates the Node builtin rule',
          ),
      ),
    );
  });

  it('reports a Node builtin import from map-authoring', async () => {
    const workspace = await createWorkspace({
      '@huntbound/map-authoring': {
        source: 'import { readFile } from "node:fs";\nvoid readFile;\n',
      },
    });

    assert.ok(
      (await checkBoundaries(workspace.root, workspace.policyPath)).some(
        (diagnostic) =>
          diagnostic.includes(
            'import "node:fs" violates the Node builtin rule',
          ),
      ),
    );
  });

  it('reports an unauthorized internal dependency', async () => {
    const workspace = await createWorkspace({
      '@huntbound/contracts': {
        dependencies: { '@huntbound/simulation': 'workspace:*' },
        source: 'import "@huntbound/simulation";\n',
      },
      '@huntbound/simulation': {},
    });

    assert.ok(
      (await checkBoundaries(workspace.root, workspace.policyPath)).some(
        (diagnostic) =>
          diagnostic.includes(
            'import "@huntbound/simulation" is not permitted for @huntbound/contracts',
          ),
      ),
    );
  });

  it('allows declared external dependencies that are not imported', async () => {
    const workspace = await createWorkspace({
      '@huntbound/content': { dependencies: { zod: '4.0.0' } },
    });

    assert.deepEqual(
      await checkBoundaries(workspace.root, workspace.policyPath),
      [],
    );
  });

  it('rejects an external dependency declared by simulation', async () => {
    const workspace = await createWorkspace({
      '@huntbound/simulation': { dependencies: { zod: '4.0.0' } },
    });

    assert.ok(
      (await checkBoundaries(workspace.root, workspace.policyPath)).some(
        (diagnostic) =>
          diagnostic.includes('zod is not permitted for @huntbound/simulation'),
      ),
    );
  });

  it('rejects a prohibited optional dependency declared by simulation', async () => {
    const workspace = await createWorkspace({
      '@huntbound/simulation': { optionalDependencies: { phaser: '4.2.1' } },
    });

    assert.ok(
      (await checkBoundaries(workspace.root, workspace.policyPath)).some(
        (diagnostic) =>
          diagnostic.includes(
            'phaser violates the DOM library rule for @huntbound/simulation',
          ),
      ),
    );
  });

  it('rejects a workspace root without package manifests', async () => {
    const root = await mkdtemp(join(tmpdir(), 'huntbound-boundaries-empty-'));
    temporaryWorkspaces.push(root);
    const policyPath = join(root, 'dependency-policy.json');
    await writeFile(policyPath, `${JSON.stringify(packagePolicy)}\n`);

    await assert.rejects(
      checkBoundaries(root, policyPath),
      /No workspace package manifests found/,
    );
  });
});
