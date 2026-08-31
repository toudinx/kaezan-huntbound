import type {
  AssetDiagnostic,
  AssetDiagnosticCode,
  AssetKey,
  AssetPackEntry,
  AssetPackManifest,
  AssetSelectionManifest,
  AssetSourceIdentity,
  AssetSourceLock,
  AssetSourceLockEntry,
  AssetValidationResult,
} from '../../../packages/assets/src/index.ts';
import { validateAssetPackManifest } from '../../../packages/assets/src/index.ts';

import type {
  ArenaFableSourceEntry,
  ArenaFableSourceManifest,
} from '../source/sourceManifest.ts';
import { sourceMapForAsset } from '../source/sourceManifest.ts';

export interface BuildAssetPackInput {
  readonly selection: AssetSelectionManifest;
  readonly sourceLock: AssetSourceLock;
  readonly sourceManifest: ArenaFableSourceManifest;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function comparePaths(
  left: readonly (string | number)[],
  right: readonly (string | number)[],
): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftSegment = left[index];
    const rightSegment = right[index];
    if (leftSegment === rightSegment) continue;
    if (typeof leftSegment === 'number' && typeof rightSegment === 'number') {
      return leftSegment - rightSegment;
    }
    return compareText(String(leftSegment), String(rightSegment));
  }
  return left.length - right.length;
}

function sortDiagnostics(
  diagnostics: readonly AssetDiagnostic[],
): readonly AssetDiagnostic[] {
  return [...diagnostics].sort((left, right) => {
    const pathOrder = comparePaths(left.path, right.path);
    if (pathOrder !== 0) return pathOrder;
    const codeOrder = compareText(left.code, right.code);
    return codeOrder !== 0
      ? codeOrder
      : compareText(left.message, right.message);
  });
}

function diagnostic(
  code: AssetDiagnosticCode,
  path: readonly (string | number)[],
  message: string,
  key?: AssetKey,
): AssetDiagnostic {
  return {
    code,
    severity: 'error',
    message,
    path,
    ...(key === undefined ? {} : { key }),
  };
}

function identitiesMatch(
  left: AssetSourceIdentity,
  right: AssetSourceIdentity,
): boolean {
  return left.kind === right.kind && left.id === right.id;
}

function packEntryFromSource(
  selectionEntry: AssetSelectionManifest['entries'][number],
  lockEntry: AssetSourceLockEntry,
  sourceEntry: ArenaFableSourceEntry,
): AssetPackEntry {
  const animations = sourceEntry.groups.map((group) => ({
    kind: group.kind,
    patternX: group.patternX,
    patternY: group.patternY,
    patternZ: group.patternZ,
    layers: group.layers,
    startFrame: group.start,
    frameCount: group.count,
    phaseDurationsMs: group.phases.map(
      ([minimum, maximum]) => [minimum, maximum] as const,
    ),
  }));

  return {
    key: selectionEntry.key,
    category: selectionEntry.category,
    sourceIdentity: selectionEntry.sourceIdentity,
    sourceGroupId: selectionEntry.sourceGroupId,
    media: {
      path: `media/${lockEntry.sha256}.png`,
      sha256: lockEntry.sha256,
      byteLength: lockEntry.byteLength,
      mimeType: 'image/png',
    },
    cellWidth: sourceEntry.cellW,
    cellHeight: sourceEntry.cellH,
    columns: sourceEntry.cols,
    atlasFrameCount: Math.max(
      ...sourceEntry.groups.map((group) => group.start + group.count),
    ),
    animations,
    pivot: selectionEntry.presentation.pivot,
    scale: selectionEntry.presentation.scale,
    filtering: selectionEntry.presentation.filtering,
  };
}

