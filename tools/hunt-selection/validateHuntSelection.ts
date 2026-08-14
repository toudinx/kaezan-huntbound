import { parseXmlRoot } from '../../packages/content/src/importers/canary/xml/xmlDiagnostics.ts';
import {
  asXmlElements,
  xmlAttribute,
} from '../../packages/content/src/importers/canary/xml/xmlTypes.ts';
import type {
  HuntSelectionDiagnostic,
  HuntSelectionExcludedCreature,
  HuntSelectionReport,
} from './types.ts';

type UnknownRecord = Record<string, unknown>;

export type SpawntimeConversion =
  | { readonly ok: true; readonly ticks: number }
  | {
      readonly ok: false;
      readonly reason: 'non-numeric' | 'not-divisible';
    };

interface ParsedSpawn {
  readonly groupIndex: number;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly spawntime: unknown;
}

interface SelectionData {
  readonly source: { readonly map: unknown; readonly spawns: unknown };
  readonly region: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
    readonly floors: readonly number[];
  };
  readonly creatures: readonly string[];
  readonly excludedCreatures: readonly HuntSelectionExcludedCreature[];
  readonly expectedSpawnGroups: number | undefined;
  readonly expectedSpawnSlots: number | undefined;
  readonly budget: {
    readonly maxFloors: number;
    readonly maxWidth: number;
    readonly maxHeight: number;
  };
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asInteger(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) ? value : undefined;
  }
  if (typeof value !== 'string' || !/^-?\d+$/.test(value.trim())) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function asIntegerOrZero(value: unknown): number {
  return asInteger(value) ?? 0;
}

function asStringList(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function normalizeCreatureName(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase();
}

function selectionData(input: unknown): SelectionData {
  const root = isRecord(input) ? input : {};
  const rawRegion = isRecord(root.region) ? root.region : {};
  const rawBudget = isRecord(root.budget) ? root.budget : {};
  const excludedCreatures = Array.isArray(root.excludedCreatures)
    ? root.excludedCreatures.flatMap((item) => {
        if (!isRecord(item)) return [];
        const name = asString(item.name);
        const reason = asString(item.reason);
        const count = asInteger(item.count);
        return name !== undefined && reason !== undefined && count !== undefined
          ? [{ name, reason, count }]
          : [];
      })
    : [];

  const rawSource = isRecord(root.source) ? root.source : {};

  return {
    source: { map: rawSource.map, spawns: rawSource.spawns },
    region: {
      minX: asIntegerOrZero(rawRegion.minX),
      minY: asIntegerOrZero(rawRegion.minY),
      maxX: asIntegerOrZero(rawRegion.maxX),
      maxY: asIntegerOrZero(rawRegion.maxY),
      floors: Array.isArray(rawRegion.floors)
        ? rawRegion.floors.flatMap((floor) => {
            const parsed = asInteger(floor);
            return parsed === undefined ? [] : [parsed];
          })
        : [],
    },
    creatures: asStringList(root.creatures),
    excludedCreatures,
    expectedSpawnGroups: asInteger(root.expectedSpawnGroups),
    expectedSpawnSlots: asInteger(root.expectedSpawnSlots),
    budget: {
      maxFloors: asIntegerOrZero(rawBudget.maxFloors),
      maxWidth: asIntegerOrZero(rawBudget.maxWidth),
      maxHeight: asIntegerOrZero(rawBudget.maxHeight),
    },
  };
}

function diagnostic(
  path: string,
  code: string,
  message: string,
): HuntSelectionDiagnostic {
  return { path, code, message };
}

function sortDiagnostics(
  diagnostics: readonly HuntSelectionDiagnostic[],
): readonly HuntSelectionDiagnostic[] {
  return [...diagnostics].sort((left, right) => {
    const pathOrder = left.path.localeCompare(right.path);
    if (pathOrder !== 0) return pathOrder;
    const codeOrder = left.code.localeCompare(right.code);
    return codeOrder !== 0
      ? codeOrder
      : left.message.localeCompare(right.message);
  });
}

function parseAttributeInteger(
  element: UnknownRecord,
  name: string,
): number | undefined {
  return asInteger(xmlAttribute(element, name));
}

function parseMonsterXml(monsterXml: string):
  | { readonly ok: true; readonly spawns: readonly ParsedSpawn[] }
  | {
      readonly ok: false;
      readonly diagnostics: readonly HuntSelectionDiagnostic[];
    } {
  const parsed = parseXmlRoot(monsterXml, 'monsters', ['monster']);
  if (!parsed.ok) {
    return {
      ok: false,
      diagnostics: parsed.diagnostics.map((item) =>
        diagnostic('source', 'HUNT_XML_INVALID', item.message),
      ),
    };
  }

  const spawns: ParsedSpawn[] = [];
  const diagnostics: HuntSelectionDiagnostic[] = [];
  for (const [groupIndex, group] of asXmlElements(
    parsed.root.monster,
  ).entries()) {
    const centerX = parseAttributeInteger(group, 'centerx');
    const centerY = parseAttributeInteger(group, 'centery');
    if (centerX === undefined || centerY === undefined) {
      diagnostics.push(
        diagnostic(
          `spawns[${groupIndex}]`,
          'HUNT_XML_INVALID',
          'Spawn group centerx and centery must be safe integers',
        ),
      );
      continue;
    }

    for (const slot of asXmlElements(group.monster)) {
      const name = asString(xmlAttribute(slot, 'name'));
      const offsetX = parseAttributeInteger(slot, 'x');
      const offsetY = parseAttributeInteger(slot, 'y');
      const floor = parseAttributeInteger(slot, 'z');
      if (
        name === undefined ||
        offsetX === undefined ||
        offsetY === undefined ||
        floor === undefined
      ) {
        diagnostics.push(
          diagnostic(
            `spawns[${groupIndex}]`,
            'HUNT_XML_INVALID',
            'Spawn name, x, y, and z attributes are required',
          ),
        );
        continue;
      }
      spawns.push({
        groupIndex,
        name,
        x: centerX + offsetX,
        y: centerY + offsetY,
        z: floor,
        spawntime: xmlAttribute(slot, 'spawntime'),
      });
    }
  }

  return diagnostics.length > 0
    ? { ok: false, diagnostics: sortDiagnostics(diagnostics) }
    : { ok: true, spawns };
}

export function convertSpawntimeToTicks(value: unknown): SpawntimeConversion {
  const text =
    typeof value === 'string'
      ? value.trim()
      : typeof value === 'number'
        ? String(value)
        : '';
  if (text.length === 0) return { ok: false, reason: 'non-numeric' };

  const seconds = Number(text);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return { ok: false, reason: 'non-numeric' };
  }

  const milliseconds = seconds * 1000;
  if (!Number.isSafeInteger(milliseconds) || milliseconds % 50 !== 0) {
    return { ok: false, reason: 'not-divisible' };
  }

  return { ok: true, ticks: milliseconds / 50 };
}

