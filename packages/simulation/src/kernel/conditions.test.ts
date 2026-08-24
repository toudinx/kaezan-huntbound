import type { ActorState, SimulationSnapshot } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';
import { encodeCanonicalJson } from '../state/canonicalJson.ts';
import { restoreSimulationKernel, snapshotKernel } from '../state/snapshot.ts';
import {
  effectiveStepCooldownTicks,
  queryConditionModifiers,
  scaleByPermille,
} from './conditions.ts';
import { createSimulationKernel } from './index.ts';
import {
  at,
  attack,
  castAbility,
  combatNeutralBlueprint,
  damageTargetAbility,
  healSelfAbility,
  kernelScenario,
  moveStep,
  payloadsOfType,
  scenarioCondition,
  supportSelfAbility,
  TEST_SEED,
} from './testScenarios.ts';

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

function heroOf(actors: readonly ActorState[]): ActorState {
  const hero = actors.find((actor) => actor.blueprintId === 'hero');
  if (hero === undefined) {
    throw new Error('hero missing');
  }
  return hero;
}

function timedConditionScenario() {
  return kernelScenario({
    scenarioId: 'condition-lifecycle',
    conditions: [
      scenarioCondition({
        conditionId: 'haste',
        durationTicks: 5,
        speedPermille: 300,
      }),
    ],
    abilities: [
      supportSelfAbility({
        abilityId: 'haste',
        resourceCost: 6,
        toggle: false,
        appliedConditionIndex: 0,
        cooldownTicks: 0,
        groupCooldownTicks: 0,
      }),
    ],
    blueprints: [
      combatNeutralBlueprint('hero', 10, 'inert', {
        factionId: 1,
        maxHealth: 20,
        maxResource: 20,
        abilityIndices: [0],
      }),
    ],
    initialActors: [{ blueprintId: 'hero', position: at(2, 2), facing: 'e' }],
  });
}

describe('condition lifecycle', () => {
  it('registers the condition with an absolute expiry and drops it on that tick, not the next', () => {
    const scenario = timedConditionScenario();
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.enqueue(castAbility(1, 0, null, 0));
    kernel.advanceOne();

    expect(heroOf(kernel.state().actors).activeConditions).toEqual([
      { conditionIndex: 0, expiresAtTick: 5, exclusivityGroup: null },
    ]);

    kernel.advance(4);
    expect(heroOf(kernel.state().actors).activeConditions).toHaveLength(1);

    kernel.advanceOne();
    expect(heroOf(kernel.state().actors).activeConditions).toEqual([]);
  });

  it('renews expiry when the same condition is reapplied instead of duplicating the entry', () => {
    const scenario = timedConditionScenario();
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.enqueue(castAbility(1, 0, null, 0));
    kernel.advanceOne();
    kernel.enqueue(castAbility(1, 0, null, 1));
    kernel.advanceOne();

    expect(heroOf(kernel.state().actors).activeConditions).toEqual([
      { conditionIndex: 0, expiresAtTick: 6, exclusivityGroup: null },
    ]);
  });

  it('keeps activeConditions in canonical conditionIndex order', () => {
    const scenario = kernelScenario({
      scenarioId: 'condition-order',
      conditions: [
        scenarioCondition({ conditionId: 'poison-a', durationTicks: 20 }),
        scenarioCondition({ conditionId: 'poison-b', durationTicks: 20 }),
      ],
      abilities: [
        supportSelfAbility({
          abilityId: 'second',
          resourceCost: 1,
          toggle: false,
          appliedConditionIndex: 1,
        }),
        supportSelfAbility({
          abilityId: 'first',
          resourceCost: 1,
          toggle: false,
          appliedConditionIndex: 0,
        }),
      ],
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 1,
          maxHealth: 20,
          maxResource: 20,
          abilityIndices: [0, 1],
        }),
      ],
      initialActors: [{ blueprintId: 'hero', position: at(2, 2), facing: 'e' }],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.enqueue(castAbility(1, 0, null, 0));
    kernel.advanceOne();
    kernel.enqueue(castAbility(1, 1, null, 1));
    kernel.advanceOne();

    expect(
      heroOf(kernel.state().actors).activeConditions.map(
        (entry) => entry.conditionIndex,
      ),
    ).toEqual([0, 1]);
  });

  it('round-trips a serialized snapshot to the same condition state', () => {
    const scenario = timedConditionScenario();
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.enqueue(castAbility(1, 0, null, 0));
    kernel.advanceOne();
    const snapshot = snapshotKernel(kernel);
    const resumed = restoredOrThrow(scenario, snapshot);

    expect(encodeCanonicalJson(resumed.state().actors)).toBe(
      encodeCanonicalJson(kernel.state().actors),
    );
    expect(heroOf(resumed.state().actors).activeConditions).toEqual([
      { conditionIndex: 0, expiresAtTick: 5, exclusivityGroup: null },
    ]);
  });
});

