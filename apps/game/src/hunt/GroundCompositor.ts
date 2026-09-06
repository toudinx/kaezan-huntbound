import {
  isHuntRegionBorderCell,
  type MapRegion,
} from '../../../../packages/contracts/src/index.ts';

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

/**
 * The ground under one cell, or nothing when the cell has none.
 *
 * The border ring of the region rectangle is answered as empty even where the
 * extraction did carry ground: that ground continues onto a floor nobody cut,
 * and the kernel blocks the ring for the same reason. Answering it here — the
 * one place the floor, the minimap and the world edge all ask — is what makes
 * the map end on a rock face instead of on a corridor that refuses to be
 * walked.
 */
export function resolveGroundSample(
  region: MapRegion,
  activeZ: number,
  cellIndex: number,
): GroundSample | undefined {
  if (!Number.isSafeInteger(cellIndex) || cellIndex < 0) return undefined;
  if (
    isHuntRegionBorderCell(
      region,
      cellIndex % region.width,
      Math.floor(cellIndex / region.width),
    )
  ) {
    return undefined;
  }

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

/**
 * Every cell of the region rectangle this floor cannot put ground under.
 *
 * The presentation has to paint something over these or the canvas shows
 * through and the edge of the map reads as a failed load. It asks here instead
 * of testing the palette itself so `resolveGroundSample` stays the one answer:
 * a wider extraction window changes what is empty, and only this module should
 * have to notice.
 */
export function unresolvedGroundCells(
  region: MapRegion,
  activeZ: number,
): readonly number[] {
  const cells: number[] = [];
  const cellCount = region.width * region.height;

  for (let index = 0; index < cellCount; index += 1) {
    if (resolveGroundSample(region, activeZ, index) === undefined) {
      cells.push(index);
    }
  }

  return cells;
}

/**
 * The empty cells that share a side with a cell that does have ground.
 *
 * One flat dark fill still reads as a hole punched in the page where it meets a
 * lit floor, because the boundary is a hard line with nothing on the far side.
 * These are the cells the scene paints as a rock face instead, so the map ends
 * on something that catches light rather than on an edge.
 */
export function groundEdgeCells(
  region: MapRegion,
  activeZ: number,
): readonly number[] {
  const hasGround = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= region.width || y >= region.height) return false;
    return (
      resolveGroundSample(region, activeZ, y * region.width + x) !== undefined
    );
  };

  return unresolvedGroundCells(region, activeZ).filter((index) => {
    const x = index % region.width;
    const y = Math.floor(index / region.width);
    return (
      hasGround(x - 1, y) ||
      hasGround(x + 1, y) ||
      hasGround(x, y - 1) ||
      hasGround(x, y + 1)
    );
  });
}

/** The inclusive cell box, in region coordinates, that holds every cell with
 * ground on this floor. `undefined` when the floor composes no ground at all. */
export interface GroundBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/**
 * Where the walkable world actually is inside the region rectangle.
 *
 * The extracted region is a rectangle, but the cave inside it is not: the
 * current window carries an empty margin on all four sides. The camera frames
 * this box rather than the rectangle, so it never travels over ground that was
 * never there.
 */
export function groundBounds(
  region: MapRegion,
  activeZ: number,
): GroundBounds | undefined {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const cellCount = region.width * region.height;

  for (let index = 0; index < cellCount; index += 1) {
    if (resolveGroundSample(region, activeZ, index) === undefined) continue;

    const x = index % region.width;
    const y = Math.floor(index / region.width);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  if (maxX < minX || maxY < minY) return undefined;

  return { minX, minY, maxX, maxY };
}

export interface GroundCompositionStats {
  readonly composedGroundCells: number;
  readonly unresolvedGroundCells: number;
}

export function groundCompositionStats(
  region: MapRegion,
  activeZ: number,
): GroundCompositionStats {
  const unresolved = unresolvedGroundCells(region, activeZ).length;

  return {
    composedGroundCells: region.width * region.height - unresolved,
    unresolvedGroundCells: unresolved,
  };
}