function catalogKeyByName(
  catalogCreatureKeys: readonly string[],
): ReadonlyMap<string, string> {
  const entries = catalogCreatureKeys.flatMap((key) => {
    const name = key.split(':').at(-1);
    return name === undefined
      ? []
      : [[normalizeCreatureName(name), key] as const];
  });
  return new Map(entries);
}

function regionContains(
  spawn: ParsedSpawn,
  region: SelectionData['region'],
): boolean {
  return (
    spawn.x >= region.minX &&
    spawn.x <= region.maxX &&
    spawn.y >= region.minY &&
    spawn.y <= region.maxY &&
    region.floors.includes(spawn.z)
  );
}

const windowsDrivePattern = /^[a-zA-Z]:/;

/**
 * A hunt names the snapshot files it comes from, so several hunts can come from
 * several maps. Both paths are relative to the snapshot root and are frozen by
 * the content source lock, which the extractor verifies.
 */
function sourceDiagnostics(
  source: SelectionData['source'],
): readonly HuntSelectionDiagnostic[] {
  const out: HuntSelectionDiagnostic[] = [];
  const check = (value: unknown, field: 'map' | 'spawns', label: string) => {
    const path = `source.${field}`;
    if (typeof value !== 'string' || value.trim().length === 0) {
      out.push(diagnostic(path, 'HUNT_SOURCE_INVALID', label));
      return;
    }
    if (
      value.includes('\\') ||
      value.startsWith('/') ||
      value.startsWith('../') ||
      windowsDrivePattern.test(value)
    ) {
      out.push(
        diagnostic(
          path,
          'HUNT_SOURCE_INVALID',
          `Source path must be relative to the snapshot root: ${value}`,
        ),
      );
    }
  };

  check(
    source.map,
    'map',
    'Selection must name the snapshot map it is extracted from',
  );
  check(
    source.spawns,
    'spawns',
    'Selection must name the snapshot spawn declaration',
  );
  return out;
}