describe('exclusivity slots', () => {
  function exclusiveScenario() {
    return kernelScenario({
      scenarioId: 'condition-exclusive',
      conditions: [
        scenarioCondition({
          conditionId: 'blood-rage',
          exclusivityGroup: 1,
          durationTicks: 0,
          skillModifierPermille: 250,
          damageReceivedPermille: 150,
        }),
        scenarioCondition({
          conditionId: 'protector',
          exclusivityGroup: 1,
          durationTicks: 0,
          damageDealtPermille: -150,
          damageReceivedPermille: -150,
        }),
        scenarioCondition({
          conditionId: 'haste',
          exclusivityGroup: null,
          durationTicks: 0,
          speedPermille: 300,
        }),
      ],
      abilities: [
        supportSelfAbility({
          abilityId: 'blood-rage',
          appliedConditionIndex: 0,
          resourceCost: 5,
        }),
        supportSelfAbility({
          abilityId: 'protector',
          appliedConditionIndex: 1,
          resourceCost: 5,
        }),
        supportSelfAbility({
          abilityId: 'haste',
          toggle: false,
          appliedConditionIndex: 2,
          resourceCost: 5,
        }),
      ],
      blueprints: [
        combatNeutralBlueprint('hero', 10, 'inert', {
          factionId: 1,
          maxHealth: 40,
          maxResource: 40,
          attackMinDamage: 10,
          attackMaxDamage: 10,
          attackCooldownTicks: 1,
          abilityIndices: [0, 1, 2],
        }),
        combatNeutralBlueprint('foe', 0, 'inert', {
          factionId: 2,
          maxHealth: 40,
        }),
      ],
      initialActors: [
        { blueprintId: 'hero', position: at(2, 2), facing: 'e' },
        { blueprintId: 'foe', position: at(3, 2), facing: 'w' },
      ],
    });
  }

  it('replaces the occupant of a slot on the same tick the rival is applied', () => {
    const scenario = exclusiveScenario();
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.enqueue(castAbility(1, 0, null, 0));
    kernel.advanceOne();
    expect(heroOf(kernel.state().actors).activeConditions).toEqual([
      { conditionIndex: 0, expiresAtTick: 0, exclusivityGroup: 1 },
    ]);

    kernel.enqueue(castAbility(1, 1, null, 1));
    kernel.advanceOne();
    expect(heroOf(kernel.state().actors).activeConditions).toEqual([
      { conditionIndex: 1, expiresAtTick: 0, exclusivityGroup: 1 },
    ]);
  });

  it('stacks conditions that have no exclusivity key', () => {
    const scenario = exclusiveScenario();
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.enqueue(castAbility(1, 0, null, 0));
    kernel.advanceOne();
    kernel.enqueue(castAbility(1, 2, null, 1));
    kernel.advanceOne();

    expect(
      heroOf(kernel.state().actors).activeConditions.map(
        (entry) => entry.conditionIndex,
      ),
    ).toEqual([0, 2]);
  });

  it('does not evict a condition whose exclusivity key is different', () => {
    const scenario = kernelScenario({
      scenarioId: 'condition-two-slots',
      conditions: [
        scenarioCondition({
          conditionId: 'elemental',
          exclusivityGroup: 1,
          durationTicks: 0,
        }),
        scenarioCondition({
          conditionId: 'crippling',
          exclusivityGroup: 2,
          durationTicks: 0,
        }),
      ],
      abilities: [
        supportSelfAbility({
          abilityId: 'elemental',
          appliedConditionIndex: 0,
          resourceCost: 1,
        }),
        supportSelfAbility({
          abilityId: 'crippling',
          appliedConditionIndex: 1,
          resourceCost: 1,
        }),
      ],
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 1,
          maxHealth: 20,
          maxResource: 20,
          abilityIndices: [0, 1],
        }),
      ],
      initialActors: [{ blueprintId: 'hero', position: at(2, 2), facing: 'e' }],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.enqueue(castAbility(1, 0, null, 0));
    kernel.advanceOne();
    kernel.enqueue(castAbility(1, 1, null, 1));
    kernel.advanceOne();

    expect(
      heroOf(kernel.state().actors).activeConditions.map(
        (entry) => entry.conditionIndex,
      ),
    ).toEqual([0, 1]);
  });
});

