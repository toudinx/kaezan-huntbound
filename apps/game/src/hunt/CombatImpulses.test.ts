import { describe, expect, it } from 'vitest';

import type {
  EntityId,
  GridPosition,
  SimulationEvent,
  TickIndex,
} from '../../../../packages/contracts/src/index.ts';

import {
  createCombatImpulses,
  HIT_STOP_MAX_MS,
  LUNGE_TTL_MS,
  SHAKE_TTL_MS,
} from './CombatImpulses';

function position(x: number, y: number): GridPosition {
  return { x, y, z: 8 };
}

function event(
  tick: number,
  payload: SimulationEvent['payload'],
): SimulationEvent {
  return { tick: tick as TickIndex, sequence: tick, payload };
}

function damaged(
  tick: number,
  entityId: number,
  sourceEntityId: number,
): SimulationEvent {
  return event(tick, {
    type: 'combat/damaged',
    entityId: entityId as EntityId,
    sourceEntityId: sourceEntityId as EntityId,
    amount: 12,
    remainingHealth: 80,
    cause: 'attack',
  });
}

function input(events: readonly SimulationEvent[]) {
  return {
    events,
    playerEntityId: 1 as EntityId,
    actorPositions: new Map<EntityId, GridPosition>([
      [1 as EntityId, position(5, 5)],
      [2 as EntityId, position(6, 5)],
    ]),
  };
}

describe('CombatImpulses', () => {
  it('creates a flash on the damaged actor, lunge on the attacker, hit-stop on both, and player-only shake', () => {
    const impulses = createCombatImpulses();

    impulses.handle(input([damaged(10, 1, 2)]));

    expect(impulses.current()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'flash', entityId: 1 }),
        expect.objectContaining({ kind: 'lunge', entityId: 2 }),
        expect.objectContaining({ kind: 'hit-stop', entityId: 1 }),
        expect.objectContaining({ kind: 'hit-stop', entityId: 2 }),
        expect.objectContaining({ kind: 'shake', entityId: 1 }),
      ]),
    );

    const rotwormDamage = createCombatImpulses();
    rotwormDamage.handle(input([damaged(10, 2, 1)]));

    expect(
      rotwormDamage.current().filter((impulse) => impulse.kind === 'shake'),
    ).toEqual([]);
  });

  it('derives a deterministic shake offset and returns it to zero at its TTL', () => {
    const first = createCombatImpulses();
    const second = createCombatImpulses();
    const damage = damaged(10, 1, 2);

    first.handle(input([damage]));
    second.handle(input([damage]));

    expect(first.cameraOffset(10 * 50 + SHAKE_TTL_MS / 2)).toEqual(
      second.cameraOffset(10 * 50 + SHAKE_TTL_MS / 2),
    );
    expect(first.cameraOffset(10 * 50 + SHAKE_TTL_MS)).toEqual({ x: 0, y: 0 });
  });

  it('moves the attacker out and back within the lunge TTL', () => {
    const impulses = createCombatImpulses();
    const createdAtMs = 10 * 50;

    impulses.handle(input([damaged(10, 1, 2)]));

    expect(impulses.lungeOffset(2 as EntityId, createdAtMs)).toEqual({
      x: 0,
      y: 0,
    });
    expect(
      impulses.lungeOffset(2 as EntityId, createdAtMs + LUNGE_TTL_MS / 2),
    ).not.toEqual({ x: 0, y: 0 });
    expect(
      impulses.lungeOffset(2 as EntityId, createdAtMs + LUNGE_TTL_MS),
    ).toEqual({
      x: 0,
      y: 0,
    });
  });

  it('caps every hit-stop at 60 milliseconds and coalesces same-tick flashes', () => {
    const impulses = createCombatImpulses();

    impulses.handle(input([damaged(10, 1, 2), damaged(10, 1, 2)]));

    expect(
      impulses.current().filter((impulse) => impulse.kind === 'flash'),
    ).toHaveLength(1);
    expect(
      impulses
        .current()
        .filter((impulse) => impulse.kind === 'hit-stop')
        .every(
          (impulse) =>
            impulse.expiresAtMs - impulse.createdAtMs <= HIT_STOP_MAX_MS,
        ),
    ).toBe(true);
  });

  it('removes expired impulses and empties on reset', () => {
    const impulses = createCombatImpulses();

    impulses.handle(input([damaged(10, 1, 2)]));
    impulses.advance(10 * 50 + SHAKE_TTL_MS);
    expect(impulses.current()).toEqual([]);

    impulses.handle(input([damaged(11, 1, 2)]));
    impulses.reset();
    expect(impulses.current()).toEqual([]);
  });
});
