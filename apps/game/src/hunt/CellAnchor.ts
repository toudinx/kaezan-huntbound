/** The pixel size of one tile in the source art, before any camera zoom. */
const SOURCE_TILE_PX = 32;

/** Where a cell-sized sprite hangs, and how big it is drawn. */
export interface CellAnchor {
  /** Phaser origin, as a fraction of the sprite's own size. */
  readonly originX: number;
  readonly originY: number;
  /** World position the origin is pinned to. */
  readonly x: number;
  readonly y: number;
  /** World size the cell is drawn at. */
  readonly width: number;
  readonly height: number;
}

/**
 * Hangs a cell from the bottom-right corner of the tile it belongs to.
 *
 * Tibia authors art in cells that are a whole number of tiles across, and a
 * one-sqm figure always occupies the cell's bottom-right tile: the knight is a
 * 32x32 figure inside a 64x64 cell, with the rest of the cell reserved for
 * creatures that really are two tiles wide. Hanging every cell from that corner
 * is therefore what keeps a figure standing on its own sqm, whatever its cell
 * size — centring the cell on the tile instead pushes a 64-wide figure half a
 * tile to the right, which is what made the actor's sqm ambiguous.
 */
export function cellAnchor(input: {
  readonly cell: { readonly x: number; readonly y: number };
  readonly cellWidth: number;
  readonly cellHeight: number;
  readonly scale: number;
  readonly tileSize: number;
}): CellAnchor {
  const tilesWide = input.cellWidth / SOURCE_TILE_PX;
  const tilesTall = input.cellHeight / SOURCE_TILE_PX;

  return {
    originX: 1,
    originY: 1,
    x: (input.cell.x + 1) * input.tileSize,
    y: (input.cell.y + 1) * input.tileSize,
    width: tilesWide * input.tileSize * input.scale,
    height: tilesTall * input.tileSize * input.scale,
  };
}
