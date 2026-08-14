import type {
  ActorState,
  Direction,
  GridPosition,
  MoveBlockedReason,
} from '@huntbound/contracts';

import {
  directionDelta,
  isDiagonal,
  stepCostTicks,
  translate,
} from './directions.ts';
import type { OccupancyIndex } from './occupancy.ts';
import type { StaticGrid } from './staticGrid.ts';

export type StepOutcome =
  | {
      readonly ok: true;
      readonly to: GridPosition;
      readonly costTicks: number;
      /**
       * Set only when the cell the step lands on declares a transition. `to`
       * stays the geometric destination; this is where the actor ends the tick.
       */
      readonly transitionedTo?: GridPosition;
    }
  | {
      readonly ok: false;
      readonly reason: MoveBlockedReason;
      readonly attempted: GridPosition;
    };

function blocked(
  reason: MoveBlockedReason,
  attempted: GridPosition,
): StepOutcome {
  return { ok: false, reason, attempted };
}

export function resolveStep(
  grid: StaticGrid,
  occupancy: OccupancyIndex,
  actor: ActorState,
  direction: Direction,
  baseTicks: number,
): StepOutcome {
  const attempted = translate(actor.position, direction);

  if (!grid.isInside(attempted)) {
    return blocked('bounds', attempted);
  }

  if (grid.isBlockedTerrain(attempted)) {
    return blocked('terrain', attempted);
  }

  if (isDiagonal(direction)) {
    const { dx, dy } = directionDelta(direction);
    const horizontalCorner: GridPosition = {
      x: actor.position.x + dx,
      y: actor.position.y,
      z: actor.position.z,
    };
    const verticalCorner: GridPosition = {
      x: actor.position.x,
      y: actor.position.y + dy,
      z: actor.position.z,
    };

    if (
      grid.isBlockedTerrain(horizontalCorner) ||
      grid.isBlockedTerrain(verticalCorner)
    ) {
      return blocked('diagonal-corner', attempted);
    }
  }

  if (occupancy.isOccupied(attempted)) {
    return blocked('occupied', attempted);
  }

  const costTicks = stepCostTicks(baseTicks, direction);
  // A guarded actor is still leaving the cell it landed on, so no transition is
  // considered for this step — not even to block it.
  const transitionedTo =
    actor.transitionGuard === null ? grid.transitionAt(attempted) : undefined;

  if (transitionedTo === undefined) {
    return { ok: true, to: attempted, costTicks };
  }

  // Arrival respects occupancy: a taken landing cell blocks the whole step and
  // the actor keeps its origin, rather than half-moving onto the stairs.
  if (occupancy.isOccupied(transitionedTo)) {
    return blocked('transition-blocked', attempted);
  }

  return { ok: true, to: attempted, costTicks, transitionedTo };
}