describe('stance toggle', () => {
  function stanceScenario() {
    return kernelScenario({
      scenarioId: 'stance-toggle',
      conditions: [
        scenarioCondition({
          conditionId: 'blood-rage',
          exclusivityGroup: 1,
          durationTicks: 0,
          skillIndex: 2,
          skillModifierPermille: 250,
        }),
        scenarioCondition({
          conditionId: 'protector',
          exclusivityGroup: 1,
          durationTicks: 0,
          damageDealtPermille: -150,
          damageReceivedPermille: -150,
        }),
      ],
      abilities: [
        supportSelfAbility({
          abilityId: 'blood-rage',
          appliedConditionIndex: 0,
          resourceCost: 8,
          primaryCooldownGroup: 1,
          groupCooldownTicks: 4,
        }),
        supportSelfAbility({
          abilityId: 'protector',
          appliedConditionIndex: 1,
          resourceCost: 8,
          primaryCooldownGroup: 1,
          groupCooldownTicks: 4,
        }),
      ],
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 1,
          maxHealth: 20,
          maxResource: 20,
          abilityIndices: [0, 1],
        }),
      ],
      initialActors: [{ blueprintId: 'hero', position: at(2, 2), facing: 'e' }],
    });
  }

  it('starts with no stance', () => {
    const kernel = createSimulationKernel(stanceScenario(), TEST_SEED);
    expect(heroOf(kernel.state().actors).activeConditions).toEqual([]);
  });

  it('charges mana when turning a stance on and refunds nothing when toggling it off', () => {
    const kernel = createSimulationKernel(stanceScenario(), TEST_SEED);
    kernel.enqueue(castAbility(1, 0, null, 0));
    kernel.advanceOne();
    expect(heroOf(kernel.state().actors).resource).toBe(12);
    expect(heroOf(kernel.state().actors).activeConditions).toEqual([
      { conditionIndex: 0, expiresAtTick: 0, exclusivityGroup: 1 },
    ]);

    kernel.enqueue(castAbility(1, 0, null, 4));
    kernel.advance(4);
    expect(heroOf(kernel.state().actors).resource).toBe(12);
    expect(heroOf(kernel.state().actors).activeConditions).toEqual([]);
  });

  it('charges the rival when swapping stances', () => {
    const kernel = createSimulationKernel(stanceScenario(), TEST_SEED);
    kernel.enqueue(castAbility(1, 0, null, 0));
    kernel.advanceOne();
    kernel.enqueue(castAbility(1, 1, null, 4));
    kernel.advance(4);

    expect(heroOf(kernel.state().actors).resource).toBe(4);
    expect(heroOf(kernel.state().actors).activeConditions).toEqual([
      { conditionIndex: 1, expiresAtTick: 0, exclusivityGroup: 1 },
    ]);
  });
});

