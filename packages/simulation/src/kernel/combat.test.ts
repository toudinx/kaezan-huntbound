import type { ActorState, SimulationSnapshot } from '@huntbound/contracts';
import { createEntityId } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';
import { encodeCanonicalJson } from '../state/canonicalJson.ts';
import { restoreSimulationKernel, snapshotKernel } from '../state/snapshot.ts';
import { createSimulationKernel } from './index.ts';
import {
  at,
  attack,
  castAbility,
  combatNeutralBlueprint,
  damageAreaAbility,
  damageTargetAbility,
  healSelfAbility,
  kernelScenario,
  moveStep,
  payloads,
  payloadsOfType,
  TEST_SEED,
  TEST_Z_BELOW,
} from './testScenarios.ts';

function streamDrawCount(snapshot: SimulationSnapshot, label: string): number {
  return (
    snapshot.randomStreams.find((stream) => stream.label === label)
      ?.drawCount ?? -1
  );
}

function restoredOrThrow(
  scenario: ReturnType<typeof kernelScenario>,
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

function withActorPatch(
  scenario: ReturnType<typeof kernelScenario>,
  patch: (actor: ActorState) => ActorState,
) {
  const kernel = createSimulationKernel(scenario, TEST_SEED);
  const snapshot = snapshotKernel(kernel);
  return restoredOrThrow(scenario, {
    ...snapshot,
    actors: snapshot.actors.map(patch),
  });
}

function fighterScenario() {
  return kernelScenario({
    scenarioId: 'combat-kernel-test',
    abilities: [
      healSelfAbility(),
      damageTargetAbility(),
      damageAreaAbility({ minPower: 3, maxPower: 3 }),
    ],
    blueprints: [
      combatNeutralBlueprint('hero', 2, 'inert', {
        factionId: 1,
        maxHealth: 20,
        maxResource: 20,
        healthRegenTicks: 2,
        healthRegenAmount: 3,
        resourceRegenTicks: 2,
        resourceRegenAmount: 4,
        attackCooldownTicks: 3,
        attackMinDamage: 5,
        attackMaxDamage: 5,
        abilityIndices: [0, 1, 2],
      }),
      combatNeutralBlueprint('foe', 2, 'inert', {
        factionId: 2,
        maxHealth: 12,
        attackCooldownTicks: 3,
        attackMinDamage: 2,
        attackMaxDamage: 2,
      }),
      combatNeutralBlueprint('ally', 2, 'inert', {
        factionId: 1,
        maxHealth: 10,
      }),
    ],
    initialActors: [
      { blueprintId: 'hero', position: at(2, 2), facing: 'e' },
      { blueprintId: 'foe', position: at(3, 2), facing: 'w' },
      { blueprintId: 'ally', position: at(1, 2), facing: 'e' },
    ],
  });
}

describe('S3 upkeep', () => {
  it('regenerates health exactly every regenTicks without exceeding maxHealth', () => {
    const scenario = fighterScenario();
    const kernel = withActorPatch(scenario, (actor) =>
      actor.blueprintId === 'hero' ? { ...actor, health: 10 } : actor,
    );

    kernel.advanceOne();
    expect(kernel.state().actors[0]?.health).toBe(10);
    kernel.advanceOne();
    expect(kernel.state().actors[0]?.health).toBe(10);
    kernel.advanceOne();
    expect(kernel.state().actors[0]?.health).toBe(13);
    kernel.advanceOne();
    expect(kernel.state().actors[0]?.health).toBe(13);
    kernel.advanceOne();
    expect(kernel.state().actors[0]?.health).toBe(16);
    kernel.advance(10);
    expect(kernel.state().actors[0]?.health).toBe(20);
  });

  it('regenerates resource exactly every regenTicks without exceeding maxResource', () => {
    const scenario = fighterScenario();
    const kernel = withActorPatch(scenario, (actor) =>
      actor.blueprintId === 'hero' ? { ...actor, resource: 6 } : actor,
    );

    kernel.advance(3);
    expect(kernel.state().actors[0]?.resource).toBe(10);
    kernel.advance(2);
    expect(kernel.state().actors[0]?.resource).toBe(14);
    kernel.advance(20);
    expect(kernel.state().actors[0]?.resource).toBe(20);
  });

  it('lets resource regenerated on tick T pay for a cast on tick T', () => {
    const scenario = kernelScenario({
      abilities: [
        healSelfAbility({ resourceCost: 8, minPower: 1, maxPower: 1 }),
      ],
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 1,
          maxHealth: 20,
          maxResource: 10,
          resourceRegenTicks: 1,
          resourceRegenAmount: 6,
          abilityIndices: [0],
        }),
      ],
      initialActors: [{ blueprintId: 'hero', position: at(1, 1), facing: 's' }],
    });
    const kernel = withActorPatch(scenario, (actor) => ({
      ...actor,
      resource: 2,
      health: 10,
    }));

    kernel.enqueue(castAbility(1, 0, null, 0));
    const first = kernel.advanceOne();
    expect(payloadsOfType(first, 'command/rejected')[0]?.code).toBe(
      'SIM_ABILITY_NO_RESOURCE',
    );
    expect(kernel.state().actors[0]?.resource).toBe(2);

    kernel.enqueue(castAbility(1, 0, null, 1));
    const second = kernel.advanceOne();
    expect(payloadsOfType(second, 'ability/cast')).toHaveLength(1);
    expect(kernel.state().actors[0]?.resource).toBe(0);
  });

  it('never regenerates when the blueprint declares regen 0', () => {
    const scenario = kernelScenario({
      blueprints: [combatNeutralBlueprint('statue', 0, 'inert')],
      initialActors: [
        { blueprintId: 'statue', position: at(1, 1), facing: 's' },
      ],
    });
    const kernel = withActorPatch(scenario, (actor) => ({
      ...actor,
      health: 1,
      resource: 0,
    }));

    kernel.advance(20);
    expect(kernel.state().actors[0]?.health).toBe(1);
    expect(kernel.state().actors[0]?.resource).toBe(0);
  });

  it('consumes no randomness while regenerating', () => {
    const scenario = fighterScenario();
    const kernel = withActorPatch(scenario, (actor) =>
      actor.blueprintId === 'hero'
        ? { ...actor, health: 4, resource: 4 }
        : actor,
    );
    const before = snapshotKernel(kernel).randomStreams.map((stream) => ({
      label: stream.label,
      drawCount: stream.drawCount,
    }));

    kernel.advance(6);

    expect(
      snapshotKernel(kernel).randomStreams.map((stream) => ({
        label: stream.label,
        drawCount: stream.drawCount,
      })),
    ).toEqual(before);
  });
});

