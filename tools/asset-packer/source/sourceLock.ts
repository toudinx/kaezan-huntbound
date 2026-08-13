import { createHash } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

import {
  type AssetDiagnostic,
  type AssetDiagnosticCode,
  type AssetSelectionManifest,
  type AssetSourceIdentity,
  type AssetSourceLock,
  type AssetSourceLockEntry,
  type AssetValidationResult,
  validateAssetSourceLock,
} from '@huntbound/assets';

import {
  type ArenaFableSourceManifest,
  parseArenaFableSourceManifest,
  resolveSelectedSourceEntries,
} from './sourceManifest.ts';

interface ResolvedSourceFile {
  readonly path: string;
  readonly diagnostics: readonly AssetDiagnostic[];
}

interface ReadSourceFile {
  readonly path: string;
  readonly bytes: Buffer;
}

type SourceMapName = keyof ArenaFableSourceManifest;

function formatPath(path: readonly (string | number)[]): string {
  return path
    .map((segment) => (typeof segment === 'number' ? `[${segment}]` : segment))
    .join('.')
    .replaceAll('.[', '[');
}

function comparePaths(
  left: readonly (string | number)[],
  right: readonly (string | number)[],
): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftSegment = left[index];
    const rightSegment = right[index];
    if (leftSegment === rightSegment) {
      continue;
    }
    if (typeof leftSegment === 'number' && typeof rightSegment === 'number') {
      return leftSegment - rightSegment;
    }
    return String(leftSegment).localeCompare(String(rightSegment));
  }
  return left.length - right.length;
}

function sortDiagnostics(
  diagnostics: readonly AssetDiagnostic[],
): readonly AssetDiagnostic[] {
  return [...diagnostics].sort((left, right) => {
    const pathOrder = comparePaths(left.path, right.path);
    if (pathOrder !== 0) {
      return pathOrder;
    }
    const codeOrder = left.code.localeCompare(right.code);
    return codeOrder !== 0
      ? codeOrder
      : left.message.localeCompare(right.message);
  });
}

function diagnostic(
  code: AssetDiagnosticCode,
  path: readonly (string | number)[],
  message: string,
  key?: AssetSourceLockEntry['key'],
): AssetDiagnostic {
  return {
    code,
    severity: 'error',
    message: path.length === 0 ? message : `${formatPath(path)}: ${message}`,
    path,
    ...(key === undefined ? {} : { key }),
  };
}

function isSafeRelativePath(value: string): boolean {
  return (
    value.length > 0 &&
    value !== '.' &&
    !value.includes('\\') &&
    !value.startsWith('/') &&
    !/^[a-zA-Z]:/.test(value) &&
    !/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value) &&
    !value.split('/').some((segment) => segment === '..') &&
    !value.includes('//') &&
    !value.endsWith('/')
  );
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

function hashBytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function sourceMapForIdentity(identity: AssetSourceIdentity): {
  readonly name: SourceMapName;
  readonly id: number;
} {
  switch (identity.kind) {
    case 'lookType':
      return { name: 'outfits', id: identity.id };
    case 'clientId':
      return { name: 'objects', id: identity.id };
    case 'effectId':
      return { name: 'effects', id: identity.id };
    case 'missileId':
      return { name: 'missiles', id: identity.id };
  }
}

function sourcePathDiagnosticPath(sourcePath: string): readonly string[] {
  return sourcePath.split('/');
}

async function resolveSourceRoot(sourceRoot: string): Promise<{
  readonly path?: string;
  readonly diagnostics: readonly AssetDiagnostic[];
}> {
  try {
    const rootPath = await realpath(sourceRoot);
    if (!(await stat(rootPath)).isDirectory()) {
      return {
        diagnostics: [
          diagnostic(
            'ASSET_MEDIA_MISSING',
            [],
            'Source root is not a directory',
          ),
        ],
      };
    }
    return { path: rootPath, diagnostics: [] };
  } catch {
    return {
      diagnostics: [
        diagnostic('ASSET_MEDIA_MISSING', [], 'Source root cannot be resolved'),
      ],
    };
  }
}

