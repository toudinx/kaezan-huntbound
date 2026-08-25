import type { ActorState, SimulationSnapshot } from '@huntbound/contracts';
import { createEntityId } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { encodeCanonicalJson } from '../state/canonicalJson.ts';
import { restoreSimulationKernel, snapshotKernel } from '../state/snapshot.ts';
import { createSimulationKernel } from './index.ts';
import {
  at,
  castAbility,
  challengeAbility,
  combatNeutralBlueprint,
  damageTargetAbility,
  kernelScenario,
  payloadsOfType,
  TEST_SEED,
} from './testScenarios.ts';

const CASTER_ID = 1;
const HUNTER_ID = 2;
const DECOY_ID = 3;
const TAUNT_DURATION_TICKS = 40;

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

function actorOf(
  actors: readonly ActorState[],
  entityId: number,
): ActorState | undefined {
  return actors.find((actor) => actor.entityId === entityId);
}

function tauntScenario(hunterPosition: {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}) {
  return kernelScenario({
    scenarioId: 'challenge-taunt',
    abilities: [
      challengeAbility(),
      damageTargetAbility({
        abilityId: 'strike',
        resourceCost: 1,
        cooldownTicks: 0,
        groupCooldownTicks: 8,
        primaryCooldownGroup: 0,
        minPower: 1,
        maxPower: 1,
      }),
    ],
    blueprints: [
      combatNeutralBlueprint('hero', 0, 'inert', {
        factionId: 0,
        maxHealth: 50,
        maxResource: 50,
        abilityIndices: [0, 1],
        combatWindowTicks: 80,
      }),
      combatNeutralBlueprint('hunter', 4, 'hunter', {
        factionId: 2,
        maxHealth: 20,
        aggroRadius: 8,
        attackCooldownTicks: 4,
        attackMinDamage: 1,
        attackMaxDamage: 1,
      }),
      combatNeutralBlueprint('decoy', 0, 'inert', {
        factionId: 1,
        maxHealth: 20,
      }),
    ],
    initialActors: [
      { blueprintId: 'hero', position: at(2, 2), facing: 'e' },
      { blueprintId: 'hunter', position: hunterPosition, facing: 'w' },
      { blueprintId: 'decoy', position: at(6, 2), facing: 'w' },
    ],
  });
}

function targetingDecoy(actor: ActorState): ActorState {
  if (actor.entityId !== createEntityId(HUNTER_ID)) {
    return actor;
  }
  return { ...actor, targetEntityId: createEntityId(DECOY_ID) };
}

