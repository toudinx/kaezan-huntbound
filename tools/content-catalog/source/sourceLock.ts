import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, posix, relative, resolve, sep } from 'node:path';

import type { ContentDiagnostic } from '@huntbound/contracts';

export interface LockedSourceFile {
  readonly relativePath: string;
  readonly sha256: string;
  readonly purpose: 'vocations' | 'items' | 'spell' | 'creature';
}

export interface SourceSnapshotLock {
  readonly sourceSystem: 'canary';
  readonly commit: string;
  readonly license: 'GPL-2.0-only';
  readonly licensePath: 'LICENSE';
  readonly licenseSha256: string;
  readonly files: readonly LockedSourceFile[];
}

const sha256Pattern = /^[0-9a-f]{64}$/;
const windowsDrivePattern = /^[a-zA-Z]:/;

function diagnostic(
  code: string,
  message: string,
  sourcePath?: string,
): ContentDiagnostic {
  return {
    code,
    severity: 'error',
    message,
    ...(sourcePath === undefined ? {} : { sourcePath }),
  };
}

function normalizeRelativePath(input: string): string | undefined {
  if (
    input.length === 0 ||
    input.includes('\\') ||
    input.startsWith('/') ||
    windowsDrivePattern.test(input)
  ) {
    return undefined;
  }

  const normalized = posix.normalize(input);
  if (
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    normalized.startsWith('/')
  ) {
    return undefined;
  }
  return normalized;
}

function isWithinRoot(rootPath: string, candidatePath: string): boolean {
  const pathFromRoot = relative(rootPath, candidatePath);
  return (
    pathFromRoot.length === 0 ||
    (!pathFromRoot.startsWith(`..${sep}`) &&
      pathFromRoot !== '..' &&
      !isAbsolute(pathFromRoot))
  );
}