describe('modifier kinds', () => {
  function physicalSkillScenario(
    heroOverrides: Partial<Parameters<typeof combatNeutralBlueprint>[3]> = {},
  ) {
    return kernelScenario({
      scenarioId: 'physical-skill-channel',
      conditions: [
        scenarioCondition({
          conditionId: 'blood-rage',
          skillIndex: 2,
          skillModifierPermille: 250,
          durationTicks: 0,
        }),
        scenarioCondition({
          conditionId: 'protector',
          damageReceivedPermille: -150,
          durationTicks: 0,
        }),
      ],
      abilities: [
        damageTargetAbility({
          abilityId: 'physical-strike',
          minPower: 100,
          maxPower: 100,
          resourceCost: 1,
          cooldownTicks: 0,
          groupCooldownTicks: 0,
          element: 'physical',
        }),
        damageTargetAbility({
          abilityId: 'fire-strike',
          minPower: 100,
          maxPower: 100,
          resourceCost: 1,
          cooldownTicks: 0,
          groupCooldownTicks: 0,
          element: 'fire',
        }),
        healSelfAbility({
          abilityId: 'big-heal',
          minPower: 100,
          maxPower: 100,
          resourceCost: 1,
          cooldownTicks: 0,
          groupCooldownTicks: 0,
        }),
      ],
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 1,
          maxHealth: 200,
          maxResource: 20,
          attackMinDamage: 100,
          attackMaxDamage: 100,
          attackCooldownTicks: 1,
          abilityIndices: [0, 1, 2],
          attackSkillIndex: 2,
          ...heroOverrides,
        }),
        combatNeutralBlueprint('foe', 0, 'inert', {
          factionId: 2,
          maxHealth: 200,
          attackMinDamage: 100,
          attackMaxDamage: 100,
          attackCooldownTicks: 1,
        }),
      ],
      initialActors: [
        { blueprintId: 'hero', position: at(2, 2), facing: 'e' },
        { blueprintId: 'foe', position: at(3, 2), facing: 'w' },
      ],
    });
  }

  it('changes the skill number the damage formula reads', () => {
    const scenario = kernelScenario({
      scenarioId: 'skill-modifier',
      conditions: [
        scenarioCondition({
          conditionId: 'blood-rage',
          skillIndex: 2,
          skillModifierPermille: 250,
          durationTicks: 0,
        }),
      ],
      abilities: [
        supportSelfAbility({
          appliedConditionIndex: 0,
          resourceCost: 1,
        }),
      ],
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 1,
          maxHealth: 20,
          maxResource: 20,
          abilityIndices: [0],
        }),
      ],
      initialActors: [{ blueprintId: 'hero', position: at(2, 2), facing: 'e' }],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.enqueue(castAbility(1, 0, null, 0));
    kernel.advanceOne();
    const actor = heroOf(kernel.state().actors);
    const modifiers = queryConditionModifiers(
      actor,
      scenario.conditions,
      kernel.tick,
    );

    expect(scaleByPermille(70, modifiers.skillModifierPermille(2))).toBe(87);
    expect(scaleByPermille(70, modifiers.skillModifierPermille(5))).toBe(70);
  });

  it('scales a physical basic attack by the matching skill modifier', () => {
    const scenario = physicalSkillScenario();
    const kernel = withActorPatch(scenario, (actor) =>
      actor.blueprintId === 'hero'
        ? {
            ...actor,
            activeConditions: [
              { conditionIndex: 0, expiresAtTick: 0, exclusivityGroup: null },
            ],
          }
        : actor,
    );
    kernel.enqueue(attack(1, 2, 0));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'combat/damaged')[0]?.amount).toBe(125);
  });

  it('scales a physical damage ability by the matching skill modifier', () => {
    const scenario = physicalSkillScenario();
    const kernel = withActorPatch(scenario, (actor) =>
      actor.blueprintId === 'hero'
        ? {
            ...actor,
            activeConditions: [
              { conditionIndex: 0, expiresAtTick: 0, exclusivityGroup: null },
            ],
          }
        : actor,
    );
    kernel.enqueue(castAbility(1, 0, 2, 0));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'combat/damaged')[0]?.amount).toBe(125);
  });

  it('keeps physical damage at 100 when the blueprint has no attackSkillIndex', () => {
    const scenario = physicalSkillScenario({ attackSkillIndex: undefined });
    const kernel = withActorPatch(scenario, (actor) =>
      actor.blueprintId === 'hero'
        ? {
            ...actor,
            activeConditions: [
              { conditionIndex: 0, expiresAtTick: 0, exclusivityGroup: null },
            ],
          }
        : actor,
    );
    kernel.enqueue(attack(1, 2, 0));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'combat/damaged')[0]?.amount).toBe(100);
  });

  it('does not apply the skill modifier to non-physical damage abilities', () => {
    const scenario = physicalSkillScenario();
    const kernel = withActorPatch(scenario, (actor) =>
      actor.blueprintId === 'hero'
        ? {
            ...actor,
            activeConditions: [
              { conditionIndex: 0, expiresAtTick: 0, exclusivityGroup: null },
            ],
          }
        : actor,
    );
    kernel.enqueue(castAbility(1, 1, 2, 0));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'combat/damaged')[0]?.amount).toBe(100);
  });

  it('does not apply the skill modifier to healing abilities', () => {
    const scenario = physicalSkillScenario();
    const kernel = withActorPatch(scenario, (actor) =>
      actor.blueprintId === 'hero'
        ? {
            ...actor,
            health: 50,
            activeConditions: [
              { conditionIndex: 0, expiresAtTick: 0, exclusivityGroup: null },
            ],
          }
        : actor,
    );
    kernel.enqueue(castAbility(1, 2, null, 0));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'combat/healed')[0]?.amount).toBe(100);
  });

  it('applies Protector damageReceivedPermille on incoming damage', () => {
    const scenario = physicalSkillScenario();
    const kernel = withActorPatch(scenario, (actor) =>
      actor.blueprintId === 'hero'
        ? {
            ...actor,
            activeConditions: [
              { conditionIndex: 1, expiresAtTick: 0, exclusivityGroup: null },
            ],
          }
        : actor,
    );
    kernel.enqueue(attack(2, 1, 0));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'combat/damaged')[0]?.amount).toBe(85);
  });

  it('scales outgoing damage by damageDealtPermille', () => {
    const scenario = kernelScenario({
      scenarioId: 'damage-dealt',
      conditions: [
        scenarioCondition({
          conditionId: 'protector',
          damageDealtPermille: -150,
          durationTicks: 0,
        }),
      ],
      abilities: [
        supportSelfAbility({
          appliedConditionIndex: 0,
          resourceCost: 1,
        }),
      ],
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 1,
          maxHealth: 40,
          maxResource: 20,
          attackMinDamage: 10,
          attackMaxDamage: 10,
          attackCooldownTicks: 1,
          abilityIndices: [0],
        }),
        combatNeutralBlueprint('foe', 0, 'inert', {
          factionId: 2,
          maxHealth: 40,
        }),
      ],
      initialActors: [
        { blueprintId: 'hero', position: at(2, 2), facing: 'e' },
        { blueprintId: 'foe', position: at(3, 2), facing: 'w' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.enqueue(castAbility(1, 0, null, 0));
    kernel.advanceOne();
    kernel.enqueue(attack(1, 2, 1));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'combat/damaged')[0]?.amount).toBe(8);
  });

  it('scales incoming damage by damageReceivedPermille', () => {
    const scenario = kernelScenario({
      scenarioId: 'damage-received',
      conditions: [
        scenarioCondition({
          conditionId: 'blood-rage',
          damageReceivedPermille: 150,
          durationTicks: 0,
        }),
      ],
      abilities: [
        supportSelfAbility({
          appliedConditionIndex: 0,
          resourceCost: 1,
        }),
      ],
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 1,
          maxHealth: 40,
          maxResource: 20,
          abilityIndices: [0],
        }),
        combatNeutralBlueprint('foe', 0, 'inert', {
          factionId: 2,
          maxHealth: 40,
          attackMinDamage: 10,
          attackMaxDamage: 10,
          attackCooldownTicks: 1,
        }),
      ],
      initialActors: [
        { blueprintId: 'hero', position: at(2, 2), facing: 'e' },
        { blueprintId: 'foe', position: at(3, 2), facing: 'w' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.enqueue(castAbility(1, 0, null, 0));
    kernel.advanceOne();
    kernel.enqueue(attack(2, 1, 1));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'combat/damaged')[0]?.amount).toBe(11);
  });

  it('shortens the effective step cooldown for haste and lengthens it for paralysis', () => {
    const scenario = kernelScenario({
      scenarioId: 'speed-modifier',
      conditions: [
        scenarioCondition({
          conditionId: 'haste',
          speedPermille: 1000,
          durationTicks: 0,
        }),
        scenarioCondition({
          conditionId: 'paralyze',
          speedPermille: -500,
          durationTicks: 0,
        }),
      ],
      blueprints: [
        combatNeutralBlueprint('hero', 10, 'inert', {
          factionId: 1,
          maxHealth: 20,
          maxResource: 0,
        }),
      ],
      initialActors: [{ blueprintId: 'hero', position: at(2, 2), facing: 'e' }],
    });

    const haste = withActorPatch(scenario, (actor) => ({
      ...actor,
      activeConditions: [
        { conditionIndex: 0, expiresAtTick: 0, exclusivityGroup: null },
      ],
    }));
    haste.enqueue(moveStep(1, 'e', 0));
    haste.advanceOne();
    expect(heroOf(haste.state().actors).readyAtTick).toBe(5);
    expect(effectiveStepCooldownTicks(10, 1000)).toBe(5);

    const slow = withActorPatch(scenario, (actor) => ({
      ...actor,
      activeConditions: [
        { conditionIndex: 1, expiresAtTick: 0, exclusivityGroup: null },
      ],
    }));
    slow.enqueue(moveStep(1, 'e', 0));
    slow.advanceOne();
    expect(heroOf(slow.state().actors).readyAtTick).toBe(20);
    expect(effectiveStepCooldownTicks(10, -500)).toBe(20);
  });

  it('spends mana before health while a mana shield is up, then falls through', () => {
    const scenario = kernelScenario({
      scenarioId: 'mana-shield',
      conditions: [
        scenarioCondition({
          conditionId: 'magic-shield',
          manaShield: true,
          durationTicks: 0,
        }),
      ],
      abilities: [
        supportSelfAbility({
          appliedConditionIndex: 0,
          resourceCost: 1,
        }),
      ],
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 1,
          maxHealth: 30,
          maxResource: 12,
          abilityIndices: [0],
        }),
        combatNeutralBlueprint('foe', 0, 'inert', {
          factionId: 2,
          maxHealth: 20,
          attackMinDamage: 10,
          attackMaxDamage: 10,
          attackCooldownTicks: 1,
        }),
      ],
      initialActors: [
        { blueprintId: 'hero', position: at(2, 2), facing: 'e' },
        { blueprintId: 'foe', position: at(3, 2), facing: 'w' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.enqueue(castAbility(1, 0, null, 0));
    kernel.advanceOne();
    expect(heroOf(kernel.state().actors).resource).toBe(11);

    kernel.enqueue(attack(2, 1, 1));
    kernel.advanceOne();
    let hero = heroOf(kernel.state().actors);
    expect(hero.resource).toBe(1);
    expect(hero.health).toBe(30);

    kernel.enqueue(attack(2, 1, 2));
    kernel.advanceOne();
    hero = heroOf(kernel.state().actors);
    expect(hero.resource).toBe(0);
    expect(hero.health).toBe(21);

    kernel.enqueue(attack(2, 1, 3));
    kernel.advanceOne();
    hero = heroOf(kernel.state().actors);
    expect(hero.resource).toBe(0);
    expect(hero.health).toBe(11);
  });

  it('deals tick damage on the interval and stops on the expiry tick', () => {
    const scenario = kernelScenario({
      scenarioId: 'tick-damage',
      conditions: [
        scenarioCondition({
          conditionId: 'poison',
          durationTicks: 12,
          tickDamageAmount: 3,
          tickDamageIntervalTicks: 4,
        }),
      ],
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 1,
          maxHealth: 20,
          maxResource: 0,
        }),
      ],
      initialActors: [{ blueprintId: 'hero', position: at(2, 2), facing: 'e' }],
    });
    const kernel = withActorPatch(scenario, (actor) => ({
      ...actor,
      activeConditions: [
        { conditionIndex: 0, expiresAtTick: 12, exclusivityGroup: null },
      ],
    }));

    kernel.advance(5);
    expect(heroOf(kernel.state().actors).health).toBe(17);
    kernel.advance(4);
    expect(heroOf(kernel.state().actors).health).toBe(14);
    kernel.advance(4);
    expect(heroOf(kernel.state().actors).health).toBe(14);
    expect(heroOf(kernel.state().actors).activeConditions).toEqual([]);
  });
});

