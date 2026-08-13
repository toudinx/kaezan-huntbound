import type { GridPosition, KernelScenario } from '@huntbound/contracts';

export interface StaticGrid {
  readonly width: number;
  readonly height: number;
  readonly z: number;
  isInside(position: GridPosition): boolean;
  isBlockedTerrain(position: GridPosition): boolean;
}

function tileKey(x: number, y: number, width: number): number {
  return y * width + x;
}

export function createStaticGrid(scenario: KernelScenario): StaticGrid {
  const blockedTiles = new Set(
    scenario.blockedTiles.map(([x, y]) => tileKey(x, y, scenario.width)),
  );

  const isInside = (position: GridPosition): boolean =>
    position.z === scenario.z &&
    position.x >= 0 &&
    position.x < scenario.width &&
    position.y >= 0 &&
    position.y < scenario.height;

  return {
    width: scenario.width,
    height: scenario.height,
    z: scenario.z,
    isInside,
    isBlockedTerrain: (position) =>
      isInside(position) &&
      blockedTiles.has(tileKey(position.x, position.y, scenario.width)),
  };
}
