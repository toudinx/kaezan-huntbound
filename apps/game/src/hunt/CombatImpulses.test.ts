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
  SHAKE_DAMAGE_FRACTION_THRESHOLD,
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
  amount = 12,
  remainingHealth = 80,
): SimulationEvent {
  return event(tick, {
    type: 'combat/damaged',
    entityId: entityId as EntityId,
    sourceEntityId: sourceEntityId as EntityId,
    amount,
    remainingHealth,
    cause: 'attack',
  });
}

function input(
  events: readonly SimulationEvent[],
  playerMaximumHealth: number | null = 100,
) {
  return {
    events,
    playerEntityId: 1 as EntityId,
    playerMaximumHealth,
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

  it('keeps impact impulses for a light player hit but omits the camera shake', () => {
    const impulses = createCombatImpulses();

    impulses.handle(input([damaged(10, 1, 2, 9)]));

    expect(
      impulses.current().filter((impulse) => impulse.kind === 'shake'),
    ).toEqual([]);
    expect(
      impulses.current().filter((impulse) => impulse.kind !== 'shake'),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'flash', entityId: 1 }),
        expect.objectContaining({ kind: 'lunge', entityId: 2 }),
        expect.objectContaining({ kind: 'hit-stop', entityId: 1 }),
        expect.objectContaining({ kind: 'hit-stop', entityId: 2 }),
      ]),
    );
  });

  it('shakes at the damage threshold and above, including exactly the threshold', () => {
    const atThreshold = createCombatImpulses();
    const aboveThreshold = createCombatImpulses();
    const thresholdDamage = Math.ceil(100 * SHAKE_DAMAGE_FRACTION_THRESHOLD);

    atThreshold.handle(input([damaged(10, 1, 2, thresholdDamage)]));
    aboveThreshold.handle(input([damaged(10, 1, 2, thresholdDamage + 1)]));

    expect(
      atThreshold.current().filter((impulse) => impulse.kind === 'shake'),
    ).toHaveLength(1);
    expect(
      aboveThreshold.current().filter((impulse) => impulse.kind === 'shake'),
    ).toHaveLength(1);
  });

  it('coalesces a same-tick box of light hits while keeping one heavy shake', () => {
    const impulses = createCombatImpulses();

    impulses.handle(
      input([
        damaged(10, 1, 2, 9),
        damaged(10, 1, 2, 9),
        damaged(10, 1, 2, 9),
        damaged(10, 1, 2, 9),
        damaged(10, 1, 2, 9),
        damaged(10, 1, 2, 9),
        damaged(10, 1, 2, 9),
        damaged(10, 1, 2, 10),
      ]),
    );

    expect(
      impulses.current().filter((impulse) => impulse.kind === 'shake'),
    ).toHaveLength(1);
  });

  it('ignores missing or non-finite player maximum health for shake decisions', () => {
    for (const playerMaximumHealth of [
      null,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      const impulses = createCombatImpulses();

      impulses.handle(input([damaged(10, 1, 2, 1000)], playerMaximumHealth));

      expect(
        impulses.current().filter((impulse) => impulse.kind === 'shake'),
      ).toEqual([]);
    }
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
