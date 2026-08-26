import type {
  AbilityDefinition,
  ActorState,
  KernelScenario,
  SimulationSnapshot,
} from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { restoreSimulationKernel, snapshotKernel } from '../state/snapshot.ts';
import { createSimulationKernel } from './index.ts';
import {
  at,
  combatNeutralBlueprint,
  damageAreaAbility,
  damageTargetAbility,
  healSelfAbility,
  kernelScenario,
  payloadsOfType,
  TEST_SEED,
} from './testScenarios.ts';

/**
 * Orc Shaman combat numbers from
 * `packages/content/src/generated/pb-01-contract-coverage.json`.
 * Kernel tests cannot import content; the translation test in
 * `buildHuntScenario.test.ts` pins these to the catalog.
 */
const ORC_SHAMAN_HEALTH = 115;
const ORC_SHAMAN_RANGED = {
  minPower: 20,
  maxPower: 31,
  rangeTiles: 7,
  chanceBasisPoints: 1500,
  cooldownTicks: 40,
  element: 'energy' as const,
};
const ORC_SHAMAN_AREA = {
  minPower: 5,
  maxPower: 43,
  radius: 1,
  chanceBasisPoints: 500,
  cooldownTicks: 40,
  element: 'fire' as const,
};
const ORC_SHAMAN_HEAL = {
  minPower: 27,
  maxPower: 43,
  chanceBasisPoints: 6000,
  cooldownTicks: 40,
};

function streamDrawCount(snapshot: SimulationSnapshot, label: string): number {
  return (
    snapshot.randomStreams.find((stream) => stream.label === label)
      ?.drawCount ?? -1
  );
}

function aiDraws(kernel: ReturnType<typeof createSimulationKernel>): number {
  return streamDrawCount(snapshotKernel(kernel), 'ai');
}

function restoredOrThrow(
  scenario: KernelScenario,
  snapshot: SimulationSnapshot,
) {
  const restored = restoreSimulationKernel(scenario, snapshot);
  if (!restored.ok) {
    throw new Error(
      `restore failed: ${restored.diagnostics.map((item) => item.code).join(', ')}`,
    );
  }
  return restored.value;
}

function shamanAbilities(): readonly AbilityDefinition[] {
  return [
    damageTargetAbility({
      abilityId: 'orc-shaman-ranged',
      rangeTiles: ORC_SHAMAN_RANGED.rangeTiles,
      minPower: ORC_SHAMAN_RANGED.minPower,
      maxPower: ORC_SHAMAN_RANGED.maxPower,
      cooldownTicks: ORC_SHAMAN_RANGED.cooldownTicks,
      groupCooldownTicks: 0,
      resourceCost: 0,
      element: ORC_SHAMAN_RANGED.element,
      chanceBasisPoints: ORC_SHAMAN_RANGED.chanceBasisPoints,
    }),
    damageAreaAbility({
      abilityId: 'orc-shaman-area',
      radius: ORC_SHAMAN_AREA.radius,
      minPower: ORC_SHAMAN_AREA.minPower,
      maxPower: ORC_SHAMAN_AREA.maxPower,
      cooldownTicks: ORC_SHAMAN_AREA.cooldownTicks,
      groupCooldownTicks: 0,
      resourceCost: 0,
      element: ORC_SHAMAN_AREA.element,
      chanceBasisPoints: ORC_SHAMAN_AREA.chanceBasisPoints,
    }),
    healSelfAbility({
      abilityId: 'orc-shaman-heal',
      minPower: ORC_SHAMAN_HEAL.minPower,
      maxPower: ORC_SHAMAN_HEAL.maxPower,
      cooldownTicks: ORC_SHAMAN_HEAL.cooldownTicks,
      groupCooldownTicks: 0,
      resourceCost: 0,
      chanceBasisPoints: ORC_SHAMAN_HEAL.chanceBasisPoints,
    }),
  ];
}

function shamanBlueprint(abilityIndices: readonly number[]) {
  return combatNeutralBlueprint('orc-shaman', 3, 'hunter', {
    factionId: 2,
    aggroRadius: 11,
    maxHealth: ORC_SHAMAN_HEALTH,
    attackCooldownTicks: 40,
    attackMinDamage: 0,
    attackMaxDamage: 15,
    attackRangeTiles: 1,
    abilityIndices: [...abilityIndices],
  });
}

function preyBlueprint(blueprintId = 'prey', maxHealth = 200) {
  return combatNeutralBlueprint(blueprintId, 2, 'inert', {
    factionId: 1,
    maxHealth,
  });
}

function boxedAtOrigin(): readonly (readonly [number, number])[] {
  return [
    [1, 1],
    [2, 1],
    [1, 2],
    [1, 3],
    [2, 3],
  ];
}

function shamanScenario(
  overrides: Partial<KernelScenario> & {
    readonly abilityIndices?: readonly number[];
    readonly abilities?: readonly AbilityDefinition[];
  } = {},
) {
  const abilities = overrides.abilities ?? shamanAbilities();
  const abilityIndices = overrides.abilityIndices ?? [0, 1, 2];
  const { abilityIndices: _abilityIndices, ...scenarioOverrides } = overrides;
  return kernelScenario({
    scenarioId: 'orc-shaman-cast-test',
    width: 8,
    height: 6,
    abilities: [...abilities],
    blueprints: [shamanBlueprint(abilityIndices), preyBlueprint()],
    ...scenarioOverrides,
  });
}

