import { describe, expect, it } from 'vitest';

import type {
  EntityId,
  GridPosition,
  SimulationEvent,
  TickIndex,
} from '../../../../packages/contracts/src/index.ts';

import {
  AUTOLOOT_ARC_TTL_MS,
  BLOOD_TTL_MS,
  CORPSE_TTL_MS,
  createCombatDecorations,
  createDecorationObjectPool,
} from './CombatDecorations';

function position(x: number, y: number): GridPosition {
  return { x, y, z: 8 };
}

function event(
  tick: number,
  payload: SimulationEvent['payload'],
): SimulationEvent {
  return { tick: tick as TickIndex, sequence: tick, payload };
}

describe('CombatDecorations', () => {
  it('creates non-blocking corpse and blood at death, then expires both by TTL', () => {
    const decorations = createCombatDecorations();
    const deathPosition = position(6, 5);

    decorations.handle({
      events: [
        event(10, {
          type: 'actor/died',
          entityId: 2 as EntityId,
          killerEntityId: 1 as EntityId,
          position: deathPosition,
        }),
      ],
      actorPositions: new Map(),
      playerPosition: position(5, 5),
    });

    expect(decorations.current()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'corpse',
          position: deathPosition,
          blocksMovement: false,
          expiresAtMs: 10 * 50 + CORPSE_TTL_MS,
        }),
        expect.objectContaining({
          kind: 'blood',
          position: deathPosition,
          blocksMovement: false,
          expiresAtMs: 10 * 50 + BLOOD_TTL_MS,
        }),
      ]),
    );

    decorations.advance(10 * 50 + Math.max(CORPSE_TTL_MS, BLOOD_TTL_MS));
    expect(decorations.current()).toEqual([]);
  });

  it('creates damage numbers and an autoloot arc from death to the player', () => {
    const decorations = createCombatDecorations();
    const deathPosition = position(6, 5);
    const playerPosition = position(5, 5);

    decorations.handle({
      events: [
        event(10, {
          type: 'actor/died',
          entityId: 2 as EntityId,
          killerEntityId: 1 as EntityId,
          position: deathPosition,
        }),
        event(10, {
          type: 'loot/granted',
          entityId: 1 as EntityId,
          sourceEntityId: 2 as EntityId,
          itemIndex: 0,
          count: 2,
        }),
        event(11, {
          type: 'combat/damaged',
          entityId: 2 as EntityId,
          sourceEntityId: 1 as EntityId,
          amount: 20,
          remainingHealth: 45,
          cause: 'attack',
        }),
      ],
      actorPositions: new Map([[2 as EntityId, deathPosition]]),
      playerPosition,
    });

    expect(decorations.current()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'damage-number',
          amount: 20,
          position: deathPosition,
        }),
        expect.objectContaining({
          kind: 'autoloot-arc',
          from: deathPosition,
          to: playerPosition,
          blocksMovement: false,
          expiresAtMs: 10 * 50 + AUTOLOOT_ARC_TTL_MS,
        }),
      ]),
    );
  });
});

interface PooledSprite {
  frame: number;
  alpha: number;
  rotation: number;
  scale: number;
}

describe('createDecorationObjectPool', () => {
  it('does not create more objects when expired decorations are replaced', () => {
    let created = 0;
    const pool = createDecorationObjectPool<PooledSprite>({
      reset: (sprite) => {
        sprite.frame = 0;
        sprite.alpha = 1;
        sprite.rotation = 0;
        sprite.scale = 1;
      },
    });

    const firstWave = [
      pool.acquire(() => {
        created += 1;
        return { frame: 0, alpha: 1, rotation: 0, scale: 1 };
      }),
      pool.acquire(() => {
        created += 1;
        return { frame: 0, alpha: 1, rotation: 0, scale: 1 };
      }),
    ];
    expect(created).toBe(2);

    for (const sprite of firstWave) pool.release(sprite);

    pool.acquire(() => {
      created += 1;
      return { frame: 0, alpha: 1, rotation: 0, scale: 1 };
    });
    pool.acquire(() => {
      created += 1;
      return { frame: 0, alpha: 1, rotation: 0, scale: 1 };
    });

    expect(created).toBe(2);
  });

  it('clears frame, alpha, rotation and scale before a sprite is reused', () => {
    const pool = createDecorationObjectPool<PooledSprite>({
      reset: (sprite) => {
        sprite.frame = 0;
        sprite.alpha = 1;
        sprite.rotation = 0;
        sprite.scale = 1;
      },
    });

    const sprite = pool.acquire(() => ({
      frame: 0,
      alpha: 1,
      rotation: 0,
      scale: 1,
    }));
    sprite.frame = 7;
    sprite.alpha = 0.25;
    sprite.rotation = Math.PI;
    sprite.scale = 3;
    pool.release(sprite);

    const reused = pool.acquire(() => ({
      frame: 9,
      alpha: 0,
      rotation: 1,
      scale: 4,
    }));

    expect(reused).toBe(sprite);
    expect(reused.frame).toBe(0);
    expect(reused.alpha).toBe(1);
    expect(reused.rotation).toBe(0);
    expect(reused.scale).toBe(1);
  });
});
