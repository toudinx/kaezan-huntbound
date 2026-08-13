import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  type LockedSourceFile,
  type SourceSnapshotLock,
  verifySourceLock,
} from './sourceLock';

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function createSnapshot(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), 'huntbound-source-lock-'));
  temporaryRoots.push(root);

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = join(root, ...relativePath.split('/'));
    mkdirSync(join(filePath, '..'), { recursive: true });
    writeFileSync(filePath, contents, 'utf8');
  }

  execFileSync('git', ['init', '--quiet', root]);
  execFileSync('git', [
    '-C',
    root,
    'config',
    'user.email',
    'tests@huntbound.invalid',
  ]);
  execFileSync('git', ['-C', root, 'config', 'user.name', 'Huntbound Tests']);
  execFileSync('git', ['-C', root, 'config', 'core.autocrlf', 'false']);
  execFileSync('git', ['-C', root, 'add', '--all']);
  execFileSync('git', [
    '-C',
    root,
    '-c',
    'commit.gpgsign=false',
    'commit',
    '--quiet',
    '-m',
    'synthetic snapshot',
  ]);

  const commit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim();

  return { root, commit };
}

function sourceFile(
  relativePath: string,
  purpose: LockedSourceFile['purpose'] = 'creature',
): LockedSourceFile {
  return {
    relativePath,
    purpose,
    sha256: '0'.repeat(64),
  };
}

function lockFor(
  commit: string,
  files: readonly LockedSourceFile[],
): SourceSnapshotLock {
  return {
    sourceSystem: 'canary',
    commit,
    license: 'GPL-2.0-only',
    licensePath: 'LICENSE',
    licenseSha256: '0'.repeat(64),
    files,
  };
}

function hashFor(contents: string): string {
  return createHash('sha256').update(contents, 'utf8').digest('hex');
}

describe('source lock verification', () => {
  it('accepts a matching snapshot without changing its files', () => {
    const snapshot = createSnapshot({
      LICENSE: 'Synthetic license marker\n',
      'data/creature.lua': 'fixture creature\n',
    });
    const fileBefore = readFileSync(join(snapshot.root, 'data/creature.lua'));
    const statBefore = lstatSync(join(snapshot.root, 'data/creature.lua'));
    const lock = {
      ...lockFor(snapshot.commit, [
        {
          ...sourceFile('data/creature.lua'),
          sha256: hashFor('fixture creature\n'),
        },
      ]),
      licenseSha256: hashFor('Synthetic license marker\n'),
    } as unknown as SourceSnapshotLock;

    expect(verifySourceLock(snapshot.root, lock)).toEqual([]);
    expect(readFileSync(join(snapshot.root, 'data/creature.lua'))).toEqual(
      fileBefore,
    );
    expect(lstatSync(join(snapshot.root, 'data/creature.lua')).mtimeMs).toBe(
      statBefore.mtimeMs,
    );
  });

  it('reports a source hash mismatch with the affected path', () => {
    const snapshot = createSnapshot({
      LICENSE: 'license\n',
      'data/creature.lua': 'actual\n',
    });
    const diagnostics = verifySourceLock(
      snapshot.root,
      lockFor(snapshot.commit, [sourceFile('data/creature.lua')]),
    );

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'source-lock.hash-mismatch',
          sourcePath: 'data/creature.lua',
        }),
        expect.objectContaining({ code: 'source-lock.license-hash-mismatch' }),
      ]),
    );
  });

  it('reports a commit mismatch independently of file hashes', () => {
    const snapshot = createSnapshot({
      LICENSE: 'license\n',
      'data/creature.lua': 'actual\n',
    });
    const lock = {
      ...lockFor(snapshot.commit.replace(/^./, 'f'), [
        {
          ...sourceFile('data/creature.lua'),
          sha256: hashFor('actual\n'),
        },
      ]),
      licenseSha256: hashFor('license\n'),
    } as SourceSnapshotLock;

    expect(verifySourceLock(snapshot.root, lock)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'source-lock.commit-mismatch',
        }),
      ]),
    );
  });

  it('reports every missing source file in one verification pass', () => {
    const snapshot = createSnapshot({ LICENSE: 'license\n' });
    const lock = {
      ...lockFor(snapshot.commit, [
        sourceFile('data/missing-a.lua'),
        sourceFile('data/missing-b.lua'),
      ]),
      licenseSha256: hashFor('license\n'),
    } satisfies SourceSnapshotLock;

    const diagnostics = verifySourceLock(snapshot.root, lock);

    expect(
      diagnostics.filter(
        (diagnostic) => diagnostic.code === 'source-lock.missing-file',
      ),
    ).toEqual([
      expect.objectContaining({ sourcePath: 'data/missing-a.lua' }),
      expect.objectContaining({ sourcePath: 'data/missing-b.lua' }),
    ]);
  });

  it('rejects unsafe paths, normalized duplicates, escaping junctions, and directories', () => {
    const snapshot = createSnapshot({
      LICENSE: 'license\n',
      'data/creature.lua': 'actual\n',
      'data/other.lua': 'other\n',
      directory: 'not a directory',
    });
    const outside = mkdtempSync(
      join(tmpdir(), 'huntbound-source-lock-outside-'),
    );
    temporaryRoots.push(outside);
    writeFileSync(join(outside, 'secret.lua'), 'outside\n', 'utf8');
    mkdirSync(join(snapshot.root, 'linked'), { recursive: false });
    rmSync(join(snapshot.root, 'linked'), { recursive: true, force: true });
    symlinkSync(outside, join(snapshot.root, 'linked'), 'junction');
    mkdirSync(join(snapshot.root, 'folder'));

    const lock = {
      ...lockFor(snapshot.commit, [
        sourceFile('/absolute.lua'),
        sourceFile('../outside.lua'),
        sourceFile('data/./creature.lua'),
        sourceFile('data/creature.lua'),
        sourceFile('linked/secret.lua'),
        sourceFile('folder'),
      ]),
      licenseSha256: hashFor('license\n'),
    } satisfies SourceSnapshotLock;

    const diagnostics = verifySourceLock(snapshot.root, lock);

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        'source-lock.invalid-path',
        'source-lock.duplicate-path',
        'source-lock.path-escapes-root',
        'source-lock.non-regular-file',
      ]),
    );
  });

  it('applies path confinement and hash verification to the license', () => {
    const snapshot = createSnapshot({
      LICENSE: 'license\n',
      'data/creature.lua': 'actual\n',
    });
    const lock = {
      ...lockFor(snapshot.commit, [
        {
          ...sourceFile('data/creature.lua'),
          sha256: hashFor('actual\n'),
        },
      ]),
      licensePath: 'data/creature.lua',
      licenseSha256: 'f'.repeat(64),
    } as unknown as SourceSnapshotLock;

    expect(verifySourceLock(snapshot.root, lock)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'source-lock.license-hash-mismatch' }),
      ]),
    );
  });
});
