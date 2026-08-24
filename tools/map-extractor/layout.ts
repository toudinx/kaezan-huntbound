import type { TransitionEntry } from '../../packages/contracts/src/hunt/types.ts';
import type { GridPosition } from '../../packages/contracts/src/simulation/types.ts';
import type { HuntSelectionRegion } from '../hunt-selection/types.ts';
import type { OtbmTile } from './otbm.ts';

export interface HuntLayoutRecipe {
  readonly schemaVersion: 1;
  readonly layoutId: string;
  readonly width: number;
  readonly height: number;
  readonly floors: readonly {
    readonly z: number;
    readonly operations: readonly HuntLayoutOperation[];
  }[];
  readonly cells: readonly HuntLayoutCell[];
  readonly playerStart: GridPosition;
  readonly transitions: readonly TransitionEntry[];
  readonly spawnPlacements: readonly {
    readonly source: {
      readonly x: number;
      readonly y: number;
      readonly z: number;
    };
    readonly target: GridPosition;
  }[];
}

export interface HuntLayoutCell {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly ground: number;
}

export const BORDERIZER_GROUND_IDS: readonly number[] = [
  101,
  ...Array.from({ length: 16 }, (_value, index) => 5711 + index),
  ...Array.from({ length: 12 }, (_value, index) => 356 + index),
];

const borderizerGroundIds = new Set(BORDERIZER_GROUND_IDS);

export type HuntLayoutOperation =
  | {
      readonly kind: 'copy-rect';
      readonly from: {
        readonly minX: number;
        readonly minY: number;
        readonly z: number;
      };
      readonly width: number;
      readonly height: number;
      readonly to: { readonly x: number; readonly y: number };
    }
  | {
      readonly kind: 'copy-cell';
      readonly from: {
        readonly x: number;
        readonly y: number;
        readonly z: number;
      };
      readonly to: { readonly x: number; readonly y: number };
    }
  | {
      readonly kind: 'erase-rect';
      readonly at: { readonly x: number; readonly y: number };
      readonly width: number;
      readonly height: number;
    };

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function layoutInvalid(path: string, message: string): Error {
  return new Error(`HUNT_LAYOUT_INVALID at ${path}: ${message}`);
}

function assertRecord(
  value: unknown,
  path: string,
): asserts value is UnknownRecord {
  if (!isRecord(value)) throw layoutInvalid(path, 'expected an object');
}

function assertKeys(
  value: UnknownRecord,
  allowed: readonly string[],
  path: string,
): void {
  const allowedKeys = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw layoutInvalid(path, `unknown key ${key}`);
    }
  }
}

function required(value: UnknownRecord, key: string, path: string): unknown {
  if (!(key in value)) throw layoutInvalid(path, `missing ${key}`);
  return value[key];
}

function stringValue(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw layoutInvalid(path, 'expected a non-empty string');
  }
  return value;
}

function integer(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw layoutInvalid(path, 'expected a safe integer');
  }
  return value;
}

function positiveInteger(value: unknown, path: string): number {
  const parsed = integer(value, path);
  if (parsed <= 0) throw layoutInvalid(path, 'expected a positive integer');
  return parsed;
}

function point(
  value: unknown,
  path: string,
  keys: readonly string[],
): Record<string, number> {
  assertRecord(value, path);
  assertKeys(value, keys, path);
  return Object.fromEntries(
    keys.map((key) => [
      key,
      integer(required(value, key, path), `${path}.${key}`),
    ]),
  );
}

function position(value: unknown, path: string): GridPosition {
  const parsed = point(value, path, ['x', 'y', 'z']);
  return {
    x: parsed.x as number,
    y: parsed.y as number,
    z: parsed.z as number,
  };
}

function withinSource(
  x: number,
  y: number,
  z: number,
  sourceRegion: HuntSelectionRegion,
  path: string,
): void {
  if (
    x < sourceRegion.minX ||
    x > sourceRegion.maxX ||
    y < sourceRegion.minY ||
    y > sourceRegion.maxY ||
    !sourceRegion.floors.includes(z)
  ) {
    throw layoutInvalid(path, 'source coordinate is outside sourceRegion');
  }
}

function withinTarget(
  x: number,
  y: number,
  width: number,
  height: number,
  recipeWidth: number,
  recipeHeight: number,
  path: string,
): void {
  if (
    x < 0 ||
    y < 0 ||
    width < 1 ||
    height < 1 ||
    x + width > recipeWidth ||
    y + height > recipeHeight
  ) {
    throw layoutInvalid(
      path,
      'target rectangle is outside the authored region',
    );
  }
}