function hashFile(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function readSnapshotCommit(snapshotRoot: string): string | undefined {
  try {
    return execFileSync('git', ['-C', snapshotRoot, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return undefined;
  }
}

interface ResolvedSourceFile {
  readonly path: string;
  readonly diagnostics: readonly ContentDiagnostic[];
}

function resolveSourceFile(
  snapshotRoot: string,
  rootRealPath: string,
  relativePath: string,
): ResolvedSourceFile {
  const normalizedPath = normalizeRelativePath(relativePath);
  if (normalizedPath === undefined) {
    return {
      path: '',
      diagnostics: [
        diagnostic(
          'source-lock.invalid-path',
          `Path must be a relative POSIX path without parent traversal: ${relativePath}`,
          relativePath,
        ),
      ],
    };
  }

  const candidatePath = resolve(snapshotRoot, ...normalizedPath.split('/'));
  let realPath: string;
  try {
    realPath = realpathSync(candidatePath);
  } catch {
    return {
      path: '',
      diagnostics: [
        diagnostic(
          'source-lock.missing-file',
          `Locked path does not exist: ${relativePath}`,
          relativePath,
        ),
      ],
    };
  }

  if (!isWithinRoot(rootRealPath, realPath)) {
    return {
      path: '',
      diagnostics: [
        diagnostic(
          'source-lock.path-escapes-root',
          `Locked path resolves outside the snapshot root: ${relativePath}`,
          relativePath,
        ),
      ],
    };
  }

  try {
    if (!statSync(realPath).isFile()) {
      return {
        path: '',
        diagnostics: [
          diagnostic(
            'source-lock.non-regular-file',
            `Locked path is not a regular file: ${relativePath}`,
            relativePath,
          ),
        ],
      };
    }
  } catch {
    return {
      path: '',
      diagnostics: [
        diagnostic(
          'source-lock.missing-file',
          `Locked path cannot be inspected: ${relativePath}`,
          relativePath,
        ),
      ],
    };
  }

  return { path: realPath, diagnostics: [] };
}

function verifyHash(
  filePath: string,
  expectedHash: string,
  mismatchCode: string,
  sourcePath: string,
): ContentDiagnostic[] {
  if (!sha256Pattern.test(expectedHash)) {
    return [
      diagnostic(
        'source-lock.invalid-hash',
        `Locked SHA-256 must be 64 lowercase hexadecimal characters: ${sourcePath}`,
        sourcePath,
      ),
    ];
  }

  const actualHash = hashFile(filePath);
  return actualHash === expectedHash
    ? []
    : [
        diagnostic(
          mismatchCode,
          `SHA-256 mismatch for ${sourcePath}: expected ${expectedHash}, got ${actualHash}`,
          sourcePath,
        ),
      ];
}

export function verifySourceLock(
  snapshotRoot: string,
  lock: SourceSnapshotLock,
): readonly ContentDiagnostic[] {
  const diagnostics: ContentDiagnostic[] = [];
  let rootRealPath: string;

  try {
    rootRealPath = realpathSync(snapshotRoot);
    if (!statSync(rootRealPath).isDirectory()) {
      diagnostics.push(
        diagnostic(
          'source-lock.invalid-snapshot-root',
          `Snapshot root is not a directory: ${snapshotRoot}`,
        ),
      );
      return diagnostics;
    }
  } catch {
    return [
      diagnostic(
        'source-lock.invalid-snapshot-root',
        `Snapshot root cannot be resolved: ${snapshotRoot}`,
      ),
    ];
  }

  const actualCommit = readSnapshotCommit(rootRealPath);
  if (actualCommit === undefined) {
    diagnostics.push(
      diagnostic(
        'source-lock.commit-unavailable',
        `Could not read HEAD from the snapshot Git repository: ${snapshotRoot}`,
      ),
    );
  } else if (actualCommit !== lock.commit) {
    diagnostics.push(
      diagnostic(
        'source-lock.commit-mismatch',
        `Snapshot commit mismatch: expected ${lock.commit}, got ${actualCommit}`,
      ),
    );
  }

  if (lock.sourceSystem !== 'canary') {
    diagnostics.push(
      diagnostic(
        'source-lock.invalid-source-system',
        `Source lock system must be canary, got ${String(lock.sourceSystem)}`,
      ),
    );
  }
  if (lock.license !== 'GPL-2.0-only') {
    diagnostics.push(
      diagnostic(
        'source-lock.invalid-license',
        `Source lock license must be GPL-2.0-only, got ${String(lock.license)}`,
      ),
    );
  }
  if (lock.licensePath !== 'LICENSE') {
    diagnostics.push(
      diagnostic(
        'source-lock.license-path-mismatch',
        `Source lock license path must be LICENSE, got ${String(lock.licensePath)}`,
        lock.licensePath,
      ),
    );
  }

  const seenPaths = new Set<string>();
  for (const lockedFile of lock.files) {
    const normalizedPath = normalizeRelativePath(lockedFile.relativePath);
    if (normalizedPath !== undefined) {
      if (seenPaths.has(normalizedPath)) {
        diagnostics.push(
          diagnostic(
            'source-lock.duplicate-path',
            `Source lock contains the path more than once after normalization: ${lockedFile.relativePath}`,
            lockedFile.relativePath,
          ),
        );
        continue;
      }
      seenPaths.add(normalizedPath);
    }

    const resolved = resolveSourceFile(
      snapshotRoot,
      rootRealPath,
      lockedFile.relativePath,
    );
    diagnostics.push(...resolved.diagnostics);
    if (resolved.path.length > 0) {
      diagnostics.push(
        ...verifyHash(
          resolved.path,
          lockedFile.sha256,
          'source-lock.hash-mismatch',
          lockedFile.relativePath,
        ),
      );
    }
  }

  const license = resolveSourceFile(
    snapshotRoot,
    rootRealPath,
    lock.licensePath,
  );
  diagnostics.push(...license.diagnostics);
  if (license.path.length > 0) {
    diagnostics.push(
      ...verifyHash(
        license.path,
        lock.licenseSha256,
        'source-lock.license-hash-mismatch',
        lock.licensePath,
      ),
    );
  }

  return diagnostics;
}
