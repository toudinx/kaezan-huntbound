import type { GridPosition, KernelScenario } from '@huntbound/contracts';

/** Terrain of a single declared floor. Cells are addressed row-major. */
export interface FloorGrid {
  readonly z: number;
  isBlockedTerrain(position: GridPosition): boolean;
}

export interface StaticGrid {
  readonly width: number;
  readonly height: number;
  readonly floors: readonly number[];
  hasFloor(z: number): boolean;
  isInside(position: GridPosition): boolean;
  isBlockedTerrain(position: GridPosition): boolean;
  transitionAt(position: GridPosition): GridPosition | undefined;
}

function tileKey(x: number, y: number, width: number): number {
  return y * width + x;
}

function positionKey(position: GridPosition): string {
  return `${position.x}:${position.y}:${position.z}`;
}

function clonePosition(position: GridPosition): GridPosition {
  return { x: position.x, y: position.y, z: position.z };
}

export function createStaticGrid(scenario: KernelScenario): StaticGrid {
  const { width, height } = scenario;

  const floorsByZ = new Map<number, FloorGrid>();
  for (const floor of scenario.floors) {
    const blocked = new Set(
      floor.blockedTiles.map(([x, y]) => tileKey(x, y, width)),
    );
    floorsByZ.set(floor.z, {
      z: floor.z,
      isBlockedTerrain: (position) =>
        blocked.has(tileKey(position.x, position.y, width)),
    });
  }

  const transitions = new Map<string, GridPosition>(
    scenario.transitions.map((transition) => [
      positionKey(transition.from),
      clonePosition(transition.to),
    ]),
  );

  const withinBounds = (position: GridPosition): boolean =>
    position.x >= 0 &&
    position.x < width &&
    position.y >= 0 &&
    position.y < height;

  const isInside = (position: GridPosition): boolean =>
    floorsByZ.has(position.z) && withinBounds(position);

  return {
    width,
    height,
    floors: scenario.floors.map((floor) => floor.z),
    hasFloor: (z) => floorsByZ.has(z),
    isInside,
    isBlockedTerrain: (position) =>
      isInside(position) &&
      (floorsByZ.get(position.z)?.isBlockedTerrain(position) ?? false),
    transitionAt: (position) => {
      const target = transitions.get(positionKey(position));
      return target === undefined ? undefined : clonePosition(target);
    },
  };
}