export function validateHuntSelection(
  selection: unknown,
  monsterXml: string,
  catalogCreatureKeys: readonly string[],
): HuntSelectionReport {
  const data = selectionData(selection);
  const width =
    data.region.maxX >= data.region.minX
      ? data.region.maxX - data.region.minX + 1
      : 0;
  const height =
    data.region.maxY >= data.region.minY
      ? data.region.maxY - data.region.minY + 1
      : 0;
  const diagnostics: HuntSelectionDiagnostic[] = [
    ...sourceDiagnostics(data.source),
  ];

  if (width > data.budget.maxWidth) {
    diagnostics.push(
      diagnostic(
        'region.maxX',
        'HUNT_REGION_OUT_OF_BUDGET',
        `Region width ${width} exceeds the ${data.budget.maxWidth}-tile budget`,
      ),
    );
  }
  if (height > data.budget.maxHeight) {
    diagnostics.push(
      diagnostic(
        'region.maxY',
        'HUNT_REGION_OUT_OF_BUDGET',
        `Region height ${height} exceeds the ${data.budget.maxHeight}-tile budget`,
      ),
    );
  }
  if (data.region.floors.length > data.budget.maxFloors) {
    diagnostics.push(
      diagnostic(
        'region.floors',
        'HUNT_REGION_OUT_OF_BUDGET',
        `Region has ${data.region.floors.length} floors, exceeding the ${data.budget.maxFloors}-floor budget`,
      ),
    );
  }

  const parsedXml = parseMonsterXml(monsterXml);
  if (!parsedXml.ok) {
    diagnostics.push(...parsedXml.diagnostics);
  }

  const catalogByName = catalogKeyByName(catalogCreatureKeys);
  const selectedCreatures = new Set(data.creatures);
  const excludedByName = new Map(
    data.excludedCreatures.map((excluded) => [
      normalizeCreatureName(excluded.name),
      excluded,
    ]),
  );
  const creatureNames = new Set<string>();
  const includedGroupIndexes = new Set<number>();
  let spawnSlots = 0;
  const inRegion = parsedXml.ok
    ? parsedXml.spawns.filter((spawn) => regionContains(spawn, data.region))
    : [];

  for (const [index, spawn] of inRegion.entries()) {
    const path = `spawns[${index}]`;
    const normalizedName = normalizeCreatureName(spawn.name);
    const excluded = excludedByName.get(normalizedName);
    if (excluded !== undefined) continue;

    const catalogKey = catalogByName.get(normalizedName);
    if (catalogKey === undefined || !selectedCreatures.has(catalogKey)) {
      diagnostics.push(
        diagnostic(
          path,
          'HUNT_UNKNOWN_CREATURE',
          `${spawn.name} is not included in the PB-01 catalog selection`,
        ),
      );
    } else {
      creatureNames.add(spawn.name);
      spawnSlots += 1;
      includedGroupIndexes.add(spawn.groupIndex);
    }

    const conversion = convertSpawntimeToTicks(spawn.spawntime);
    if (!conversion.ok) {
      diagnostics.push(
        diagnostic(
          path,
          'HUNT_SPAWNTIME_NOT_DIVISIBLE',
          conversion.reason === 'non-numeric'
            ? `${spawn.name} spawntime must be numeric seconds`
            : `${spawn.name} spawntime must be a multiple of 50 ms when converted to milliseconds`,
        ),
      );
    }
  }

  if (inRegion.length === 0) {
    diagnostics.push(
      diagnostic(
        'region',
        'HUNT_EMPTY_REGION',
        'Region contains no spawn slots on the selected floors',
      ),
    );
  }

  if (
    data.expectedSpawnGroups !== undefined &&
    data.expectedSpawnGroups !== includedGroupIndexes.size
  ) {
    diagnostics.push(
      diagnostic(
        'expectedSpawnGroups',
        'HUNT_EXPECTED_SPAWN_COUNT_MISMATCH',
        `Expected ${data.expectedSpawnGroups} included spawn groups, measured ${includedGroupIndexes.size}`,
      ),
    );
  }
  if (
    data.expectedSpawnSlots !== undefined &&
    data.expectedSpawnSlots !== spawnSlots
  ) {
    diagnostics.push(
      diagnostic(
        'expectedSpawnSlots',
        'HUNT_EXPECTED_SPAWN_COUNT_MISMATCH',
        `Expected ${data.expectedSpawnSlots} included spawn slots, measured ${spawnSlots}`,
      ),
    );
  }

  const sortedDiagnostics = sortDiagnostics(diagnostics);
  return {
    ok: sortedDiagnostics.length === 0,
    width,
    height,
    floors: [...data.region.floors],
    spawnGroups: includedGroupIndexes.size,
    spawnSlots,
    creatureNames: [...creatureNames].sort((left, right) =>
      left.localeCompare(right),
    ),
    diagnostics: sortedDiagnostics,
  };
}