describe('modifier composition', () => {
  it('sums permille deltas then applies once so two +100 modifiers on 7 become 8, not 7', () => {
    const scenario = kernelScenario({
      scenarioId: 'composition',
      conditions: [
        scenarioCondition({
          conditionId: 'buff-a',
          damageDealtPermille: 100,
          durationTicks: 0,
        }),
        scenarioCondition({
          conditionId: 'buff-b',
          damageDealtPermille: 100,
          durationTicks: 0,
        }),
      ],
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 1,
          maxHealth: 20,
          maxResource: 0,
          attackMinDamage: 7,
          attackMaxDamage: 7,
          attackCooldownTicks: 1,
        }),
        combatNeutralBlueprint('foe', 0, 'inert', {
          factionId: 2,
          maxHealth: 40,
        }),
      ],
      initialActors: [
        { blueprintId: 'hero', position: at(2, 2), facing: 'e' },
        { blueprintId: 'foe', position: at(3, 2), facing: 'w' },
      ],
    });
    const kernel = withActorPatch(scenario, (actor) =>
      actor.blueprintId === 'hero'
        ? {
            ...actor,
            activeConditions: [
              { conditionIndex: 0, expiresAtTick: 0, exclusivityGroup: null },
              { conditionIndex: 1, expiresAtTick: 0, exclusivityGroup: null },
            ],
          }
        : actor,
    );
    kernel.enqueue(attack(1, 2, 0));
    const events = kernel.advanceOne();

    expect(scaleByPermille(7, 200)).toBe(8);
    expect(payloadsOfType(events, 'combat/damaged')[0]?.amount).toBe(8);
  });
});

