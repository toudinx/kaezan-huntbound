import type {
  AssetCategory,
  AssetDiagnostic,
  AssetDiagnosticCode,
  AssetKey,
  AssetSelectionEntry,
  AssetSelectionManifest,
  AssetSourceIdentity,
  AssetValidationResult,
} from '@huntbound/assets';

export interface ArenaFableAnimationGroup {
  readonly kind: string;
  readonly patternX: number;
  readonly patternY: number;
  readonly patternZ: number;
  readonly layers: number;
  readonly phases: readonly (readonly [number, number])[];
  readonly start: number;
  readonly count: number;
}

export interface ArenaFableSourceEntry {
  readonly file: string;
  readonly cellW: number;
  readonly cellH: number;
  readonly cols: number;
  readonly groups: readonly ArenaFableAnimationGroup[];
}

export interface ArenaFableSourceManifest {
  readonly outfits: Readonly<Record<string, ArenaFableSourceEntry>>;
  readonly objects: Readonly<Record<string, ArenaFableSourceEntry>>;
  readonly effects: Readonly<Record<string, ArenaFableSourceEntry>>;
  readonly missiles: Readonly<Record<string, ArenaFableSourceEntry>>;
}

export interface SelectedSourceEntry {
  readonly selection: AssetSelectionEntry;
  readonly sourcePath: string;
  readonly source: ArenaFableSourceEntry;
}

type SourceMapName = keyof ArenaFableSourceManifest;
type UnknownRecord = Record<string, unknown>;

const sourceMapNames: readonly SourceMapName[] = [
  'outfits',
  'objects',
  'effects',
  'missiles',
];

const sourceEntryFields = new Set([
  'name',
  'file',
  'cellW',
  'cellH',
  'cols',
  'groups',
  'flags',
]);

const sourceGroupFields = new Set([
  'kind',
  'patternX',
  'patternY',
  'patternZ',
  'layers',
  'phases',
  'start',
  'count',
]);

const ignoredTopLevelFields = new Set(['semantic', 'objectNames']);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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
  key?: AssetKey,
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

function hasOnlyFields(
  value: UnknownRecord,
  fields: ReadonlySet<string>,
  path: readonly (string | number)[],
): readonly AssetDiagnostic[] {
  return Object.keys(value)
    .filter((field) => !fields.has(field))
    .map((field) =>
      diagnostic(
        'ASSET_SCHEMA_INVALID',
        [...path, field],
        `Unknown field ${field}`,
      ),
    );
}

function readString(
  value: UnknownRecord,
  field: string,
  path: readonly (string | number)[],
  diagnostics: AssetDiagnostic[],
): string | undefined {
  const candidate = value[field];
  if (typeof candidate !== 'string') {
    diagnostics.push(
      diagnostic('ASSET_SCHEMA_INVALID', [...path, field], 'Expected a string'),
    );
    return undefined;
  }
  return candidate;
}

function readInteger(
  value: UnknownRecord,
  field: string,
  path: readonly (string | number)[],
  diagnostics: AssetDiagnostic[],
  options: { readonly positive: boolean } = { positive: false },
): number | undefined {
  const candidate = value[field];
  if (
    typeof candidate !== 'number' ||
    !Number.isFinite(candidate) ||
    !Number.isInteger(candidate) ||
    (options.positive ? candidate <= 0 : candidate < 0)
  ) {
    diagnostics.push(
      diagnostic(
        'ASSET_SCHEMA_INVALID',
        [...path, field],
        options.positive
          ? 'Expected a positive integer'
          : 'Expected a non-negative integer',
      ),
    );
    return undefined;
  }
  return candidate;
}