function parseOperation(
  value: unknown,
  path: string,
  recipeWidth: number,
  recipeHeight: number,
  sourceRegion: HuntSelectionRegion,
): HuntLayoutOperation {
  assertRecord(value, path);
  const kind = stringValue(required(value, 'kind', path), `${path}.kind`);
  if (kind === 'copy-rect') {
    assertKeys(value, ['kind', 'from', 'width', 'height', 'to'], path);
    const from = point(required(value, 'from', path), `${path}.from`, [
      'minX',
      'minY',
      'z',
    ]);
    const width = positiveInteger(
      required(value, 'width', path),
      `${path}.width`,
    );
    const height = positiveInteger(
      required(value, 'height', path),
      `${path}.height`,
    );
    const to = point(required(value, 'to', path), `${path}.to`, ['x', 'y']);
    withinSource(
      from.minX as number,
      from.minY as number,
      from.z as number,
      sourceRegion,
      `${path}.from`,
    );
    withinSource(
      (from.minX as number) + width - 1,
      (from.minY as number) + height - 1,
      from.z as number,
      sourceRegion,
      `${path}.from`,
    );
    withinTarget(
      to.x as number,
      to.y as number,
      width,
      height,
      recipeWidth,
      recipeHeight,
      `${path}.to`,
    );
    return {
      kind,
      from: {
        minX: from.minX as number,
        minY: from.minY as number,
        z: from.z as number,
      },
      width,
      height,
      to: { x: to.x as number, y: to.y as number },
    };
  }

  if (kind === 'copy-cell') {
    assertKeys(value, ['kind', 'from', 'to'], path);
    const from = point(required(value, 'from', path), `${path}.from`, [
      'x',
      'y',
      'z',
    ]);
    const to = point(required(value, 'to', path), `${path}.to`, ['x', 'y']);
    withinSource(
      from.x as number,
      from.y as number,
      from.z as number,
      sourceRegion,
      `${path}.from`,
    );
    withinTarget(
      to.x as number,
      to.y as number,
      1,
      1,
      recipeWidth,
      recipeHeight,
      `${path}.to`,
    );
    return {
      kind,
      from: { x: from.x as number, y: from.y as number, z: from.z as number },
      to: { x: to.x as number, y: to.y as number },
    };
  }

  if (kind === 'erase-rect') {
    assertKeys(value, ['kind', 'at', 'width', 'height'], path);
    const at = point(required(value, 'at', path), `${path}.at`, ['x', 'y']);
    const width = positiveInteger(
      required(value, 'width', path),
      `${path}.width`,
    );
    const height = positiveInteger(
      required(value, 'height', path),
      `${path}.height`,
    );
    withinTarget(
      at.x as number,
      at.y as number,
      width,
      height,
      recipeWidth,
      recipeHeight,
      `${path}.at`,
    );
    return {
      kind,
      at: { x: at.x as number, y: at.y as number },
      width,
      height,
    };
  }

  throw layoutInvalid(`${path}.kind`, `unknown operation ${kind}`);
}

function targetPosition(
  value: unknown,
  path: string,
  width: number,
  height: number,
  floors: ReadonlySet<number>,
): GridPosition {
  const parsed = position(value, path);
  if (
    parsed.x < 0 ||
    parsed.x >= width ||
    parsed.y < 0 ||
    parsed.y >= height ||
    !floors.has(parsed.z)
  ) {
    throw layoutInvalid(
      path,
      'functional point is outside the authored region',
    );
  }
  return parsed;
}

function parseCell(
  value: unknown,
  path: string,
  recipeWidth: number,
  recipeHeight: number,
  floors: ReadonlySet<number>,
): HuntLayoutCell {
  assertRecord(value, path);
  assertKeys(value, ['x', 'y', 'z', 'ground'], path);
  const x = integer(required(value, 'x', path), `${path}.x`);
  const y = integer(required(value, 'y', path), `${path}.y`);
  const z = integer(required(value, 'z', path), `${path}.z`);
  const ground = integer(required(value, 'ground', path), `${path}.ground`);

  withinTarget(x, y, 1, 1, recipeWidth, recipeHeight, path);
  if (!floors.has(z)) {
    throw layoutInvalid(
      `${path}.z`,
      'floor is absent from the authored region',
    );
  }
  if (!borderizerGroundIds.has(ground)) {
    throw layoutInvalid(
      `${path}.ground`,
      'ground id is outside the borderizer vocabulary',
    );
  }

  return { x, y, z, ground };
}