describe('S4 attack', () => {
  it('hits an adjacent foe and emits combat/attacked then combat/damaged', () => {
    const kernel = createSimulationKernel(fighterScenario(), TEST_SEED);
    kernel.enqueue(attack(1, 2, 0));
    const events = kernel.advanceOne();

    expect(
      payloads(events).filter((payload) => payload.type.startsWith('combat/')),
    ).toEqual([
      { type: 'combat/attacked', entityId: 1, targetEntityId: 2 },
      {
        type: 'combat/damaged',
        entityId: 2,
        sourceEntityId: 1,
        amount: 5,
        remainingHealth: 7,
        cause: 'attack',
      },
    ]);
    expect(kernel.state().actors[1]?.health).toBe(7);
    expect(kernel.state().actors[0]?.attackReadyAtTick).toBe(3);
  });

  it('rejects a Chebyshev-2 target with SIM_ATTACK_OUT_OF_RANGE', () => {
    const scenario = {
      ...fighterScenario(),
      initialActors: [
        { blueprintId: 'hero', position: at(2, 2), facing: 'e' as const },
        { blueprintId: 'foe', position: at(4, 2), facing: 'w' as const },
        { blueprintId: 'ally', position: at(1, 2), facing: 'e' as const },
      ],
    };
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    const before = encodeCanonicalJson(kernel.state().actors);
    const combatBefore = streamDrawCount(snapshotKernel(kernel), 'combat');

    kernel.enqueue(attack(1, 2, 0));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'command/rejected')[0]).toMatchObject({
      commandType: 'actor/attack',
      code: 'SIM_ATTACK_OUT_OF_RANGE',
    });
    expect(encodeCanonicalJson(kernel.state().actors)).toBe(before);
    expect(streamDrawCount(snapshotKernel(kernel), 'combat')).toBe(
      combatBefore,
    );
  });

  it('hits a diagonal neighbour even when both orthogonal cells are blocked', () => {
    const scenario = {
      ...fighterScenario(),
      floors: [{ z: 7, blockedTiles: [[3, 2] as const, [2, 3] as const] }],
      initialActors: [
        { blueprintId: 'hero', position: at(2, 2), facing: 'se' as const },
        { blueprintId: 'foe', position: at(3, 3), facing: 'nw' as const },
        { blueprintId: 'ally', position: at(0, 0), facing: 'e' as const },
      ],
    };
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.enqueue(attack(1, 2, 0));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'combat/attacked')).toEqual([
      { type: 'combat/attacked', entityId: 1, targetEntityId: 2 },
    ]);
    expect(payloadsOfType(events, 'command/rejected')).toEqual([]);
  });

  it('uses attackRangeTiles and isSightClear for a Chebyshev-2 strike', () => {
    const open = kernelScenario({
      scenarioId: 'ranged-open',
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 1,
          maxHealth: 10,
          attackMinDamage: 3,
          attackMaxDamage: 3,
          attackRangeTiles: 2,
        }),
        combatNeutralBlueprint('foe', 0, 'inert', {
          factionId: 2,
          maxHealth: 10,
        }),
      ],
      initialActors: [
        { blueprintId: 'hero', position: at(1, 1), facing: 'e' },
        { blueprintId: 'foe', position: at(3, 1), facing: 'w' },
      ],
    });
    const openKernel = createSimulationKernel(open, TEST_SEED);
    openKernel.enqueue(attack(1, 2, 0));
    expect(payloadsOfType(openKernel.advanceOne(), 'combat/attacked')).toEqual([
      { type: 'combat/attacked', entityId: 1, targetEntityId: 2 },
    ]);

    const blocked = kernelScenario({
      scenarioId: 'ranged-blocked',
      floors: [{ z: 7, blockedTiles: [[2, 1]] }],
      blueprints: open.blueprints,
      initialActors: open.initialActors,
    });
    const blockedKernel = createSimulationKernel(blocked, TEST_SEED);
    blockedKernel.enqueue(attack(1, 2, 0));
    expect(
      payloadsOfType(blockedKernel.advanceOne(), 'command/rejected')[0]?.code,
    ).toBe('SIM_ATTACK_OUT_OF_RANGE');
  });

  it('rejects a target on another floor', () => {
    const scenario = kernelScenario({
      floors: [
        { z: 7, blockedTiles: [] },
        { z: TEST_Z_BELOW, blockedTiles: [] },
      ],
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 1,
          maxHealth: 10,
          attackMinDamage: 1,
          attackMaxDamage: 1,
        }),
        combatNeutralBlueprint('foe', 0, 'inert', {
          factionId: 2,
          maxHealth: 10,
        }),
      ],
      initialActors: [
        { blueprintId: 'hero', position: at(1, 1), facing: 's' },
        {
          blueprintId: 'foe',
          position: at(1, 1, TEST_Z_BELOW),
          facing: 'n',
        },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.enqueue(attack(1, 2, 0));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'command/rejected')[0]?.code).toBe(
      'SIM_ATTACK_OUT_OF_RANGE',
    );
  });

  it('rejects the same faction with SIM_TARGET_SAME_FACTION', () => {
    const kernel = createSimulationKernel(fighterScenario(), TEST_SEED);
    const before = encodeCanonicalJson(kernel.state().actors);
    kernel.enqueue(attack(1, 3, 0));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'command/rejected')[0]?.code).toBe(
      'SIM_TARGET_SAME_FACTION',
    );
    expect(encodeCanonicalJson(kernel.state().actors)).toBe(before);
  });

  it('rejects an unknown target with SIM_TARGET_UNKNOWN', () => {
    const kernel = createSimulationKernel(fighterScenario(), TEST_SEED);
    kernel.enqueue(attack(1, 99, 0));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'command/rejected')[0]?.code).toBe(
      'SIM_TARGET_UNKNOWN',
    );
  });

  it('rejects a blow before attackReadyAtTick with SIM_ATTACK_ON_COOLDOWN', () => {
    const kernel = createSimulationKernel(fighterScenario(), TEST_SEED);
    kernel.enqueue(attack(1, 2, 0));
    kernel.advanceOne();
    const combatBefore = streamDrawCount(snapshotKernel(kernel), 'combat');
    const healthBefore = kernel.state().actors[1]?.health;

    kernel.enqueue(attack(1, 2, 1));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'command/rejected')[0]?.code).toBe(
      'SIM_ATTACK_ON_COOLDOWN',
    );
    expect(kernel.state().actors[1]?.health).toBe(healthBefore);
    expect(streamDrawCount(snapshotKernel(kernel), 'combat')).toBe(
      combatBefore,
    );
  });

  it('evaluates adjacency after S2 so a same-tick step can create the blow', () => {
    const scenario = {
      ...fighterScenario(),
      initialActors: [
        { blueprintId: 'hero', position: at(1, 2), facing: 'e' as const },
        { blueprintId: 'foe', position: at(3, 2), facing: 'w' as const },
        { blueprintId: 'ally', position: at(0, 2), facing: 'e' as const },
      ],
    };
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.enqueue(moveStep(1, 'e', 0, 'ai'));
    kernel.enqueue(attack(1, 2, 0, 'player'));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'actor/moved')[0]?.to).toEqual(at(2, 2));
    expect(payloadsOfType(events, 'combat/damaged')).toHaveLength(1);
    expect(kernel.state().actors[0]?.position).toEqual(at(2, 2));
  });
});

