import { describe, expect, it } from 'vitest';

import type {
  EntityId,
  GridPosition,
  SimulationEvent,
  TickIndex,
} from '../../../../packages/contracts/src/index.ts';

import {
  type CombatTargetActor,
  createCombatTargetSelection,
} from './CombatTargeting';

function position(x: number, y: number): GridPosition {
  return { x, y, z: 8 };
}

function actors(): readonly CombatTargetActor[] {
  return [
    {
      entityId: 1 as EntityId,
      blueprintId: 'player',
      position: position(5, 5),
    },
    {
      entityId: 2 as EntityId,
      blueprintId: 'rotworm',
      position: position(6, 5),
    },
    {
      entityId: 3 as EntityId,
      blueprintId: 'rotworm',
      position: position(7, 5),
    },
  ];
}

function event(payload: SimulationEvent['payload'], tick = 1): SimulationEvent {
  return { tick: tick as TickIndex, sequence: tick, payload };
}

describe('CombatTargeting', () => {
  it('selects a clicked creature and cycles through enemy actors', () => {
    const selection = createCombatTargetSelection({
      playerEntityId: 1 as EntityId,
    });

    expect(selection.select(2 as EntityId, actors())).toBe(true);
    expect(selection.targetId()).toBe(2);

    selection.cycle(actors());
    expect(selection.targetId()).toBe(3);

    selection.cycle(actors());
    expect(selection.targetId()).toBe(2);
  });

  it('clears a selected target when its death event arrives', () => {
    const selection = createCombatTargetSelection({
      playerEntityId: 1 as EntityId,
    });
    selection.select(2 as EntityId, actors());

    selection.handle([
      event({
        type: 'actor/died',
        entityId: 2 as EntityId,
        killerEntityId: 1 as EntityId,
        position: position(6, 5),
      }),
    ]);

    expect(selection.targetId()).toBeNull();
  });

  it('keeps an out-of-range target while exposing the kernel rejection', () => {
    const selection = createCombatTargetSelection({
      playerEntityId: 1 as EntityId,
    });
    selection.select(3 as EntityId, actors());

    selection.handle([
      event({
        type: 'command/rejected',
        commandType: 'actor/attack',
        commandSequence: 4,
        code: 'SIM_ATTACK_OUT_OF_RANGE',
      }),
    ]);

    expect(selection.targetId()).toBe(3);
    expect(selection.rejection()).toEqual({
      commandType: 'actor/attack',
      code: 'SIM_ATTACK_OUT_OF_RANGE',
      tick: 1,
    });
  });

  it('follows the player target-changed event from the kernel', () => {
    const selection = createCombatTargetSelection({
      playerEntityId: 1 as EntityId,
    });

    selection.handle([
      event({
        type: 'combat/target-changed',
        entityId: 1 as EntityId,
        targetEntityId: 3 as EntityId,
      }),
    ]);

    expect(selection.targetId()).toBe(3);
  });
});