describe('Challenge forced target', () => {
  it('turns an adjacent hunter that was on another target toward the caster', () => {
    const kernel = withActorPatch(tauntScenario(at(3, 2)), targetingDecoy);
    kernel.enqueue(castAbility(CASTER_ID, 0, null, 0));
    const events = kernel.advanceOne();
    const hunter = actorOf(kernel.state().actors, HUNTER_ID);

    expect(payloadsOfType(events, 'combat/damaged')).toEqual([]);
    expect(payloadsOfType(events, 'ability/cast')).toEqual([
      {
        type: 'ability/cast',
        entityId: CASTER_ID,
        abilityIndex: 0,
        targetEntityId: null,
      },
    ]);
    expect(payloadsOfType(events, 'combat/target-changed')).toEqual([
      {
        type: 'combat/target-changed',
        entityId: HUNTER_ID,
        targetEntityId: CASTER_ID,
      },
    ]);
    expect(hunter?.targetEntityId).toBe(CASTER_ID);
    expect(hunter?.forcedTargetEntityId).toBe(CASTER_ID);
    expect(hunter?.forcedTargetExpiresAtTick).toBe(TAUNT_DURATION_TICKS);
    expect(
      actorOf(kernel.state().actors, CASTER_ID)?.lastDamageReceivedTick,
    ).toBe(0);
  });

  it('does not retarget a hunter outside Chebyshev radius 1', () => {
    const kernel = withActorPatch(tauntScenario(at(5, 2)), targetingDecoy);
    kernel.enqueue(castAbility(CASTER_ID, 0, null, 0));
    const events = kernel.advanceOne();
    const hunter = actorOf(kernel.state().actors, HUNTER_ID);

    expect(payloadsOfType(events, 'combat/target-changed')).toEqual([]);
    expect(hunter?.targetEntityId).toBe(DECOY_ID);
    expect(hunter?.forcedTargetEntityId).toBeNull();
    expect(hunter?.forcedTargetExpiresAtTick).toBe(0);
  });

  it('keeps the lock on the tick before expiry and drops it on the expiry tick', () => {
    const kernel = withActorPatch(tauntScenario(at(3, 2)), targetingDecoy);
    kernel.enqueue(castAbility(CASTER_ID, 0, null, 0));
    kernel.advance(TAUNT_DURATION_TICKS);

    const living = actorOf(kernel.state().actors, HUNTER_ID);
    expect(kernel.state().tick).toBe(TAUNT_DURATION_TICKS);
    expect(living?.forcedTargetEntityId).toBe(CASTER_ID);
    expect(living?.forcedTargetExpiresAtTick).toBe(TAUNT_DURATION_TICKS);
    expect(living?.targetEntityId).toBe(CASTER_ID);

    kernel.advanceOne();
    const expired = actorOf(kernel.state().actors, HUNTER_ID);
    expect(kernel.state().tick).toBe(TAUNT_DURATION_TICKS + 1);
    expect(expired?.forcedTargetEntityId).toBeNull();
    expect(expired?.forcedTargetExpiresAtTick).toBe(0);
  });

  it('restores the lock from a snapshot without a new persistence format', () => {
    const scenario = tauntScenario(at(3, 2));
    const kernel = withActorPatch(scenario, targetingDecoy);
    kernel.enqueue(castAbility(CASTER_ID, 0, null, 0));
    kernel.advanceOne();

    const snapshot = snapshotKernel(kernel);
    const encoded = encodeCanonicalJson(snapshot);
    expect(encoded).toContain('"forcedTargetEntityId":1');
    expect(encoded).toContain(
      `"forcedTargetExpiresAtTick":${TAUNT_DURATION_TICKS}`,
    );

    const restored = restoredOrThrow(scenario, snapshot);
    restored.advance(TAUNT_DURATION_TICKS - 1);
    const living = actorOf(restored.state().actors, HUNTER_ID);
    expect(living?.forcedTargetEntityId).toBe(CASTER_ID);
    expect(living?.targetEntityId).toBe(CASTER_ID);

    restored.advanceOne();
    const expired = actorOf(restored.state().actors, HUNTER_ID);
    expect(expired?.forcedTargetEntityId).toBeNull();
  });

  it('does not lock or get locked by the attack cooldown group', () => {
    const holdHunter = (actor: ActorState): ActorState => {
      if (actor.entityId !== createEntityId(HUNTER_ID)) {
        return actor;
      }
      return {
        ...actor,
        targetEntityId: createEntityId(DECOY_ID),
        readyAtTick: 10_000,
      };
    };
    const kernel = withActorPatch(tauntScenario(at(3, 2)), holdHunter);
    kernel.enqueue(castAbility(CASTER_ID, 0, null, 0));
    kernel.advanceOne();
    kernel.enqueue(castAbility(CASTER_ID, 1, HUNTER_ID, 1));
    const strikeEvents = kernel.advanceOne();

    expect(payloadsOfType(strikeEvents, 'command/rejected')).toEqual([]);
    expect(payloadsOfType(strikeEvents, 'ability/cast')).toEqual([
      {
        type: 'ability/cast',
        entityId: CASTER_ID,
        abilityIndex: 1,
        targetEntityId: HUNTER_ID,
      },
    ]);

    const reverse = withActorPatch(tauntScenario(at(3, 2)), holdHunter);
    reverse.enqueue(castAbility(CASTER_ID, 1, HUNTER_ID, 0));
    reverse.advanceOne();
    reverse.enqueue(castAbility(CASTER_ID, 0, null, 1));
    const challengeEvents = reverse.advanceOne();
    expect(payloadsOfType(challengeEvents, 'command/rejected')).toEqual([]);
    expect(payloadsOfType(challengeEvents, 'ability/cast')).toEqual([
      {
        type: 'ability/cast',
        entityId: CASTER_ID,
        abilityIndex: 0,
        targetEntityId: null,
      },
    ]);
  });

  it('taunts two adjacent hunters in entityId order and draws no combat RNG', () => {
    const scenario = kernelScenario({
      scenarioId: 'challenge-two-hunters',
      abilities: [challengeAbility()],
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 0,
          maxHealth: 50,
          maxResource: 50,
          abilityIndices: [0],
        }),
        combatNeutralBlueprint('hunter-a', 4, 'hunter', {
          factionId: 2,
          maxHealth: 20,
          aggroRadius: 8,
        }),
        combatNeutralBlueprint('hunter-b', 4, 'hunter', {
          factionId: 2,
          maxHealth: 20,
          aggroRadius: 8,
        }),
        combatNeutralBlueprint('decoy', 0, 'inert', {
          factionId: 1,
          maxHealth: 20,
        }),
      ],
      initialActors: [
        { blueprintId: 'hero', position: at(2, 2), facing: 'e' },
        { blueprintId: 'hunter-a', position: at(3, 2), facing: 'w' },
        { blueprintId: 'hunter-b', position: at(2, 3), facing: 'n' },
        { blueprintId: 'decoy', position: at(6, 2), facing: 'w' },
      ],
    });
    const kernel = withActorPatch(scenario, (actor) =>
      actor.blueprintId.startsWith('hunter')
        ? { ...actor, targetEntityId: createEntityId(4) }
        : actor,
    );
    const combatDrawsBefore =
      snapshotKernel(kernel).randomStreams.find(
        (stream) => stream.label === 'combat',
      )?.drawCount ?? -1;
    kernel.enqueue(castAbility(CASTER_ID, 0, null, 0));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'combat/target-changed')).toEqual([
      {
        type: 'combat/target-changed',
        entityId: 2,
        targetEntityId: CASTER_ID,
      },
      {
        type: 'combat/target-changed',
        entityId: 3,
        targetEntityId: CASTER_ID,
      },
    ]);
    expect(
      snapshotKernel(kernel).randomStreams.find(
        (stream) => stream.label === 'combat',
      )?.drawCount,
    ).toBe(combatDrawsBefore);
  });

  it('omits idle forced-target fields so an untaunted snapshot keeps the prior shape', () => {
    const kernel = createSimulationKernel(tauntScenario(at(5, 2)), TEST_SEED);
    const encoded = encodeCanonicalJson(snapshotKernel(kernel));
    expect(encoded.includes('forcedTarget')).toBe(false);
  });
});
