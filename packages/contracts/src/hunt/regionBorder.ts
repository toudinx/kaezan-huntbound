/** The rectangle a hunt region occupies, which is all the border rule needs. */
export interface RegionExtent {
  readonly width: number;
  readonly height: number;
}

/**
 * How many cells of the region rectangle the hunt keeps out of play.
 *
 * A region is a window cut out of the Canary map, so its outermost cells carry
 * ground whose continuation was never extracted. Left in play they read as an
 * open corridor the kernel then refuses to walk into. One ring is enough: the
 * scenario blocks it and the presentation composes no ground there, so the map
 * ends on the same rock face it uses for every other void.
 */
export const HUNT_REGION_BORDER_TILES = 1;

export function isHuntRegionBorderCell(
  extent: RegionExtent,
  x: number,
  y: number,
): boolean {
  const margin = HUNT_REGION_BORDER_TILES;
  return (
    x < margin ||
    y < margin ||
    x >= extent.width - margin ||
    y >= extent.height - margin
  );
}

/** The border ring as row-major cell indices, ascending. */
export function huntRegionBorderCells(extent: RegionExtent): readonly number[] {
  const cells: number[] = [];
  for (let y = 0; y < extent.height; y += 1) {
    for (let x = 0; x < extent.width; x += 1) {
      if (isHuntRegionBorderCell(extent, x, y))
        cells.push(y * extent.width + x);
    }
  }
  return cells;
}