function parsePhases(
  value: unknown,
  path: readonly (string | number)[],
  diagnostics: AssetDiagnostic[],
): readonly (readonly [number, number])[] {
  if (!Array.isArray(value)) {
    diagnostics.push(
      diagnostic(
        'ASSET_SCHEMA_INVALID',
        path,
        'Expected an array of duration ranges',
      ),
    );
    return [];
  }

  const phases: [number, number][] = [];
  value.forEach((candidate, index) => {
    if (
      !Array.isArray(candidate) ||
      candidate.length !== 2 ||
      candidate.some(
        (phase) =>
          typeof phase !== 'number' ||
          !Number.isFinite(phase) ||
          !Number.isInteger(phase) ||
          phase < 0,
      )
    ) {
      diagnostics.push(
        diagnostic(
          'ASSET_ANIMATION_INVALID',
          [...path, index],
          'Expected a non-negative integer duration range [min, max]',
        ),
      );
      return;
    }

    const min = candidate[0];
    const max = candidate[1];
    if (min === undefined || max === undefined || min > max) {
      diagnostics.push(
        diagnostic(
          'ASSET_ANIMATION_INVALID',
          [...path, index],
          'Duration range minimum must not exceed maximum',
        ),
      );
      return;
    }
    phases.push([min, max]);
  });
  return phases;
}

function parseGroup(
  value: unknown,
  path: readonly (string | number)[],
  diagnostics: AssetDiagnostic[],
): ArenaFableAnimationGroup | undefined {
  if (!isRecord(value)) {
    diagnostics.push(
      diagnostic('ASSET_SCHEMA_INVALID', path, 'Expected an object'),
    );
    return undefined;
  }

  diagnostics.push(...hasOnlyFields(value, sourceGroupFields, path));
  const kind = readString(value, 'kind', path, diagnostics);
  const patternX = readInteger(value, 'patternX', path, diagnostics);
  const patternY = readInteger(value, 'patternY', path, diagnostics);
  const patternZ = readInteger(value, 'patternZ', path, diagnostics);
  const layers = readInteger(value, 'layers', path, diagnostics, {
    positive: true,
  });
  const phases = parsePhases(value.phases, [...path, 'phases'], diagnostics);
  const start = readInteger(value, 'start', path, diagnostics);
  const count = readInteger(value, 'count', path, diagnostics, {
    positive: true,
  });

  if (
    kind === undefined ||
    patternX === undefined ||
    patternY === undefined ||
    patternZ === undefined ||
    layers === undefined ||
    start === undefined ||
    count === undefined
  ) {
    return undefined;
  }

  return {
    kind,
    patternX,
    patternY,
    patternZ,
    layers,
    phases,
    start,
    count,
  };
}

function parseEntry(
  value: unknown,
  path: readonly (string | number)[],
  diagnostics: AssetDiagnostic[],
): ArenaFableSourceEntry | undefined {
  if (!isRecord(value)) {
    diagnostics.push(
      diagnostic('ASSET_SCHEMA_INVALID', path, 'Expected an object'),
    );
    return undefined;
  }

  diagnostics.push(...hasOnlyFields(value, sourceEntryFields, path));
  const name = readString(value, 'name', path, diagnostics);
  const file = readString(value, 'file', path, diagnostics);
  const cellW = readInteger(value, 'cellW', path, diagnostics, {
    positive: true,
  });
  const cellH = readInteger(value, 'cellH', path, diagnostics, {
    positive: true,
  });
  const cols = readInteger(value, 'cols', path, diagnostics, {
    positive: true,
  });

  if (file !== undefined && !isSafeRelativePath(file)) {
    diagnostics.push(
      diagnostic(
        'ASSET_PATH_UNSAFE',
        [...path, 'file'],
        'Path must be a relative POSIX path without traversal or a scheme',
      ),
    );
  }

  if (!isRecord(value.flags)) {
    diagnostics.push(
      diagnostic(
        'ASSET_SCHEMA_INVALID',
        [...path, 'flags'],
        'Expected an object',
      ),
    );
  }

  const rawGroups = value.groups;
  const groupValues = Array.isArray(rawGroups) ? rawGroups : [rawGroups];
  if (
    rawGroups === undefined ||
    (!Array.isArray(rawGroups) && !isRecord(rawGroups))
  ) {
    diagnostics.push(
      diagnostic(
        'ASSET_SCHEMA_INVALID',
        [...path, 'groups'],
        'Expected a group object or array of group objects',
      ),
    );
  }
  const groups = groupValues.flatMap((group, index) => {
    const parsed = parseGroup(group, [...path, 'groups', index], diagnostics);
    return parsed === undefined ? [] : [parsed];
  });

  if (
    name === undefined ||
    file === undefined ||
    cellW === undefined ||
    cellH === undefined ||
    cols === undefined
  ) {
    return undefined;
  }

  return { file, cellW, cellH, cols, groups };
}

