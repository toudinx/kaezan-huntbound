import { describe, expect, it } from 'vitest';

import type {
  EntityId,
  GridPosition,
} from '../../../../packages/contracts/src/index.ts';

import { resolveTargetRing, type TargetRingActor } from './TargetRing';

function actor(
  entityId: number,
  x: number,
  y: number,
  visible = true,
): TargetRingActor {
  return {
    entityId: entityId as EntityId,
    position: { x, y, z: 8 },
    visible,
  };
}

describe('TargetRing', () => {
  it('derives a visible ring from the selected actor tile', () => {
    expect(
      resolveTargetRing(2 as EntityId, [actor(1, 5, 5), actor(2, 6, 5)]),
    ).toEqual({
      targetEntityId: 2,
      position: { x: 6, y: 5, z: 8 } satisfies GridPosition,
      visible: true,
    });
  });

  it('moves the ring when the target selection changes', () => {
    const actors = [actor(1, 5, 5), actor(2, 6, 5), actor(3, 7, 5)];

    expect(resolveTargetRing(2 as EntityId, actors).position).toEqual({
      x: 6,
      y: 5,
      z: 8,
    });
    expect(resolveTargetRing(3 as EntityId, actors).position).toEqual({
      x: 7,
      y: 5,
      z: 8,
    });
  });

  it('hides when the selected actor dies or is no longer visible', () => {
    expect(resolveTargetRing(2 as EntityId, [actor(1, 5, 5)])).toEqual({
      targetEntityId: null,
      position: null,
      visible: false,
    });
    expect(resolveTargetRing(2 as EntityId, [actor(2, 6, 5, false)])).toEqual({
      targetEntityId: null,
      position: null,
      visible: false,
    });
  });

  it('hides when the target selection is cleared', () => {
    expect(resolveTargetRing(null, [actor(2, 6, 5)])).toEqual({
      targetEntityId: null,
      position: null,
      visible: false,
    });
  });
});