describe('S4 cast', () => {
  it('heals the caster on a self ability', () => {
    const scenario = fighterScenario();
    const kernel = withActorPatch(scenario, (actor) =>
      actor.blueprintId === 'hero' ? { ...actor, health: 10 } : actor,
    );
    kernel.enqueue(castAbility(1, 0, null, 0));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'ability/cast')[0]).toEqual({
      type: 'ability/cast',
      entityId: 1,
      abilityIndex: 0,
      targetEntityId: null,
    });
    expect(payloadsOfType(events, 'combat/healed')[0]).toEqual({
      type: 'combat/healed',
      entityId: 1,
      sourceEntityId: 1,
      amount: 3,
      health: 13,
    });
    expect(kernel.state().actors[0]?.resource).toBe(16);
  });

  it('requires range and a different faction for a damaging target ability', () => {
    const scenario = fighterScenario();
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.enqueue(castAbility(1, 1, 2, 0));
    expect(
      payloadsOfType(kernel.advanceOne(), 'combat/damaged')[0],
    ).toMatchObject({
      entityId: 2,
      amount: 4,
      remainingHealth: 8,
      cause: 'ability',
    });

    const far = {
      ...fighterScenario(),
      initialActors: [
        { blueprintId: 'hero', position: at(2, 2), facing: 'e' as const },
        { blueprintId: 'foe', position: at(5, 2), facing: 'w' as const },
        { blueprintId: 'ally', position: at(1, 2), facing: 'e' as const },
      ],
    };
    const farKernel = createSimulationKernel(far, TEST_SEED);
    farKernel.enqueue(castAbility(1, 1, 2, 0));
    expect(
      payloadsOfType(farKernel.advanceOne(), 'command/rejected')[0]?.code,
    ).toBe('SIM_ABILITY_OUT_OF_RANGE');

    const allyKernel = createSimulationKernel(fighterScenario(), TEST_SEED);
    allyKernel.enqueue(castAbility(1, 1, 3, 0));
    expect(
      payloadsOfType(allyKernel.advanceOne(), 'command/rejected')[0]?.code,
    ).toBe('SIM_TARGET_SAME_FACTION');
  });

  it('hits every valid area target in increasing EntityId order', () => {
    const scenario = kernelScenario({
      abilities: [damageAreaAbility({ minPower: 3, maxPower: 3, radius: 1 })],
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 1,
          maxHealth: 20,
          maxResource: 20,
          abilityIndices: [0],
        }),
        combatNeutralBlueprint('foe', 0, 'inert', {
          factionId: 2,
          maxHealth: 10,
        }),
      ],
      initialActors: [
        { blueprintId: 'hero', position: at(2, 2), facing: 's' },
        { blueprintId: 'foe', position: at(3, 2), facing: 'w' },
        { blueprintId: 'foe', position: at(2, 3), facing: 'n' },
        { blueprintId: 'foe', position: at(5, 5), facing: 'n' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.enqueue(castAbility(1, 0, null, 0));
    const damaged = payloadsOfType(kernel.advanceOne(), 'combat/damaged');

    expect(damaged.map((payload) => payload.entityId)).toEqual([2, 3]);
    expect(damaged.every((payload) => payload.amount === 3)).toBe(true);
    expect(
      kernel.state().actors.find((actor) => actor.entityId === 4)?.health,
    ).toBe(10);
  });

  it('refuses a cast without enough resource and spends nothing', () => {
    const scenario = fighterScenario();
    const kernel = withActorPatch(scenario, (actor) =>
      actor.blueprintId === 'hero' ? { ...actor, resource: 3 } : actor,
    );
    const before = encodeCanonicalJson(kernel.state().actors);
    kernel.enqueue(castAbility(1, 0, null, 0));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'command/rejected')[0]?.code).toBe(
      'SIM_ABILITY_NO_RESOURCE',
    );
    expect(encodeCanonicalJson(kernel.state().actors)).toBe(before);
  });

  it('refuses own cooldown and group cooldown with the shared code', () => {
    const kernel = createSimulationKernel(fighterScenario(), TEST_SEED);
    kernel.enqueue(castAbility(1, 0, null, 0));
    kernel.advanceOne();

    kernel.enqueue(castAbility(1, 0, null, 1));
    expect(
      payloadsOfType(kernel.advanceOne(), 'command/rejected')[0]?.code,
    ).toBe('SIM_ABILITY_ON_COOLDOWN');

    const again = createSimulationKernel(fighterScenario(), TEST_SEED);
    again.enqueue(castAbility(1, 0, null, 0));
    again.advanceOne();
    again.enqueue(castAbility(1, 1, 2, 1));
    expect(
      payloadsOfType(again.advanceOne(), 'command/rejected')[0]?.code,
    ).toBe('SIM_ABILITY_ON_COOLDOWN');
  });

  it('refuses an ability index the blueprint does not declare', () => {
    const kernel = createSimulationKernel(fighterScenario(), TEST_SEED);
    kernel.enqueue(castAbility(1, 9, null, 0));
    expect(
      payloadsOfType(kernel.advanceOne(), 'command/rejected')[0]?.code,
    ).toBe('SIM_ABILITY_UNKNOWN');
  });

  it('consumes one combat roll per area target in EntityId order, reproducibly', () => {
    const scenario = kernelScenario({
      abilities: [damageAreaAbility({ minPower: 2, maxPower: 8, radius: 1 })],
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 1,
          maxHealth: 20,
          maxResource: 20,
          abilityIndices: [0],
        }),
        combatNeutralBlueprint('foe', 0, 'inert', {
          factionId: 2,
          maxHealth: 40,
        }),
      ],
      initialActors: [
        { blueprintId: 'hero', position: at(2, 2), facing: 's' },
        { blueprintId: 'foe', position: at(3, 2), facing: 'w' },
        { blueprintId: 'foe', position: at(2, 3), facing: 'n' },
      ],
    });
    const left = createSimulationKernel(scenario, TEST_SEED);
    left.enqueue(castAbility(1, 0, null, 0));
    const leftEvents = left.advanceOne();
    const right = createSimulationKernel(scenario, TEST_SEED);
    right.enqueue(castAbility(1, 0, null, 0));
    const rightEvents = right.advanceOne();

    expect(encodeCanonicalJson(payloads(leftEvents))).toBe(
      encodeCanonicalJson(payloads(rightEvents)),
    );
    expect(streamDrawCount(snapshotKernel(left), 'combat')).toBe(2);
    const amounts = payloadsOfType(leftEvents, 'combat/damaged').map(
      (payload) => payload.amount,
    );
    expect(amounts).toHaveLength(2);
    expect(amounts[0]).not.toBe(amounts[1]);
  });

  it('does not consume a combat roll when min equals max', () => {
    const kernel = createSimulationKernel(fighterScenario(), TEST_SEED);
    const before = streamDrawCount(snapshotKernel(kernel), 'combat');
    kernel.enqueue(attack(1, 2, 0));
    kernel.advanceOne();
    expect(streamDrawCount(snapshotKernel(kernel), 'combat')).toBe(before);

    kernel.enqueue(castAbility(1, 2, null, 3));
    kernel.advance(3);
    expect(streamDrawCount(snapshotKernel(kernel), 'combat')).toBe(before);
  });
});