export function parseHuntLayoutRecipe(
  raw: unknown,
  sourceRegion: HuntSelectionRegion,
): HuntLayoutRecipe {
  const path = 'layout';
  assertRecord(raw, path);
  assertKeys(
    raw,
    [
      'schemaVersion',
      'layoutId',
      'width',
      'height',
      'floors',
      'cells',
      'playerStart',
      'transitions',
      'spawnPlacements',
    ],
    path,
  );
  const schemaVersion = integer(
    required(raw, 'schemaVersion', path),
    `${path}.schemaVersion`,
  );
  if (schemaVersion !== 1) {
    throw layoutInvalid(`${path}.schemaVersion`, 'must be 1');
  }
  const layoutId = stringValue(
    required(raw, 'layoutId', path),
    `${path}.layoutId`,
  );
  const width = positiveInteger(required(raw, 'width', path), `${path}.width`);
  const height = positiveInteger(
    required(raw, 'height', path),
    `${path}.height`,
  );
  const rawFloors = required(raw, 'floors', path);
  if (!Array.isArray(rawFloors) || rawFloors.length === 0) {
    throw layoutInvalid(`${path}.floors`, 'expected a non-empty array');
  }

  const seenFloors = new Set<number>();
  const floors = rawFloors.map((value, floorIndex) => {
    const floorPath = `${path}.floors[${floorIndex}]`;
    assertRecord(value, floorPath);
    assertKeys(value, ['z', 'operations'], floorPath);
    const z = integer(required(value, 'z', floorPath), `${floorPath}.z`);
    if (seenFloors.has(z))
      throw layoutInvalid(`${floorPath}.z`, 'floor z is duplicated');
    if (!sourceRegion.floors.includes(z)) {
      throw layoutInvalid(
        `${floorPath}.z`,
        'floor is absent from sourceRegion',
      );
    }
    seenFloors.add(z);
    const operationsValue = required(value, 'operations', floorPath);
    if (!Array.isArray(operationsValue)) {
      throw layoutInvalid(`${floorPath}.operations`, 'expected an array');
    }
    return {
      z,
      operations: operationsValue.map((operation, operationIndex) =>
        parseOperation(
          operation,
          `${floorPath}.operations[${operationIndex}]`,
          width,
          height,
          sourceRegion,
        ),
      ),
    };
  });

  const cellsValue = raw.cells ?? [];
  if (!Array.isArray(cellsValue)) {
    throw layoutInvalid(`${path}.cells`, 'expected an array');
  }
  const seenCells = new Set<string>();
  const cells = cellsValue.map((value, cellIndex) => {
    const cellPath = `${path}.cells[${cellIndex}]`;
    const cell = parseCell(value, cellPath, width, height, seenFloors);
    const key = `${cell.x}:${cell.y}:${cell.z}`;
    if (seenCells.has(key)) {
      throw layoutInvalid(`${cellPath}`, 'cell coordinate is duplicated');
    }
    seenCells.add(key);
    return cell;
  });

  const playerStart = targetPosition(
    required(raw, 'playerStart', path),
    `${path}.playerStart`,
    width,
    height,
    seenFloors,
  );

  const transitionsValue = required(raw, 'transitions', path);
  if (!Array.isArray(transitionsValue)) {
    throw layoutInvalid(`${path}.transitions`, 'expected an array');
  }
  const transitions = transitionsValue.map((value, index) => {
    const transitionPath = `${path}.transitions[${index}]`;
    assertRecord(value, transitionPath);
    assertKeys(value, ['from', 'to'], transitionPath);
    return {
      from: targetPosition(
        required(value, 'from', transitionPath),
        `${transitionPath}.from`,
        width,
        height,
        seenFloors,
      ),
      to: targetPosition(
        required(value, 'to', transitionPath),
        `${transitionPath}.to`,
        width,
        height,
        seenFloors,
      ),
    };
  });
  const transitionOrigins = new Set(
    transitions.map(({ from }) => `${from.x}:${from.y}:${from.z}`),
  );
  if (transitionOrigins.size !== transitions.length) {
    throw layoutInvalid(
      `${path}.transitions`,
      'transition origin is duplicated',
    );
  }

  const placementsValue = required(raw, 'spawnPlacements', path);
  if (!Array.isArray(placementsValue)) {
    throw layoutInvalid(`${path}.spawnPlacements`, 'expected an array');
  }
  const spawnSources = new Set<string>();
  const spawnPlacements = placementsValue.map((value, index) => {
    const placementPath = `${path}.spawnPlacements[${index}]`;
    assertRecord(value, placementPath);
    assertKeys(value, ['source', 'target'], placementPath);
    const source = position(
      required(value, 'source', placementPath),
      `${placementPath}.source`,
    );
    withinSource(
      source.x,
      source.y,
      source.z,
      sourceRegion,
      `${placementPath}.source`,
    );
    const sourceKey = `${source.x}:${source.y}:${source.z}`;
    if (spawnSources.has(sourceKey)) {
      throw layoutInvalid(
        `${placementPath}.source`,
        'spawn source is duplicated',
      );
    }
    spawnSources.add(sourceKey);
    return {
      source,
      target: targetPosition(
        required(value, 'target', placementPath),
        `${placementPath}.target`,
        width,
        height,
        seenFloors,
      ),
    };
  });

  return {
    schemaVersion: 1,
    layoutId,
    width,
    height,
    floors,
    cells,
    playerStart,
    transitions,
    spawnPlacements,
  };
}

