import type { MapRegion } from '../../../../packages/contracts/src/index.ts';

export interface GroundSample {
  readonly paletteIndex: number;
  readonly sourceZ: number;
}

function validPaletteIndex(region: MapRegion, paletteIndex: number): boolean {
  if (!Number.isSafeInteger(paletteIndex) || paletteIndex < 0) return false;
  const serverId = region.palette[paletteIndex];
  return (
    Number.isSafeInteger(serverId) && serverId !== undefined && serverId > 0
  );
}

export function resolveGroundSample(
  region: MapRegion,
  activeZ: number,
  cellIndex: number,
): GroundSample | undefined {
  if (!Number.isSafeInteger(cellIndex) || cellIndex < 0) return undefined;

  const orderedFloors = [
    ...region.floors.filter((floor) => floor.z === activeZ),
    ...region.floors
      .filter((floor) => floor.z > activeZ)
      .sort((left, right) => left.z - right.z),
  ];

  for (const floor of orderedFloors) {
    const paletteIndex = floor.ground[cellIndex];
    if (paletteIndex !== undefined && validPaletteIndex(region, paletteIndex)) {
      return { paletteIndex, sourceZ: floor.z };
    }
  }

  return undefined;
}

export interface GroundCompositionStats {
  readonly composedGroundCells: number;
  readonly unresolvedGroundCells: number;
}

export function groundCompositionStats(
  region: MapRegion,
  activeZ: number,
): GroundCompositionStats {
  let composedGroundCells = 0;
  let unresolvedGroundCells = 0;
  const cellCount = region.width * region.height;

  for (let index = 0; index < cellCount; index += 1) {
    if (resolveGroundSample(region, activeZ, index) === undefined) {
      unresolvedGroundCells += 1;
    } else {
      composedGroundCells += 1;
    }
  }

  return { composedGroundCells, unresolvedGroundCells };
}
