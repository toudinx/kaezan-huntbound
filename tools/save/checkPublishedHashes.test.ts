import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  checkPublishedHashes,
  parsePublishedHashTable,
  SAVE_PUBLISHED_HASH_ARTIFACTS,
  sha256Bytes,
} from './checkPublishedHashes.ts';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function scratch(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'huntbound-save-hashes-'));
  roots.push(root);
  return root;
}

function hashesMarkdown(digests: Readonly<Record<string, string>>): string {
  const rows = SAVE_PUBLISHED_HASH_ARTIFACTS.map(
    (artifact) => `| \`${artifact}\` | \`${digests[artifact]}\` |`,
  );
  return [
    '# fixture hashes',
    '',
    '| Artifact | SHA-256 |',
    '|---|---|',
    ...rows,
    '',
  ].join('\n');
}

const defaultBodies: Readonly<Record<string, string>> = {
  'checkpoint.golden.json': '{"schemaVersion":1}\n',
  'export.golden.txt': '{"schemaVersion":1}\n',
  'legacy.json': '{"stash":[]}\n',
  'migrated.golden.json': '{"schemaVersion":1,"stash":[]}\n',
};

async function writeConsistentFixture(
  root: string,
  bodies: Readonly<Record<string, string>> = defaultBodies,
): Promise<Readonly<Record<string, string>>> {
  await mkdir(root, { recursive: true });
  const digests: Record<string, string> = {};
  await Promise.all(
    SAVE_PUBLISHED_HASH_ARTIFACTS.map(async (artifact) => {
      const body = bodies[artifact] ?? '';
      const bytes = Buffer.from(body, 'utf8');
      digests[artifact] = sha256Bytes(bytes);
      await writeFile(join(root, artifact), bytes);
    }),
  );
  await Promise.all([
    writeFile(
      join(root, 'checkpoint.golden.sha256'),
      `${digests['checkpoint.golden.json']}\n`,
    ),
    writeFile(
      join(root, 'export.golden.sha256'),
      `${digests['export.golden.txt']}\n`,
    ),
    writeFile(join(root, 'legacy.sha256'), `${digests['legacy.json']}\n`),
    writeFile(
      join(root, 'migrated.golden.sha256'),
      `${digests['migrated.golden.json']}\n`,
    ),
  ]);
  await writeFile(join(root, 'hashes.md'), hashesMarkdown(digests));
  return digests;
}

describe('parsePublishedHashTable', () => {
  it('reads the four save artifact rows and ignores prose', () => {
    const parsed = parsePublishedHashTable(
      hashesMarkdown({
        'checkpoint.golden.json': 'a'.repeat(64),
        'export.golden.txt': 'b'.repeat(64),
        'legacy.json': 'c'.repeat(64),
        'migrated.golden.json': 'd'.repeat(64),
      }),
    );

    expect('error' in parsed).toBe(false);
    if ('error' in parsed) return;
    expect(parsed.get('checkpoint.golden.json')).toBe('a'.repeat(64));
    expect(parsed.get('migrated.golden.json')).toBe('d'.repeat(64));
    expect(parsed.size).toBe(4);
  });

  it('rejects a table with no digest rows', () => {
    const parsed = parsePublishedHashTable(
      '# empty\n\n| Artifact | SHA-256 |\n|---|---|\n',
    );
    expect(parsed).toEqual({ error: 'hashes.md has no artifact digest rows' });
  });
});

describe('checkPublishedHashes', () => {
  it('accepts hashes.md, file bytes, and sidecars that agree', async () => {
    const root = await scratch();
    const digests = await writeConsistentFixture(root);

    const result = await checkPublishedHashes(root);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.digests['checkpoint.golden.json']).toBe(
      digests['checkpoint.golden.json'],
    );
    expect(result.digests['migrated.golden.json']).toBe(
      digests['migrated.golden.json'],
    );
  });

  it('reports divergence when a published hash digit changes', async () => {
    const root = await scratch();
    const digests = await writeConsistentFixture(root);
    const mutated = `${digests['checkpoint.golden.json']?.slice(0, -1)}0`;
    await writeFile(
      join(root, 'hashes.md'),
      hashesMarkdown({ ...digests, 'checkpoint.golden.json': mutated }),
    );

    const result = await checkPublishedHashes(root);

    expect(result.ok).toBe(false);
    if (result.ok || result.kind !== 'divergence') return;
    expect(result.divergences).toEqual([
      {
        file: join(root, 'hashes.md'),
        expected: mutated,
        actual: digests['checkpoint.golden.json'],
      },
    ]);
  });

  it('reports divergence when a sidecar no longer matches its file', async () => {
    const root = await scratch();
    await writeConsistentFixture(root);
    await writeFile(join(root, 'legacy.sha256'), `${'0'.repeat(64)}\n`);

    const result = await checkPublishedHashes(root);

    expect(result.ok).toBe(false);
    if (result.ok || result.kind !== 'divergence') return;
    expect(result.divergences).toEqual([
      {
        file: join(root, 'legacy.sha256'),
        expected: '0'.repeat(64),
        actual: sha256Bytes(Buffer.from('{"stash":[]}\n', 'utf8')),
      },
    ]);
  });

  it('exits as invalid input when hashes.md is missing', async () => {
    const root = await scratch();
    const result = await checkPublishedHashes(root);

    expect(result.ok).toBe(false);
    if (result.ok || result.kind !== 'invalid-input') return;
    expect(result.errors[0]).toContain('hashes.md');
  });

  it('exits as invalid input when a required artifact row is missing', async () => {
    const root = await scratch();
    const digests = await writeConsistentFixture(root);
    const rest = { ...digests };
    delete rest['migrated.golden.json'];
    await writeFile(join(root, 'hashes.md'), hashesMarkdown(rest));

    const result = await checkPublishedHashes(root);

    expect(result.ok).toBe(false);
    if (result.ok || result.kind !== 'invalid-input') return;
    expect(result.errors).toContain(
      'hashes.md is missing migrated.golden.json',
    );
  });
});