describe('S5 death', () => {
  it('removes a zero-health actor with actor/died carrying the death cell', () => {
    const scenario = fighterScenario();
    const kernel = withActorPatch(scenario, (actor) =>
      actor.entityId === createEntityId(2) ? { ...actor, health: 5 } : actor,
    );
    kernel.enqueue(attack(1, 2, 0));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'combat/damaged')[0]?.remainingHealth).toBe(
      0,
    );
    expect(payloadsOfType(events, 'actor/died')[0]).toEqual({
      type: 'actor/died',
      entityId: 2,
      killerEntityId: 1,
      position: at(3, 2),
    });
    expect(kernel.state().actors.map((actor) => actor.entityId)).toEqual([
      1, 3,
    ]);
  });

  it('releases the spawn seat with readyAtTick = deathTick + respawnTicks', () => {
    const scenario = kernelScenario({
      spawnGroups: [
        {
          center: at(3, 2),
          radius: 0,
          slots: [{ blueprintId: 'foe', position: at(3, 2), respawnTicks: 5 }],
        },
      ],
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 1,
          maxHealth: 20,
          attackMinDamage: 10,
          attackMaxDamage: 10,
        }),
        combatNeutralBlueprint('foe', 0, 'inert', {
          factionId: 2,
          maxHealth: 10,
        }),
      ],
      initialActors: [{ blueprintId: 'hero', position: at(2, 2), facing: 'e' }],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advanceOne();
    const foe = kernel
      .state()
      .actors.find((actor) => actor.blueprintId === 'foe');
    expect(foe).toBeDefined();
    kernel.enqueue(attack(1, foe?.entityId ?? 2, 1));
    kernel.advanceOne();

    const slot = snapshotKernel(kernel).spawnSlots[0];
    expect(slot?.entityId).toBeNull();
    expect(slot?.readyAtTick).toBe(1 + 5);
  });

  it('lets S7 birth into the cell freed by death on the same tick', () => {
    const scenario = kernelScenario({
      spawnGroups: [
        {
          center: at(3, 2),
          radius: 0,
          slots: [{ blueprintId: 'foe', position: at(3, 2), respawnTicks: 0 }],
        },
      ],
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 1,
          maxHealth: 20,
          attackMinDamage: 10,
          attackMaxDamage: 10,
        }),
        combatNeutralBlueprint('foe', 0, 'inert', {
          factionId: 2,
          maxHealth: 10,
        }),
      ],
      initialActors: [{ blueprintId: 'hero', position: at(2, 2), facing: 'e' }],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advanceOne();
    const firstFoe = kernel
      .state()
      .actors.find((actor) => actor.blueprintId === 'foe');
    kernel.enqueue(attack(1, firstFoe?.entityId ?? 2, 1));
    const events = kernel.advanceOne();
    const spawned = payloadsOfType(events, 'actor/spawned').filter(
      (payload) => payload.blueprintId === 'foe',
    );

    expect(payloadsOfType(events, 'actor/died')).toHaveLength(1);
    expect(spawned[0]?.position).toEqual(at(3, 2));
    expect(spawned[0]?.entityId).not.toBe(firstFoe?.entityId);
  });

  it('does not let S6 queue an intent for an actor that died this tick', () => {
    const scenario = kernelScenario({
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 1,
          maxHealth: 20,
          attackMinDamage: 10,
          attackMaxDamage: 10,
        }),
        combatNeutralBlueprint('wanderer', 0, 'wander', {
          factionId: 2,
          maxHealth: 10,
        }),
      ],
      initialActors: [
        { blueprintId: 'hero', position: at(2, 2), facing: 'e' },
        { blueprintId: 'wanderer', position: at(3, 2), facing: 'w' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.enqueue(attack(1, 2, 0));
    kernel.advanceOne();

    expect(kernel.state().actors.map((actor) => actor.entityId)).toEqual([1]);
    expect(snapshotKernel(kernel).pendingIntents).toEqual([]);
  });

  it('removes a dead player without scheduling a respawn', () => {
    const scenario = kernelScenario({
      spawnGroups: [
        {
          center: at(3, 2),
          radius: 0,
          slots: [{ blueprintId: 'foe', position: at(3, 2), respawnTicks: 4 }],
        },
      ],
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 1,
          maxHealth: 5,
        }),
        combatNeutralBlueprint('foe', 0, 'inert', {
          factionId: 2,
          maxHealth: 20,
          attackMinDamage: 5,
          attackMaxDamage: 5,
        }),
      ],
      initialActors: [{ blueprintId: 'hero', position: at(2, 2), facing: 'e' }],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advanceOne();
    const foe = kernel
      .state()
      .actors.find((actor) => actor.blueprintId === 'foe');
    kernel.enqueue(attack(foe?.entityId ?? 2, 1, 1, 'ai'));
    kernel.advanceOne();

    expect(
      kernel.state().actors.some((actor) => actor.blueprintId === 'hero'),
    ).toBe(false);
    expect(
      snapshotKernel(kernel).spawnSlots.every((slot) => slot.entityId !== 1),
    ).toBe(true);
    const nextIds = new Set<number>();
    kernel.advance(8);
    for (const actor of kernel.state().actors) {
      nextIds.add(actor.entityId);
    }
    expect(nextIds.has(1)).toBe(false);
  });

  it('never reuses an EntityId after death', () => {
    const scenario = kernelScenario({
      spawnGroups: [
        {
          center: at(3, 2),
          radius: 0,
          slots: [{ blueprintId: 'foe', position: at(3, 2), respawnTicks: 0 }],
        },
      ],
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 1,
          maxHealth: 20,
          attackMinDamage: 10,
          attackMaxDamage: 10,
        }),
        combatNeutralBlueprint('foe', 0, 'inert', {
          factionId: 2,
          maxHealth: 10,
        }),
      ],
      initialActors: [{ blueprintId: 'hero', position: at(2, 2), facing: 'e' }],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advanceOne();
    const first = kernel
      .state()
      .actors.find((actor) => actor.blueprintId === 'foe');
    kernel.enqueue(attack(1, first?.entityId ?? 2, 1));
    kernel.advanceOne();
    const second = kernel
      .state()
      .actors.find((actor) => actor.blueprintId === 'foe');

    expect(second?.entityId).toBeGreaterThan(first?.entityId ?? 0);
    expect(kernel.state().nextEntityId).toBeGreaterThan(second?.entityId ?? 0);
  });

  it('clamps remainingHealth in the damage event to zero', () => {
    const scenario = fighterScenario();
    const kernel = withActorPatch(scenario, (actor) =>
      actor.entityId === createEntityId(2) ? { ...actor, health: 2 } : actor,
    );
    kernel.enqueue(attack(1, 2, 0));
    const damaged = payloadsOfType(kernel.advanceOne(), 'combat/damaged')[0];

    expect(damaged?.amount).toBe(5);
    expect(damaged?.remainingHealth).toBe(0);
  });
});