async function resolveSourceFile(
  rootPath: string,
  sourcePath: string,
): Promise<ResolvedSourceFile> {
  const path = sourcePathDiagnosticPath(sourcePath);
  if (!isSafeRelativePath(sourcePath)) {
    return {
      path: '',
      diagnostics: [
        diagnostic(
          'ASSET_PATH_UNSAFE',
          path,
          'Path must be a relative POSIX path without traversal or a scheme',
        ),
      ],
    };
  }

  let realPath: string;
  try {
    realPath = await realpath(resolve(rootPath, ...sourcePath.split('/')));
  } catch {
    return {
      path: '',
      diagnostics: [
        diagnostic('ASSET_MEDIA_MISSING', path, 'Source file does not exist'),
      ],
    };
  }

  if (!isWithinRoot(rootPath, realPath)) {
    return {
      path: '',
      diagnostics: [
        diagnostic(
          'ASSET_PATH_UNSAFE',
          path,
          'Source path resolves outside the source root',
        ),
      ],
    };
  }

  try {
    if (!(await stat(realPath)).isFile()) {
      return {
        path: '',
        diagnostics: [
          diagnostic(
            'ASSET_MEDIA_MISSING',
            path,
            'Source path is not a regular file',
          ),
        ],
      };
    }
  } catch {
    return {
      path: '',
      diagnostics: [
        diagnostic(
          'ASSET_MEDIA_MISSING',
          path,
          'Source file cannot be inspected',
        ),
      ],
    };
  }

  return { path: realPath, diagnostics: [] };
}

async function readResolvedSourceFile(
  rootPath: string,
  sourcePath: string,
  diagnostics: AssetDiagnostic[],
): Promise<ReadSourceFile | undefined> {
  const resolved = await resolveSourceFile(rootPath, sourcePath);
  diagnostics.push(...resolved.diagnostics);
  if (resolved.path.length === 0) {
    return undefined;
  }

  try {
    return { path: resolved.path, bytes: await readFile(resolved.path) };
  } catch {
    diagnostics.push(
      diagnostic(
        'ASSET_MEDIA_MISSING',
        sourcePathDiagnosticPath(sourcePath),
        'Source file cannot be read',
      ),
    );
    return undefined;
  }
}

function invalidJsonDiagnostic(path: readonly string[]): AssetDiagnostic {
  return diagnostic('ASSET_SCHEMA_INVALID', path, 'Manifest is not valid JSON');
}

async function readAndParseManifest(
  rootPath: string,
  diagnostics: AssetDiagnostic[],
): Promise<
  | {
      readonly source: ArenaFableSourceManifest;
      readonly bytes: Buffer;
    }
  | undefined
> {
  const file = await readResolvedSourceFile(
    rootPath,
    'manifest.json',
    diagnostics,
  );
  if (file === undefined) {
    return undefined;
  }

  let input: unknown;
  try {
    input = JSON.parse(file.bytes.toString('utf8')) as unknown;
  } catch {
    diagnostics.push(invalidJsonDiagnostic(['manifest.json']));
    return undefined;
  }

  const parsed = parseArenaFableSourceManifest(input);
  if (!parsed.ok) {
    diagnostics.push(...parsed.diagnostics);
    return undefined;
  }
  return { source: parsed.value, bytes: file.bytes };
}

async function resolveRootAndManifest(
  sourceRoot: string,
  diagnostics: AssetDiagnostic[],
): Promise<
  | {
      readonly rootPath: string;
      readonly source: ArenaFableSourceManifest;
      readonly manifestBytes: Buffer;
    }
  | undefined
> {
  const root = await resolveSourceRoot(sourceRoot);
  diagnostics.push(...root.diagnostics);
  if (root.path === undefined) {
    return undefined;
  }

  const manifest = await readAndParseManifest(root.path, diagnostics);
  if (manifest === undefined) {
    return undefined;
  }
  return {
    rootPath: root.path,
    source: manifest.source,
    manifestBytes: manifest.bytes,
  };
}

function validateLock(
  lock: AssetSourceLock,
): AssetValidationResult<AssetSourceLock> {
  return validateAssetSourceLock(lock);
}

export async function createAssetSourceLock(input: {
  readonly sourceRoot: string;
  readonly selection: AssetSelectionManifest;
  readonly source: string;
  readonly sourceSnapshot: string;
}): Promise<AssetValidationResult<AssetSourceLock>> {
  const diagnostics: AssetDiagnostic[] = [];
  const resolved = await resolveRootAndManifest(input.sourceRoot, diagnostics);
  if (resolved === undefined) {
    return { ok: false, diagnostics: sortDiagnostics(diagnostics) };
  }

  const selected = resolveSelectedSourceEntries(
    input.selection,
    resolved.source,
  );
  if (!selected.ok) {
    return {
      ok: false,
      diagnostics: sortDiagnostics([...diagnostics, ...selected.diagnostics]),
    };
  }

  const files: AssetSourceLockEntry[] = [];
  const orderedEntries = [...selected.value].sort((left, right) =>
    left.selection.key.localeCompare(right.selection.key),
  );
  for (const selectedEntry of orderedEntries) {
    const file = await readResolvedSourceFile(
      resolved.rootPath,
      selectedEntry.sourcePath,
      diagnostics,
    );
    if (file === undefined) {
      continue;
    }
    files.push({
      key: selectedEntry.selection.key,
      category: selectedEntry.selection.category,
      sourceIdentity: selectedEntry.selection.sourceIdentity,
      path: selectedEntry.sourcePath,
      sha256: hashBytes(file.bytes),
      byteLength: file.bytes.byteLength,
    });
  }

  if (diagnostics.length > 0) {
    return { ok: false, diagnostics: sortDiagnostics(diagnostics) };
  }

  const lock = {
    schemaVersion: '1',
    source: input.source,
    sourceSnapshot: input.sourceSnapshot,
    manifest: {
      path: 'manifest.json',
      sha256: hashBytes(resolved.manifestBytes),
      byteLength: resolved.manifestBytes.byteLength,
    },
    files,
  } satisfies AssetSourceLock;
  return validateLock(lock);
}