describe('secondary cooldown channel', () => {
  it('does not let a secondary-group cooldown block a primary-group ability, or the reverse', () => {
    const scenario = kernelScenario({
      scenarioId: 'cooldown-channels',
      conditions: [
        scenarioCondition({ conditionId: 'blood-rage', durationTicks: 0 }),
      ],
      abilities: [
        damageTargetAbility({
          abilityId: 'strike',
          resourceCost: 1,
          cooldownTicks: 0,
          groupCooldownTicks: 8,
          primaryCooldownGroup: 0,
          minPower: 1,
          maxPower: 1,
        }),
        supportSelfAbility({
          abilityId: 'blood-rage',
          resourceCost: 1,
          cooldownTicks: 0,
          groupCooldownTicks: 8,
          primaryCooldownGroup: 1,
          secondaryCooldownGroup: 2,
          secondaryGroupCooldownTicks: 8,
          appliedConditionIndex: 0,
        }),
      ],
      blueprints: [
        combatNeutralBlueprint('hero', 0, 'inert', {
          factionId: 1,
          maxHealth: 20,
          maxResource: 20,
          abilityIndices: [0, 1],
        }),
        combatNeutralBlueprint('foe', 0, 'inert', {
          factionId: 2,
          maxHealth: 20,
        }),
      ],
      initialActors: [
        { blueprintId: 'hero', position: at(2, 2), facing: 'e' },
        { blueprintId: 'foe', position: at(3, 2), facing: 'w' },
      ],
    });

    const afterStance = createSimulationKernel(scenario, TEST_SEED);
    afterStance.enqueue(castAbility(1, 1, null, 0));
    afterStance.advanceOne();
    afterStance.enqueue(castAbility(1, 0, 2, 1));
    const strikeEvents = afterStance.advanceOne();
    expect(payloadsOfType(strikeEvents, 'command/rejected')).toEqual([]);
    expect(payloadsOfType(strikeEvents, 'ability/cast')).toHaveLength(1);

    const afterStrike = createSimulationKernel(scenario, TEST_SEED);
    afterStrike.enqueue(castAbility(1, 0, 2, 0));
    afterStrike.advanceOne();
    afterStrike.enqueue(castAbility(1, 1, null, 1));
    const stanceEvents = afterStrike.advanceOne();
    expect(payloadsOfType(stanceEvents, 'command/rejected')).toEqual([]);
    expect(payloadsOfType(stanceEvents, 'ability/cast')).toHaveLength(1);
  });
});

describe('stance persistence', () => {
  it('keeps a toggled stance and its expiry across snapshot restore', () => {
    const scenario = timedConditionScenario();
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.enqueue(castAbility(1, 0, null, 0));
    kernel.advanceOne();
    const snapshot = snapshotKernel(kernel);
    const resumed = restoredOrThrow(
      scenario,
      JSON.parse(JSON.stringify(snapshot)) as SimulationSnapshot,
    );

    expect(heroOf(resumed.state().actors).activeConditions).toEqual([
      { conditionIndex: 0, expiresAtTick: 5, exclusivityGroup: null },
    ]);
    resumed.advance(4);
    expect(heroOf(resumed.state().actors).activeConditions).toHaveLength(1);
    resumed.advanceOne();
    expect(heroOf(resumed.state().actors).activeConditions).toEqual([]);
  });
});