describe('combat restoration fidelity', () => {
  const SWEEP_TICKS = 16;

  function combatSweepScenario() {
    return kernelScenario({
      scenarioId: 'combat-restore-sweep',
      abilities: [
        healSelfAbility({ resourceCost: 4, minPower: 2, maxPower: 2 }),
        damageAreaAbility({ minPower: 4, maxPower: 7, radius: 1 }),
      ],
      spawnGroups: [
        {
          center: at(3, 2),
          radius: 0,
          slots: [{ blueprintId: 'foe', position: at(3, 2), respawnTicks: 8 }],
        },
      ],
      blueprints: [
        combatNeutralBlueprint('hero', 2, 'inert', {
          factionId: 1,
          maxHealth: 20,
          maxResource: 20,
          healthRegenTicks: 3,
          healthRegenAmount: 2,
          resourceRegenTicks: 3,
          resourceRegenAmount: 3,
          attackCooldownTicks: 3,
          attackMinDamage: 4,
          attackMaxDamage: 7,
          abilityIndices: [0, 1],
        }),
        combatNeutralBlueprint('foe', 2, 'inert', {
          factionId: 2,
          maxHealth: 8,
          attackMinDamage: 1,
          attackMaxDamage: 1,
        }),
      ],
      initialActors: [{ blueprintId: 'hero', position: at(2, 2), facing: 'e' }],
    });
  }

  function driveCombatRun(kernel: ReturnType<typeof createSimulationKernel>) {
    kernel.enqueue(castAbility(1, 0, null, 0));
    kernel.enqueue(attack(1, 2, 1));
    kernel.enqueue(castAbility(1, 1, null, 5));
    kernel.enqueue(attack(1, 2, 9));
  }

  it('resumes every boundary of a run with combat, heal, cooldown and death', () => {
    const scenario = combatSweepScenario();
    const straight = createSimulationKernel(scenario, TEST_SEED);
    driveCombatRun(straight);
    const straightEvents = straight.advance(SWEEP_TICKS);
    const straightSnapshot = encodeCanonicalJson(snapshotKernel(straight));

    const problems: string[] = [];
    for (let boundary = 0; boundary <= SWEEP_TICKS; boundary += 1) {
      const split = createSimulationKernel(scenario, TEST_SEED);
      driveCombatRun(split);
      const head = split.advance(boundary);
      const resumed = restoredOrThrow(scenario, snapshotKernel(split));
      const tail = resumed.advance(SWEEP_TICKS - boundary);
      if (
        encodeCanonicalJson([...head, ...tail]) !==
        encodeCanonicalJson(straightEvents)
      ) {
        problems.push(`tick ${boundary}: event journal differs`);
      }
      if (encodeCanonicalJson(snapshotKernel(resumed)) !== straightSnapshot) {
        problems.push(`tick ${boundary}: final snapshot differs`);
      }
    }

    expect(problems).toEqual([]);
    expect(
      payloadsOfType(straightEvents, 'combat/healed').length,
    ).toBeGreaterThan(0);
    expect(
      payloadsOfType(straightEvents, 'ability/cast').length,
    ).toBeGreaterThan(1);
    expect(payloadsOfType(straightEvents, 'actor/died').length).toBeGreaterThan(
      0,
    );
  });
});