function withActorPatch(
  scenario: KernelScenario,
  patch: (actor: ActorState) => Partial<ActorState>,
) {
  const kernel = createSimulationKernel(scenario, TEST_SEED);
  const snapshot = snapshotKernel(kernel);
  const restored = restoredOrThrow(scenario, {
    ...snapshot,
    actors: snapshot.actors.map((actor) => ({ ...actor, ...patch(actor) })),
  });
  return restored;
}

function shamanOf(kernel: ReturnType<typeof createSimulationKernel>) {
  return kernel
    .state()
    .actors.find((actor) => actor.blueprintId === 'orc-shaman');
}

describe('S6 hunter ability guard', () => {
  it('does not draw the ai stream for a hunter with empty abilityIndices while chasing', () => {
    const scenario = shamanScenario({
      abilityIndices: [],
      initialActors: [
        { blueprintId: 'orc-shaman', position: at(0, 2), facing: 'e' },
        { blueprintId: 'prey', position: at(7, 2), facing: 'w' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advance(8);

    expect(shamanOf(kernel)?.targetEntityId).toBe(2);
    expect(aiDraws(kernel)).toBe(0);
  });

  it('draws the ai stream only when abilityIndices is non-empty and a spell is eligible', () => {
    const empty = createSimulationKernel(
      shamanScenario({
        abilityIndices: [],
        floors: [{ z: 7, blockedTiles: boxedAtOrigin() }],
        initialActors: [
          { blueprintId: 'orc-shaman', position: at(0, 2), facing: 'e' },
          { blueprintId: 'prey', position: at(7, 2), facing: 'w' },
        ],
      }),
      TEST_SEED,
    );
    const caster = createSimulationKernel(
      shamanScenario({
        floors: [{ z: 7, blockedTiles: boxedAtOrigin() }],
        initialActors: [
          { blueprintId: 'orc-shaman', position: at(0, 2), facing: 'e' },
          { blueprintId: 'prey', position: at(7, 2), facing: 'w' },
        ],
      }),
      TEST_SEED,
    );
    empty.advance(1);
    caster.advance(1);

    expect(aiDraws(empty)).toBe(0);
    expect(aiDraws(caster)).toBe(1);
  });
});

describe('orc shaman catalog abilities', () => {
  it('casts the energy projectile at Chebyshev 7 and spends the cycle instead of walking', () => {
    const abilities = shamanAbilities().map((ability, index) =>
      index === 0
        ? { ...ability, chanceBasisPoints: 10_000 }
        : { ...ability, chanceBasisPoints: 0 },
    );
    const scenario = shamanScenario({
      abilities,
      floors: [{ z: 7, blockedTiles: boxedAtOrigin() }],
      initialActors: [
        { blueprintId: 'orc-shaman', position: at(0, 2), facing: 'e' },
        { blueprintId: 'prey', position: at(7, 2), facing: 'w' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    const decided = kernel.advanceOne();
    expect(payloadsOfType(decided, 'actor/moved')).toEqual([]);
    expect(snapshotKernel(kernel).pendingIntents).toEqual([
      {
        kind: 'cast',
        tick: 1,
        entityId: 1,
        abilityIndex: 0,
        targetEntityId: 2,
      },
    ]);

    const resolved = kernel.advanceOne();
    expect(payloadsOfType(resolved, 'ability/cast')).toEqual([
      {
        type: 'ability/cast',
        entityId: 1,
        abilityIndex: 0,
        targetEntityId: 2,
      },
    ]);
    const damaged = payloadsOfType(resolved, 'combat/damaged');
    expect(damaged).toHaveLength(1);
    expect(damaged[0]).toMatchObject({
      entityId: 2,
      sourceEntityId: 1,
      cause: 'ability',
    });
    expect(damaged[0]?.amount).toBeGreaterThanOrEqual(
      ORC_SHAMAN_RANGED.minPower,
    );
    expect(damaged[0]?.amount).toBeLessThanOrEqual(ORC_SHAMAN_RANGED.maxPower);
    expect(shamanOf(kernel)?.position).toEqual(at(0, 2));
  });

  it('hits every hostile inside Chebyshev radius 1 and misses a foe at distance 2', () => {
    const abilities = shamanAbilities().map((ability, index) =>
      index === 1
        ? { ...ability, chanceBasisPoints: 10_000 }
        : { ...ability, chanceBasisPoints: 0 },
    );
    const scenario = shamanScenario({
      abilities,
      abilityIndices: [1],
      blueprints: [
        shamanBlueprint([1]),
        preyBlueprint('prey-a'),
        preyBlueprint('prey-b'),
        preyBlueprint('prey-far'),
      ],
      initialActors: [
        { blueprintId: 'orc-shaman', position: at(3, 3), facing: 'e' },
        { blueprintId: 'prey-a', position: at(4, 3), facing: 'w' },
        { blueprintId: 'prey-b', position: at(3, 4), facing: 'n' },
        { blueprintId: 'prey-far', position: at(5, 3), facing: 'w' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advanceOne();
    const resolved = kernel.advanceOne();
    const damaged = payloadsOfType(resolved, 'combat/damaged');

    expect(payloadsOfType(resolved, 'ability/cast')).toEqual([
      {
        type: 'ability/cast',
        entityId: 1,
        abilityIndex: 1,
        targetEntityId: null,
      },
    ]);
    expect(damaged.map((payload) => payload.entityId)).toEqual([2, 3]);
    expect(
      kernel.state().actors.find((actor) => actor.entityId === 4)?.health,
    ).toBe(200);
  });

  it('heals itself when wounded and has no melee target', () => {
    const abilities = shamanAbilities().map((ability, index) =>
      index === 2
        ? { ...ability, chanceBasisPoints: 10_000 }
        : { ...ability, chanceBasisPoints: 0 },
    );
    const scenario = shamanScenario({
      abilities,
      abilityIndices: [2],
      blueprints: [shamanBlueprint([2])],
      initialActors: [
        { blueprintId: 'orc-shaman', position: at(3, 3), facing: 's' },
      ],
    });
    const kernel = withActorPatch(scenario, (actor) =>
      actor.blueprintId === 'orc-shaman' ? { health: 40 } : {},
    );
    kernel.advanceOne();
    const resolved = kernel.advanceOne();
    const healed = payloadsOfType(resolved, 'combat/healed');

    expect(payloadsOfType(resolved, 'ability/cast')).toEqual([
      {
        type: 'ability/cast',
        entityId: 1,
        abilityIndex: 2,
        targetEntityId: null,
      },
    ]);
    expect(healed).toHaveLength(1);
    expect(healed[0]?.amount).toBeGreaterThanOrEqual(ORC_SHAMAN_HEAL.minPower);
    expect(healed[0]?.amount).toBeLessThanOrEqual(ORC_SHAMAN_HEAL.maxPower);
    expect(shamanOf(kernel)?.health).toBeGreaterThan(40);
  });

  it('evaluates abilities in index order and breaks actor ties by EntityId', () => {
    const abilities = [
      damageTargetAbility({
        abilityId: 'first-ranged',
        rangeTiles: 7,
        minPower: 20,
        maxPower: 20,
        cooldownTicks: 40,
        groupCooldownTicks: 0,
        resourceCost: 0,
        chanceBasisPoints: 0,
      }),
      damageTargetAbility({
        abilityId: 'second-ranged',
        rangeTiles: 7,
        minPower: 31,
        maxPower: 31,
        cooldownTicks: 40,
        groupCooldownTicks: 0,
        resourceCost: 0,
        chanceBasisPoints: 10_000,
      }),
    ];
    const scenario = kernelScenario({
      scenarioId: 'cast-order-test',
      width: 8,
      height: 6,
      abilities,
      floors: [{ z: 7, blockedTiles: boxedAtOrigin() }],
      blueprints: [
        combatNeutralBlueprint('caster-a', 3, 'hunter', {
          factionId: 2,
          aggroRadius: 11,
          maxHealth: 115,
          attackRangeTiles: 1,
          abilityIndices: [0, 1],
        }),
        combatNeutralBlueprint('caster-b', 3, 'hunter', {
          factionId: 2,
          aggroRadius: 11,
          maxHealth: 115,
          attackRangeTiles: 1,
          abilityIndices: [0, 1],
        }),
        preyBlueprint(),
      ],
      initialActors: [
        { blueprintId: 'caster-a', position: at(0, 2), facing: 'e' },
        { blueprintId: 'caster-b', position: at(0, 4), facing: 'e' },
        { blueprintId: 'prey', position: at(7, 2), facing: 'w' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advanceOne();
    const resolved = kernel.advanceOne();
    const casts = payloadsOfType(resolved, 'ability/cast');

    expect(casts.map((payload) => payload.entityId)).toEqual([1, 2]);
    expect(casts.every((payload) => payload.abilityIndex === 1)).toBe(true);
  });

  it('restores a pending cast and still resolves it on the next tick', () => {
    const abilities = shamanAbilities().map((ability, index) =>
      index === 0
        ? { ...ability, chanceBasisPoints: 10_000 }
        : { ...ability, chanceBasisPoints: 0 },
    );
    const scenario = shamanScenario({
      abilities,
      floors: [{ z: 7, blockedTiles: boxedAtOrigin() }],
      initialActors: [
        { blueprintId: 'orc-shaman', position: at(0, 2), facing: 'e' },
        { blueprintId: 'prey', position: at(7, 2), facing: 'w' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advanceOne();
    const resumed = restoredOrThrow(scenario, snapshotKernel(kernel));
    const resolved = resumed.advanceOne();

    expect(payloadsOfType(resolved, 'ability/cast')).toHaveLength(1);
    expect(payloadsOfType(resolved, 'combat/damaged')).toHaveLength(1);
  });
});