function sourceKey(x: number, y: number, z: number): string {
  return `${z}:${y}:${x}`;
}

function targetKey(x: number, y: number): string {
  return `${y}:${x}`;
}

function copyTile(
  tile: OtbmTile | undefined,
  x: number,
  y: number,
  z: number,
): OtbmTile | undefined {
  return tile === undefined ? undefined : { x, y, z, items: [...tile.items] };
}

function replaceGround(
  tile: OtbmTile | undefined,
  x: number,
  y: number,
  z: number,
  ground: number,
): OtbmTile {
  if (!borderizerGroundIds.has(ground)) {
    throw layoutInvalid(
      `layout.cells[${x}:${y}:${z}].ground`,
      'ground id is outside the borderizer vocabulary',
    );
  }
  const existingItems = tile?.items ?? [];
  return {
    x,
    y,
    z,
    items:
      existingItems.length === 0
        ? [ground]
        : [ground, ...existingItems.slice(1)],
  };
}

export function applyHuntLayout(
  sourceTiles: readonly OtbmTile[],
  recipe: HuntLayoutRecipe,
): readonly OtbmTile[] {
  const source = new Map(
    sourceTiles.map((tile) => [sourceKey(tile.x, tile.y, tile.z), tile]),
  );
  const authored: OtbmTile[] = [];

  for (const floor of recipe.floors) {
    const cells = new Map<string, OtbmTile>();
    const setTarget = (x: number, y: number, tile: OtbmTile | undefined) => {
      const key = targetKey(x, y);
      if (tile === undefined) cells.delete(key);
      else cells.set(key, tile);
    };

    for (const operation of floor.operations) {
      if (operation.kind === 'copy-rect') {
        for (let row = 0; row < operation.height; row += 1) {
          for (let column = 0; column < operation.width; column += 1) {
            const sourceX = operation.from.minX + column;
            const sourceY = operation.from.minY + row;
            setTarget(
              operation.to.x + column,
              operation.to.y + row,
              copyTile(
                source.get(sourceKey(sourceX, sourceY, operation.from.z)),
                operation.to.x + column,
                operation.to.y + row,
                floor.z,
              ),
            );
          }
        }
        continue;
      }
      if (operation.kind === 'copy-cell') {
        setTarget(
          operation.to.x,
          operation.to.y,
          copyTile(
            source.get(
              sourceKey(operation.from.x, operation.from.y, operation.from.z),
            ),
            operation.to.x,
            operation.to.y,
            floor.z,
          ),
        );
        continue;
      }
      for (let row = 0; row < operation.height; row += 1) {
        for (let column = 0; column < operation.width; column += 1) {
          setTarget(operation.at.x + column, operation.at.y + row, undefined);
        }
      }
    }

    for (const cell of recipe.cells) {
      if (cell.z !== floor.z) continue;
      const key = targetKey(cell.x, cell.y);
      setTarget(
        cell.x,
        cell.y,
        replaceGround(cells.get(key), cell.x, cell.y, cell.z, cell.ground),
      );
    }

    authored.push(...cells.values());
  }

  return authored.sort((left, right) => {
    if (left.z !== right.z) return left.z - right.z;
    if (left.y !== right.y) return left.y - right.y;
    return left.x - right.x;
  });
}