describe('combat-sensitive regeneration', () => {
  function regenScenario(
    playerOverrides: Parameters<typeof combatNeutralBlueprint>[3] = {},
    foeOverrides: Parameters<typeof combatNeutralBlueprint>[3] = {},
  ) {
    return kernelScenario({
      scenarioId: 'sustain-regen-test',
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 0,
          maxHealth: 100,
          maxResource: 100,
          healthRegenTicks: 1,
          healthRegenAmount: 1,
          resourceRegenTicks: 1,
          resourceRegenAmount: 1,
          outOfCombatHealthRegenTicks: 1,
          outOfCombatHealthRegenAmount: 7,
          outOfCombatResourceRegenTicks: 1,
          outOfCombatResourceRegenAmount: 7,
          combatWindowTicks: 4,
          ...playerOverrides,
        }),
        combatNeutralBlueprint('foe', 0, 'inert', {
          factionId: 1,
          maxHealth: 50,
          attackCooldownTicks: 1,
          attackMinDamage: 3,
          attackMaxDamage: 3,
          ...foeOverrides,
        }),
      ],
      initialActors: [
        { blueprintId: 'hero', position: at(2, 2), facing: 'e' },
        { blueprintId: 'foe', position: at(3, 2), facing: 'w' },
      ],
    });
  }

  it('never uses the in-combat rate when the player has not been hit', () => {
    const kernel = withActorPatch(regenScenario(), (actor) =>
      actor.blueprintId === 'hero'
        ? { ...actor, health: 20, resource: 20, nextHealthRegenTick: 1 }
        : actor,
    );

    kernel.advance(1);
    expect(kernel.state().actors[0]?.health).toBe(20);
    kernel.advance(1);
    expect(kernel.state().actors[0]?.health).toBe(27);
  });

  it('switches to the in-combat rate after a received combat/damaged and back at both window edges', () => {
    const kernel = withActorPatch(regenScenario(), (actor) =>
      actor.blueprintId === 'hero'
        ? {
            ...actor,
            health: 20,
            lastDamageReceivedTick: 10,
            nextHealthRegenTick: 13,
          }
        : actor,
    );

    kernel.advance(13);
    expect(kernel.state().actors[0]?.health).toBe(20);
    kernel.advance(1);
    expect(kernel.state().actors[0]?.health).toBe(21);
    kernel.advance(1);
    expect(kernel.state().actors[0]?.health).toBe(28);
  });

  it('returns to the in-combat rate when hit during out-of-combat regeneration', () => {
    const kernel = withActorPatch(regenScenario(), (actor) =>
      actor.blueprintId === 'hero'
        ? {
            ...actor,
            health: 20,
            lastDamageReceivedTick: 10,
            nextHealthRegenTick: 14,
          }
        : actor,
    );

    kernel.advance(15);
    expect(kernel.state().actors[0]?.health).toBe(27);

    kernel.enqueue(attack(2, 1, 15));
    kernel.advanceOne();
    expect(kernel.state().actors[0]?.lastDamageReceivedTick).toBe(15);
    expect(kernel.state().actors[0]?.health).toBe(31);

    kernel.advanceOne();
    expect(kernel.state().actors[0]?.health).toBe(32);
  });

  it('keeps the original rate when combatWindowTicks is 0', () => {
    const kernel = withActorPatch(
      regenScenario({ combatWindowTicks: 0 }),
      (actor) =>
        actor.blueprintId === 'hero'
          ? { ...actor, health: 20, nextHealthRegenTick: 1 }
          : actor,
    );

    kernel.advance(2);
    expect(kernel.state().actors[0]?.health).toBe(21);
  });

  it('never lets a creature use the out-of-combat rate even when those fields are set', () => {
    const kernel = withActorPatch(
      regenScenario(
        {},
        {
          healthRegenTicks: 1,
          healthRegenAmount: 1,
          outOfCombatHealthRegenTicks: 1,
          outOfCombatHealthRegenAmount: 7,
          combatWindowTicks: 4,
        },
      ),
      (actor) =>
        actor.blueprintId === 'foe'
          ? { ...actor, health: 20, nextHealthRegenTick: 1 }
          : actor,
    );

    kernel.advance(2);
    expect(kernel.state().actors[1]?.health).toBe(21);
  });
});