export function buildAssetPackManifest(
  input: BuildAssetPackInput,
): AssetValidationResult<AssetPackManifest> {
  const diagnostics: AssetDiagnostic[] = [];
  const selectionKeys = new Set(input.selection.entries.map(({ key }) => key));
  const lockByKey = new Map<
    AssetKey,
    { readonly entry: AssetSourceLockEntry; readonly index: number }
  >();
  input.sourceLock.files.forEach((entry, index) => {
    lockByKey.set(entry.key, { entry, index });
    if (!selectionKeys.has(entry.key)) {
      diagnostics.push(
        diagnostic(
          'ASSET_REFERENCE_MISSING',
          ['sourceLock', 'files', index, 'key'],
          `Source lock key ${entry.key} is not selected`,
          entry.key,
        ),
      );
    }
  });

  const groupIndexes = new Map(
    input.selection.groups.map((group, index) => [group.groupId, index]),
  );
  for (const group of input.selection.groups) {
    const groupIndex = groupIndexes.get(group.groupId) ?? 0;
    if (group.source !== input.sourceLock.source) {
      diagnostics.push(
        diagnostic(
          'ASSET_REFERENCE_MISSING',
          ['selection', 'groups', groupIndex, 'source'],
          `Source group ${group.groupId} disagrees with the source lock`,
        ),
      );
    }
    if (group.sourceSnapshot !== input.sourceLock.sourceSnapshot) {
      diagnostics.push(
        diagnostic(
          'ASSET_REFERENCE_MISSING',
          ['selection', 'groups', groupIndex, 'sourceSnapshot'],
          `Source group ${group.groupId} snapshot disagrees with the source lock`,
        ),
      );
    }
  }

  const entries: AssetPackEntry[] = [];
  const orderedSelectionEntries = [...input.selection.entries].sort(
    (left, right) => compareText(left.key, right.key),
  );
  for (const selectionEntry of orderedSelectionEntries) {
    const locked = lockByKey.get(selectionEntry.key);
    if (locked === undefined) {
      diagnostics.push(
        diagnostic(
          'ASSET_REFERENCE_MISSING',
          ['sourceLock', 'files'],
          `Source lock is missing ${selectionEntry.key}`,
          selectionEntry.key,
        ),
      );
      continue;
    }

    let lockEntryMatches = true;
    if (locked.entry.category !== selectionEntry.category) {
      diagnostics.push(
        diagnostic(
          'ASSET_CATEGORY_MISMATCH',
          ['sourceLock', 'files', locked.index, 'category'],
          `Source lock category ${locked.entry.category} disagrees with selection category ${selectionEntry.category}`,
          selectionEntry.key,
        ),
      );
      lockEntryMatches = false;
    }
    if (
      !identitiesMatch(
        locked.entry.sourceIdentity,
        selectionEntry.sourceIdentity,
      )
    ) {
      diagnostics.push(
        diagnostic(
          'ASSET_REFERENCE_MISSING',
          ['sourceLock', 'files', locked.index, 'sourceIdentity'],
          `Source lock identity disagrees with ${selectionEntry.key}`,
          selectionEntry.key,
        ),
      );
      lockEntryMatches = false;
    }

    const { name, id } = sourceMapForAsset(
      selectionEntry.category,
      selectionEntry.sourceIdentity,
    );
    const sourceEntry = input.sourceManifest[name][String(id)];
    if (sourceEntry === undefined) {
      diagnostics.push(
        diagnostic(
          'ASSET_REFERENCE_MISSING',
          ['sourceManifest', name, String(id)],
          `Source identity ${selectionEntry.sourceIdentity.kind}:${id} is missing`,
          selectionEntry.key,
        ),
      );
      continue;
    }
    if (sourceEntry.file !== locked.entry.path) {
      diagnostics.push(
        diagnostic(
          'ASSET_REFERENCE_MISSING',
          ['sourceLock', 'files', locked.index, 'path'],
          `Source path ${sourceEntry.file} disagrees with locked path ${locked.entry.path}`,
          selectionEntry.key,
        ),
      );
      lockEntryMatches = false;
    }
    if (sourceEntry.groups.length === 0) {
      diagnostics.push(
        diagnostic(
          'ASSET_ANIMATION_INVALID',
          ['sourceManifest', name, String(id), 'groups'],
          `Source identity ${selectionEntry.sourceIdentity.kind}:${id} has no animation groups`,
          selectionEntry.key,
        ),
      );
      continue;
    }
    if (lockEntryMatches) {
      entries.push(
        packEntryFromSource(selectionEntry, locked.entry, sourceEntry),
      );
    }
  }

  if (diagnostics.length > 0) {
    return { ok: false, diagnostics: sortDiagnostics(diagnostics) };
  }

  return validateAssetPackManifest({
    schemaVersion: '1',
    packId: input.selection.packId,
    contentVersion: input.selection.contentVersion,
    groups: [...input.selection.groups]
      .sort((left, right) => compareText(left.groupId, right.groupId))
      .map((group) => ({
        ...group,
        buildProfiles: [...group.buildProfiles].sort(compareText),
      })),
    entries,
  });
}

function canonicalizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJsonValue);
  }
  if (value !== null && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort(compareText)) {
      const child = canonicalizeJsonValue(
        (value as Record<string, unknown>)[key],
      );
      if (child !== undefined) output[key] = child;
    }
    return output;
  }
  return value;
}

export function canonicalAssetJson(value: unknown): string {
  const serialized = JSON.stringify(canonicalizeJsonValue(value));
  if (serialized === undefined) {
    throw new TypeError('Asset JSON root must be serializable');
  }
  return `${serialized}\n`;
}
