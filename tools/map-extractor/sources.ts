import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, posix, relative, resolve, sep } from 'node:path';

import type {
  LockedSourceFile,
  SourceSnapshotLock,
} from '../../packages/content/src/application/sourceLockTypes.ts';
import type { HuntSelectionSource } from '../hunt-selection/types.ts';

/**
 * Provenance of the two snapshot files one hunt is extracted from.
 *
 * The hunt selection names its own map and spawn declaration, and the source
 * lock freezes their digests. Nothing here is global: several hunts can come
 * from several maps at once, and adding a hunt is a selection file plus its lock
 * entries, never a code change.
 */
export type HuntSourcePurpose = 'map' | 'spawn';

export interface HuntSourceDiagnostic {
  readonly path: string;
  readonly code:
    | 'HUNT_SOURCE_NOT_LOCKED'
    | 'HUNT_SOURCE_AMBIGUOUS'
    | 'HUNT_SOURCE_MISSING'
    | 'HUNT_SOURCE_PATH_INVALID'
    | 'HUNT_SOURCE_HASH_MISMATCH';
  readonly message: string;
}

export interface ResolvedHuntSource {
  readonly purpose: HuntSourcePurpose;
  readonly relativePath: string;
  readonly sha256: string;
  readonly bytes: Uint8Array;
  /** The same bytes as latin1 text; the snapshot XML is ISO-8859-1. */
  readonly text: string;
}

export type HuntSourcesResult =
  | {
      readonly ok: true;
      readonly map: ResolvedHuntSource;
      readonly spawn: ResolvedHuntSource;
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly HuntSourceDiagnostic[];
    };

export interface ResolveHuntSourcesOptions {
  /** Only the fixtures that discover a digest turn this off. */
  readonly verifyHashes?: boolean;
}

const windowsDrivePattern = /^[a-zA-Z]:/;

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
  return normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    normalized.startsWith('/')
    ? undefined
    : normalized;
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

function diagnostic(
  path: string,
  code: HuntSourceDiagnostic['code'],
  message: string,
): HuntSourceDiagnostic {
  return { path, code, message };
}

/** Finds the lock entry that freezes exactly the path the selection asked for. */
function pickByPath(
  files: readonly LockedSourceFile[],
  purpose: HuntSourcePurpose,
  requestedPath: string,
): LockedSourceFile | HuntSourceDiagnostic {
  const normalized = normalizeRelativePath(requestedPath);
  if (normalized === undefined) {
    return diagnostic(
      `sources.${purpose}`,
      'HUNT_SOURCE_PATH_INVALID',
      `Selection ${purpose} must be relative and inside the snapshot: ${requestedPath}`,
    );
  }

  const matches = files.filter(
    (file) => normalizeRelativePath(file.relativePath) === normalized,
  );
  const [first] = matches;
  if (first === undefined) {
    return diagnostic(
      `sources.${purpose}`,
      'HUNT_SOURCE_NOT_LOCKED',
      `The content source lock does not freeze the selected ${purpose}: ${normalized}`,
    );
  }
  if (matches.length > 1) {
    return diagnostic(
      `sources.${purpose}`,
      'HUNT_SOURCE_AMBIGUOUS',
      `The content source lock freezes ${normalized} ${matches.length} times`,
    );
  }
  if (first.purpose !== purpose) {
    return diagnostic(
      `sources.${purpose}`,
      'HUNT_SOURCE_NOT_LOCKED',
      `${normalized} is locked with purpose ${first.purpose}, not ${purpose}`,
    );
  }
  return first;
}

function readLockedFile(
  locked: LockedSourceFile,
  purpose: HuntSourcePurpose,
  snapshotRoot: string,
  rootRealPath: string,
  verifyHashes: boolean,
): ResolvedHuntSource | HuntSourceDiagnostic {
  const path = `sources.${purpose}`;
  const normalized = normalizeRelativePath(locked.relativePath);
  if (normalized === undefined) {
    return diagnostic(
      path,
      'HUNT_SOURCE_PATH_INVALID',
      `Locked path must be relative and inside the snapshot: ${locked.relativePath}`,
    );
  }

  const candidate = resolve(snapshotRoot, ...normalized.split('/'));
  let realPath: string;
  try {
    realPath = realpathSync(candidate);
  } catch {
    return diagnostic(
      path,
      'HUNT_SOURCE_MISSING',
      `Locked ${purpose} is absent from the snapshot: ${locked.relativePath}`,
    );
  }
  if (!isWithinRoot(rootRealPath, realPath)) {
    return diagnostic(
      path,
      'HUNT_SOURCE_PATH_INVALID',
      `Locked path resolves outside the snapshot root: ${locked.relativePath}`,
    );
  }
  if (!statSync(realPath).isFile()) {
    return diagnostic(
      path,
      'HUNT_SOURCE_MISSING',
      `Locked ${purpose} is not a regular file: ${locked.relativePath}`,
    );
  }

  const buffer = readFileSync(realPath);
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  if (verifyHashes && sha256 !== locked.sha256) {
    return diagnostic(
      path,
      'HUNT_SOURCE_HASH_MISMATCH',
      `SHA-256 mismatch for ${locked.relativePath}: lock says ${locked.sha256}, snapshot has ${sha256}`,
    );
  }

  return {
    purpose,
    relativePath: normalized,
    sha256,
    bytes: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
    text: buffer.toString('latin1'),
  };
}

function isDiagnostic(
  value: ResolvedHuntSource | LockedSourceFile | HuntSourceDiagnostic,
): value is HuntSourceDiagnostic {
  return 'code' in value;
}

/**
 * Locates and verifies the map and spawn declaration one hunt selection names.
 *
 * Every palette id in the extracted region traces back to these two files plus
 * `tile-flags.json`, whose own sources — `appearances.dat` and `items.xml` —
 * the same lock already freezes.
 */
export function resolveHuntSources(
  lock: SourceSnapshotLock,
  snapshotRoot: string,
  selectionSource: HuntSelectionSource,
  options: ResolveHuntSourcesOptions = {},
): HuntSourcesResult {
  const verifyHashes = options.verifyHashes ?? true;
  const diagnostics: HuntSourceDiagnostic[] = [];

  let rootRealPath: string;
  try {
    rootRealPath = realpathSync(snapshotRoot);
  } catch {
    return {
      ok: false,
      diagnostics: [
        diagnostic(
          'sources',
          'HUNT_SOURCE_MISSING',
          `Snapshot root cannot be resolved: ${snapshotRoot}`,
        ),
      ],
    };
  }

  const requested: Readonly<Record<HuntSourcePurpose, string>> = {
    map: selectionSource.map,
    spawn: selectionSource.spawns,
  };
  const resolved = new Map<HuntSourcePurpose, ResolvedHuntSource>();
  for (const purpose of ['map', 'spawn'] as const) {
    const locked = pickByPath(lock.files, purpose, requested[purpose]);
    if (isDiagnostic(locked)) {
      diagnostics.push(locked);
      continue;
    }
    const source = readLockedFile(
      locked,
      purpose,
      snapshotRoot,
      rootRealPath,
      verifyHashes,
    );
    if (isDiagnostic(source)) {
      diagnostics.push(source);
      continue;
    }
    resolved.set(purpose, source);
  }

  const map = resolved.get('map');
  const spawn = resolved.get('spawn');
  if (diagnostics.length > 0 || map === undefined || spawn === undefined) {
    return { ok: false, diagnostics };
  }
  return { ok: true, map, spawn };
}
