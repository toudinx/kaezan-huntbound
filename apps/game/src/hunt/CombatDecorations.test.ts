import { describe, expect, it } from 'vitest';
import {
  createAssetKey,
  HUNT_PACK_BLOOD_EFFECT_KEY,
  HUNT_PACK_HIT_AREA_EFFECT_KEY,
  HUNT_PACK_MAGIC_BLUE_EFFECT_KEY,
} from '../../../../packages/assets/src/index.ts';
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
  IMPACT_TTL_MS,
} from './CombatDecorations';
import { combatFxForCause } from './CombatFxTable';
import { DEFAULT_COMBAT_ABILITIES } from './CombatViewModel';

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

  it('plans hit-area impact on the target from combat/attacked', () => {
    const decorations = createCombatDecorations();
    const targetPosition = position(6, 5);

    decorations.handle({
      events: [
        event(10, {
          type: 'combat/attacked',
          entityId: 1 as EntityId,
          targetEntityId: 2 as EntityId,
        }),
      ],
      actorPositions: new Map([[2 as EntityId, targetPosition]]),
      playerPosition: position(5, 5),
    });

    expect(decorations.current()).toEqual([
      expect.objectContaining({
        kind: 'impact',
        key: combatFxForCause('attack').impactKey,
        position: targetPosition,
        blocksMovement: false,
        expiresAtMs: 10 * 50 + IMPACT_TTL_MS,
      }),
    ]);
  });

  it('adds blood and a damage number from attack damage without a second impact', () => {
    const decorations = createCombatDecorations();
    const targetPosition = position(6, 5);

    decorations.handle({
      events: [
        event(10, {
          type: 'combat/attacked',
          entityId: 1 as EntityId,
          targetEntityId: 2 as EntityId,
        }),
        event(10, {
          type: 'combat/damaged',
          entityId: 2 as EntityId,
          sourceEntityId: 1 as EntityId,
          amount: 20,
          remainingHealth: 45,
          cause: 'attack',
        }),
      ],
      actorPositions: new Map([[2 as EntityId, targetPosition]]),
      playerPosition: position(5, 5),
    });

    const current = decorations.current();
    expect(current.filter((entry) => entry.kind === 'impact')).toEqual([
      expect.objectContaining({
        key: createAssetKey(HUNT_PACK_HIT_AREA_EFFECT_KEY),
        position: targetPosition,
      }),
    ]);
    expect(current.filter((entry) => entry.kind === 'blood')).toEqual([
      expect.objectContaining({
        key: createAssetKey(HUNT_PACK_BLOOD_EFFECT_KEY),
        position: targetPosition,
        expiresAtMs: 10 * 50 + BLOOD_TTL_MS,
      }),
    ]);
    expect(current.filter((entry) => entry.kind === 'damage-number')).toEqual([
      expect.objectContaining({
        amount: 20,
        position: targetPosition,
      }),
    ]);
  });

  it('plans only a damage number for ability damage', () => {
    const decorations = createCombatDecorations();
    const targetPosition = position(6, 5);

    decorations.handle({
      events: [
        event(10, {
          type: 'combat/damaged',
          entityId: 2 as EntityId,
          sourceEntityId: 1 as EntityId,
          amount: 14,
          remainingHealth: 51,
          cause: 'ability',
        }),
      ],
      actorPositions: new Map([[2 as EntityId, targetPosition]]),
      playerPosition: position(5, 5),
    });

    expect(decorations.current()).toEqual([
      expect.objectContaining({
        kind: 'damage-number',
        amount: 14,
        position: targetPosition,
      }),
    ]);
  });

  it('skips impact when the target has no known position', () => {
    const decorations = createCombatDecorations();

    decorations.handle({
      events: [
        event(10, {
          type: 'combat/attacked',
          entityId: 1 as EntityId,
          targetEntityId: 2 as EntityId,
        }),
      ],
      actorPositions: new Map(),
      playerPosition: position(5, 5),
    });

    expect(decorations.current()).toEqual([]);
  });

  it('plans berserk on every tile in radius one with distance-based stagger', () => {
    const decorations = createCombatDecorations(DEFAULT_COMBAT_ABILITIES);
    const casterPosition = position(6, 5);

    decorations.handle({
      events: [
        event(10, {
          type: 'ability/cast',
          entityId: 1 as EntityId,
          abilityIndex: 0,
          targetEntityId: null,
        }),
      ],
      actorPositions: new Map([[1 as EntityId, casterPosition]]),
      playerPosition: casterPosition,
    });

    const effects = decorations.current();
    expect(effects).toHaveLength(9);
    expect(effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: createAssetKey(HUNT_PACK_HIT_AREA_EFFECT_KEY),
          position: casterPosition,
          createdAtMs: 10 * 50,
        }),
      ]),
    );
    expect(
      effects
        .map((effect) => effect.position)
        .filter((value) => value !== undefined),
    ).toEqual(
      expect.arrayContaining([
        position(5, 4),
        position(6, 4),
        position(7, 4),
        position(5, 5),
        position(6, 5),
        position(7, 5),
        position(5, 6),
        position(6, 6),
        position(7, 6),
      ]),
    );
    expect(new Set(effects.map((effect) => effect.createdAtMs))).toEqual(
      new Set([10 * 50, 10 * 50 + 40]),
    );
  });

  it('plans a stronger hit-area impact for brutal-strike on the target', () => {
    const decorations = createCombatDecorations(DEFAULT_COMBAT_ABILITIES);
    const targetPosition = position(7, 5);

    decorations.handle({
      events: [
        event(10, {
          type: 'ability/cast',
          entityId: 1 as EntityId,
          abilityIndex: 1,
          targetEntityId: 2 as EntityId,
        }),
        event(10, {
          type: 'combat/damaged',
          entityId: 2 as EntityId,
          sourceEntityId: 1 as EntityId,
          amount: 14,
          remainingHealth: 51,
          cause: 'ability',
        }),
      ],
      actorPositions: new Map([[2 as EntityId, targetPosition]]),
      playerPosition: position(6, 5),
    });

    const effects = decorations.current();
    expect(effects.filter((effect) => effect.kind === 'impact')).toEqual([
      expect.objectContaining({
        key: createAssetKey(HUNT_PACK_HIT_AREA_EFFECT_KEY),
        position: targetPosition,
        stronger: true,
      }),
    ]);
    expect(effects.filter((effect) => effect.kind === 'blood')).toEqual([]);
    expect(effects.filter((effect) => effect.kind === 'damage-number')).toEqual(
      [expect.objectContaining({ amount: 14, position: targetPosition })],
    );
  });

  it('plans wound-cleansing magic-blue on the caster', () => {
    const decorations = createCombatDecorations(DEFAULT_COMBAT_ABILITIES);
    const casterPosition = position(6, 5);

    decorations.handle({
      events: [
        event(10, {
          type: 'ability/cast',
          entityId: 1 as EntityId,
          abilityIndex: 2,
          targetEntityId: null,
        }),
      ],
      actorPositions: new Map([[1 as EntityId, casterPosition]]),
      playerPosition: casterPosition,
    });

    expect(decorations.current()).toEqual([
      expect.objectContaining({
        kind: 'impact',
        key: createAssetKey(HUNT_PACK_MAGIC_BLUE_EFFECT_KEY),
        position: casterPosition,
      }),
    ]);
  });

  it('does not plan an effect for an ability index outside the scenario catalog', () => {
    const decorations = createCombatDecorations(DEFAULT_COMBAT_ABILITIES);

    decorations.handle({
      events: [
        event(10, {
          type: 'ability/cast',
          entityId: 1 as EntityId,
          abilityIndex: 99,
          targetEntityId: null,
        }),
      ],
      actorPositions: new Map([[1 as EntityId, position(6, 5)]]),
      playerPosition: position(6, 5),
    });

    expect(decorations.current()).toEqual([]);
  });

  it('plans a positive heal-number distinct from damage-number', () => {
    const decorations = createCombatDecorations(DEFAULT_COMBAT_ABILITIES);
    const casterPosition = position(6, 5);

    decorations.handle({
      events: [
        event(10, {
          type: 'combat/healed',
          entityId: 1 as EntityId,
          sourceEntityId: 1 as EntityId,
          amount: 12,
          health: 185,
        }),
      ],
      actorPositions: new Map([[1 as EntityId, casterPosition]]),
      playerPosition: casterPosition,
    });

    const effects = decorations.current();
    expect(effects.filter((effect) => effect.kind === 'heal-number')).toEqual([
      expect.objectContaining({
        amount: 12,
        position: casterPosition,
      }),
    ]);
    expect(effects.filter((effect) => effect.kind === 'damage-number')).toEqual(
      [],
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
