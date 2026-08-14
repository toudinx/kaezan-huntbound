import type { ActorState, EntityId, GridPosition } from '@huntbound/contracts';

export interface OccupancyIndex {
  occupantAt(position: GridPosition): EntityId | undefined;
  isOccupied(position: GridPosition): boolean;
}

/**
 * The key includes `z`. Keying on `(x, y)` alone would make an actor one floor
 * down block the column above it, which is the easy defect of the multi-floor
 * bump.
 */
function cellKey(position: GridPosition): string {
  return `${position.x}:${position.y}:${position.z}`;
}

export function createOccupancyIndex(
  actors: readonly ActorState[],
): OccupancyIndex {
  const cells = new Map<string, EntityId>();

  for (const actor of actors) {
    cells.set(cellKey(actor.position), actor.entityId);
  }

  const occupantAt = (position: GridPosition): EntityId | undefined =>
    cells.get(cellKey(position));

  return {
    occupantAt,
    isOccupied: (position) => occupantAt(position) !== undefined,
  };
}
