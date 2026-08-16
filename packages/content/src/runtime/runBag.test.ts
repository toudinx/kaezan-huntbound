import type { SimulationEvent } from '@huntbound/contracts';
import { createEntityId, createTickIndex } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { projectRunBag } from './runBag.ts';

const itemKeys = ['item:tibia:gold-coin', 'item:tibia:health-potion'] as const;

function lootEvent(
  sequence: number,
  itemIndex: number,
  count: number,
): SimulationEvent {
  return {
    tick: createTickIndex(4),
    sequence,
    payload: {
      type: 'loot/granted',
      entityId: createEntityId(1),
      sourceEntityId: createEntityId(2),
      itemIndex,
      count,
    },
  };
}

describe('projectRunBag', () => {
  it('aggregates loot by item key, ignores other events, and sorts by key', () => {
    const events: readonly SimulationEvent[] = [
      {
        tick: createTickIndex(4),
        sequence: 1,
        payload: {
          type: 'actor/died',
          entityId: createEntityId(2),
          killerEntityId: createEntityId(1),
          position: { x: 2, y: 1, z: 7 },
        },
      },
      lootEvent(2, 1, 2),
      lootEvent(3, 0, 1),
      lootEvent(4, 1, 3),
    ];

    expect(projectRunBag(events, itemKeys)).toEqual([
      { itemKey: 'item:tibia:gold-coin', count: 1 },
      { itemKey: 'item:tibia:health-potion', count: 5 },
    ]);
  });

  it('is incremental and does not mutate the previous projection', () => {
    const firstBatch = [lootEvent(1, 1, 2)];
    const secondBatch = [lootEvent(2, 0, 1), lootEvent(3, 1, 3)];
    const firstProjection = projectRunBag(firstBatch, itemKeys);
    const incremental = projectRunBag(secondBatch, itemKeys, firstProjection);

    expect(incremental).toEqual(
      projectRunBag([...firstBatch, ...secondBatch], itemKeys),
    );
    expect(firstProjection).toEqual([
      { itemKey: 'item:tibia:health-potion', count: 2 },
    ]);
  });

  it('throws explicitly when a loot event references an unknown item index', () => {
    expect(() => projectRunBag([lootEvent(1, 2, 1)], itemKeys)).toThrow(
      /itemIndex 2/,
    );
  });
});
