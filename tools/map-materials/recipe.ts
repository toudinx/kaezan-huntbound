import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { DEFAULT_AMBIGUITY_MINIMUM_OCCURRENCE } from './aggregate.ts';
import { MATERIAL_BORDERS_SCHEMA_VERSION } from './table.ts';
import type {
  MaterialDefinition,
  MaterialMiningRecipe,
  MaterialWindow,
} from './types.ts';

interface UnknownRecord {
  readonly [key: string]: unknown;
}

export function readMaterialMiningRecipe(path: string): MaterialMiningRecipe {
  const parsed = JSON.parse(readFileSync(resolve(path), 'utf8')) as unknown;
  return validateMaterialMiningRecipe(parsed);
}

export function validateMaterialMiningRecipe(
  value: unknown,
): MaterialMiningRecipe {
  if (!isRecord(value)) {
    throw new Error('Material mining recipe must be an object');
  }
  if (value.schemaVersion !== MATERIAL_BORDERS_SCHEMA_VERSION) {
    throw new Error(
      `Material mining recipe schemaVersion must be ${MATERIAL_BORDERS_SCHEMA_VERSION}`,
    );
  }

  const sourcePath = requiredString(value, 'sourcePath');
  if (sourcePath.includes('\\') || /^[a-zA-Z]:|^\//.test(sourcePath)) {
    throw new Error(
      'Material mining sourcePath must be relative with / separators',
    );
  }

  const materials = readMaterials(value.materials);
  const windows = readWindows(value.windows);
  const ambiguityMinimumOccurrence =
    value.ambiguityMinimumOccurrence === undefined
      ? DEFAULT_AMBIGUITY_MINIMUM_OCCURRENCE
      : readPositiveInteger(
          value.ambiguityMinimumOccurrence,
          'ambiguityMinimumOccurrence',
        );

  return {
    ambiguityMinimumOccurrence,
    materials,
    schemaVersion: value.schemaVersion as number,
    sourcePath,
    windows,
  };
}

function readMaterials(value: unknown): readonly MaterialDefinition[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Material mining recipe must contain materials');
  }

  const keys = new Set<string>();
  const ids = new Set<number>();
  const materials = value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`materials[${index}] must be an object`);
    }
    const key = requiredString(entry, 'key');
    if (keys.has(key)) throw new Error(`Duplicate material key ${key}`);
    keys.add(key);

    const serverIds = readPositiveIntegers(
      entry.serverIds,
      `materials[${index}].serverIds`,
    );
    for (const serverId of serverIds) {
      if (ids.has(serverId)) {
        throw new Error(
          `Server id ${serverId} belongs to more than one material`,
        );
      }
      ids.add(serverId);
    }
    return { key, serverIds };
  });

  return materials;
}

function readWindows(value: unknown): readonly MaterialWindow[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Material mining recipe must contain windows');
  }
  return value.map((entry, index) => {
    if (!isRecord(entry))
      throw new Error(`windows[${index}] must be an object`);
    const minX = requiredInteger(entry, 'minX');
    const minY = requiredInteger(entry, 'minY');
    const maxX = requiredInteger(entry, 'maxX');
    const maxY = requiredInteger(entry, 'maxY');
    if (minX > maxX || minY > maxY) {
      throw new Error(`windows[${index}] has inverted bounds`);
    }
    const floors = readNonNegativeIntegers(
      entry.floors,
      `windows[${index}].floors`,
    );
    return {
      floors,
      maxX,
      maxY,
      minX,
      minY,
      reason: requiredString(entry, 'reason'),
    };
  });
}

function readNonNegativeIntegers(
  value: unknown,
  path: string,
): readonly number[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((entry) => !Number.isInteger(entry) || (entry as number) < 0)
  ) {
    throw new Error(
      `${path} must be a non-empty array of non-negative integers`,
    );
  }
  const entries = value as number[];
  if (new Set(entries).size !== entries.length) {
    throw new Error(`${path} must not contain duplicates`);
  }
  return [...entries].sort((left, right) => left - right);
}

function readPositiveIntegers(value: unknown, path: string): readonly number[] {
  const entries = readNonNegativeIntegers(value, path);
  if (entries.some((entry) => entry <= 0)) {
    throw new Error(`${path} must contain only positive integers`);
  }
  return entries;
}

function readPositiveInteger(value: unknown, path: string): number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new Error(`${path} must be a positive integer`);
  }
  return value as number;
}

function requiredInteger(value: UnknownRecord, key: string): number {
  const entry = value[key];
  if (!Number.isInteger(entry)) throw new Error(`${key} must be an integer`);
  return entry as number;
}

function requiredString(value: UnknownRecord, key: string): string {
  const entry = value[key];
  if (typeof entry !== 'string' || entry.length === 0) {
    throw new Error(`${key} must be a non-empty string`);
  }
  return entry;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
