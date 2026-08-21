import type {
  ActorState,
  Direction,
  EntityId,
  GridPosition,
} from '@huntbound/contracts';

import { chebyshevDistance, DIRECTIONS } from './directions.ts';
import type { OccupancyIndex } from './occupancy.ts';
import type { StaticGrid } from './staticGrid.ts';
import { resolveStep } from './step.ts';

/** Search ceiling on the scale of `CANARY_VIEW_RANGE_TILES` (11). */
export const PATH_MAX_SEARCH_DIST = 12;

/**
 * Canary `WALK_TARGET_NEARBY_EXTRA_COST = 2`: a step taken while `dx <= 1` and
 * `dy <= 1` costs twice as much, so the monster does not orbit at full speed.
 */
export const WALK_TARGET_NEARBY_EXTRA_COST = 2;

export function nearbyTargetStepCostTicks(costTicks: number): number {
  return costTicks * WALK_TARGET_NEARBY_EXTRA_COST;
}

function walkerStub(entityId: EntityId, position: GridPosition): ActorState {
  return {
    entityId,
    blueprintId: 'path-walker',
    position,
    facing: 'n',
    readyAtTick: 0,
    transitionGuard: null,
    health: 1,
    resource: 0,
    targetEntityId: null,
    attackReadyAtTick: 0,
    groupCooldowns: [],
    abilityCooldowns: [],
    nextHealthRegenTick: 0,
    nextResourceRegenTick: 0,
    lastDamageReceivedTick: 0,
    activeConditions: [],
    abilityCharges: [],
  };
}

function cellKey(position: GridPosition): string {
  return `${position.x}:${position.y}:${position.z}`;
}

/**
 * First step of the shortest 8-neighbour path onto any cell at Chebyshev
 * `<= targetDistance` of `target`. Ties break in `DIRECTIONS` order. No path
 * within `maxSearchDist` returns `undefined` so the caller can fall back to
 * `greedyStepDirection`.
 */
export function firstPathStepDirection(
  grid: StaticGrid,
  occupancy: OccupancyIndex,
  from: GridPosition,
  target: GridPosition,
  options: {
    readonly walkerId: EntityId;
    readonly targetDistance: number;
    readonly maxSearchDist?: number;
  },
): Direction | undefined {
  if (from.z !== target.z) {
    return undefined;
  }
  if (chebyshevDistance(from, target) <= options.targetDistance) {
    return undefined;
  }

  const maxSearchDist = options.maxSearchDist ?? PATH_MAX_SEARCH_DIST;
  const queue: {
    readonly position: GridPosition;
    readonly firstDirection: Direction | undefined;
  }[] = [{ position: from, firstDirection: undefined }];
  const visited = new Set<string>([cellKey(from)]);

  while (queue.length > 0) {
    const node = queue.shift();
    if (node === undefined) {
      break;
    }
    const actor = walkerStub(options.walkerId, node.position);
    for (const direction of DIRECTIONS) {
      const outcome = resolveStep(grid, occupancy, actor, direction, 1);
      if (!outcome.ok) {
        continue;
      }
      if (outcome.transitionedTo !== undefined) {
        continue;
      }
      const next = outcome.to;
      if (chebyshevDistance(from, next) > maxSearchDist) {
        continue;
      }
      const key = cellKey(next);
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);
      const firstDirection = node.firstDirection ?? direction;
      if (chebyshevDistance(next, target) <= options.targetDistance) {
        return firstDirection;
      }
      queue.push({ position: next, firstDirection });
    }
  }

  return undefined;
}