describe('leech', () => {
  function leechScenario(
    playerOverrides: Parameters<typeof combatNeutralBlueprint>[3] = {},
    foeOverrides: Parameters<typeof combatNeutralBlueprint>[3] = {},
  ) {
    return kernelScenario({
      scenarioId: 'sustain-leech-test',
      abilities: [damageAreaAbility({ minPower: 10, maxPower: 10, radius: 1 })],
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 0,
          maxHealth: 100,
          maxResource: 100,
          attackCooldownTicks: 1,
          attackMinDamage: 10,
          attackMaxDamage: 10,
          lifeLeechPermille: 200,
          manaLeechPermille: 100,
          abilityIndices: [0],
          ...playerOverrides,
        }),
        combatNeutralBlueprint('foe', 0, 'inert', {
          factionId: 1,
          maxHealth: 40,
          ...foeOverrides,
        }),
      ],
      initialActors: [
        { blueprintId: 'hero', position: at(2, 2), facing: 's' },
        { blueprintId: 'foe', position: at(3, 2), facing: 'w' },
      ],
    });
  }

  it('returns health and mana to the source in configured thousandths of applied damage', () => {
    const kernel = withActorPatch(leechScenario(), (actor) =>
      actor.blueprintId === 'hero'
        ? { ...actor, health: 50, resource: 40 }
        : actor,
    );
    kernel.enqueue(attack(1, 2, 0));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'combat/damaged')[0]).toMatchObject({
      entityId: 2,
      amount: 10,
    });
    expect(payloadsOfType(events, 'combat/leeched')).toEqual([
      {
        type: 'combat/leeched',
        entityId: 1,
        sourceEntityId: 2,
        healthAmount: 2,
        resourceAmount: 1,
        health: 52,
        resource: 41,
      },
    ]);
    expect(kernel.state().actors[0]?.health).toBe(52);
    expect(kernel.state().actors[0]?.resource).toBe(41);
  });

  it('emits nothing when both leech rates are 0', () => {
    const kernel = withActorPatch(
      leechScenario({ lifeLeechPermille: 0, manaLeechPermille: 0 }),
      (actor) =>
        actor.blueprintId === 'hero'
          ? { ...actor, health: 50, resource: 40 }
          : actor,
    );
    kernel.enqueue(attack(1, 2, 0));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'combat/leeched')).toEqual([]);
    expect(kernel.state().actors[0]?.health).toBe(50);
    expect(kernel.state().actors[0]?.resource).toBe(40);
  });

  it('clamps leech so it never exceeds the source maximum', () => {
    const kernel = withActorPatch(leechScenario(), (actor) =>
      actor.blueprintId === 'hero'
        ? { ...actor, health: 99, resource: 99 }
        : actor,
    );
    kernel.enqueue(attack(1, 2, 0));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'combat/leeched')[0]).toMatchObject({
      healthAmount: 1,
      resourceAmount: 1,
      health: 100,
      resource: 100,
    });
  });

  it('does not leech damage applied to a target already at zero health', () => {
    const kernel = withActorPatch(leechScenario(), (actor) =>
      actor.blueprintId === 'hero'
        ? { ...actor, health: 50, resource: 40 }
        : { ...actor, health: 0 },
    );
    kernel.enqueue(attack(1, 2, 0));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'combat/damaged')[0]).toMatchObject({
      amount: 10,
      remainingHealth: 0,
    });
    expect(payloadsOfType(events, 'combat/leeched')).toEqual([]);
    expect(kernel.state().actors[0]?.health).toBe(50);
  });

  it('sums area leech per target in canonical entity order', () => {
    const scenario = kernelScenario({
      scenarioId: 'sustain-area-leech-test',
      abilities: [
        damageAreaAbility({
          minPower: 10,
          maxPower: 10,
          radius: 1,
          resourceCost: 0,
        }),
      ],
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 0,
          maxHealth: 100,
          maxResource: 100,
          lifeLeechPermille: 1000,
          manaLeechPermille: 0,
          abilityIndices: [0],
        }),
        combatNeutralBlueprint('foe', 0, 'inert', {
          factionId: 1,
          maxHealth: 40,
        }),
      ],
      initialActors: [
        { blueprintId: 'hero', position: at(2, 2), facing: 's' },
        { blueprintId: 'foe', position: at(3, 2), facing: 'w' },
        { blueprintId: 'foe', position: at(2, 3), facing: 'n' },
      ],
    });
    const kernel = withActorPatch(scenario, (actor) =>
      actor.blueprintId === 'hero' ? { ...actor, health: 50 } : actor,
    );
    kernel.enqueue(castAbility(1, 0, null, 0));
    const events = kernel.advanceOne();
    const combat = payloads(events).filter((payload) =>
      payload.type.startsWith('combat/'),
    );

    expect(combat).toEqual([
      {
        type: 'combat/damaged',
        entityId: 2,
        sourceEntityId: 1,
        amount: 10,
        remainingHealth: 30,
        cause: 'ability',
      },
      {
        type: 'combat/leeched',
        entityId: 1,
        sourceEntityId: 2,
        healthAmount: 10,
        resourceAmount: 0,
        health: 60,
        resource: 100,
      },
      {
        type: 'combat/damaged',
        entityId: 3,
        sourceEntityId: 1,
        amount: 10,
        remainingHealth: 30,
        cause: 'ability',
      },
      {
        type: 'combat/leeched',
        entityId: 1,
        sourceEntityId: 3,
        healthAmount: 10,
        resourceAmount: 0,
        health: 70,
        resource: 100,
      },
    ]);
    expect(kernel.state().actors[0]?.health).toBe(70);
  });

  it('applies creature leech against the player from the attacker blueprint', () => {
    const kernel = withActorPatch(
      leechScenario(
        { lifeLeechPermille: 0, manaLeechPermille: 0 },
        {
          lifeLeechPermille: 500,
          manaLeechPermille: 0,
          attackMinDamage: 10,
          attackMaxDamage: 10,
          attackCooldownTicks: 1,
        },
      ),
      (actor) =>
        actor.blueprintId === 'foe' ? { ...actor, health: 20 } : actor,
    );
    kernel.enqueue(attack(2, 1, 0));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'combat/leeched')).toEqual([
      {
        type: 'combat/leeched',
        entityId: 2,
        sourceEntityId: 1,
        healthAmount: 5,
        resourceAmount: 0,
        health: 25,
        resource: 0,
      },
    ]);
  });

  it('truncates permille division so 7 damage at 100‰ yields no leech', () => {
    const kernel = withActorPatch(
      leechScenario({
        attackMinDamage: 7,
        attackMaxDamage: 7,
        lifeLeechPermille: 100,
        manaLeechPermille: 100,
      }),
      (actor) =>
        actor.blueprintId === 'hero'
          ? { ...actor, health: 50, resource: 40 }
          : actor,
    );
    kernel.enqueue(attack(1, 2, 0));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'combat/leeched')).toEqual([]);
    expect(kernel.state().actors[0]?.health).toBe(50);
  });
});
