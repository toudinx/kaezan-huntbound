import type { ActorState, EntityId, GridPosition } from '@huntbound/contracts';

export interface OccupancyIndex {
  occupantAt(position: GridPosition): EntityId | undefined;
  isOccupied(position: GridPosition): boolean;
}

export function createOccupancyIndex(
  actors: readonly ActorState[],
): OccupancyIndex {
  const rows = new Map<number, Map<number, EntityId>>();

  for (const actor of actors) {
    let row = rows.get(actor.position.x);
    if (row === undefined) {
      row = new Map<number, EntityId>();
      rows.set(actor.position.x, row);
    }
    row.set(actor.position.y, actor.entityId);
  }

  const occupantAt = (position: GridPosition): EntityId | undefined =>
    rows.get(position.x)?.get(position.y);

  return {
    occupantAt,
    isOccupied: (position) => occupantAt(position) !== undefined,
  };
}
