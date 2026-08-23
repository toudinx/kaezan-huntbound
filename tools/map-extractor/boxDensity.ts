import type {
  HuntDefinition,
  MapRegionFloor,
} from '../../packages/contracts/src/hunt/types.ts';
import type { GridPosition } from '../../packages/contracts/src/simulation/types.ts';
import {
  createStaticGrid,
  isSightClear,
} from '../../packages/simulation/src/grid/index.ts';

/**
 * Chebyshev tiles a `hunter` creature can acquire a target from. It is
 * `CANARY_VIEW_RANGE_TILES`, the value `composeCreature` writes into every
 * blueprint that has an attack, restated here so the measurement does not
 * depend on the content package.
 */
export const AGGRO_RADIUS_TILES = 11;

export interface BoxSpot {
  readonly position: GridPosition;
  readonly pullableSlots: number;
}

export interface BoxDensityReport {
  /** The best spot on the map, or `null` when no tile can pull anything. */
  readonly best: BoxSpot | null;
  /** How many walkable tiles reach at least `n` slots, indexed by `n`. */
  readonly tilesByPull: readonly number[];
}

function walkableAt(
  floor: MapRegionFloor,
  x: number,
  y: number,
  width: number,
): boolean {
  return !floor.collision.includes(y * width + x);
}

function spawnSlotPositions(hunt: HuntDefinition): readonly GridPosition[] {
  return hunt.spawns.groups.flatMap((group) =>
    group.slots.map((slot) => ({
      x: group.center.x + slot.offsetX,
      y: group.center.y + slot.offsetY,
      z: group.center.z + slot.offsetZ,
    })),
  );
}

/**
 * How many creatures a player can gather onto one tile.
 *
 * A knight's box is not a property of the kit: it is a property of the map.
 * The measurement stands in for the pull itself — every spawn slot on the
 * same floor, within aggro range, with a clear sight line, is a creature that
 * will walk to whoever stands there. Sight is the same `Map::isSightClear`
 * port the kernel uses to acquire targets, so a wall between the player and a
 * spawn correctly disqualifies it.
 *
 * The number is an upper bound: it counts seats, and a seat is only occupied
 * when its respawn timer has elapsed.
 */
export function analyzeBoxDensity(
  hunt: HuntDefinition,
  aggroRadiusTiles: number = AGGRO_RADIUS_TILES,
): BoxDensityReport {
  const { width, height, floors } = hunt.region;
  const grid = createStaticGrid({
    width,
    height,
    floors: floors.map((floor) => ({
      z: floor.z,
      blockedTiles: floor.collision.map(
        (index) => [index % width, Math.floor(index / width)] as const,
      ),
    })),
    transitions: [],
  });

  const slots = spawnSlotPositions(hunt);
  const tilesByPull: number[] = [];
  let best: BoxSpot | null = null;

  for (const floor of floors) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (!walkableAt(floor, x, y, width)) continue;
        const from: GridPosition = { x, y, z: floor.z };

        let pullableSlots = 0;
        for (const slot of slots) {
          if (slot.z !== from.z) continue;
          if (
            Math.max(Math.abs(slot.x - from.x), Math.abs(slot.y - from.y)) >
            aggroRadiusTiles
          ) {
            continue;
          }
          if (!isSightClear(grid, from, slot)) continue;
          pullableSlots += 1;
        }

        while (tilesByPull.length <= pullableSlots) tilesByPull.push(0);
        for (let n = 0; n <= pullableSlots; n += 1) {
          tilesByPull[n] = (tilesByPull[n] ?? 0) + 1;
        }

        if (best === null || pullableSlots > best.pullableSlots) {
          best = { position: from, pullableSlots };
        }
      }
    }
  }

  return { best, tilesByPull };
}