async function verifyLockedFile(
  rootPath: string,
  sourcePath: string,
  expectedHash: string,
  expectedByteLength: number,
  diagnostics: AssetDiagnostic[],
): Promise<void> {
  const file = await readResolvedSourceFile(rootPath, sourcePath, diagnostics);
  if (file === undefined) {
    return;
  }
  const path = sourcePathDiagnosticPath(sourcePath);
  if (file.bytes.byteLength !== expectedByteLength) {
    diagnostics.push(
      diagnostic(
        'ASSET_MEDIA_SIZE_MISMATCH',
        path,
        `Expected ${expectedByteLength} bytes, got ${file.bytes.byteLength}`,
      ),
    );
  }
  const actualHash = hashBytes(file.bytes);
  if (actualHash !== expectedHash) {
    diagnostics.push(
      diagnostic(
        'ASSET_MEDIA_HASH_MISMATCH',
        path,
        `Expected ${expectedHash}, got ${actualHash}`,
      ),
    );
  }
}

function verifyManifestEntry(
  source: ArenaFableSourceManifest,
  entry: AssetSourceLockEntry,
  diagnostics: AssetDiagnostic[],
): void {
  const { name, id } = sourceMapForIdentity(entry.sourceIdentity);
  const sourceEntry = source[name][String(id)];
  if (sourceEntry === undefined) {
    diagnostics.push(
      diagnostic(
        'ASSET_REFERENCE_MISSING',
        [name, String(id)],
        `Source identity ${entry.sourceIdentity.kind}:${id} was not found`,
        entry.key,
      ),
    );
    return;
  }
  if (sourceEntry.file !== entry.path) {
    diagnostics.push(
      diagnostic(
        'ASSET_REFERENCE_MISSING',
        [name, String(id)],
        `Source path changed from ${entry.path} to ${sourceEntry.file}`,
        entry.key,
      ),
    );
  }
}

export async function verifyAssetSourceLock(input: {
  readonly sourceRoot: string;
  readonly lock: AssetSourceLock;
}): Promise<AssetValidationResult<AssetSourceLock>> {
  const validation = validateLock(input.lock);
  if (!validation.ok) {
    return validation;
  }

  const diagnostics: AssetDiagnostic[] = [];
  const resolved = await resolveRootAndManifest(input.sourceRoot, diagnostics);
  if (resolved === undefined) {
    return { ok: false, diagnostics: sortDiagnostics(diagnostics) };
  }

  if (input.lock.manifest.path !== 'manifest.json') {
    diagnostics.push(
      diagnostic(
        'ASSET_SCHEMA_INVALID',
        ['manifest', 'path'],
        'Source lock manifest path must be manifest.json',
      ),
    );
  }
  if (hashBytes(resolved.manifestBytes) !== input.lock.manifest.sha256) {
    diagnostics.push(
      diagnostic(
        'ASSET_MEDIA_HASH_MISMATCH',
        ['manifest.json'],
        `Expected ${input.lock.manifest.sha256}, got ${hashBytes(resolved.manifestBytes)}`,
      ),
    );
  }
  if (resolved.manifestBytes.byteLength !== input.lock.manifest.byteLength) {
    diagnostics.push(
      diagnostic(
        'ASSET_MEDIA_SIZE_MISMATCH',
        ['manifest.json'],
        `Expected ${input.lock.manifest.byteLength} bytes, got ${resolved.manifestBytes.byteLength}`,
      ),
    );
  }

  const orderedFiles = [...input.lock.files].sort((left, right) =>
    left.key.localeCompare(right.key),
  );
  for (const entry of orderedFiles) {
    verifyManifestEntry(resolved.source, entry, diagnostics);
    await verifyLockedFile(
      resolved.rootPath,
      entry.path,
      entry.sha256,
      entry.byteLength,
      diagnostics,
    );
  }

  return diagnostics.length > 0
    ? { ok: false, diagnostics: sortDiagnostics(diagnostics) }
    : { ok: true, value: input.lock };
}
