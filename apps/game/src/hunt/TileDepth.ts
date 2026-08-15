import type { HuntDrawLayer } from './HuntPresentation';

/** The order the layers of one tile are painted in. */
const LAYER_RANK: Readonly<Record<HuntDrawLayer, number>> = {
  ground: 0,
  objectsBelow: 1,
  actors: 2,
  objectsAbove: 3,
};

const LAYERS_PER_TILE = Object.keys(LAYER_RANK).length;

/** How many items one tile's layer can stack before it reaches the next one. */
const STACK_LIMIT = 1_000;

/**
 * The paint order of one thing standing on one tile.
 *
 * Tibia paints the map tile by tile — a row at a time, left to right — and only
 * then, inside a tile, ground before objects before the creature before the
 * things that hang over it. Ordering by layer first instead puts every actor
 * over every wall, whatever tile each is on, so a character walking against a
 * wall is drawn on top of it rather than behind it.
 *
 * Because a cell overhangs its tile upwards and to the left, this order is also
 * what makes an actor pass behind the wall east and south of him while still
 * passing in front of the wall north and west of him.
 */
export function tileDepth(input: {
  readonly x: number;
  readonly y: number;
  readonly layer: HuntDrawLayer;
  readonly stackIndex: number;
  /** Tiles per row, so a column never bleeds into the next row's order. */
  readonly regionWidth: number;
}): number {
  const tile = input.y * input.regionWidth + input.x;
  const stack = Math.min(Math.max(input.stackIndex, 0), STACK_LIMIT - 1);

  return tile * LAYERS_PER_TILE + LAYER_RANK[input.layer] + stack / STACK_LIMIT;
}

/**
 * The paint order of an actor, who may be straddling two tiles.
 *
 * The simulation hands him the destination the moment a step starts, but he
 * glides over the tile he is leaving for the whole step. Sorting him with the
 * destination buries him under the floor of the tile he is still standing on
 * when he walks north or west, and sorting him with the origin does the same
 * when he walks south or east — either way the floor eats him and lets him back
 * out as he slides across, which reads on screen as the actor fading in.
 *
 * Taking the later of the two tiles keeps him over both floors for the whole
 * step, and still leaves him behind everything painted after them.
 */
export function actorDepth(input: {
  readonly from: { readonly x: number; readonly y: number };
  readonly to: { readonly x: number; readonly y: number };
  readonly regionWidth: number;
}): number {
  const at = (cell: { readonly x: number; readonly y: number }): number =>
    tileDepth({
      x: Math.round(cell.x),
      y: Math.round(cell.y),
      layer: 'actors',
      stackIndex: 0,
      regionWidth: input.regionWidth,
    });

  return Math.max(at(input.from), at(input.to));
}
