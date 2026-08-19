import { describe, expect, it } from 'vitest';

import type {
  EntityId,
  SimulationEvent,
} from '../../../../packages/contracts/src/index.ts';

import { huntFloorSync, isRosterEvent } from './huntFloorSync';

function event(
  sequence: number,
  payload: SimulationEvent['payload'],
): SimulationEvent {
  return {
    tick: 0 as SimulationEvent['tick'],
    sequence,
    payload,
  };
}

const otherTransitioned = event(1, {
  type: 'actor/transitioned',
  entityId: 2 as EntityId,
  from: { x: 0, y: 0, z: 8 },
  to: { x: 0, y: 0, z: 9 },
});

const otherMoved = event(1, {
  type: 'actor/moved',
  entityId: 2 as EntityId,
  from: { x: 0, y: 0, z: 8 },
  to: { x: 1, y: 0, z: 8 },
  facing: 'e',
});

describe('huntFloorSync', () => {
  it('treats another actor leaving the floor as a roster update', () => {
    expect(isRosterEvent(otherTransitioned)).toBe(true);
    expect(huntFloorSync(8, 8, [otherTransitioned])).toBe('sync-roster');
  });

  it('rebuilds only when the presented floor itself changed', () => {
    expect(huntFloorSync(8, 9, [otherTransitioned])).toBe('rebuild');
  });

  it('leaves the floor alone when another actor only walks', () => {
    expect(isRosterEvent(otherMoved)).toBe(false);
    expect(huntFloorSync(8, 8, [otherMoved])).toBe('skip');
  });
});
