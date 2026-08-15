import type {
  HuntDefinition,
  MapRegionFloor,
} from '../../packages/contracts/src/hunt/types.ts';
import type { GridPosition } from '../../packages/contracts/src/simulation/types.ts';
import type { ExtractionDiagnostic } from './types.ts';
import { diagnostic, sortDiagnostics } from './types.ts';

const DIRECTIONS: readonly (readonly [number, number])[] = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
];

export interface HuntTopologyReport {
  readonly floors: readonly {
    readonly z: number;
    readonly walkableTiles: number;
    readonly componentCount: number;
    readonly unreachable: readonly number[];
  }[];
  readonly diagnostics: readonly ExtractionDiagnostic[];
}

function positionKey(position: GridPosition): string {
  return `${position.z}:${position.y}:${position.x}`;
}

function indexOf(position: GridPosition, width: number): number {
  return position.y * width + position.x;
}

function inBounds(
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}

function walkableAt(
  floor: MapRegionFloor | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  if (floor === undefined || !inBounds(x, y, width, height)) return false;
  return !floor.collision.includes(y * width + x);
}

function canStep(
  floor: MapRegionFloor | undefined,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  width: number,
  height: number,
): boolean {
  if (!walkableAt(floor, toX, toY, width, height)) return false;
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;
  if (deltaX === 0 || deltaY === 0) return true;
  return (
    walkableAt(floor, fromX + deltaX, fromY, width, height) &&
    walkableAt(floor, fromX, fromY + deltaY, width, height)
  );
}

function neighbors(
  floor: MapRegionFloor | undefined,
  index: number,
  width: number,
  height: number,
): readonly number[] {
  const x = index % width;
  const y = Math.floor(index / width);
  return DIRECTIONS.flatMap(([deltaX, deltaY]) => {
    const nextX = x + deltaX;
    const nextY = y + deltaY;
    return canStep(floor, x, y, nextX, nextY, width, height)
      ? [nextY * width + nextX]
      : [];
  });
}

function walkableIndices(
  floor: MapRegionFloor,
  cellCount: number,
): readonly number[] {
  const collision = new Set(floor.collision);
  return Array.from({ length: cellCount }, (_value, index) => index).filter(
    (index) => !collision.has(index),
  );
}

function components(
  floor: MapRegionFloor,
  width: number,
  height: number,
): { readonly count: number; readonly walkable: readonly number[] } {
  const walkable = walkableIndices(floor, width * height);
  const remaining = new Set(walkable);
  let count = 0;
  while (remaining.size > 0) {
    const root = [...remaining][0] as number;
    const queue = [root];
    remaining.delete(root);
    while (queue.length > 0) {
      const current = queue.shift() as number;
      for (const next of neighbors(floor, current, width, height)) {
        if (!remaining.delete(next)) continue;
        queue.push(next);
      }
    }
    count += 1;
  }
  return { count, walkable };
}

function reachableFromRoots(
  floor: MapRegionFloor | undefined,
  roots: readonly number[],
  width: number,
  height: number,
): Set<number> {
  const reachable = new Set<number>();
  const queue = roots.filter((root) => {
    if (floor === undefined || root < 0 || root >= width * height) return false;
    const x = root % width;
    const y = Math.floor(root / width);
    return walkableAt(floor, x, y, width, height);
  });
  for (const root of queue) reachable.add(root);
  while (queue.length > 0) {
    const current = queue.shift() as number;
    for (const next of neighbors(floor, current, width, height)) {
      if (reachable.has(next)) continue;
      reachable.add(next);
      queue.push(next);
    }
  }
  return reachable;
}

function pointWalkable(
  position: GridPosition,
  floorByZ: ReadonlyMap<number, MapRegionFloor>,
  width: number,
  height: number,
): boolean {
  return walkableAt(
    floorByZ.get(position.z),
    position.x,
    position.y,
    width,
    height,
  );
}

