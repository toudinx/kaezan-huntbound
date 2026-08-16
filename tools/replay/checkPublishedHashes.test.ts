import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  checkPublishedHashes,
  PUBLISHED_HASH_ARTIFACTS,
  parsePublishedHashTable,
  sha256Bytes,
} from './checkPublishedHashes.ts';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function scratch(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'huntbound-hashes-'));
  roots.push(root);
  return root;
}

function hashesMarkdown(digests: Readonly<Record<string, string>>): string {
  const rows = PUBLISHED_HASH_ARTIFACTS.map(
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

async function writeConsistentFixture(
  root: string,
  bodies: Readonly<Record<string, string>> = {
    'scenario.json': '{"scenario":true}\n',
    'commands.jsonl': '{"kind":"header"}\n',
    'snapshot.golden.json': '{"tick":1}\n',
    'events.golden.jsonl': '{"tick":1}\n',
  },
): Promise<Readonly<Record<string, string>>> {
  await mkdir(root, { recursive: true });
  const digests: Record<string, string> = {};
  await Promise.all(
    PUBLISHED_HASH_ARTIFACTS.map(async (artifact) => {
      const body = bodies[artifact] ?? '';
      const bytes = Buffer.from(body, 'utf8');
      digests[artifact] = sha256Bytes(bytes);
      await writeFile(join(root, artifact), bytes);
    }),
  );
  // Sidecar names follow digestPathFor: strip the last extension only.
  await Promise.all([
    writeFile(join(root, 'scenario.sha256'), `${digests['scenario.json']}\n`),
    writeFile(join(root, 'commands.sha256'), `${digests['commands.jsonl']}\n`),
    writeFile(
      join(root, 'snapshot.golden.sha256'),
      `${digests['snapshot.golden.json']}\n`,
    ),
    writeFile(
      join(root, 'events.golden.sha256'),
      `${digests['events.golden.jsonl']}\n`,
    ),
  ]);
  await writeFile(join(root, 'hashes.md'), hashesMarkdown(digests));
  return digests;
}

describe('parsePublishedHashTable', () => {
  it('reads the four artifact rows and ignores prose', () => {
    const parsed = parsePublishedHashTable(
      hashesMarkdown({
        'scenario.json': 'a'.repeat(64),
        'commands.jsonl': 'b'.repeat(64),
        'snapshot.golden.json': 'c'.repeat(64),
        'events.golden.jsonl': 'd'.repeat(64),
      }),
    );

    expect('error' in parsed).toBe(false);
    if ('error' in parsed) return;
    expect(parsed.get('scenario.json')).toBe('a'.repeat(64));
    expect(parsed.get('events.golden.jsonl')).toBe('d'.repeat(64));
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
    expect(result.digests['scenario.json']).toBe(digests['scenario.json']);
    expect(result.digests['events.golden.jsonl']).toBe(
      digests['events.golden.jsonl'],
    );
  });

  it('reports divergence when a published hash digit changes', async () => {
    const root = await scratch();
    const digests = await writeConsistentFixture(root);
    const mutated = `${digests['scenario.json']?.slice(0, -1)}0`;
    await writeFile(
      join(root, 'hashes.md'),
      hashesMarkdown({ ...digests, 'scenario.json': mutated }),
    );

    const result = await checkPublishedHashes(root);

    expect(result.ok).toBe(false);
    if (result.ok || result.kind !== 'divergence') return;
    expect(result.divergences).toEqual([
      {
        file: join(root, 'hashes.md'),
        expected: mutated,
        actual: digests['scenario.json'],
      },
    ]);
  });

  it('reports divergence when a sidecar no longer matches its file', async () => {
    const root = await scratch();
    await writeConsistentFixture(root);
    await writeFile(join(root, 'commands.sha256'), `${'0'.repeat(64)}\n`);

    const result = await checkPublishedHashes(root);

    expect(result.ok).toBe(false);
    if (result.ok || result.kind !== 'divergence') return;
    expect(result.divergences).toEqual([
      {
        file: join(root, 'commands.sha256'),
        expected: '0'.repeat(64),
        actual: sha256Bytes(Buffer.from('{"kind":"header"}\n', 'utf8')),
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
    delete rest['events.golden.jsonl'];
    await writeFile(join(root, 'hashes.md'), hashesMarkdown(rest));

    const result = await checkPublishedHashes(root);

    expect(result.ok).toBe(false);
    if (result.ok || result.kind !== 'invalid-input') return;
    expect(result.errors).toContain('hashes.md is missing events.golden.jsonl');
  });
});
