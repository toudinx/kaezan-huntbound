import type {
  MapRegion,
  TransitionEntry,
  TransitionTable,
} from '../../packages/contracts/src/hunt/types.ts';
import type { GridPosition } from '../../packages/contracts/src/simulation/types.ts';
import type { FloorChange } from '../tile-flags/types.ts';
import type { FloorChangeCells } from './region.ts';
import type { ExtractionDiagnostic } from './types.ts';
import { diagnostic } from './types.ts';

/**
 * Geometry of every floor change value, taken from `Tile::queryDestination` in
 * `references/canary/src/items/tile.cpp`.
 *
 * `down` goes one floor down in place and wins over every other value on the
 * same tile, exactly as Canary's `if / else if` does. The upward values go one
 * floor up and accumulate their offsets. The `_ALT` states are Canary's
 * two-tile stairs, not aliases of `south` / `east`.
 */
const UPWARD_OFFSETS: Readonly<
  Record<Exclude<FloorChange, 'down'>, readonly [number, number]>
> = {
  north: [0, -1],
  south: [0, 1],
  southalt: [0, 2],
  east: [1, 0],
  eastalt: [2, 0],
  west: [-1, 0],
};

export interface TransitionTableBuild {
  readonly table: TransitionTable;
  readonly diagnostics: readonly ExtractionDiagnostic[];
}

function destination(
  from: GridPosition,
  values: ReadonlySet<FloorChange>,
): GridPosition {
  if (values.has('down')) {
    return { x: from.x, y: from.y, z: from.z + 1 };
  }
  let x = from.x;
  let y = from.y;
  for (const value of values) {
    if (value === 'down') continue;
    const [deltaX, deltaY] = UPWARD_OFFSETS[value];
    x += deltaX;
    y += deltaY;
  }
  return { x, y, z: from.z - 1 };
}

/**
 * Derives the directed transitions of the region.
 *
 * Each cell yields at most one transition, so two entries can never share an
 * origin. A destination outside the region, on a floor that was not extracted
 * or on a collision tile is dropped, counted and reported.
 */
export function buildTransitionTable(
  region: MapRegion,
  floorChanges: FloorChangeCells,
): TransitionTableBuild {
  const collisionByFloor = new Map(
    region.floors.map((floor) => [floor.z, new Set(floor.collision)]),
  );
  const entries: TransitionEntry[] = [];
  const diagnostics: ExtractionDiagnostic[] = [];
  let dropped = 0;

  const drop = (from: GridPosition, to: GridPosition, reason: string) => {
    dropped += 1;
    diagnostics.push(
      diagnostic(
        `transitions.from[${from.z},${from.y},${from.x}]`,
        'HUNT_TRANSITION_DROPPED',
        `Destination (${to.x}, ${to.y}, ${to.z}) ${reason}`,
      ),
    );
  };

  for (const floor of region.floors) {
    const cells = floorChanges.get(floor.z);
    if (cells === undefined) continue;

    for (const index of [...cells.keys()].sort((left, right) => left - right)) {
      const values = cells.get(index) as ReadonlySet<FloorChange>;
      if (values.size === 0) continue;

      const from: GridPosition = {
        x: index % region.width,
        y: Math.floor(index / region.width),
        z: floor.z,
      };
      const to = destination(from, values);

      if (
        to.x < 0 ||
        to.x >= region.width ||
        to.y < 0 ||
        to.y >= region.height
      ) {
        drop(from, to, 'falls outside the extracted region');
        continue;
      }
      const collision = collisionByFloor.get(to.z);
      if (collision === undefined) {
        drop(from, to, 'is on a floor that was not extracted');
        continue;
      }
      if (collision.has(to.y * region.width + to.x)) {
        drop(from, to, 'is a collision tile');
        continue;
      }

      entries.push({ from, to });
    }
  }

  entries.sort((left, right) => {
    if (left.from.z !== right.from.z) return left.from.z - right.from.z;
    if (left.from.y !== right.from.y) return left.from.y - right.from.y;
    return left.from.x - right.from.x;
  });

  return { table: { entries, dropped }, diagnostics };
}