function parseMap(
  value: unknown,
  mapName: SourceMapName,
  diagnostics: AssetDiagnostic[],
): Readonly<Record<string, ArenaFableSourceEntry>> {
  if (!isRecord(value)) {
    diagnostics.push(
      diagnostic('ASSET_SCHEMA_INVALID', [mapName], 'Expected an object map'),
    );
    return {};
  }

  const entries: Record<string, ArenaFableSourceEntry> = {};
  for (const [id, rawEntry] of Object.entries(value)) {
    if (!/^[1-9]\d*$/.test(id)) {
      diagnostics.push(
        diagnostic(
          'ASSET_SCHEMA_INVALID',
          [mapName, id],
          'Map keys must be positive decimal IDs',
        ),
      );
      continue;
    }
    const entry = parseEntry(rawEntry, [mapName, id], diagnostics);
    if (entry !== undefined) {
      entries[id] = entry;
    }
  }
  return entries;
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

function categoryMapMatches(
  category: AssetCategory,
  identity: AssetSourceIdentity,
): boolean {
  switch (identity.kind) {
    case 'lookType':
      return category === 'outfit' || category === 'creature';
    case 'clientId':
      return category === 'object';
    case 'effectId':
      return category === 'effect';
    case 'missileId':
      return category === 'missile';
  }
}

export function parseArenaFableSourceManifest(
  input: unknown,
): AssetValidationResult<ArenaFableSourceManifest> {
  if (!isRecord(input)) {
    return {
      ok: false,
      diagnostics: [
        diagnostic('ASSET_SCHEMA_INVALID', [], 'Expected a manifest object'),
      ],
    };
  }

  const diagnostics = [
    ...hasOnlyFields(
      input,
      new Set([...sourceMapNames, ...ignoredTopLevelFields]),
      [],
    ),
  ];
  for (const ignoredField of ignoredTopLevelFields) {
    if (ignoredField in input && !isRecord(input[ignoredField])) {
      diagnostics.push(
        diagnostic(
          'ASSET_SCHEMA_INVALID',
          [ignoredField],
          'Expected an object',
        ),
      );
    }
  }

  const manifest = {
    outfits: parseMap(input.outfits, 'outfits', diagnostics),
    objects: parseMap(input.objects, 'objects', diagnostics),
    effects: parseMap(input.effects, 'effects', diagnostics),
    missiles: parseMap(input.missiles, 'missiles', diagnostics),
  } satisfies ArenaFableSourceManifest;

  return diagnostics.length > 0
    ? { ok: false, diagnostics: sortDiagnostics(diagnostics) }
    : { ok: true, value: manifest };
}

export function resolveSelectedSourceEntries(
  selection: AssetSelectionManifest,
  source: ArenaFableSourceManifest,
): AssetValidationResult<readonly SelectedSourceEntry[]> {
  const diagnostics: AssetDiagnostic[] = [];
  const resolved: SelectedSourceEntry[] = [];

  for (const entry of selection.entries) {
    const { name, id } = sourceMapForIdentity(entry.sourceIdentity);
    if (!categoryMapMatches(entry.category, entry.sourceIdentity)) {
      diagnostics.push(
        diagnostic(
          'ASSET_CATEGORY_MISMATCH',
          ['entries', selection.entries.indexOf(entry), 'category'],
          `Category ${entry.category} is incompatible with ${entry.sourceIdentity.kind}`,
          entry.key,
        ),
      );
      continue;
    }

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
      continue;
    }

    resolved.push({
      selection: entry,
      sourcePath: sourceEntry.file,
      source: sourceEntry,
    });
  }

  return diagnostics.length > 0
    ? { ok: false, diagnostics: sortDiagnostics(diagnostics) }
    : { ok: true, value: resolved };
}
