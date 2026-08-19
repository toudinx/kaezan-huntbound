import type { SimulationEvent } from '../../../../packages/contracts/src/index.ts';

/**
 * Events that change which actor sprites exist, without changing the painted
 * floor. A non-player `actor/transitioned` belongs here: the roster updates,
 * the tiles stay.
 */
export function isRosterEvent(event: SimulationEvent): boolean {
  switch (event.payload.type) {
    case 'actor/spawned':
    case 'actor/despawned':
    case 'actor/died':
    case 'actor/transitioned':
      return true;
    default:
      return false;
  }
}

export type HuntFloorSync = 'rebuild' | 'sync-roster' | 'skip';

export function huntFloorSync(
  floorBefore: number,
  floorAfter: number,
  events: readonly SimulationEvent[],
): HuntFloorSync {
  if (floorBefore !== floorAfter) {
    return 'rebuild';
  }
  if (events.some(isRosterEvent)) {
    return 'sync-roster';
  }
  return 'skip';
}