export function analyzeHuntTopology(hunt: HuntDefinition): HuntTopologyReport {
  const { width, height } = hunt.region;
  const floorByZ = new Map(hunt.region.floors.map((floor) => [floor.z, floor]));
  const rootsByZ = new Map<number, Set<number>>(
    hunt.region.floors.map((floor) => [floor.z, new Set<number>()]),
  );
  const reachableByZ = new Map<number, Set<number>>(
    hunt.region.floors.map((floor) => [floor.z, new Set<number>()]),
  );
  const startFloor = floorByZ.get(hunt.playerStart.z);
  if (startFloor !== undefined) {
    rootsByZ.get(hunt.playerStart.z)?.add(indexOf(hunt.playerStart, width));
  }

  const pendingFloors = [hunt.playerStart.z];
  const queuedFloors = new Set(pendingFloors);
  while (pendingFloors.length > 0) {
    const z = pendingFloors.shift() as number;
    queuedFloors.delete(z);
    const floor = floorByZ.get(z);
    const roots = rootsByZ.get(z);
    if (floor === undefined || roots === undefined) continue;
    const reachable = reachableFromRoots(floor, [...roots], width, height);
    const previous = reachableByZ.get(z) as Set<number>;
    const changed = [...reachable].some((index) => !previous.has(index));
    for (const index of reachable) previous.add(index);
    if (!changed && previous.size > 0) continue;

    hunt.transitions.entries.forEach((transition) => {
      if (transition.from.z !== z) return;
      const fromIndex = indexOf(transition.from, width);
      if (!previous.has(fromIndex)) return;
      if (transition.to.z === z) return;
      const targetRoots = rootsByZ.get(transition.to.z);
      if (targetRoots === undefined) return;
      const targetIndex = indexOf(transition.to, width);
      if (targetRoots.has(targetIndex)) return;
      targetRoots.add(targetIndex);
      if (!queuedFloors.has(transition.to.z)) {
        pendingFloors.push(transition.to.z);
        queuedFloors.add(transition.to.z);
      }
    });
  }

  const floorReports = hunt.region.floors.map((floor) => {
    const { count, walkable } = components(floor, width, height);
    const reachable = reachableByZ.get(floor.z) ?? new Set<number>();
    return {
      z: floor.z,
      walkableTiles: walkable.length,
      componentCount: count,
      unreachable: walkable.filter((index) => !reachable.has(index)),
    };
  });

  const diagnostics: ExtractionDiagnostic[] = [];
  const reachablePosition = (position: GridPosition): boolean => {
    const floor = floorByZ.get(position.z);
    if (!pointWalkable(position, floorByZ, width, height)) return false;
    return reachableByZ.get(position.z)?.has(indexOf(position, width)) ?? false;
  };

  if (!reachablePosition(hunt.playerStart)) {
    diagnostics.push(
      diagnostic(
        'playerStart',
        'HUNT_PLAYER_START_UNREACHABLE',
        `Player start (${hunt.playerStart.x}, ${hunt.playerStart.y}, ${hunt.playerStart.z}) is not reachable`,
      ),
    );
  }

  hunt.spawns.groups.forEach((group, groupIndex) => {
    group.slots.forEach((slot, slotIndex) => {
      const position = {
        x: group.center.x + slot.offsetX,
        y: group.center.y + slot.offsetY,
        z: group.center.z + slot.offsetZ,
      };
      if (!reachablePosition(position)) {
        diagnostics.push(
          diagnostic(
            `spawns.groups[${groupIndex}].slots[${slotIndex}]`,
            'HUNT_SPAWN_UNREACHABLE',
            `Spawn ${slot.blueprintId} at (${position.x}, ${position.y}, ${position.z}) is not reachable`,
          ),
        );
      }
    });
  });

  hunt.transitions.entries.forEach((transition, index) => {
    if (
      !reachablePosition(transition.from) ||
      !reachablePosition(transition.to)
    ) {
      diagnostics.push(
        diagnostic(
          `transitions.entries[${index}]`,
          'HUNT_TRANSITION_UNREACHABLE',
          `Transition from (${transition.from.x}, ${transition.from.y}, ${transition.from.z}) to (${transition.to.x}, ${transition.to.y}, ${transition.to.z}) is not reachable at both ends`,
        ),
      );
    }
  });

  floorReports.forEach((floor) => {
    if (floor.componentCount > 1) {
      diagnostics.push(
        diagnostic(
          `walkable.floors[${floor.z}]`,
          'HUNT_WALKABLE_DISCONNECTED',
          `Floor ${floor.z} has ${floor.componentCount} reachable walkable components`,
        ),
      );
    }
  });

  return {
    floors: floorReports,
    diagnostics: sortDiagnostics(diagnostics),
  };
}
